-- ============================================================================
-- MULTI-CURRENCY SUPPORT
-- ============================================================================
-- 1. `households.base_currency` — preferovaná mena domácnosti pre report-y.
-- 2. `currency` columns na `expenses`, `incomes`, `loans` (default 'EUR').
-- 3. `fx_rates` tabuľka s denným kurzom voči EUR (zdroj: ECB).
-- 4. Helper `convert_to_base(amount, from_ccy, household_id, on_date)`.
--
-- Nepriamo dotknuté: dashboard a forecast funkcie zatiaľ pracujú v base
-- currency a klient zobrazuje hodnoty po konverzii. Implementácia plnej
-- multi-currency agregácie v MV príde s ďalšou migráciou (out of scope tu).
-- ============================================================================

alter table households
  add column if not exists base_currency char(3) not null default 'EUR';

alter table expenses
  add column if not exists currency char(3) not null default 'EUR';

alter table incomes
  add column if not exists currency char(3) not null default 'EUR';

alter table loans
  add column if not exists currency char(3) not null default 'EUR';

create table if not exists fx_rates (
  id uuid primary key default uuid_generate_v4(),
  rate_date date not null,
  from_currency char(3) not null,
  to_currency char(3) not null default 'EUR',
  rate numeric(18, 8) not null check (rate > 0),
  source text not null default 'ecb',
  fetched_at timestamptz not null default now(),
  unique (rate_date, from_currency, to_currency)
);

create index if not exists idx_fx_rates_date on fx_rates(rate_date);
create index if not exists idx_fx_rates_from on fx_rates(from_currency);

-- FX rates sú referenčné dáta, čítateľné pre všetkých prihlásených.
alter table fx_rates enable row level security;

drop policy if exists "fx_rates_read_all_authenticated" on fx_rates;
create policy "fx_rates_read_all_authenticated"
  on fx_rates for select
  using (auth.uid() is not null);

-- Insert/update iba service role (cron job ECB feed).
drop policy if exists "fx_rates_no_user_write" on fx_rates;
create policy "fx_rates_no_user_write"
  on fx_rates for all
  using (false)
  with check (false);

-- ============================================================================
-- convert_to_base
-- Idempotentne konvertuje amount z `from_ccy` do base meny domácnosti
-- pre daný deň. Ak rate neexistuje, fallback na najnovší rate <= on_date.
-- ============================================================================
create or replace function convert_to_base(
  p_amount numeric,
  p_from_currency char(3),
  p_household_id uuid,
  p_on_date date default current_date
) returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_base char(3);
  v_rate numeric;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not public.is_household_member(auth.uid(), p_household_id) then
    raise exception 'Forbidden';
  end if;

  select base_currency into v_base
    from households where id = p_household_id;

  if v_base is null then
    raise exception 'Household not found: %', p_household_id;
  end if;

  if p_from_currency = v_base then
    return p_amount;
  end if;

  -- Direct rate from -> base.
  select rate into v_rate
    from fx_rates
   where from_currency = p_from_currency
     and to_currency = v_base
     and rate_date <= p_on_date
   order by rate_date desc
   limit 1;

  if v_rate is not null then
    return round(p_amount * v_rate, 4);
  end if;

  -- Inverse rate base -> from.
  select 1.0 / rate into v_rate
    from fx_rates
   where from_currency = v_base
     and to_currency = p_from_currency
     and rate_date <= p_on_date
   order by rate_date desc
   limit 1;

  if v_rate is not null then
    return round(p_amount * v_rate, 4);
  end if;

  raise exception 'No FX rate found for % -> % on or before %',
    p_from_currency, v_base, p_on_date;
end;
$$;

revoke execute on function convert_to_base(numeric, char, uuid, date) from public;
grant execute on function convert_to_base(numeric, char, uuid, date) to authenticated, service_role;

comment on table fx_rates is 'Denné FX rate-y (ECB). Read-only pre používateľov.';
comment on function convert_to_base(numeric, char, uuid, date) is
  'Skonvertuje sumu z danej meny do base currency domácnosti pomocou najbližšieho dostupného rate-u.';
