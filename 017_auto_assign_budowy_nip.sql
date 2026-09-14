-- 017_auto_assign_budowy_nip.sql
-- Automatyczne przypisywanie bębnów bez NIPu lub ze zleceń budowlanych (WZI, WIO, PZB, 50X-...) do kontrahenta 'BUDOWY'

-- 1. Upewnienie się, że firma 'BUDOWY' istnieje w tabeli companies
INSERT INTO public.companies (nip, name, email, address, market, salesperson_name)
VALUES ('BUDOWY', 'Grupa Eltron - Budowy Własne', 'e.antolak@grupaeltron.pl', 'Białystok', 'Wewnętrzny', 'Dział Budownictwa')
ON CONFLICT (nip) DO UPDATE 
SET 
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  market = EXCLUDED.market,
  salesperson_name = EXCLUDED.salesperson_name;

-- 2. Funkcja wyzwalacza: automatyczne uzupełnianie NIPu 'BUDOWY'
CREATE OR REPLACE FUNCTION public.auto_assign_budowy_nip()
RETURNS TRIGGER AS $$
BEGIN
  -- Jeśli NIP jest pusty lub NULL
  IF NEW.nip IS NULL OR TRIM(NEW.nip) = '' THEN
    NEW.nip := 'BUDOWY';
  END IF;

  -- Jeśli typ dokumentu lub numer wskazuje na zlecenia wewnętrzne/budowlane, a NIP nie został podany
  IF (NEW.typ_dok IN ('WZI', 'WIO', 'PWI', 'KIO', 'WI', 'PZB') 
      OR NEW.pelna_nazwa_kontrahenta ~* '^50[0-9]-[0-9]{2}-[0-9]{2}'
      OR NEW.kontrahent ~* '^50[0-9]-[0-9]{2}-[0-9]{2}')
     AND (NEW.nip IS NULL OR TRIM(NEW.nip) = '' OR NEW.nip = 'BUDOWY') THEN
    NEW.nip := 'BUDOWY';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Utworzenie wyzwalacza przed wstawieniem lub aktualizacją w drums
DROP TRIGGER IF EXISTS trg_auto_assign_budowy_nip ON public.drums;
CREATE TRIGGER trg_auto_assign_budowy_nip
  BEFORE INSERT OR UPDATE ON public.drums
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_budowy_nip();
