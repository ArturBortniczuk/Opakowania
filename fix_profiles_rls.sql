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
