-- Dodanie współrzędnych geograficznych do tabel bębnów i zgłoszeń odbioru
ALTER TABLE public.drums ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE public.drums ADD COLUMN IF NOT EXISTS longitude NUMERIC;

ALTER TABLE public.return_requests ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE public.return_requests ADD COLUMN IF NOT EXISTS longitude NUMERIC;
