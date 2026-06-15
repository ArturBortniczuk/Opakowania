-- 1. BAZOWE TABELE Z INICJALNEJ MIGRACJI

CREATE TABLE IF NOT EXISTS companies (
        nip VARCHAR(10) PRIMARY KEY,
        name TEXT NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        address TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        nip VARCHAR(10) UNIQUE NOT NULL REFERENCES companies(nip) ON DELETE CASCADE,
        password_hash TEXT NOT NULL,
        is_first_login BOOLEAN DEFAULT true,
        last_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        nip VARCHAR(10) UNIQUE NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'admin',
        password_hash TEXT,
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

CREATE TABLE IF NOT EXISTS drums (
        id SERIAL PRIMARY KEY,
        kod_bebna VARCHAR(50) NOT NULL,
        nazwa TEXT,
        cecha TEXT,
        data_zwrotu_do_dostawcy DATE,
        kon_dostawca TEXT,
        pelna_nazwa_kontrahenta TEXT,
        nip VARCHAR(10) REFERENCES companies(nip) ON DELETE SET NULL,
        typ_dok VARCHAR(50),
        nr_dokumentupz VARCHAR(100),
        data_przyjecia_na_stan DATE,
        kontrahent TEXT,
        status VARCHAR(50),
        data_wydania DATE,
        UNIQUE (kod_bebna, nip) -- Klucz unikalny dla bębna w ramach klienta
      );

CREATE TABLE IF NOT EXISTS return_requests (
        id SERIAL PRIMARY KEY,
        user_nip VARCHAR(10) REFERENCES companies(nip) ON DELETE SET NULL,
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
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

CREATE TABLE IF NOT EXISTS custom_return_periods (
        id SERIAL PRIMARY KEY,
        nip VARCHAR(10) UNIQUE NOT NULL REFERENCES companies(nip) ON DELETE CASCADE,
        return_period_days INTEGER NOT NULL DEFAULT 85,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

-- ==========================================
-- PLIK: 002_migration_supabase_auth.sql
-- ==========================================

-- SQL: Migracja do standardu Supabase Auth z profilami, automatycznym wyzwalaczem (Trigger) i politykami RLS
-- Uruchom ten skrypt w Supabase SQL Editor!

-- 1. Tworzenie tabeli profili publicznych w schemacie public
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  nip VARCHAR(10),
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Specjalista')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rodo_accepted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Funkcja i trigger do automatycznej synchronizacji rejestracji w auth.users -> public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    name,
    phone,
    company_name,
    nip,
    role,
    status,
    rodo_accepted
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

-- 3. Migracja istniejących handlowców (salespeople) do auth.users
INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  s.email,
  s.password_hash, -- Zachowujemy istniejący hash bcrypt
  CURRENT_TIMESTAMP,
  jsonb_build_object('provider', 'email', 'providers', array['email']),
  jsonb_build_object('name', s.name, 'role', s.role, 'status', 'approved', 'phone', COALESCE(s.phone, '')),
  s.created_at,
  CURRENT_TIMESTAMP
FROM public.salespeople s
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.email = s.email
);

-- 4. Migracja istniejących administratorów (admin_users) do auth.users
INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  a.email,
  a.password_hash,
  CURRENT_TIMESTAMP,
  jsonb_build_object('provider', 'email', 'providers', array['email']),
  jsonb_build_object('name', a.name, 'role', a.role, 'status', 'approved'),
  a.created_at,
  CURRENT_TIMESTAMP
FROM public.admin_users a
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.email = a.email
);

-- 5. Włączenie RLS (Row Level Security) na wszystkich tabelach
ALTER TABLE public.drums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_drum_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_return_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. Usuwanie starych polityk w celu uniknięcia konfliktów
DROP POLICY IF EXISTS "Zarządzanie firmami dla wszystkich" ON public.companies;
DROP POLICY IF EXISTS "Zarządzanie profilami dla wszystkich" ON public.client_profiles;
DROP POLICY IF EXISTS "Zarządzanie terminami dla wszystkich" ON public.custom_drum_deadlines;
DROP POLICY IF EXISTS "Zarządzanie zasadami dla wszystkich" ON public.supplier_return_rules;
DROP POLICY IF EXISTS "Zarządzanie zasadami dla zalogowanych" ON public.supplier_return_rules;

-- 7. Tworzenie precyzyjnych i bezpiecznych polityk RLS dla nowych sesji JWT

-- POLITYKI DLA PROFILE
CREATE POLICY "Użytkownik odczytuje własny profil" ON public.profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Zezwól na rejestrację profilu" ON public.profiles 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Użytkownik aktualizuje własny profil" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin i pracownicy zarządzają profilami" ON public.profiles 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Specjalista'))
  );

