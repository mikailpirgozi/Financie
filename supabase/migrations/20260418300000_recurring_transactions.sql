-- ============================================================================
-- RECURRING TRANSACTIONS
-- ============================================================================
-- Periodicky generované príjmy a výdavky (nájomné, výplata, predplatné, ...).
-- Materializácia do `expenses` / `incomes` prebieha lazy (RPC `materialize_recurring`)
-- alebo cez pg_cron raz denne. Užívateľ vie templatu kedykoľvek pozastaviť alebo
-- editnúť bez toho, aby sa staré inštancie prepísali.
-- ============================================================================

create type recurring_kind as enum ('expense', 'income');
create type recurring_frequency as enum ('daily', 'weekly', 'monthly', 'quarterly', 'yearly');

create table recurring_transactions (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  kind recurring_kind not null,
  category_id uuid not null references categories(id),
  amount numeric(15, 2) not null check (amount > 0),
  currency char(3) not null default 'EUR',
  frequency recurring_frequency not null,
  -- Pre frequency='monthly' znamená "deň v mesiaci" (1-31, klampovaný na koniec mesiaca).
  -- Pre 'weekly' deň v týždni (0=Po..6=Ne) odvodený zo `start_date`.
  start_date date not null,
  end_date date,
  next_run_date date not null,
  -- Voliteľný popis ktorý sa propaguje do generovaných transakcií.
  merchant text,
  source text,
  note text,
  is_active boolean not null default true,
  -- Sleduje meta pre debugging (last_materialized_at, occurrences_count).
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurring_end_after_start check (end_date is null or end_date >= start_date),
  constraint recurring_kind_category check (
    (kind = 'expense' and category_id is not null) or
    (kind = 'income' and category_id is not null)
  )
);

create index idx_recurring_household on recurring_transactions(household_id);
create index idx_recurring_next_run on recurring_transactions(next_run_date)
  where is_active = true;
create index idx_recurring_active on recurring_transactions(household_id, is_active);

create trigger update_recurring_updated_at
  before update on recurring_transactions
  for each row execute function update_updated_at_column();

-- ============================================================================
-- RLS
-- ============================================================================
alter table recurring_transactions enable row level security;

create policy "recurring_select_own_household"
  on recurring_transactions for select
  using (public.is_household_member(auth.uid(), household_id));

create policy "recurring_insert_own_household"
  on recurring_transactions for insert
  with check (public.is_household_member(auth.uid(), household_id));

create policy "recurring_update_own_household"
  on recurring_transactions for update
  using (public.is_household_member(auth.uid(), household_id))
  with check (public.is_household_member(auth.uid(), household_id));

create policy "recurring_delete_own_household"
  on recurring_transactions for delete
  using (public.is_household_member(auth.uid(), household_id));

-- ============================================================================
-- Helper: spočítaj ďalší výskyt po danom dátume podľa frequency
-- ============================================================================
create or replace function compute_next_occurrence(
  p_from_date date,
  p_frequency recurring_frequency,
  p_anchor_day integer
) returns date
language plpgsql
immutable
as $$
declare
  v_next date;
begin
  case p_frequency
    when 'daily' then v_next := p_from_date + interval '1 day';
    when 'weekly' then v_next := p_from_date + interval '1 week';
    when 'monthly' then v_next := (date_trunc('month', p_from_date) + interval '1 month')::date
                             + (least(p_anchor_day, extract(day from
                                 (date_trunc('month', p_from_date) + interval '2 month' - interval '1 day')::date
                               )) - 1) * interval '1 day';
    when 'quarterly' then v_next := p_from_date + interval '3 months';
    when 'yearly' then v_next := p_from_date + interval '1 year';
  end case;
  return v_next;
end;
$$;

-- ============================================================================
-- materialize_recurring(p_household, p_until)
-- Vygeneruje všetky chýbajúce výskyty po `next_run_date` až do `p_until`.
-- Idempotentné: kontroluje meta tag `recurring_id` v zdrojovej tabuľke aby
-- pri opakovanom spustení nevytvorila duplikáty.
-- ============================================================================
create or replace function materialize_recurring(
  p_household_id uuid,
  p_until date default (current_date + interval '12 months')::date
) returns table (
  recurring_id uuid,
  generated_count integer,
  last_date date
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec record;
  v_next date;
  v_count integer;
  v_anchor integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_household_member(auth.uid(), p_household_id) then
    raise exception 'Forbidden';
  end if;

  for v_rec in
    select *
    from recurring_transactions
    where household_id = p_household_id
      and is_active = true
      and next_run_date <= p_until
  loop
    v_next := v_rec.next_run_date;
    v_count := 0;
    v_anchor := extract(day from v_rec.start_date)::integer;

    while v_next <= p_until and (v_rec.end_date is null or v_next <= v_rec.end_date) loop
      if v_rec.kind = 'expense' then
        insert into expenses (household_id, date, amount, category_id, merchant, note)
        select v_rec.household_id, v_next, v_rec.amount, v_rec.category_id, v_rec.merchant,
               coalesce(v_rec.note, '') || format(' [recurring:%s]', v_rec.id)
        where not exists (
          select 1 from expenses e
          where e.household_id = v_rec.household_id
            and e.date = v_next
            and e.note like '%[recurring:' || v_rec.id || ']%'
        );
      else
        insert into incomes (household_id, date, amount, source, category_id, note)
        select v_rec.household_id, v_next, v_rec.amount,
               coalesce(v_rec.source, v_rec.merchant, 'recurring'), v_rec.category_id,
               coalesce(v_rec.note, '') || format(' [recurring:%s]', v_rec.id)
        where not exists (
          select 1 from incomes i
          where i.household_id = v_rec.household_id
            and i.date = v_next
            and i.note like '%[recurring:' || v_rec.id || ']%'
        );
      end if;

      v_count := v_count + 1;
      v_next := compute_next_occurrence(v_next, v_rec.frequency, v_anchor);
    end loop;

    update recurring_transactions
       set next_run_date = v_next,
           meta = jsonb_set(
             jsonb_set(meta, '{last_materialized_at}', to_jsonb(now())),
             '{occurrences_count}',
             to_jsonb(coalesce((meta->>'occurrences_count')::integer, 0) + v_count)
           )
     where id = v_rec.id;

    recurring_id := v_rec.id;
    generated_count := v_count;
    last_date := v_next;
    return next;
  end loop;
end;
$$;

revoke execute on function materialize_recurring(uuid, date) from public;
grant execute on function materialize_recurring(uuid, date) to authenticated, service_role;

comment on table recurring_transactions is
  'Šablóny opakovaných transakcií. Inštancie sa generujú do expenses/incomes cez materialize_recurring().';
comment on function materialize_recurring(uuid, date) is
  'Vygeneruje chýbajúce inštancie recurring transakcií do daného dátumu (default +12 mesiacov). Idempotentné.';
