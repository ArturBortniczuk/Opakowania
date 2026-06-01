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