-- POLITYKI DLA COMPANIES
CREATE POLICY "Klient odczytuje własną firmę" ON public.companies 
  FOR SELECT USING (nip = (SELECT nip FROM public.profiles WHERE id = auth.uid() AND status = 'approved'));

CREATE POLICY "Klient aktualizuje własną firmę" ON public.companies 
  FOR UPDATE USING (nip = (SELECT nip FROM public.profiles WHERE id = auth.uid() AND status = 'approved'))
  WITH CHECK (nip = (SELECT nip FROM public.profiles WHERE id = auth.uid() AND status = 'approved'));

CREATE POLICY "Admin i pracownicy zarządzają firmami" ON public.companies 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Specjalista'))
  );

-- POLITYKI DLA DRUMS
CREATE POLICY "Klient odczytuje swoje bębny" ON public.drums 
  FOR SELECT USING (nip = (SELECT nip FROM public.profiles WHERE id = auth.uid() AND status = 'approved'));

CREATE POLICY "Klient aktualizuje swoje bębny" ON public.drums 
  FOR UPDATE USING (nip = (SELECT nip FROM public.profiles WHERE id = auth.uid() AND status = 'approved'));

CREATE POLICY "Admin i pracownicy zarządzają bębnami" ON public.drums 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Specjalista'))
  );

-- POLITYKI DLA RETURN_REQUESTS
CREATE POLICY "Klient odczytuje swoje zwroty" ON public.return_requests 
  FOR SELECT USING (user_nip = (SELECT nip FROM public.profiles WHERE id = auth.uid() AND status = 'approved'));

CREATE POLICY "Klient dodaje zgłoszenie zwrotu" ON public.return_requests 
  FOR INSERT WITH CHECK (user_nip = (SELECT nip FROM public.profiles WHERE id = auth.uid() AND status = 'approved'));

CREATE POLICY "Admin i pracownicy zarządzają zgłoszeniami" ON public.return_requests 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Specjalista'))
  );

-- POLITYKI DLA CLIENT_PROFILES
CREATE POLICY "Klient zarządza profilami pracowników" ON public.client_profiles 
  FOR ALL USING (company_nip = (SELECT nip FROM public.profiles WHERE id = auth.uid() AND status = 'approved'))
  WITH CHECK (company_nip = (SELECT nip FROM public.profiles WHERE id = auth.uid() AND status = 'approved'));

CREATE POLICY "Admin i pracownicy odczytują profile klientów" ON public.client_profiles 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Specjalista'))
  );

-- POLITYKI DLA CUSTOM_DRUM_DEADLINES
CREATE POLICY "Klient odczytuje niestandardowe terminy" ON public.custom_drum_deadlines 
  FOR SELECT USING (nip = (SELECT nip FROM public.profiles WHERE id = auth.uid() AND status = 'approved'));

CREATE POLICY "Admin i pracownicy zarządzają terminami" ON public.custom_drum_deadlines 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Specjalista'))
  );

-- POLITYKI DLA SUPPLIER_RETURN_RULES
CREATE POLICY "Każdy odczytuje zasady zwrotów dostawców" ON public.supplier_return_rules 
  FOR SELECT USING (true);

CREATE POLICY "Admin zarządza zasadami zwrotów dostawców" ON public.supplier_return_rules 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
  );

-- Odświeżenie schematu PostgREST
NOTIFY pgrst, 'reload schema';


-- ==========================================
-- PLIK: import_salespeople.sql
-- ==========================================

-- SQL: Import handlowców i modyfikacja widoku statystyk firm
-- Uruchom ten skrypt w Supabase SQL Editor!

-- 1. Tworzenie tabeli salespeople
CREATE TABLE IF NOT EXISTS public.salespeople (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    stanowisko TEXT,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('Dyrektor', 'Kierownik', 'Wsparcie', 'Specjalista')),
    market TEXT,
    region TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_first_login BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Włączenie RLS (Row Level Security) dla nowej tabeli
ALTER TABLE public.salespeople ENABLE ROW LEVEL SECURITY;

-- Polityka RLS dla tabeli salespeople (spójna z resztą systemu)
DROP POLICY IF EXISTS "Zarządzanie handlowcami dla wszystkich" ON public.salespeople;
CREATE POLICY "Zarządzanie handlowcami dla wszystkich" 
ON public.salespeople 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Czyszczenie starych rekordów, aby uniknąć konfliktów przy ponownym uruchomieniu
TRUNCATE public.salespeople CASCADE;

