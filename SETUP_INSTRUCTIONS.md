# 🚀 Vytvorenie Households - Inštrukcie

## Spusti tento príkaz:

```bash
./setup-households.sh
```

## Čo sa stane:

1. Skript sa opýta na **Database Password**
2. Nájdeš ho tu: https://supabase.com/dashboard/project/agccohbrvpjknlhltqzc/settings/database
3. Skopíruj heslo a vlož ho (text nebude viditeľný pri písaní)
4. Skript vytvorí households pre všetkých používateľov
5. Obnov aplikáciu v prehliadači (Cmd+R)

## Alternatíva: Manuálne cez psql

Ak chceš spustiť príkaz priamo:

```bash
# Nahraď TVOJE_HESLO skutočným heslom
psql "postgresql://postgres:TVOJE_HESLO@db.agccohbrvpjknlhltqzc.supabase.co:5432/postgres" \
  -f CREATE_HOUSEHOLD_FOR_EXISTING_USERS.sql
```

## Kde nájsť heslo?

1. Otvor: https://supabase.com/dashboard/project/agccohbrvpjknlhltqzc/settings/database
2. Klikni na **"Database Password"** sekciu
3. Klikni na **"Reset Database Password"** ak si ho stratil
4. Skopíruj heslo

---

**Pripravený?** Spusti: `./setup-households.sh`

