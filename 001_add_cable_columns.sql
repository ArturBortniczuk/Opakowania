-- Skrypt dodający nowe kolumny kablowe do bazy Supabase
-- Uruchom ten skrypt w Supabase SQL Editor w swoim projekcie

ALTER TABLE public.drums
ADD COLUMN IF NOT EXISTS nawiniety_kabel TEXT,
ADD COLUMN IF NOT EXISTS ilosc_kabla TEXT,
ADD COLUMN IF NOT EXISTS czy_zaplacona VARCHAR(50),
ADD COLUMN IF NOT EXISTS termin_platnosci TEXT;

-- Przeładowanie API by nowe struktury i kolumny weszły w życie
NOTIFY pgrst, 'reload schema';
