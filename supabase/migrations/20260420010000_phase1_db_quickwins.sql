-- =====================================================
-- PHASE 1 — DB QUICK WINS
-- =====================================================
-- Tieto zmeny patria do "performance audit P1" planu:
--   D6: chybajuce FK + indexy na payments(expense_id, income_id)
--   D7: drop pg_notify trigerov ktore nemaju listenera (refresh robi cron)
--   D8: drop redundantneho idx_loan_schedules_status na samotnom (status)
--       (composite (loan_id, status, due_date) ho pokryva pre vsetky queries)
-- =====================================================


-- ---------------------------------------------------------------
-- D6. payments.expense_id / income_id : FK + indexy
-- ---------------------------------------------------------------
-- Pôvodná schéma má len UUID stĺpce bez FK – môžu existovať osirote
-- záznamy. Najprv ich pred FK violation vyčistíme (set NULL keď cieľ
-- neexistuje), potom pridáme FK + index.

UPDATE public.payments p
   SET expense_id = NULL
 WHERE expense_id IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM public.expenses e WHERE e.id = p.expense_id
   );

UPDATE public.payments p
   SET income_id = NULL
 WHERE income_id IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM public.incomes i WHERE i.id = p.income_id
   );

-- FK constraint (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payments_expense_id_fkey'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_expense_id_fkey
      FOREIGN KEY (expense_id) REFERENCES public.expenses(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payments_income_id_fkey'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_income_id_fkey
      FOREIGN KEY (income_id) REFERENCES public.incomes(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Indexy pre rýchly join + RLS lookup
CREATE INDEX IF NOT EXISTS idx_payments_expense_id
  ON public.payments(expense_id)
  WHERE expense_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_income_id
  ON public.payments(income_id)
  WHERE income_id IS NOT NULL;


-- ---------------------------------------------------------------
-- D7. Drop pg_notify dashboard refresh triggers
-- ---------------------------------------------------------------
-- Refresh už robí pg_cron každých 15 minút (refresh_dashboard_summary).
-- Trigger len volal pg_notify('refresh_dashboard', ...) bez listenera,
-- takže pridáva write-latency bez efektu.

DROP TRIGGER IF EXISTS trigger_income_dashboard_refresh ON public.incomes;
DROP TRIGGER IF EXISTS trigger_expense_dashboard_refresh ON public.expenses;
DROP TRIGGER IF EXISTS trigger_loan_dashboard_refresh ON public.loans;
DROP TRIGGER IF EXISTS trigger_asset_dashboard_refresh ON public.assets;

-- Funkciu necháme (môže byť znova použitá ak v budúcnosti pribudne LISTEN klient)
COMMENT ON FUNCTION public.trigger_refresh_dashboard() IS
  'Aktualne nie je naviazany na ziadny trigger (drop v 20260420010000). '
  'Refresh dashboard MV robi pg_cron job refresh-dashboard-summary kazdych 15 min.';


-- ---------------------------------------------------------------
-- D8. Drop redundantneho indexu loan_schedules(status)
-- ---------------------------------------------------------------
-- idx_loan_schedules_status na samotnom (status) je malo selektivny.
-- Composite index idx_loan_schedules_composite (loan_id, status, due_date)
-- z 20241030 ho pokryva pre vsetky relevantne queries
-- (vsetky queries filtruju aj podla loan_id).
--
-- POZN.: 20241030 vytvoril aj IF NOT EXISTS variant na (loan_id, status)
-- s tym istym menom, ten ale uz mal index z initial_schema -> tak ostal
-- na (status). Drop bezpecne odstrani jeden alebo druhy stav.

DROP INDEX IF EXISTS public.idx_loan_schedules_status;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Po aplikacii overte:
--   SELECT tgname, tgrelid::regclass FROM pg_trigger
--    WHERE tgname LIKE '%dashboard_refresh';   -- 0 rows
--   SELECT indexname FROM pg_indexes
--    WHERE tablename = 'loan_schedules';        -- bez idx_loan_schedules_status
--   SELECT conname FROM pg_constraint
--    WHERE conrelid = 'public.payments'::regclass; -- payments_*_fkey
-- =====================================================
