-- =====================================================
-- SECURITY HARDENING (P0)
-- =====================================================
-- Tato migracia rieci kriticke RLS / IDOR diery v multi-tenant
-- modeli FinApp:
--
--   1. household_members INSERT: bypass cudzej domacnosti
--   2. SECURITY DEFINER RPC bez auth.uid() guard (IDOR)
--   3. income_templates bez RLS
--   4. Chybajuce DELETE / UPDATE politiky
--   5. audit_logs INSERT akceptoval lubovolny payload
--   6. Drift role: CHECK ('owner','member') vs politiky pouzivaju 'admin'
--   7. Duplicitna 'dashboard' politika na monthly_summaries
-- =====================================================

-- ---------------------------------------------------------------
-- 0. Helper: jednotny check clenstva (SECURITY DEFINER)
-- ---------------------------------------------------------------
-- Používame SECURITY DEFINER, aby kontrola fungovala aj cez RPC
-- ktore samé bežia s elevated permissions.

CREATE OR REPLACE FUNCTION public.is_household_member(p_household_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM household_members
    WHERE household_id = p_household_id
      AND user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_household_member(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_household_member(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_household_owner_or_admin(p_household_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM household_members
    WHERE household_id = p_household_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_household_owner_or_admin(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_household_owner_or_admin(uuid) TO authenticated;

-- ---------------------------------------------------------------
-- 1. Drift role: CHECK ('owner','member','admin')
-- ---------------------------------------------------------------
-- Ostatne migracie a aplikacny kod uz pouzivaju 'admin' rolu;
-- v init schéme bola CHECK constraint len ('owner','member').
-- Rozsirujeme ju na vsetky tri.

ALTER TABLE household_members
  DROP CONSTRAINT IF EXISTS household_members_role_check;

ALTER TABLE household_members
  ADD CONSTRAINT household_members_role_check
  CHECK (role IN ('owner', 'admin', 'member'));

-- ---------------------------------------------------------------
-- 2. household_members: opraveny INSERT
-- ---------------------------------------------------------------
-- Stara politika: WITH CHECK (true) -> ktokoľvek prihlaseny
-- mohol vlozit riadok pre cudziu domacnost.
--
-- Nova politika povoluje INSERT len ak:
--   a) volajuci je owner/admin v cielovej domacnosti, ALEBO
--   b) cielova domacnost este nema ziadnych clenov (bootstrap
--      pre nove householdy vytvorene cez API/trigger).
--
-- Bootstrap je dolezity, lebo create_household_for_new_user trigger
-- bezi ako SECURITY DEFINER, takze ten obide RLS uplne — ale
-- API endpoint /api/households (manualne vytvorenie) potrebuje
-- najprv vytvorit households riadok a potom hned prvy member riadok.

DROP POLICY IF EXISTS "hm_insert" ON household_members;

CREATE POLICY "hm_insert" ON household_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- (a) volajuci je owner/admin v tejto domacnosti
    public.is_household_owner_or_admin(household_id)
    -- (b) bootstrap: domacnost este nema ziadneho clena
    OR NOT EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = household_members.household_id
    )
  );

-- Pridame UPDATE politiku (povodne chybala) - len owner/admin moze
-- menit role clenov, a nikto nemoze upgradovat sam seba na owner
-- ak nim este nie je.

DROP POLICY IF EXISTS "hm_update" ON household_members;

CREATE POLICY "hm_update" ON household_members
  FOR UPDATE
  TO authenticated
  USING (public.is_household_owner_or_admin(household_id))
  WITH CHECK (public.is_household_owner_or_admin(household_id));

-- DELETE: clen sa moze sam odstranit, alebo owner/admin moze
-- odstranit kohokolvek (povodna politika to dovolovala len pre
-- self-delete - to je bezpecne, ale rozsirime o owner case).

DROP POLICY IF EXISTS "hm_delete" ON household_members;

CREATE POLICY "hm_delete" ON household_members
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_household_owner_or_admin(household_id)
  );

-- ---------------------------------------------------------------
-- 3. income_templates: chybajuce RLS
-- ---------------------------------------------------------------

ALTER TABLE income_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "income_templates_select" ON income_templates;
CREATE POLICY "income_templates_select" ON income_templates
  FOR SELECT TO authenticated
  USING (public.is_household_member(household_id));