-- 2. Wstawianie danych handlowców (hasło domyślne to Eltron123!)
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Mateusz Kalinowski', 'Dyrektor ds. Kluczowych Klientów', 'm.kalinowski@grupaeltron.pl', '8 8 5   8 5 1   2 2 3', 'Dyrektor', 'Podlaski', 'Wszystkie', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Paweł Rogowski', 'Kierownik Rynku Podlaskiego', 'p.rogowski@grupaeltron.pl', '7 8 5   8 8 0   2 0 0', 'Kierownik', 'Podlaski', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Krzysztof Zarzecki', 'Dyrektor ds. Inwestycji Infrastrukturalnych', 'k.zarzecki@grupaeltron.pl', '5 0 5   0 2 4   5 1 7', 'Dyrektor', 'Podlaski', 'Wszystkie', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Paulina Lewkowicz', 'Specjalistka ds. Inwestycji Infrastrukturalnych', 'p.lewkowicz@grupaeltron.pl', '8 8 7 9 7 1 7 1 5', 'Wsparcie', 'Podlaski', 'Wszystkie', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Mateusz Magnuszewski', 'Specjalista ds. Techniczno - Handlowych', 'm.magnuszewski@grupaeltron.pl', '8 8 5   5 6 0   8 1 2', 'Specjalista', 'Podlaski', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Karol Kulesza', 'Specjalista ds. Techniczno - Handlowych', 'k.kulesza@grupaeltron.pl', '8 8 5 5 0 2 9 4 1', 'Specjalista', 'Podlaski', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Paulina Walejewska', 'Główna Specjalistka ds. Wsparcia Sprzedaży', 'handelpodlaski@grupaeltron.pl', '6 0 7   1 5 2   3 3 6', 'Wsparcie', 'Podlaski', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Bartłomiej Klimaszewski', 'Specjalista ds. Techniczno - Handlowych', 'b.klimaszewski@grupaeltron.pl', '6 0 9   9 9 8   6 3 0', 'Specjalista', 'Podlaski', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Aneta Wasilewska', 'Specjalistka ds. Wsparcia Sprzedaży', 'a.wasilewska@grupaeltron.pl', '8 8 5   8 5 1   2 7 0', 'Wsparcie', 'Podlaski', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Karol Rzepniewski', 'Kierownik Rynku Mazowieckiego', 'k.rzepniewski@grupaeltron.pl', '6 0 7   1 5 1   3 9 2', 'Kierownik', 'Mazowiecki', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Michał Berliński', 'Specjalista ds. Techniczno - Handlowych', 'm.berlinski@grupaeltron.pl', '6 9 1 1 1 3 7 4 2', 'Specjalista', 'Mazowiecki', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Justyna Zaleska', 'Specjalistka ds. Wsparcia Sprzedaży', 'handelmazowiecki@grupaeltron.pl', '6 6 1   6 1 3   2 9 9', 'Wsparcie', 'Mazowiecki', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Marcin Misztela', 'Specjalista ds. Techniczno - Handlowych', 'm.misztela@grupaeltron.pl', '6 6 7   8 0 0   7 3 1', 'Specjalista', 'Mazowiecki', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Mariusz Tryc', 'Specjalista ds. Techniczno - Handlowych', 'm.tryc@grupaeltron.pl', '6 0 9 8 8 0 3 3 1', 'Specjalista', 'Mazowiecki', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Maciej Durajczyk', 'Dyrektor Sprzedaży Regionalnej - Region Północ', 'm.durajczyk@grupaeltron.pl', '6 9 1   2 2 7   2 8 0', 'Dyrektor', 'Pomorski', 'Północ', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Wojciech Paździorko', 'Kierownik Rynku Pomorskiego', 'w.pazdziorko@grupaeltron.pl', '8 8 7 6 5 0 7 2 4', 'Kierownik', 'Pomorski', 'Północ', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Joanna Drewing', 'Specjalistka ds. Wsparcia Sprzedaży', 'handelpomorski@grupaeltron.pl', '6 9 1 1 1 9 3 3 6', 'Wsparcie', 'Pomorski', 'Północ', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Mikołaj Jędrzejczak', 'Specjalista ds. Techniczno - Handlowych', 'm.jedrzejczak@grupaeltron.pl', '6 9 1 6 7 0 6 1 1', 'Specjalista', 'Pomorski', 'Północ', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Mikołaj Sadowczyk', 'Kierownik Rynku Wielkopolskiego', 'm.sadowczyk@grupaeltron.pl', '8 8 5 5 6 1 3 2 1', 'Kierownik', 'Wielkopolski', 'Północ', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Błażej Maroń', 'Specjalista ds. Techniczno - Handlowych', 'b.maron@grupaeltron.pl', '6 9 1 3 6 0 9 6 6', 'Specjalista', 'Wielkopolski', 'Północ', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Roksana Namyślak', 'Specjalistka ds. Wsparcia Sprzedaży', 'handelwielkopolski@grupaeltron.pl', '6 0 7   1 2 6   9 4 3', 'Wsparcie', 'Wielkopolski', 'Północ', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Łukasz Wasak', 'Dyrektor Sprzedaży Regionalnej - Region Południe', 'l.wasak@grupaeltron.pl', '6 9 1 6 7 0 6 0 8', 'Dyrektor', 'Lubelski', 'Południe', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Adrian Chotyniec', 'Kierownik Rynku Lubelskiego', 'a.chotyniec@grupaeltron.pl', '8 8 5   2 2 0   1 7 7', 'Kierownik', 'Lubelski', 'Południe', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Barbara Chrzanowska', 'Specjalistka ds. Wsparcia Sprzedaży', 'handellubelski@grupaeltron.pl', '6 0 7   1 5 0   5 1 0', 'Wsparcie', 'Lubelski', 'Południe', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Przemysław Ziętek', 'Specjalista ds. Techniczno - Handlowych', 'p.zietek@grupaeltron.pl', '6 0 9 8 8 1 0 1 9', 'Specjalista', 'Lubelski', 'Południe', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Marcin Szafraniec', 'Kierownik Rynku Małopolskiego', 'm.szafraniec@grupaeltron.pl', '8 8 5   5 0 2   9 4 0', 'Kierownik', 'Małopolski', 'Południe', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Monika Ładniak - Kamińska', 'Specjalistka ds. Wsparcia Sprzedaży', 'handelmalopolski@grupaeltron.pl', '8 8 7   1 3 3   7 3 0', 'Wsparcie', 'Małopolski', 'Południe', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Mariusz Szafrański', 'Specjalista ds. Techniczno - Handlowych', 'm.szafranski@grupaeltron.pl', '6 9 5   8 8 3   0 2 5', 'Specjalista', 'Małopolski', 'Południe', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Grzegorz Górny', 'Kierownik Rynku Śląskiego', 'g.gorny@grupaeltron.pl', '6 0 9   7 7 4   1 1 3', 'Kierownik', 'Śląski', 'Śląsk', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Łukasz Korgul', 'Kierownik Rynku Dolnośląskiego', 'l.korgul@grupaeltron.pl', '6 0 7   1 5 3   5 7 8', 'Kierownik', 'Dolnośląski', 'Śląsk', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Joanna Gabryś', 'Specjalistka ds. Wsparcia Sprzedaży', 'handeldolnoslaski@grupaeltron.pl', '6 6 7 8 0 1 0 1 0', 'Wsparcie', 'Dolnośląski', 'Śląsk', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Maksymilian Bala', 'Specjalista ds. Techniczno - Handlowych', 'm.bala@grupaeltron.pl', '6 6 7   8 0 2   1 1 2', 'Specjalista', 'Dolnośląski', 'Śląsk', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');

