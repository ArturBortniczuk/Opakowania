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
