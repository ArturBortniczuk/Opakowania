-- ==============================================================================
-- KOMPLETNY SKRYPT MIGRACYJNY SUPABASE (V2)
-- Zawiera wszystkie tabele, poprawki, brakujące kolumny i funkcje.
-- Uruchom w Supabase SQL Editor na nowym koncie.
-- ==============================================================================

-- 1. ROZSZERZENIA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABELE GŁÓWNE

CREATE TABLE IF NOT EXISTS public.companies (
  nip VARCHAR(10) PRIMARY KEY,
  name TEXT NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  salesperson_name TEXT,
  market TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.salespeople (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    stanowisko TEXT,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('Dyrektor', 'Kierownik', 'Wsparcie', 'Magazyn', 'Specjalista')),
    market TEXT,
    region TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_first_login BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.client_profiles (
  id SERIAL PRIMARY KEY,
  company_nip VARCHAR(10) NOT NULL REFERENCES public.companies(nip) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.drums (
  id SERIAL PRIMARY KEY,
  kod_bebna VARCHAR(50) NOT NULL,
  nazwa TEXT,
  cecha TEXT,
  rozmiar_bebna TEXT,
  adres_dostawy TEXT,
  nazwa_punktu_dostawy TEXT,
  numer_faktury TEXT,
  data_zwrotu_do_dostawcy DATE,
  kon_dostawca TEXT,
  pelna_nazwa_kontrahenta TEXT,
  nip VARCHAR(10) REFERENCES public.companies(nip) ON DELETE SET NULL,
  typ_dok VARCHAR(50),
  nr_dokumentupz VARCHAR(100),
  data_przyjecia_na_stan DATE,
  kontrahent TEXT,
  status VARCHAR(50),
  cena_netto_bebna TEXT,
  data_wydania DATE,
  lokalizacja_wms TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  UNIQUE (kod_bebna, nip)
);

CREATE TABLE IF NOT EXISTS public.return_requests (
  id SERIAL PRIMARY KEY,
  user_nip VARCHAR(10) REFERENCES public.companies(nip) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  street TEXT NOT NULL,
  postal_code VARCHAR(10) NOT NULL,
  city VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  loading_hours VARCHAR(50) NOT NULL,
  available_equipment TEXT,
  notes TEXT,
  collection_date DATE NOT NULL,
  selected_drums JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'Pending',
  priority VARCHAR(10) DEFAULT 'Normal',
  transport_date DATE,
  correction_number TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  profile_id INTEGER REFERENCES public.client_profiles(id) ON DELETE SET NULL,
  profile_name VARCHAR(255),
  profile_email VARCHAR(255),
  profile_phone VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.custom_return_periods (
  id SERIAL PRIMARY KEY,
  nip VARCHAR(10) UNIQUE NOT NULL REFERENCES public.companies(nip) ON DELETE CASCADE,
  return_period_days INTEGER NOT NULL DEFAULT 85,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.client_drum_notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nip TEXT NOT NULL,
  kod_bebna TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(nip, kod_bebna)
);

CREATE TABLE IF NOT EXISTS public.drum_exceptions (
  id SERIAL PRIMARY KEY,
  kod_bebna VARCHAR(50) NOT NULL,
  nip VARCHAR(10) NOT NULL REFERENCES public.companies(nip) ON DELETE CASCADE,
  exception_type VARCHAR(20) NOT NULL CHECK (exception_type IN ('lost', 'kept')),
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (kod_bebna, nip)
);

CREATE TABLE IF NOT EXISTS public.custom_drum_deadlines (
  id SERIAL PRIMARY KEY,
  kod_bebna VARCHAR(50) NOT NULL,
  nip VARCHAR(10) NOT NULL REFERENCES public.companies(nip) ON DELETE CASCADE,
  custom_return_date DATE NOT NULL,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (kod_bebna, nip)
);

CREATE TABLE IF NOT EXISTS public.supplier_return_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_name text NOT NULL,
  max_days_overdue integer NOT NULL,
  return_percentage numeric NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

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

-- 3. PROFILES (Zintegrowane z Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  nip VARCHAR(10),
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Magazyn', 'Specjalista')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rodo_accepted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. WIDOKI (VIEWS)
CREATE OR REPLACE VIEW public.company_client_stats 
WITH (security_invoker = true) AS
SELECT 
  c.nip,
  c.name,
  c.email,
  c.phone,
  c.address,
  c.created_at,
  c.salesperson_name,
  c.market,
  s.region as salesperson_region,
  COALESCE(d.drums_count, 0)::INTEGER as "drumsCount",
  COALESCE(d.overdue_drums, 0)::INTEGER as "overdueDrums",
  COALESCE(r.pending_requests, 0)::INTEGER as "pendingRequests",
  COALESCE(r.total_requests, 0)::INTEGER as "totalRequests"
FROM public.companies c
LEFT JOIN public.salespeople s ON c.salesperson_name = s.name
LEFT JOIN (
  SELECT 
    nip, 
    COUNT(*)::INTEGER as drums_count,
    COUNT(*) FILTER (
      WHERE COALESCE(data_zwrotu_do_dostawcy, data_wydania + 120) < CURRENT_DATE 
      AND (kontrahent <> 'Nie wydany')
    )::INTEGER as overdue_drums
  FROM public.drums
  GROUP BY nip
) d ON c.nip = d.nip
LEFT JOIN (
  SELECT 
    user_nip, 
    COUNT(*) FILTER (WHERE status = 'Pending')::INTEGER as pending_requests,
    COUNT(*)::INTEGER as total_requests
  FROM public.return_requests
  GROUP BY user_nip
) r ON c.nip = r.user_nip;


-- 5. FUNKCJE I WYZWALACZE (TRIGGERS)

-- A) Helper function do polityk bezpieczeństwa (Omija RLS, działa szybko i bezpiecznie)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- B) Automatyczne dodawanie profili na podstawie rejestracji w auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, name, phone, company_name, nip, role, status, rodo_accepted
  ) VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', ''),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    COALESCE(new.raw_user_meta_data->>'companyName', ''),
    COALESCE(new.raw_user_meta_data->>'nip', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'client'),
    COALESCE(new.raw_user_meta_data->>'status', 'pending'),
    COALESCE((new.raw_user_meta_data->>'rodoAccepted')::boolean, false)
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    company_name = EXCLUDED.company_name,
    nip = EXCLUDED.nip,
    role = EXCLUDED.role,
    status = EXCLUDED.status;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- C) Synchronizacja koordynatów dla bębnów z cache (Geocoding)
