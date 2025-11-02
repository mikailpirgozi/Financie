# Fix: Dashboard zobrazuje cudzie dáta novému userovi

## Problém
Nový používateľ po registrácii videl v dashboarde cudzie dáta:
- Zostatok úveru: 673 543 €
- Čistá hodnota: -673 543 €
- Aj keď nemal žiadne vlastné dáta

## Príčina
**Supabase `.in()` bug** v kombinácii s chýbajúcou RLS policy:

1. **Materialized view `loan_metrics`** nepodporuje RLS policies
2. V `apps/web/src/app/api/dashboard/route.ts`:
   ```typescript
   const { data: metrics } = await supabase
     .from('loan_metrics')
     .select('*')
     .in('loan_id', loans?.map(l => l.id) || []);  // ❌ BUG!
   ```
3. **Keď `loans` je prázdne pole, `.in('loan_id', [])` vráti VŠETKY záznamy namiesto žiadnych!**
   - Toto je známy problém v Supabase
   - Bez RLS policies, user vidí dáta zo všetkých domácností

## Riešenie
Pridaný guard check pred queryom `loan_metrics`:

```typescript
// Only query loan_metrics if there are loans
// IMPORTANT: .in('loan_id', []) in Supabase returns ALL records, not zero!
let metrics = null;
if (loans && loans.length > 0) {
  const { data } = await supabase
    .from('loan_metrics')
    .select('*')
    .in('loan_id', loans.map(l => l.id));
  metrics = data;
}
```

## Testovanie
Test vytvoril nového usera a overil dashboard:
- ✅ Zostatok úveru: 0 (predtým 673 543)
- ✅ Čistá hodnota: 0 (predtým -673 543)
- ✅ Žiadne cudzie dáta

## Zmeny
- ✅ Pridaný check `if (loans && loans.length > 0)` pred loan_metrics query
- ✅ Pridaný komentár upozorňujúci na Supabase .in() bug

## Bezpečnostné dopady
- ✅ **CRITICAL FIX** - Users už nevidia cudzie finančné dáta
- ✅ Dodržané GDPR a privacy requirements
- ✅ Žiadne iné `.in([], ...)` volania v kóde

## Aplikované
- Dátum: 2024-11-02
- Tested: ✅ Funguje
- Status: ✅ Fixed

## Poznámka pre budúcnosť
Supabase `.in()` s prázdnym poľom vždy vráti **všetky záznamy**. Vždy kontrolovať:
```typescript
if (array && array.length > 0) {
  // safe to use .in()
}
```