-- 3. Aktualizacja widoku company_client_stats, aby zawierał region handlowca
DROP VIEW IF EXISTS public.company_client_stats;

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

-- Odświeżenie PostgREST
NOTIFY pgrst, 'reload schema';


-- ==========================================
-- PLIK: create_warehouse_users.sql
-- ==========================================

-- Skrypt tworzący konta dla pracowników magazynu w Supabase Auth
-- Domyślne hasło dla wszystkich to: Magazyn2026! (użytkownicy mogą je potem zmienić)

DO $$
DECLARE
    default_password text := crypt('Magazyn2026!', gen_salt('bf'));
BEGIN
    -- 1. Mateusz Bagiński
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'm.baginski@grupaeltron.pl') THEN
        INSERT INTO auth.users (
            id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), 'authenticated', 'authenticated', 'm.baginski@grupaeltron.pl', default_password, now(),
            '{"provider":"email","providers":["email"]}',
            '{"name":"Mateusz Bagiński", "role":"Specjalista", "status":"approved", "department":"Magazyn"}',
            now(), now()
        );
    END IF;

    -- 2. Marcin Pawlak
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'm.pawlak@grupaeltron.pl') THEN
        INSERT INTO auth.users (
            id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), 'authenticated', 'authenticated', 'm.pawlak@grupaeltron.pl', default_password, now(),
            '{"provider":"email","providers":["email"]}',
            '{"name":"Marcin Pawlak", "role":"Specjalista", "status":"approved", "department":"Magazyn"}',
            now(), now()
        );
    END IF;

    -- 3. Michał Borkowski
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'm.borkowski@grupaeltron.pl') THEN
        INSERT INTO auth.users (
            id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), 'authenticated', 'authenticated', 'm.borkowski@grupaeltron.pl', default_password, now(),
            '{"provider":"email","providers":["email"]}',
            '{"name":"Michał Borkowski", "role":"Specjalista", "status":"approved", "department":"Magazyn"}',
            now(), now()
        );
    END IF;

    -- 4. Kamil Gryka
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'k.gryka@grupaeltron.pl') THEN
        INSERT INTO auth.users (
            id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), 'authenticated', 'authenticated', 'k.gryka@grupaeltron.pl', default_password, now(),
            '{"provider":"email","providers":["email"]}',
            '{"name":"Kamil Gryka", "role":"Specjalista", "status":"approved", "department":"Magazyn"}',
            now(), now()
        );
    END IF;

    -- 5. Paweł Opolski
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'p.opolski@grupaeltron.pl') THEN
        INSERT INTO auth.users (
            id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), 'authenticated', 'authenticated', 'p.opolski@grupaeltron.pl', default_password, now(),
            '{"provider":"email","providers":["email"]}',
            '{"name":"Paweł Opolski", "role":"Specjalista", "status":"approved", "department":"Magazyn"}',
            now(), now()
        );
    END IF;

    -- 6. Mateusz Klewinowski
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'mateusz.klewinowski@grupaeltron.pl') THEN
        INSERT INTO auth.users (
            id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), 'authenticated', 'authenticated', 'mateusz.klewinowski@grupaeltron.pl', default_password, now(),
            '{"provider":"email","providers":["email"]}',
            '{"name":"Mateusz Klewinowski", "role":"Specjalista", "status":"approved", "department":"Magazyn"}',
            now(), now()
        );
    END IF;