DROP POLICY IF EXISTS "income_templates_insert" ON income_templates;
CREATE POLICY "income_templates_insert" ON income_templates
  FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(household_id));

DROP POLICY IF EXISTS "income_templates_update" ON income_templates;
CREATE POLICY "income_templates_update" ON income_templates
  FOR UPDATE TO authenticated
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));

DROP POLICY IF EXISTS "income_templates_delete" ON income_templates;
CREATE POLICY "income_templates_delete" ON income_templates
  FOR DELETE TO authenticated
  USING (public.is_household_member(household_id));

-- ---------------------------------------------------------------
-- 4. Chybajuce DELETE / UPDATE politiky na ostatnych tabulkach
-- ---------------------------------------------------------------

-- loan_schedules: chybala DELETE
DROP POLICY IF EXISTS "loan_schedules_delete" ON loan_schedules;
CREATE POLICY "loan_schedules_delete" ON loan_schedules
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM loans
    WHERE loans.id = loan_schedules.loan_id
      AND public.is_household_member(loans.household_id)
  ));

-- asset_valuations: chybali UPDATE a DELETE
DROP POLICY IF EXISTS "asset_valuations_update" ON asset_valuations;
CREATE POLICY "asset_valuations_update" ON asset_valuations
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM assets
    WHERE assets.id = asset_valuations.asset_id
      AND public.is_household_member(assets.household_id)
  ));

DROP POLICY IF EXISTS "asset_valuations_delete" ON asset_valuations;
CREATE POLICY "asset_valuations_delete" ON asset_valuations
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM assets
    WHERE assets.id = asset_valuations.asset_id
      AND public.is_household_member(assets.household_id)
  ));

-- monthly_summaries: chybala DELETE + odstranime duplikatnu politiku
DROP POLICY IF EXISTS "Users can view their household dashboard" ON monthly_summaries;

DROP POLICY IF EXISTS "monthly_summaries_delete" ON monthly_summaries;
CREATE POLICY "monthly_summaries_delete" ON monthly_summaries
  FOR DELETE TO authenticated
  USING (public.is_household_member(household_id));

-- ---------------------------------------------------------------
-- 5. audit_logs: spristupnit INSERT len ak user_id = auth.uid()
-- ---------------------------------------------------------------
-- Stara politika: WITH CHECK (true) -> kazdy mohol vlozit
-- audit zaznam s lubovolnym user_id / household_id.

DROP POLICY IF EXISTS "Service role can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;

CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_household_member(household_id)
  );

-- ---------------------------------------------------------------
-- 6. SECURITY DEFINER RPC: pridanie auth.uid() guard
-- ---------------------------------------------------------------
-- Vsetky funkcie ktore prijimaju p_household_id musia overit, ze
-- volajuci je clenom danej domacnosti.

-- 6a. count_overdue_installments
DROP FUNCTION IF EXISTS count_overdue_installments(uuid);

CREATE OR REPLACE FUNCTION count_overdue_installments(p_household_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_household_member(p_household_id) THEN
    RAISE EXCEPTION 'unauthorized: not a member of household %', p_household_id
      USING ERRCODE = '42501';
  END IF;

  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM loan_schedules ls
    JOIN loans l ON l.id = ls.loan_id
    WHERE l.household_id = p_household_id
      AND l.status = 'active'
      AND ls.status IN ('pending', 'overdue')
      AND ls.due_date < CURRENT_DATE
  );
END;
$$;

GRANT EXECUTE ON FUNCTION count_overdue_installments(uuid) TO authenticated;

-- 6b. get_overdue_loans
DROP FUNCTION IF EXISTS get_overdue_loans(uuid);

