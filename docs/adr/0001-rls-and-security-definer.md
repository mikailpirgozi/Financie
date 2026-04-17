# 0001 — RLS a `SECURITY DEFINER` funkcie

Date: 2026-04-17
Status: Accepted

## Context

Pôvodný stav DB bol netriviálne nebezpečný:

- `household_members` mal `INSERT WITH CHECK (true)` → ktokoľvek
  prihlásený sa mohol pridať do cudzej domácnosti.
- `income_templates` nemala zapnutú RLS.
- `audit_logs` mali `INSERT WITH CHECK (true)` → ktokoľvek mohol
  zapísať audit záznam s ľubovoľným `user_id`.
- Niektoré tabuľky nemali žiadnu DELETE/UPDATE politiku → tichá
  nedostupnosť operácií.
- Viaceré `SECURITY DEFINER` RPC (`get_loans_with_metrics`,
  `count_overdue_installments`, `get_overdue_loans`,
  `get_household_dashboard_summary`, `refresh_*`) bežali s elevated
  právami **bez `auth.uid()` checku** → IDOR.

Materialized views (`loan_metrics`, `mv_household_dashboard_summary`)
nepodporujú RLS priamo — Supabase Postgres ich vystavuje cez
PostgREST a klient by ich mohol čítať bez filtrov.

## Decision

1. **Každá doménová tabuľka má povinne RLS**, vrátane
   `income_templates`. Migrácia
   `20260418100000_security_hardening.sql` to vynucuje.
2. **`household_members.INSERT`** povolený iba ak:
   - `auth.uid() = NEW.user_id` **a zároveň**
   - aktuálny user je `owner` v cieľovom `household_id`, **alebo**
     je to insert pre seba samého ako reakcia na pozvánku
     (server-side cez admin clienta).
3. **Audit log INSERT** povolený iba pre `user_id = auth.uid()`.
4. **Každá `SECURITY DEFINER` funkcia musí mať na začiatku:**
   ```sql
   IF auth.uid() IS NULL THEN
     RAISE EXCEPTION 'Authentication required';
   END IF;
   IF NOT public.is_household_member(auth.uid(), p_household_id) THEN
     RAISE EXCEPTION 'Forbidden';
   END IF;
   ```
   `EXECUTE` práva sú zúžené na `authenticated` rolu (a `service_role`
   pre interné jobs).
5. **Materialized views** sa NEvystavujú priamo. Namiesto toho
   `SECURITY INVOKER` views (`v_loan_metrics`,
   `v_household_dashboard_summary`), ktoré filtrujú výsledok podľa
   `auth.uid()` a `household_members`. Klient číta cez tieto views.

## Consequences

- Žiadny endpoint ani RPC neobíde RLS. Aj keby útočník trafil
  Postgres priamo s ukradnutým JWT, dotyčný má prístup len k svojim
  domácnostiam.
- Server-side jobs (cron, webhook) musia explicitne použiť
  service-role klienta (viď [ADR-0003](./0003-service-role-client.md)),
  inak im RLS všetko zarúti.
- Akákoľvek nová `SECURITY DEFINER` funkcia musí mať guard. Code
  review check-list to vyžaduje.
- Pri pridávaní novej tabuľky **nikdy** nepoužiť `WITH CHECK (true)` —
  reviewer to musí vrátiť.
