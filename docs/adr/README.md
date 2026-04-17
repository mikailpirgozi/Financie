# Architecture Decision Records (ADR)

Tu žijú "prečo" pre nepriame rozhodnutia. Forma je krátka, ale
explicitná: kontext → rozhodnutie → následky.

## Konvencie

- Číslujeme `NNNN-slug.md` (4 čísla, kebab-case).
- Stav: `Accepted | Superseded | Deprecated`.
- Superseded ADR sa nesmie mazať — pridaj poznámku odkazujúcu na
  nasledovníka.

## Šablóna

```md
# NNNN — Title

Date: YYYY-MM-DD
Status: Accepted

## Context

Čo nás k tomu dotlačilo, aké boli alternatívy, prečo ich neberieme.

## Decision

Konkrétne čo sme sa rozhodli urobiť.

## Consequences

Čo to znamená pre kód, dáta, ops, budúce ADR-ká.
```

## Index

- [0001 — RLS a `SECURITY DEFINER` funkcie](./0001-rls-and-security-definer.md)
- [0002 — Predčasné splatenie: penalta z prepaid amount](./0002-early-repayment-semantics.md)
- [0003 — Service-role Supabase klient ako single helper](./0003-service-role-client.md)