CREATE OR REPLACE FUNCTION public.sync_drum_coordinates()
RETURNS TRIGGER AS $$
DECLARE
  cached_record RECORD;
BEGIN
  IF NEW.adres_dostawy IS NOT NULL AND NEW.adres_dostawy <> '' THEN
    SELECT latitude, longitude INTO cached_record 
    FROM public.address_coordinates_cache 
    WHERE address = TRIM(NEW.adres_dostawy)
    LIMIT 1;

    IF FOUND AND cached_record.latitude IS NOT NULL THEN
      NEW.latitude = cached_record.latitude;
      NEW.longitude = cached_record.longitude;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_drum_coordinates ON public.drums;
CREATE TRIGGER trigger_sync_drum_coordinates
BEFORE INSERT OR UPDATE ON public.drums
FOR EACH ROW EXECUTE FUNCTION public.sync_drum_coordinates();


-- 6. POLITYKI BEZPIECZEŃSTWA (RLS - Row Level Security)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salespeople ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_return_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_drum_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drum_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_drum_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_return_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.address_coordinates_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6.1. PROFILE
CREATE POLICY "Użytkownik odczytuje własny profil" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admin i pracownicy odczytują wszystkie profile" ON public.profiles FOR SELECT USING (public.get_my_role() IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Specjalista'));
CREATE POLICY "Zezwól na rejestrację profilu" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id AND role = 'client');
CREATE POLICY "Użytkownik aktualizuje własny profil" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin i pracownicy zarządzają profilami" ON public.profiles FOR ALL USING (public.get_my_role() IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Specjalista'));

