-- Skrypt dodający kolumnę lokalizacja_wms do tabeli bębnów

ALTER TABLE public.drums
ADD COLUMN IF NOT EXISTS lokalizacja_wms TEXT;
