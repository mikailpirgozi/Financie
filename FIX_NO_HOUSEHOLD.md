# Riešenie problému: Používateľ nemá domácnosť

## Problém
Používateľ vidí prázdnu stránku alebo správu "Žiadna domácnosť" namiesto tlačidiel na pridávanie úverov, výdavkov atď.

## Príčina
Používateľ sa zaregistroval PRED tým, ako bol v databáze vytvorený trigger `handle_new_user_complete()`, ktorý automaticky vytvára household pri registrácii.

## Riešenie

### Krok 1: Spustiť trigger pre budúcich používateľov
```bash
# Pripoj sa k databáze a spusti:
psql -h <DB_HOST> -U postgres -d postgres -f FIX_REGISTRATION.sql
```

### Krok 2: Vytvoriť household pre existujúcich používateľov
```bash
# Spusti skript, ktorý vytvorí household pre všetkých existujúcich používateľov:
psql -h <DB_HOST> -U postgres -d postgres -f CREATE_HOUSEHOLD_FOR_EXISTING_USERS.sql
```

### Alternatíva: Cez Supabase Dashboard

1. Otvor Supabase Dashboard
2. Choď do **SQL Editor**
3. Skopíruj obsah súboru `CREATE_HOUSEHOLD_FOR_EXISTING_USERS.sql`
4. Spusti SQL query
5. Skontroluj výsledok - mali by sa zobraziť všetci používatelia s ich households

### Krok 3: Overiť v aplikácii

1. Obnov stránku v prehliadači (Cmd+R alebo Ctrl+R)
2. Teraz by sa mali zobraziť tlačidlá:
   - ➕ Nový úver
   - ➕ Nový výdavok
   - ➕ Nový príjem
   - atď.

## Overenie

Po spustení skriptov by mal každý používateľ mať:
- ✅ Profil v tabuľke `profiles`
- ✅ Household v tabuľke `households`
- ✅ Záznam v `household_members` s rolou `owner`
- ✅ 8 default kategórií (5 expense, 3 income)

## Poznámky

- Skript je **idempotentný** - môžete ho spustiť viackrát bez problémov
- Nevytvorí duplicitné households pre používateľov, ktorí už nejakú majú
- Pre nových používateľov sa household vytvorí automaticky vďaka triggeru

