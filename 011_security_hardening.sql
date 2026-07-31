-- 011_security_hardening.sql
-- Utworzono: Audyt bezpieczeństwa i uszczelnienie RLS, wyzwalaczy i uprawnień

-- ============================================================
-- 1. BLOKADA ESKALACJI UPRAWNIEŃ W PUBLIC.PROFILES
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_profile_field_tampering()
RETURNS TRIGGER AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- Pobierz rolę wywołującego ( SECURITY DEFINER omija RLS )
  caller_role := public.get_my_role();

  -- Jeśli wywołujący nie jest adminem ani supervisorem, zablokuj zmianę pól wrażliwych
  IF (caller_role IS NULL OR caller_role NOT IN ('admin', 'supervisor')) AND auth.uid() IS NOT NULL THEN
    IF NEW.role <> OLD.role THEN
      RAISE EXCEPTION 'Brak uprawnień do zmiany roli użytkownika.';
    END IF;
    IF NEW.status <> OLD.status THEN
      RAISE EXCEPTION 'Brak uprawnień do zmiany statusu konta.';
    END IF;
    IF NEW.nip IS DISTINCT FROM OLD.nip THEN
      RAISE EXCEPTION 'Brak uprawnień do zmiany NIP firmy.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_prevent_profile_field_tampering ON public.profiles;
CREATE TRIGGER tr_prevent_profile_field_tampering
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_field_tampering();


-- ============================================================
-- 2. USZCZEELNIENIE POLITYK RLS W TABELACH
-- ============================================================

-- A) admin_drum_notes (wcześniej dostępne dla każdego z (true))
DROP POLICY IF EXISTS "Dostęp dla autoryzowanych" ON public.admin_drum_notes;
DROP POLICY IF EXISTS "Pracownicy zarządzają notatkami admina" ON public.admin_drum_notes;
CREATE POLICY "Pracownicy zarządzają notatkami admina" ON public.admin_drum_notes
  FOR ALL USING (
    public.get_my_role() IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Magazyn', 'Specjalista')
  );

-- B) companies (wcześniej FOR ALL USING (true))
DROP POLICY IF EXISTS "Zarządzanie firmami dla wszystkich" ON public.companies;
DROP POLICY IF EXISTS "Każdy zalogowany odczytuje firmy" ON public.companies;
DROP POLICY IF EXISTS "Admini zarządzają firmami" ON public.companies;

CREATE POLICY "Każdy zalogowany odczytuje firmy" ON public.companies
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admini zarządzają firmami" ON public.companies
  FOR ALL USING (
    public.get_my_role() IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Magazyn', 'Specjalista')
  );

-- C) client_profiles (wcześniej FOR ALL USING (true))
DROP POLICY IF EXISTS "Zarządzanie profilami dla wszystkich" ON public.client_profiles;
DROP POLICY IF EXISTS "Pracownik klienta widzi swoje dane" ON public.client_profiles;
DROP POLICY IF EXISTS "Admini zarządzają profilami klientów" ON public.client_profiles;

CREATE POLICY "Pracownik klienta widzi swoje dane" ON public.client_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admini zarządzają profilami klientów" ON public.client_profiles
  FOR ALL USING (
    public.get_my_role() IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Magazyn', 'Specjalista')
  );

-- D) client_drum_notes (wcześniej FOR ALL USING (true))
DROP POLICY IF EXISTS "Dostęp dla autoryzowanych" ON public.client_drum_notes;
DROP POLICY IF EXISTS "Klient odczytuje i tworzy swoje notatki bębnów" ON public.client_drum_notes;

CREATE POLICY "Klient odczytuje i tworzy swoje notatki bębnów" ON public.client_drum_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.drums d
      JOIN public.profiles p ON p.nip = d.nip AND p.status = 'approved'
      WHERE d.kod_bebna = client_drum_notes.drum_code
        AND p.id = auth.uid()
    ) OR public.get_my_role() IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Magazyn', 'Specjalista')
  );

-- E) drum_exceptions (wcześniej FOR ALL USING (true))
DROP POLICY IF EXISTS "Zarządzanie wyjątkami dla wszystkich" ON public.drum_exceptions;
DROP POLICY IF EXISTS "Klient odczytuje wyjątki swoich bębnów" ON public.drum_exceptions;
DROP POLICY IF EXISTS "Admini zarządzają wyjątkami" ON public.drum_exceptions;

CREATE POLICY "Klient odczytuje wyjątki swoich bębnów" ON public.drum_exceptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.status = 'approved' AND p.nip = (
        SELECT d.nip FROM public.drums d WHERE d.kod_bebna = drum_exceptions.drum_code LIMIT 1
      )
    ) OR public.get_my_role() IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Magazyn', 'Specjalista')
  );

CREATE POLICY "Admini zarządzają wyjątkami" ON public.drum_exceptions
  FOR ALL USING (
    public.get_my_role() IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Magazyn', 'Specjalista')
  );

-- F) custom_return_periods (wcześniej FOR ALL USING (true))
DROP POLICY IF EXISTS "Zarządzanie okresami dla wszystkich" ON public.custom_return_periods;
DROP POLICY IF EXISTS "Klient odczytuje swoje okresy zwrotu" ON public.custom_return_periods;
DROP POLICY IF EXISTS "Admini zarządzają okresami zwrotu" ON public.custom_return_periods;

CREATE POLICY "Klient odczytuje swoje okresy zwrotu" ON public.custom_return_periods
  FOR SELECT USING (
    nip = (SELECT nip FROM public.profiles WHERE id = auth.uid() AND status = 'approved')
    OR public.get_my_role() IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Magazyn', 'Specjalista')
  );

CREATE POLICY "Admini zarządzają okresami zwrotu" ON public.custom_return_periods
  FOR ALL USING (
    public.get_my_role() IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Magazyn', 'Specjalista')
  );

-- G) custom_drum_deadlines (wcześniej FOR ALL USING (true))
DROP POLICY IF EXISTS "Zarządzanie terminami dla wszystkich" ON public.custom_drum_deadlines;
DROP POLICY IF EXISTS "Klient odczytuje swoje terminy zwrotu" ON public.custom_drum_deadlines;
DROP POLICY IF EXISTS "Admini zarządzają terminami zwrotu" ON public.custom_drum_deadlines;

CREATE POLICY "Klient odczytuje swoje terminy zwrotu" ON public.custom_drum_deadlines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.drums d 
      JOIN public.profiles p ON p.nip = d.nip AND p.status = 'approved'
      WHERE d.kod_bebna = custom_drum_deadlines.drum_code
        AND p.id = auth.uid()
    ) OR public.get_my_role() IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Magazyn', 'Specjalista')
  );

CREATE POLICY "Admini zarządzają terminami zwrotu" ON public.custom_drum_deadlines
  FOR ALL USING (
    public.get_my_role() IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Magazyn', 'Specjalista')
  );

-- H) chat_messages (Weryfikacja tożsamości nadawcy)
DROP POLICY IF EXISTS "Klienci wysyłają wiadomości do swoich wątków" ON public.chat_messages;
CREATE POLICY "Klienci wysyłają wiadomości do swoich wątków" ON public.chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND sender_role = 'client' AND
    EXISTS (
      SELECT 1 FROM public.chat_threads
      WHERE chat_threads.id = chat_messages.thread_id
        AND chat_threads.client_user_id = auth.uid()
    )
  );