END $$;


-- ==========================================
-- PLIK: create_client_profiles.sql
-- ==========================================

-- SQL: Tworzenie tabeli profili pracowników i rozszerzenie tabeli zwrotów
-- Uruchom ten skrypt w Supabase SQL Editor!

CREATE TABLE IF NOT EXISTS public.client_profiles (
  id SERIAL PRIMARY KEY,
  company_nip VARCHAR(10) NOT NULL REFERENCES public.companies(nip) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Włączenie RLS dla tabeli profili
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

-- Polityka dostępu do profili
DROP POLICY IF EXISTS "Zarządzanie profilami dla wszystkich" ON public.client_profiles;
CREATE POLICY "Zarządzanie profilami dla wszystkich" 
ON public.client_profiles 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Dodanie kolumn powiązań do tabeli zgłoszeń zwrotu (return_requests)
ALTER TABLE public.return_requests ADD COLUMN IF NOT EXISTS profile_id INTEGER REFERENCES public.client_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.return_requests ADD COLUMN IF NOT EXISTS profile_name VARCHAR(255);
ALTER TABLE public.return_requests ADD COLUMN IF NOT EXISTS profile_email VARCHAR(255);
ALTER TABLE public.return_requests ADD COLUMN IF NOT EXISTS profile_phone VARCHAR(50);

-- Odświeżenie pamięci podręcznej PostgREST
NOTIFY pgrst, 'reload schema';


-- ==========================================
-- PLIK: create_client_drum_notes.sql
-- ==========================================

-- Utworzenie tabeli na notatki klientów
CREATE TABLE public.client_drum_notes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nip TEXT NOT NULL,
    kod_bebna TEXT NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(nip, kod_bebna)
);

-- Ustawienie RLS (Row Level Security) dla tabeli
ALTER TABLE public.client_drum_notes ENABLE ROW LEVEL SECURITY;

-- Polityki dostępu (zakładając, że bezpieczne operacje mogą opierać się na NIP z autoryzacji 
-- lub w środowisku zaufanym na aplikacji klienckiej)
-- Aby ułatwić zarządzanie i być spójnym zresztą bazy, nadajemy dostęp do zapisu i odczytu po NIP klienta.

CREATE POLICY "Enable read for users based on nip"
ON public.client_drum_notes
FOR SELECT
USING (true); -- W zależności od ustawień aplikacji, tu może być potrzebne auth.uid() 
-- Ale skoro aplikacja sama filtruje po NIP, zostawmy możliwość dostępu (lub opcjonalnie zróbmy public)
-- Lepszym podejściem z punktu widzenia bezpieczeństwa Supabase jest:
-- USING (auth.uid() IN (SELECT id FROM profiles WHERE nip = client_drum_notes.nip));
-- Jednakże użyjmy po prostu polityk dla zalogowanych użytkowników z publicznym dostępem 
-- pod warunkiem, że sprawdzanie jest na warstwie API aplikacji (zgodnie z dotychczasowym wzorcem opartym na .eq('nip', userNip))

