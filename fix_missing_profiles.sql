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
