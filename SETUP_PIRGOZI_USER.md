# Setup pre pirgozi1@gmail.com

## Krok 1: Otvor Supabase SQL Editor

1. Choď na: https://supabase.com/dashboard/project/agccohbrvpjknlhltqzc/sql/new
2. Alebo: Dashboard → SQL Editor → New query

## Krok 2: Skopíruj a spusti tento SQL

Obsah súboru: `setup-user-with-demo-data.sql`

## Výsledok

Po spustení budeš mať:
- ✅ Household vytvorený
- ✅ 9 kategórií (potraviny, bývanie, doprava, atď.)
- ✅ 4 demo príjmy (mzdy + freelance)
- ✅ 11 demo výdavkov (potraviny, nájom, tankovanie, atď.)
- ✅ 1 demo úver (hypotéka 150 000 EUR)

## Alternatíva: Spustiť cez terminál

Ak máš `psql` a database password:

```bash
psql "postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -f setup-user-with-demo-data.sql
```

