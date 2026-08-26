-- 015_fix_drum_exceptions_rls.sql
-- Naprawa uprawnień RLS dla tabeli public.drum_exceptions
-- Zezwala klientom na dodawanie i edycję zgłoszeń zatrzymania ("Zostawiam sobie") oraz zagubień ("Zgłoś zagubienie")

DROP POLICY IF EXISTS "Zarządzanie wyjątkami dla wszystkich" ON public.drum_exceptions;
DROP POLICY IF EXISTS "Klient odczytuje wyjątki swoich bębnów" ON public.drum_exceptions;
DROP POLICY IF EXISTS "Klient zarządza wyjątkami swoich bębnów" ON public.drum_exceptions;
DROP POLICY IF EXISTS "Admini zarządzają wyjątkami" ON public.drum_exceptions;

CREATE POLICY "Klient zarządza wyjątkami swoich bębnów" ON public.drum_exceptions
  FOR ALL
  USING (
    nip = (SELECT nip FROM public.profiles WHERE id = auth.uid() AND status = 'approved')
    OR public.get_my_role() IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Magazyn', 'Specjalista')
  )
  WITH CHECK (
    nip = (SELECT nip FROM public.profiles WHERE id = auth.uid() AND status = 'approved')
    OR public.get_my_role() IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Magazyn', 'Specjalista')
  );