CREATE OR REPLACE FUNCTION get_overdue_loans(p_household_id UUID)
RETURNS TABLE (
  loan_id UUID,
  lender TEXT,
  overdue_count BIGINT,
  total_overdue_amount NUMERIC,
  oldest_overdue_date DATE,
  days_overdue INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_household_member(p_household_id) THEN
    RAISE EXCEPTION 'unauthorized: not a member of household %', p_household_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    l.id as loan_id,
    l.lender,
    COUNT(ls.id) as overdue_count,
    COALESCE(SUM(ls.total_due), 0) as total_overdue_amount,
    MIN(ls.due_date) as oldest_overdue_date,
    (CURRENT_DATE - MIN(ls.due_date))::INTEGER as days_overdue
  FROM loans l
  JOIN loan_schedules ls ON ls.loan_id = l.id
  WHERE l.household_id = p_household_id
    AND l.status = 'active'
    AND ls.status IN ('pending', 'overdue')
    AND ls.due_date < CURRENT_DATE
  GROUP BY l.id, l.lender
  ORDER BY days_overdue DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_overdue_loans(uuid) TO authenticated;

-- 6c. get_household_dashboard_summary
-- Pozn.: signaturu (BIGINT counts) zarovnavame s rescue migracou
-- 20260418010000_rescue_portfolio_objects.sql.
DROP FUNCTION IF EXISTS get_household_dashboard_summary(uuid, integer);

CREATE OR REPLACE FUNCTION get_household_dashboard_summary(
  p_household_id UUID,
  p_months_count INTEGER DEFAULT 6
)
RETURNS TABLE (
  month TEXT,
  total_income NUMERIC,
  total_expenses NUMERIC,
  net_cash_flow NUMERIC,
  loan_balance_remaining NUMERIC,
  total_asset_value NUMERIC,
  net_worth NUMERIC,
  income_count BIGINT,
  expense_count BIGINT,
  total_loans BIGINT,
  active_loans BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_household_member(p_household_id) THEN
    RAISE EXCEPTION 'unauthorized: not a member of household %', p_household_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    mvd.month::TEXT,
    mvd.total_income,
    mvd.total_expenses,
    mvd.net_cash_flow,
    mvd.loan_balance_remaining,
    mvd.total_asset_value,
    mvd.net_worth,
    mvd.income_count,
    mvd.expense_count,
    mvd.total_loans,
    mvd.active_loans
  FROM mv_household_dashboard_summary mvd
  WHERE mvd.household_id = p_household_id
  ORDER BY mvd.month DESC
  LIMIT p_months_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_household_dashboard_summary(uuid, integer) TO authenticated;

-- 6d. get_loans_with_metrics (vratane linked_asset stlpcov z poslednej migracie)
-- DROP najprv aby sme bezpecne zmenili signaturu (pridat auth guard + linked_asset_kind)
DROP FUNCTION IF EXISTS get_loans_with_metrics(uuid);

CREATE OR REPLACE FUNCTION get_loans_with_metrics(p_household_id uuid)
RETURNS TABLE (
  id uuid,
  household_id uuid,
  name text,
  lender text,
  loan_type text,
  principal numeric,
  annual_rate numeric,
  rate_type text,
  day_count_convention text,
  start_date date,
  term_months integer,
  balloon_amount numeric,
  fee_setup numeric,
  fee_monthly numeric,
  insurance_monthly numeric,
  early_repayment_penalty_pct numeric,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  linked_asset_id uuid,
  linked_asset_name text,
  linked_asset_license_plate text,
  linked_asset_kind text,
  current_balance numeric,
  paid_count bigint,
  overdue_count bigint,
  due_soon_count bigint,
  total_installments bigint,
  paid_amount numeric,
  paid_principal numeric,
  total_interest numeric,
  total_fees numeric,
  total_payment numeric,
  remaining_amount numeric,
  next_installment json
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_household_member(p_household_id) THEN
    RAISE EXCEPTION 'unauthorized: not a member of household %', p_household_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.household_id,
    l.name,
    l.lender,
    l.loan_type,
    l.principal,
    l.annual_rate,
    l.rate_type,
    l.day_count_convention,
    l.start_date,
    l.term_months,
    l.balloon_amount,
    l.fee_setup,
    l.fee_monthly,
    l.insurance_monthly,
    l.early_repayment_penalty_pct,
    l.status,
    l.created_at,
    l.updated_at,
    l.linked_asset_id,
    a.name AS linked_asset_name,
    a.license_plate AS linked_asset_license_plate,
    a.kind AS linked_asset_kind,
    COALESCE(m.current_balance, l.principal) AS current_balance,
    COALESCE(m.paid_count, 0) AS paid_count,
    COALESCE(m.overdue_count, 0) AS overdue_count,
    COALESCE(m.due_soon_count, 0) AS due_soon_count,
    COALESCE(m.total_installments, 0) AS total_installments,
    COALESCE(m.paid_amount, 0) AS paid_amount,
    COALESCE(m.paid_principal, 0) AS paid_principal,
    COALESCE(m.total_interest, 0) AS total_interest,
    COALESCE(m.total_fees, 0) AS total_fees,
    COALESCE(m.total_payment, 0) AS total_payment,
    COALESCE(m.remaining_amount, l.principal) AS remaining_amount,
    m.next_installment
  FROM loans l
  LEFT JOIN loan_metrics m ON m.loan_id = l.id
  LEFT JOIN assets a ON a.id = l.linked_asset_id
  WHERE l.household_id = p_household_id
  ORDER BY l.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_loans_with_metrics(uuid) TO authenticated;

-- 6e. refresh_loan_metrics_safe: ODOBRAT z authenticated
-- Tato funkcia robi REFRESH MATERIALIZED VIEW pre vsetky householdy
-- naraz - nepatri do rúk koncoveho usera. Ponechame ju k dispozícii
-- len pre service role / cron.

REVOKE EXECUTE ON FUNCTION refresh_loan_metrics_safe() FROM authenticated;
REVOKE EXECUTE ON FUNCTION refresh_loan_metrics_safe() FROM public;
GRANT EXECUTE ON FUNCTION refresh_loan_metrics_safe() TO service_role;

-- 6f. refresh_dashboard_summary: rovnako, len service role
REVOKE EXECUTE ON FUNCTION refresh_dashboard_summary() FROM authenticated;
REVOKE EXECUTE ON FUNCTION refresh_dashboard_summary() FROM public;
GRANT EXECUTE ON FUNCTION refresh_dashboard_summary() TO service_role;

-- ---------------------------------------------------------------
-- 7. Materialized views: SECURITY INVOKER wrapper view
-- ---------------------------------------------------------------
-- MV nepodliehaju RLS. Aktualne web API routes ich citaju priamo
-- cez supabase klienta (server-side, vzdy s WHERE household_id=...).
-- Riziko: prihlaseny utocnik moze v browseri zavolat
--   supabase.from('loan_metrics').select('*')
-- a dostane agregaty vsetkych domacnosti.
--
-- Riesenie: vytvorime SECURITY INVOKER view ktora filtruje podla
-- clenstva. Stary GRANT na MV ponechame (server API routes ho stale
-- pouzivaju), ale pridame bezpecnu alternativu pre buduce pouzitie
-- z klienta.

CREATE OR REPLACE VIEW public.v_loan_metrics
WITH (security_invoker = true)
AS
SELECT *
FROM loan_metrics
WHERE EXISTS (
  SELECT 1 FROM household_members hm
  WHERE hm.household_id = loan_metrics.household_id
    AND hm.user_id = auth.uid()
);

GRANT SELECT ON public.v_loan_metrics TO authenticated;

CREATE OR REPLACE VIEW public.v_household_dashboard_summary
WITH (security_invoker = true)
AS
SELECT *
FROM mv_household_dashboard_summary
WHERE EXISTS (
  SELECT 1 FROM household_members hm
  WHERE hm.household_id = mv_household_dashboard_summary.household_id
    AND hm.user_id = auth.uid()
);

GRANT SELECT ON public.v_household_dashboard_summary TO authenticated;

COMMENT ON VIEW public.v_loan_metrics IS
  'Bezpecny wrapper nad loan_metrics MV s filtrovanim podla clenstva v domacnosti. Pouzivat z klienta namiesto priameho .from(loan_metrics).';

COMMENT ON VIEW public.v_household_dashboard_summary IS
  'Bezpecny wrapper nad mv_household_dashboard_summary MV s filtrovanim podla clenstva. Pouzivat z klienta namiesto priameho .from(mv_household_dashboard_summary).';

COMMENT ON FUNCTION public.is_household_member(uuid) IS
  'Vracia true ak prihlaseny user (auth.uid()) je clenom danej domacnosti. Pouzitie v RLS politikach a SECURITY DEFINER guarde.';

COMMENT ON FUNCTION public.is_household_owner_or_admin(uuid) IS
  'Vracia true ak prihlaseny user je owner alebo admin v danej domacnosti.';