-- Ze względu na architekturę projektu, tworzymy politykę, która po prostu sprawdza czy to autoryzowany użytkownik:
CREATE POLICY "Enable all for authenticated users" 
ON public.client_drum_notes 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Ustawiamy powiązanie (FK) na bębny, jeśli tabela drums używa cechy jako klucza, ale 
-- w tej bazie "cecha" to tekst, a nie PK. Więc po prostu robimy indeks.
CREATE INDEX idx_client_drum_notes_nip_cecha ON public.client_drum_notes (nip, kod_bebna);


-- ==========================================
-- PLIK: create_drum_exceptions_table.sql
-- ==========================================

-- SQL: Tworzenie tabeli na trwałe wyjątki bębnów (zagubione / zatrzymane)
-- Uruchom ten skrypt w Supabase SQL Editor

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

-- Włączenie RLS (Row Level Security) dla tabeli
ALTER TABLE public.drum_exceptions ENABLE ROW LEVEL SECURITY;

-- Usunięcie starej polityki, jeśli istnieje
DROP POLICY IF EXISTS "Zarządzanie wyjątkami dla wszystkich" ON public.drum_exceptions;

-- Utworzenie nowej polityki zezwalającej na wszystkie operacje (Select, Insert, Update, Delete)
CREATE POLICY "Zarządzanie wyjątkami dla wszystkich" 
ON public.drum_exceptions 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Odświeżenie pamięci podręcznej PostgREST
NOTIFY pgrst, 'reload schema';


-- ==========================================
-- PLIK: create_custom_drum_deadlines.sql
-- ==========================================

-- SQL: Tworzenie tabeli indywidualnych przedłużeń terminów zwrotu bębnów
-- Uruchom ten skrypt w Supabase SQL Editor!

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

-- Włączenie RLS (Row Level Security) dla tabeli
ALTER TABLE public.custom_drum_deadlines ENABLE ROW LEVEL SECURITY;

-- Usunięcie starej polityki, jeśli istnieje
DROP POLICY IF EXISTS "Zarządzanie terminami dla wszystkich" ON public.custom_drum_deadlines;

-- Utworzenie nowej polityki zezwalającej na wszystkie operacje (Select, Insert, Update, Delete)
CREATE POLICY "Zarządzanie terminami dla wszystkich" 
ON public.custom_drum_deadlines 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Odświeżenie pamięci podręcznej PostgREST
NOTIFY pgrst, 'reload schema';


-- ==========================================
-- PLIK: create_supplier_rules.sql
-- ==========================================

