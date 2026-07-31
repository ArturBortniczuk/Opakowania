-- 012_fix_client_profiles_rls.sql
-- Naprawa uprawnień RLS dla tabeli client_profiles (umożliwia klientom dodawanie i zarządzanie podprofilami pracowników swojej firmy)

DROP POLICY IF EXISTS "Pracownik klienta widzi swoje dane" ON public.client_profiles;
DROP POLICY IF EXISTS "Klient zarządza profilami swojej firmy" ON public.client_profiles;
DROP POLICY IF EXISTS "Admini zarządzają profilami klientów" ON public.client_profiles;

CREATE POLICY "Klient zarządza profilami swojej firmy" ON public.client_profiles
  FOR ALL
  USING (
    company_nip = (SELECT nip FROM public.profiles WHERE id = auth.uid() AND status = 'approved')
    OR public.get_my_role() IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Magazyn', 'Specjalista')
  )
  WITH CHECK (
    company_nip = (SELECT nip FROM public.profiles WHERE id = auth.uid() AND status = 'approved')
    OR public.get_my_role() IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Magazyn', 'Specjalista')
  );
