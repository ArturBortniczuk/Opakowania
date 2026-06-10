-- 1. Utworzenie tabeli cache dla adresów
CREATE TABLE IF NOT EXISTS public.address_coordinates_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT UNIQUE NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  is_manual BOOLEAN DEFAULT false,
  is_not_found BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Odblokowanie dostępu dla administratorów (oraz odczyt dla systemu)
ALTER TABLE public.address_coordinates_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Wszyscy zalogowani odczytują cache" ON public.address_coordinates_cache;
CREATE POLICY "Wszyscy zalogowani odczytują cache" ON public.address_coordinates_cache
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admini zarządzają cachem" ON public.address_coordinates_cache;
CREATE POLICY "Admini zarządzają cachem" ON public.address_coordinates_cache
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Specjalista'))
  );

-- 2. Funkcja Triggera do podmieniania współrzędnych w tabeli drums
CREATE OR REPLACE FUNCTION public.sync_drum_coordinates()
RETURNS TRIGGER AS $$
DECLARE
  cached_record RECORD;
BEGIN
  -- Funkcja wywoływana przed INSERT lub UPDATE na tabeli drums
  -- Uzupełniamy tylko jeśli latitude/longitude są puste (pozostawiamy możliwość ręcznego nadpisania w wyjątkowych sytuacjach)
  
  IF NEW.adres_dostawy IS NOT NULL AND NEW.adres_dostawy <> '' THEN
    -- Szukamy adresu w naszym cache (używamy BTRIM/TRIM by uniknąć błędów ze spacjami na końcu z ERP)
    SELECT latitude, longitude INTO cached_record 
    FROM public.address_coordinates_cache 
    WHERE address = TRIM(NEW.adres_dostawy)
    LIMIT 1;

    -- Jeśli znaleźliśmy i nie jest to null, nadpisujemy
    IF FOUND AND cached_record.latitude IS NOT NULL THEN
      NEW.latitude = cached_record.latitude;
      NEW.longitude = cached_record.longitude;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Podłączenie Triggera
DROP TRIGGER IF EXISTS trigger_sync_drum_coordinates ON public.drums;

CREATE TRIGGER trigger_sync_drum_coordinates
BEFORE INSERT OR UPDATE ON public.drums
FOR EACH ROW
EXECUTE FUNCTION public.sync_drum_coordinates();

-- 4. AWARYJNA NAPRAWA (Backfill): 
-- Zaktualizuj wszystkie obecne bębny w bazie, łącząc je z cachem pomijając białe znaki!
UPDATE public.drums d
SET latitude = c.latitude, longitude = c.longitude
FROM public.address_coordinates_cache c
WHERE TRIM(d.adres_dostawy) = c.address
AND d.latitude IS NULL
AND c.latitude IS NOT NULL;

-- 4. Aktualizacja starych bębnów na podstawie obecnego cache'u
-- (Przydatne, gdy np. ręcznie zaktualizowaliśmy cache, a w drums dane jeszcze się nie podmieniły)
-- Zostanie to obsłużone po stronie aplikacji przez ponowny zapis, lub można wywołać UPDATE drums SET id=id