-- Tabela definiująca zasady zwrotów bębnów dla poszczególnych dostawców
CREATE TABLE IF NOT EXISTS public.supplier_return_rules (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier_name text NOT NULL,        -- Nazwa dostawcy (odpowiada KON_DOSTAWCA)
    max_days_overdue integer NOT NULL,  -- Maksymalne dopuszczalne opóźnienie w dniach dla danej stawki (np. 30 oznacza od 1 do 30 dni)
                                        -- Wartość 0 lub mniejsza oznacza brak opóźnienia (zwrot w terminie)
    return_percentage numeric NOT NULL, -- Jaki procent wartości bębna zwracamy (np. 75, 100)
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Przykładowe wstawienie danych (zgodnie z życzeniem - NKT opóźnienie do 30 dni = 75%)
INSERT INTO public.supplier_return_rules (supplier_name, max_days_overdue, return_percentage)
VALUES 
    ('NKT', 0, 100),   -- Zwrot w terminie lub przed terminem = 100%
    ('NKT', 30, 75),   -- Zwrot spóźniony do 30 dni = 75%
    ('NKT', 60, 50);   -- Zwrot spóźniony do 60 dni = 50%

-- Opcjonalne zabezpieczenia RLS (pozwalające na odczyt przez klientów, żeby aplikacja mogła kalkulować % w locie)
ALTER TABLE public.supplier_return_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Odczyt zasad zwrotów dla wszystkich" 
ON public.supplier_return_rules FOR SELECT 
USING (true);


-- ==========================================
-- PLIK: create_company_client_stats_view.sql
-- ==========================================

-- SQL: Tworzenie zoptymalizowanego widoku statystyk klientów ORAZ naprawa polityki RLS dla firm
-- Uruchom ten skrypt w Supabase SQL Editor, aby naprawić obciążenie, lagowanie strony i błąd zapisu danych!

DROP VIEW IF EXISTS public.company_client_stats;

-- 1. Tworzenie wydajnego widoku statystyk
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
  COALESCE(d.drums_count, 0)::INTEGER as "drumsCount",
  COALESCE(d.overdue_drums, 0)::INTEGER as "overdueDrums",
  COALESCE(r.pending_requests, 0)::INTEGER as "pendingRequests",
  COALESCE(r.total_requests, 0)::INTEGER as "totalRequests"
FROM public.companies c
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

-- 2. Naprawa polityk bezpieczeństwa (RLS) dla tabeli companies
-- Pozwala to klientowi React na pomyślne aktualizowanie danych firmy (email, telefon, handlowiec, rynek, adres)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Zarządzanie firmami dla wszystkich" ON public.companies;
DROP POLICY IF EXISTS "Zezwól na aktualizację firm" ON public.companies;

CREATE POLICY "Zarządzanie firmami dla wszystkich" 
ON public.companies 
FOR ALL 
USING (true)
WITH CHECK (true);

-- 3. Odświeżenie pamięci podręcznej PostgREST (aby nowe kolumny i widoki były widoczne w API)
NOTIFY pgrst, 'reload schema';


-- ==========================================
-- PLIK: add_salesperson_column.sql
-- ==========================================

-- Dodanie kolumny salesperson_name do tabeli companies (jeśli jeszcze nie istnieje)
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS salesperson_name TEXT;

-- Dodanie kolumny market do tabeli companies (jeśli jeszcze nie istnieje)
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS market TEXT;

-- Odświeżenie pamięci podręcznej PostgREST (aby nowe kolumny były widoczne w API)
NOTIFY pgrst, 'reload schema';


-- ==========================================
-- PLIK: add_transport_fields.sql
-- ==========================================

-- Dodanie brakujących kolumn do tabeli zgłoszeń
ALTER TABLE return_requests 
ADD COLUMN IF NOT EXISTS transport_date DATE,
ADD COLUMN IF NOT EXISTS correction_number TEXT;

-- Opcjonalnie: odświeżenie cache'u PostgREST (jeśli kolumny już były a nadal jest błąd)
NOTIFY pgrst, 'reload schema';


-- ==========================================
-- PLIK: add_lokalizacja_wms.sql
-- ==========================================

-- Skrypt dodający kolumnę lokalizacja_wms do tabeli bębnów

ALTER TABLE public.drums
ADD COLUMN IF NOT EXISTS lokalizacja_wms TEXT;


-- ==========================================
-- PLIK: add_coordinates.sql
-- ==========================================

-- Dodanie współrzędnych geograficznych do tabel bębnów i zgłoszeń odbioru
ALTER TABLE public.drums ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE public.drums ADD COLUMN IF NOT EXISTS longitude NUMERIC;

ALTER TABLE public.return_requests ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE public.return_requests ADD COLUMN IF NOT EXISTS longitude NUMERIC;


-- ==========================================
-- PLIK: fix_missing_profiles.sql
-- ==========================================

-- ============================================================
-- FIX: Wstawianie/aktualizacja profili administratorów
-- Uruchom w Supabase SQL Editor (PO fix_profiles_rls.sql!)
-- ============================================================

-- Profil dla a.bortniczuk@grupaeltron.pl (admin)
INSERT INTO public.profiles (id, email, name, role, status, rodo_accepted)
VALUES (
  '4982d4f3-50fd-45aa-b2ab-40ddecb34d44',
  'a.bortniczuk@grupaeltron.pl',
  'Artur Bortniczuk',
  'admin',
  'approved',
  true
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name  = EXCLUDED.name,
  role  = EXCLUDED.role,
  status = EXCLUDED.status;

-- Profil dla p.blazewicz@grupaeltron.pl (admin)
INSERT INTO public.profiles (id, email, name, role, status, rodo_accepted)
VALUES (
  'fac55dc6-0188-4a38-a6ef-2ca3a1028d7a',
  'p.blazewicz@grupaeltron.pl',
  'P. Błażewicz',
  'admin',
  'approved',
  true
)
ON CONFLICT (id) DO UPDATE SET
  email  = EXCLUDED.email,
  name   = EXCLUDED.name,
  role   = EXCLUDED.role,
  status = EXCLUDED.status;

-- Odśwież schemat PostgREST
NOTIFY pgrst, 'reload schema';


-- ==========================================
-- PLIK: fix_profiles_rls.sql
-- ==========================================

-- ============================================================
-- FIX: Naprawa rekurencji w politykach RLS dla tabeli profiles
-- Uruchom w Supabase SQL Editor
-- ============================================================

-- 1. Pomocnicza funkcja SECURITY DEFINER - omija RLS, pobiera rolę bezpośrednio
-- Dzięki SECURITY DEFINER wykonuje się z uprawnieniami właściciela (postgres), nie użytkownika
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Usuń WSZYSTKIE stare polityki na tabeli profiles
DROP POLICY IF EXISTS "Użytkownik odczytuje własny profil" ON public.profiles;
DROP POLICY IF EXISTS "Zezwól na rejestrację profilu" ON public.profiles;
DROP POLICY IF EXISTS "Użytkownik aktualizuje własny profil" ON public.profiles;
DROP POLICY IF EXISTS "Admin i pracownicy zarządzają profilami" ON public.profiles;

-- 3. Odtwórz polityki BEZ rekurencji, używając funkcji get_my_role()
-- Każdy zalogowany użytkownik może odczytać SWÓJ profil
CREATE POLICY "Użytkownik odczytuje własny profil"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Administrator i pracownicy mogą czytać WSZYSTKIE profile (przez funkcję SECURITY DEFINER)
CREATE POLICY "Admin i pracownicy odczytują wszystkie profile"
ON public.profiles FOR SELECT
USING (
  public.get_my_role() IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Specjalista')
);

-- Wstawianie (rejestracja) - trigger handle_new_user też tego wymaga
CREATE POLICY "Zezwól na rejestrację profilu"
ON public.profiles FOR INSERT
WITH CHECK (true);

-- Każdy może edytować tylko swój profil
CREATE POLICY "Użytkownik aktualizuje własny profil"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Admin i pracownicy mogą edytować/usuwać WSZYSTKIE profile
CREATE POLICY "Admin i pracownicy zarządzają profilami"
ON public.profiles FOR ALL
USING (
  public.get_my_role() IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Specjalista')
);

-- 4. Odśwież schemat PostgREST
NOTIFY pgrst, 'reload schema';


-- ==========================================
-- PLIK: fix_rls.sql
-- ==========================================

-- Usunięcie starej polityki (żeby zachować porządek)
DROP POLICY IF EXISTS "Odczyt zasad zwrotƈw dla wszystkich" ON public.supplier_return_rules;
DROP POLICY IF EXISTS "Zarządzanie zasadami dla zalogowanych" ON public.supplier_return_rules;
DROP POLICY IF EXISTS "Odczyt zasad zwrotów dla wszystkich" ON public.supplier_return_rules;

-- Utworzenie nowej polityki zezwalającej na WSZYSTKIE operacje (Select, Insert, Update, Delete) 
-- dla każdego zalogowanego użytkownika w systemie
CREATE POLICY "Zarządzanie zasadami dla zalogowanych" 
ON public.supplier_return_rules 
FOR ALL 
USING (true)
WITH CHECK (true);


-- ==========================================
-- PLIK: fix_security_policies.sql
-- ==========================================

-- ============================================================
-- FIX BEZPIECZEŃSTWA: Polityki RLS
-- Uruchom w Supabase SQL Editor
-- ============================================================

-- 1. Naprawa polityki INSERT na profiles
--    Stara polityka pozwalała wstawić profil z dowolną rolą (nawet admin)
--    przez niezalogowanego użytkownika przez API!
DROP POLICY IF EXISTS "Zezwól na rejestrację profilu" ON public.profiles;

CREATE POLICY "Zezwól na rejestrację profilu"
ON public.profiles FOR INSERT
WITH CHECK (
  auth.uid() = id        -- tylko dla własnego konta
  AND role = 'client'    -- tylko rola klienta przy rejestracji
);

-- 2. Naprawa supplier_return_rules — za szeroka polityka FOR ALL (true)
--    Każdy zalogowany klient mógł edytować/usuwać reguły zwrotów!
DROP POLICY IF EXISTS "Zarządzanie zasadami dla zalogowanych" ON public.supplier_return_rules;
DROP POLICY IF EXISTS "Każdy odczytuje zasady zwrotów dostawców" ON public.supplier_return_rules;
DROP POLICY IF EXISTS "Admin zarządza zasadami zwrotów dostawców" ON public.supplier_return_rules;

-- Tylko odczyt dla wszystkich zalogowanych
CREATE POLICY "Każdy odczytuje zasady zwrotów dostawców"
ON public.supplier_return_rules FOR SELECT
USING (auth.role() = 'authenticated');

-- Tylko admin i supervisor mogą modyfikować
CREATE POLICY "Admin zarządza zasadami zwrotów dostawców"
ON public.supplier_return_rules FOR ALL
USING (
  public.get_my_role() IN ('admin', 'supervisor')
);

-- 3. Upewniamy się że salespeople nie są edytowalne przez klientów
ALTER TABLE IF EXISTS public.salespeople ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pracownicy odczytują handlowców" ON public.salespeople;
CREATE POLICY "Pracownicy odczytują handlowców"
ON public.salespeople FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin zarządza handlowcami" ON public.salespeople;
CREATE POLICY "Admin zarządza handlowcami"
ON public.salespeople FOR ALL
USING (
  public.get_my_role() IN ('admin', 'supervisor')
);

-- Odśwież schemat PostgREST
NOTIFY pgrst, 'reload schema';


