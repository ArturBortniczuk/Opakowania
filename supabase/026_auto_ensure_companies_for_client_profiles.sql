-- ==============================================================================
-- Migracja 026: Automatyczna synchronizacja firm dla zatwierdzonych klientów
-- Rozwiązuje błąd FK 'client_profiles_company_nip_fkey' przy tworzeniu profilu pracownika.
-- ==============================================================================

-- 1. Uzupełnienie brakujących firm dla wszystkich już zatwierdzonych klientów
INSERT INTO public.companies (nip, name, email, phone)
SELECT 
    REGEXP_REPLACE(p.nip, '\D', '', 'g') AS nip,
    COALESCE(NULLIF(p.company_name, ''), 'Firma ' || p.nip) AS name,
    p.email,
    p.phone
FROM public.profiles p
WHERE p.role = 'client' 
  AND p.status = 'approved'
  AND p.nip IS NOT NULL
  AND LENGTH(REGEXP_REPLACE(p.nip, '\D', '', 'g')) = 10
ON CONFLICT (nip) DO UPDATE
SET 
    name = COALESCE(NULLIF(public.companies.name, ''), EXCLUDED.name),
    email = COALESCE(public.companies.email, EXCLUDED.email),
    phone = COALESCE(public.companies.phone, EXCLUDED.phone);

-- 2. Funkcja wyzwalacza: automatyczne tworzenie wpisu w companies po zatwierdzeniu profilu klienta
CREATE OR REPLACE FUNCTION public.tr_ensure_company_on_profile_approved()
RETURNS TRIGGER AS $$
DECLARE
    clean_nip TEXT;
BEGIN
    IF NEW.role = 'client' AND NEW.status = 'approved' AND NEW.nip IS NOT NULL THEN
        clean_nip := REGEXP_REPLACE(NEW.nip, '\D', '', 'g');
        IF LENGTH(clean_nip) = 10 THEN
            INSERT INTO public.companies (nip, name, email, phone)
            VALUES (
                clean_nip,
                COALESCE(NULLIF(NEW.company_name, ''), 'Firma ' || clean_nip),
                NEW.email,
                NEW.phone
            )
            ON CONFLICT (nip) DO UPDATE
            SET 
                name = COALESCE(NULLIF(public.companies.name, ''), EXCLUDED.name),
                email = COALESCE(public.companies.email, EXCLUDED.email),
                phone = COALESCE(public.companies.phone, EXCLUDED.phone);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Podpięcie wyzwalacza do tabeli profiles
DROP TRIGGER IF EXISTS tr_ensure_company_on_profile_approved ON public.profiles;
CREATE TRIGGER tr_ensure_company_on_profile_approved
AFTER INSERT OR UPDATE OF status, nip, role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.tr_ensure_company_on_profile_approved();