-- 6.2. FIRMY (Pełen dostęp dla aplikacji klienckiej wg najnowszych fixów)
CREATE POLICY "Zarządzanie firmami dla wszystkich" ON public.companies FOR ALL USING (true) WITH CHECK (true);

-- 6.3. HANDLOWCY
CREATE POLICY "Pracownicy odczytują handlowców" ON public.salespeople FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin zarządza handlowcami" ON public.salespeople FOR ALL USING (public.get_my_role() IN ('admin', 'supervisor'));

-- 6.4. BĘBNY
CREATE POLICY "Klient odczytuje swoje bębny" ON public.drums FOR SELECT USING (nip = (SELECT nip FROM public.profiles WHERE id = auth.uid() AND status = 'approved'));
CREATE POLICY "Klient aktualizuje swoje bębny" ON public.drums FOR UPDATE USING (nip = (SELECT nip FROM public.profiles WHERE id = auth.uid() AND status = 'approved'));
CREATE POLICY "Admin i pracownicy zarządzają bębnami" ON public.drums FOR ALL USING (public.get_my_role() IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Specjalista'));

-- 6.5. ZGŁOSZENIA ZWROTÓW (RETURN REQUESTS)
CREATE POLICY "Klient odczytuje swoje zwroty" ON public.return_requests FOR SELECT USING (user_nip = (SELECT nip FROM public.profiles WHERE id = auth.uid() AND status = 'approved'));
CREATE POLICY "Klient dodaje zgłoszenie zwrotu" ON public.return_requests FOR INSERT WITH CHECK (user_nip = (SELECT nip FROM public.profiles WHERE id = auth.uid() AND status = 'approved'));
CREATE POLICY "Admin i pracownicy zarządzają zgłoszeniami" ON public.return_requests FOR ALL USING (public.get_my_role() IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Specjalista'));

-- 6.6. PROFILE PRACOWNIKÓW KLIENTÓW
CREATE POLICY "Zarządzanie profilami dla wszystkich" ON public.client_profiles FOR ALL USING (true) WITH CHECK (true);

-- 6.7. NIESTANDARDOWE OKRESY ZWROTU
CREATE POLICY "Zarządzanie okresami dla wszystkich" ON public.custom_return_periods FOR ALL USING (true) WITH CHECK (true);

-- 6.8. NOTATKI DO BĘBNÓW
CREATE POLICY "Dostęp dla autoryzowanych" ON public.client_drum_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.9. WYJĄTKI BĘBNÓW (Zagubione/Zatrzymane)
CREATE POLICY "Zarządzanie wyjątkami dla wszystkich" ON public.drum_exceptions FOR ALL USING (true) WITH CHECK (true);

-- 6.10. NIESTANDARDOWE TERMINY ZWROTU
CREATE POLICY "Zarządzanie terminami dla wszystkich" ON public.custom_drum_deadlines FOR ALL USING (true) WITH CHECK (true);

-- 6.11. ZASADY ZWROTÓW DOSTAWCÓW
CREATE POLICY "Każdy odczytuje zasady zwrotów dostawców" ON public.supplier_return_rules FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin zarządza zasadami zwrotów dostawców" ON public.supplier_return_rules FOR ALL USING (public.get_my_role() IN ('admin', 'supervisor'));

-- 6.12. CACHE GEOLOKALIZACJI
CREATE POLICY "Wszyscy zalogowani odczytują cache" ON public.address_coordinates_cache FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admini zarządzają cachem" ON public.address_coordinates_cache FOR ALL USING (public.get_my_role() IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Specjalista'));


-- 7. INICJALIZACJA DANYCH (Handlowcy, Zasady dostawców, Konta)

-- Zasady NKT
INSERT INTO public.supplier_return_rules (supplier_name, max_days_overdue, return_percentage) VALUES 
('NKT', 0, 100),
('NKT', 30, 75),
('NKT', 60, 50);

-- Handlowcy (Eltron123!)
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES 
('Mateusz Kalinowski', 'Dyrektor ds. Kluczowych Klientów', 'm.kalinowski@grupaeltron.pl', '8 8 5   8 5 1   2 2 3', 'Dyrektor', 'Podlaski', 'Wszystkie', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96'),
('Paweł Rogowski', 'Kierownik Rynku Podlaskiego', 'p.rogowski@grupaeltron.pl', '7 8 5   8 8 0   2 0 0', 'Kierownik', 'Podlaski', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96'),
('Krzysztof Zarzecki', 'Dyrektor ds. Inwestycji Infrastrukturalnych', 'k.zarzecki@grupaeltron.pl', '5 0 5   0 2 4   5 1 7', 'Dyrektor', 'Podlaski', 'Wszystkie', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96'),
('Paulina Lewkowicz', 'Specjalistka ds. Inwestycji Infrastrukturalnych', 'p.lewkowicz@grupaeltron.pl', '8 8 7 9 7 1 7 1 5', 'Wsparcie', 'Podlaski', 'Wszystkie', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96'),
('Mateusz Magnuszewski', 'Specjalista ds. Techniczno - Handlowych', 'm.magnuszewski@grupaeltron.pl', '8 8 5   5 6 0   8 1 2', 'Specjalista', 'Podlaski', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96'),
('Karol Kulesza', 'Specjalista ds. Techniczno - Handlowych', 'k.kulesza@grupaeltron.pl', '8 8 5 5 0 2 9 4 1', 'Specjalista', 'Podlaski', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96'),
('Paulina Walejewska', 'Główna Specjalistka ds. Wsparcia Sprzedaży', 'handelpodlaski@grupaeltron.pl', '6 0 7   1 5 2   3 3 6', 'Wsparcie', 'Podlaski', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96'),
('Bartłomiej Klimaszewski', 'Specjalista ds. Techniczno - Handlowych', 'b.klimaszewski@grupaeltron.pl', '6 0 9   9 9 8   6 3 0', 'Specjalista', 'Podlaski', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96'),
('Aneta Wasilewska', 'Specjalistka ds. Wsparcia Sprzedaży', 'a.wasilewska@grupaeltron.pl', '8 8 5   8 5 1   2 7 0', 'Wsparcie', 'Podlaski', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96'),
('Karol Rzepniewski', 'Kierownik Rynku Mazowieckiego', 'k.rzepniewski@grupaeltron.pl', '6 0 7   1 5 1   3 9 2', 'Kierownik', 'Mazowiecki', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96'),
('Michał Berliński', 'Specjalista ds. Techniczno - Handlowych', 'm.berlinski@grupaeltron.pl', '6 9 1 1 1 3 7 4 2', 'Specjalista', 'Mazowiecki', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96'),
('Justyna Zaleska', 'Specjalistka ds. Wsparcia Sprzedaży', 'handelmazowiecki@grupaeltron.pl', '6 6 1   6 1 3   2 9 9', 'Wsparcie', 'Mazowiecki', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96'),
('Marcin Misztela', 'Specjalista ds. Techniczno - Handlowych', 'm.misztela@grupaeltron.pl', '6 6 7   8 0 0   7 3 1', 'Specjalista', 'Mazowiecki', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96'),
('Mariusz Tryc', 'Specjalista ds. Techniczno - Handlowych', 'm.tryc@grupaeltron.pl', '6 0 9 8 8 0 3 3 1', 'Specjalista', 'Mazowiecki', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96'),
('Maciej Durajczyk', 'Dyrektor Sprzedaży Regionalnej - Region Północ', 'm.durajczyk@grupaeltron.pl', '6 9 1   2 2 7   2 8 0', 'Dyrektor', 'Pomorski', 'Północ', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96'),
('Wojciech Paździorko', 'Kierownik Rynku Pomorskiego', 'w.pazdziorko@grupaeltron.pl', '8 8 7 6 5 0 7 2 4', 'Kierownik', 'Pomorski', 'Północ', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96'),
('Joanna Drewing', 'Specjalistka ds. Wsparcia Sprzedaży', 'handelpomorski@grupaeltron.pl', '6 9 1 1 1 9 3 3 6', 'Wsparcie', 'Pomorski', 'Północ', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96'),
('Mikołaj Jędrzejczak', 'Specjalista ds. Techniczno - Handlowych', 'm.jedrzejczak@grupaeltron.pl', '6 9 1 6 7 0 6 1 1', 'Specjalista', 'Pomorski', 'Północ', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96'),
('Mikołaj Sadowczyk', 'Kierownik Rynku Wielkopolskiego', 'm.sadowczyk@grupaeltron.pl', '8 8 5 5 6 1 3 2 1', 'Kierownik', 'Wielkopolski', 'Północ', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96'),
('Błażej Maroń', 'Specjalista ds. Techniczno - Handlowych', 'b.maron@grupaeltron.pl', '6 9 1 3 6 0 9 6 6', 'Specjalista', 'Wielkopolski', 'Północ', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96'),
('Roksana Namyślak', 'Specjalistka ds. Wsparcia Sprzedaży', 'handelwielkopolski@grupaeltron.pl', '6 0 7   1 2 6   9 4 3', 'Wsparcie', 'Wielkopolski', 'Północ', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96'),
('Łukasz Wasak', 'Dyrektor Sprzedaży Regionalnej - Region Południe', 'l.wasak@grupaeltron.pl', '6 9 1 6 7 0 6 0 8', 'Dyrektor', 'Lubelski', 'Południe', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96'),
('Adrian Chotyniec', 'Kierownik Rynku Lubelskiego', 'a.chotyniec@grupaeltron.pl', '8 8 5   2 2 0   1 7 7', 'Kierownik', 'Lubelski', 'Południe', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96'),
('Barbara Chrzanowska', 'Specjalistka ds. Wsparcia Sprzedaży', 'handellubelski@grupaeltron.pl', '6 0 7   1 5 0   5 1 0', 'Wsparcie', 'Lubelski', 'Południe', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96'),
('Przemysław Ziętek', 'Specjalista ds. Techniczno - Handlowych', 'p.zietek@grupaeltron.pl', '6 0 9 8 8 1 0 1 9', 'Specjalista', 'Lubelski', 'Południe', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96'),
('Marcin Szafraniec', 'Kierownik Rynku Małopolskiego', 'm.szafraniec@grupaeltron.pl', '8 8 5   5 0 2   9 4 0', 'Kierownik', 'Małopolski', 'Południe', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96'),
('Monika Ładniak - Kamińska', 'Specjalistka ds. Wsparcia Sprzedaży', 'handelmalopolski@grupaeltron.pl', '8 8 7   1 3 3   7 3 0', 'Wsparcie', 'Małopolski', 'Południe', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96'),
('Mariusz Szafrański', 'Specjalista ds. Techniczno - Handlowych', 'm.szafranski@grupaeltron.pl', '6 9 5   8 8 3   0 2 5', 'Specjalista', 'Małopolski', 'Południe', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96'),
('Grzegorz Górny', 'Kierownik Rynku Śląskiego', 'g.gorny@grupaeltron.pl', '6 0 9   7 7 4   1 1 3', 'Kierownik', 'Śląski', 'Śląsk', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96'),
('Łukasz Korgul', 'Kierownik Rynku Dolnośląskiego', 'l.korgul@grupaeltron.pl', '6 0 7   1 5 3   5 7 8', 'Kierownik', 'Dolnośląski', 'Śląsk', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96'),
('Joanna Gabryś', 'Specjalistka ds. Wsparcia Sprzedaży', 'handeldolnoslaski@grupaeltron.pl', '6 6 7 8 0 1 0 1 0', 'Wsparcie', 'Dolnośląski', 'Śląsk', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96'),
('Maksymilian Bala', 'Specjalista ds. Techniczno - Handlowych', 'm.bala@grupaeltron.pl', '6 6 7   8 0 2   1 1 2', 'Specjalista', 'Dolnośląski', 'Śląsk', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96')
ON CONFLICT (name) DO NOTHING;

-- Tworzenie użytkowników w auth.users
DO $$
DECLARE
    default_password text := crypt('Magazyn2026!', gen_salt('bf'));
BEGIN
    -- Użytkownicy magazynu
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'm.baginski@grupaeltron.pl') THEN
        INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) 
        VALUES (gen_random_uuid(), 'authenticated', 'authenticated', 'm.baginski@grupaeltron.pl', default_password, now(), '{"provider":"email","providers":["email"]}', '{"name":"Mateusz Bagiński", "role":"Specjalista", "status":"approved", "department":"Magazyn"}', now(), now());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'm.pawlak@grupaeltron.pl') THEN
        INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) 
        VALUES (gen_random_uuid(), 'authenticated', 'authenticated', 'm.pawlak@grupaeltron.pl', default_password, now(), '{"provider":"email","providers":["email"]}', '{"name":"Marcin Pawlak", "role":"Specjalista", "status":"approved", "department":"Magazyn"}', now(), now());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'm.borkowski@grupaeltron.pl') THEN
        INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) 
        VALUES (gen_random_uuid(), 'authenticated', 'authenticated', 'm.borkowski@grupaeltron.pl', default_password, now(), '{"provider":"email","providers":["email"]}', '{"name":"Michał Borkowski", "role":"Specjalista", "status":"approved", "department":"Magazyn"}', now(), now());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'k.gryka@grupaeltron.pl') THEN
        INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) 
        VALUES (gen_random_uuid(), 'authenticated', 'authenticated', 'k.gryka@grupaeltron.pl', default_password, now(), '{"provider":"email","providers":["email"]}', '{"name":"Kamil Gryka", "role":"Specjalista", "status":"approved", "department":"Magazyn"}', now(), now());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'p.opolski@grupaeltron.pl') THEN
        INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) 
        VALUES (gen_random_uuid(), 'authenticated', 'authenticated', 'p.opolski@grupaeltron.pl', default_password, now(), '{"provider":"email","providers":["email"]}', '{"name":"Paweł Opolski", "role":"Specjalista", "status":"approved", "department":"Magazyn"}', now(), now());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'mateusz.klewinowski@grupaeltron.pl') THEN
        INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) 
        VALUES (gen_random_uuid(), 'authenticated', 'authenticated', 'mateusz.klewinowski@grupaeltron.pl', default_password, now(), '{"provider":"email","providers":["email"]}', '{"name":"Mateusz Klewinowski", "role":"Specjalista", "status":"approved", "department":"Magazyn"}', now(), now());
    END IF;
    
    -- Administratorzy główni
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'a.bortniczuk@grupaeltron.pl') THEN
        INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) 
        VALUES (gen_random_uuid(), 'authenticated', 'authenticated', 'a.bortniczuk@grupaeltron.pl', default_password, now(), '{"provider":"email","providers":["email"]}', '{"name":"Artur Bortniczuk", "role":"admin", "status":"approved", "rodoAccepted":true}', now(), now());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'p.blazewicz@grupaeltron.pl') THEN
        INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) 
        VALUES (gen_random_uuid(), 'authenticated', 'authenticated', 'p.blazewicz@grupaeltron.pl', default_password, now(), '{"provider":"email","providers":["email"]}', '{"name":"P. Błażewicz", "role":"admin", "status":"approved", "rodoAccepted":true}', now(), now());
    END IF;
END $$;

-- Migracja wstawionych Handlowców do auth.users
INSERT INTO auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
SELECT 
  gen_random_uuid(), 'authenticated', 'authenticated', s.email, s.password_hash, CURRENT_TIMESTAMP,
  jsonb_build_object('provider', 'email', 'providers', array['email']),
  jsonb_build_object('name', s.name, 'role', s.role, 'status', 'approved', 'phone', COALESCE(s.phone, '')),
  s.created_at, CURRENT_TIMESTAMP
FROM public.salespeople s
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.email = s.email
);

-- Przeładowanie API by nowe struktury i polityki weszły w życie
NOTIFY pgrst, 'reload schema';
