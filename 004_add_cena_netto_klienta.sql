-- Dodanie kolumny cena_netto_klienta do tabeli drums
ALTER TABLE drums ADD COLUMN IF NOT EXISTS cena_netto_klienta NUMERIC;
