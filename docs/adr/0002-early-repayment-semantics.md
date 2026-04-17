# 0002 — Predčasné splatenie: penalta z prepaid amount, bez kapitalizácie

Date: 2026-04-17
Status: Accepted

## Context

V `packages/core/src/loan-engine` existovali **dve mierne odlišné
semantiky** predčasného splatenia:

1. `simulator.calculateEarlyRepayment` počítala penaltu zo
   **zostávajúcej istiny** v deň prepayment-u a niekedy ju efektívne
   pripočítala k novej istine pri prepočte schedule-u.
2. `payment-processor.calculateEarlyRepaymentPenalty` /
   `processEarlyRepayment` počítala penaltu z **prepaid amount**
   (sumy ktorú reálne posielame nad rámec splátky) a zaúčtovala ju
   ako cash výdavok, **nie** ako navýšenie istiny.

V praxi to viedlo k rozdielnym výsledkom medzi simulátorom a reálnym
zaúčtovaním → mätúce čísla v UI ("simulácia ukázala X, reálne sa
stalo Y").

EU CCD (Consumer Credit Directive) aj slovenský zákon o spotr.
úveroch interpretujú penaltu ako poplatok **viazaný na predčasne
splatenú sumu** (typicky 0.5–1 % z prepaid amount), nie ako
percento z celkového zostatku. Kapitalizácia penalty by navyše
viedla k úroku z penalty — to je explicitne zakázané.

## Decision

- **Single source of truth:** `calculateEarlyRepaymentPenalty` v
  `payment-processor.ts`.
- `simulator.calculateEarlyRepayment` interne deleguje na ten istý
  helper a generuje len `what-if` schedule.
- Penalta sa vždy:
  - počíta z **prepaid amount** (`min(repaymentAmount, currentBalance)`),
  - vyplatí ako **cash** (zaúčtuje sa do platby ako "fee/penalty"),
  - **nikdy** sa nepripočíta k zostávajúcej istine.
- Doc komenty v oboch súboroch explicitne túto semantiku popisujú,
  aby prípadný refaktor bol upozornený.

## Consequences

- Simulátor a reálne zaúčtovanie vracajú rovnaké čísla → UI je
  konzistentné.
- Compliance s EU/SK reguláciou.
- Pri novom type úveru (napr. balón s čiastočným prepayment-om)
  treba vždy najprv skontrolovať že helper pokrýva edge case-y
  (`repaymentAmount > currentBalance` → cap na balance, žiadna
  záporná penalta).
- Test suite v `packages/core` má lock-in test ktorý overuje že
  penalta NIE JE kapitalizovaná. Reviewer musí tento test brániť.
