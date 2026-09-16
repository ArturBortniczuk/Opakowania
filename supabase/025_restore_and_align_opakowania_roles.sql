-- ==============================================================================
-- 025_RESTORE_AND_ALIGN_OPAKOWANIA_ROLES.SQL
-- Pełne przywrócenie i synchronizacja ról i uprawnień pracowników:
-- Dyrektor, Kierownik, Specjalista, Wsparcie, Magazyn, Administrator, Klient.
-- ==============================================================================

-- 1. AKTUALIZACJA / DODANIE KOMPLETNYCH RÓL W TABELI APP_ROLES DLA OPAKOWAŃ
INSERT INTO public.app_roles (app_id, name, description, is_system, permissions)
VALUES 
(
    'opakowania',
    'Administrator',
    'Pełny dostęp do bazy bębnów, kaucji, protokołów, użytkowników i konfiguracji systemu.',
    true,
    '{
        "view": true,
        "report": true,
        "warehouse_receive": true,
        "settlement": true,
        "admin_panel": true
    }'::jsonb
),
(
    'opakowania',
    'Dyrektor',
    'Nadzór regionalny/krajowy: wgląd we wszystkich handlowców i klientów ze swojego regionu (lub całego kraju).',
    true,
    '{
        "view": true,
        "report": true,
        "warehouse_receive": false,
        "settlement": true,
        "admin_panel": false
    }'::jsonb
),
(
    'opakowania',
    'Kierownik',
    'Nadzór nad rynkiem: podgląd wszystkich specjalistów i kontrahentów z przypisanego rynku handlowego.',
    true,
    '{
        "view": true,
        "report": true,
        "warehouse_receive": false,
        "settlement": false,
        "admin_panel": false
    }'::jsonb
),
(
    'opakowania',
    'Specjalista',
    'Specjalista ds. Handlowych: zgłaszanie bębnów i podgląd wyłącznie swoich własnych klientów.',
    true,
    '{
        "view": true,
        "report": true,
        "warehouse_receive": false,
        "settlement": false,
        "admin_panel": false
    }'::jsonb
),
(
    'opakowania',
    'Wsparcie',
    'Wsparcie Sprzedaży: rozliczanie kaucji, wystawianie korekt oraz podgląd handlowców i klientów z rynku.',
    true,
    '{
        "view": true,
        "report": true,
        "warehouse_receive": false,
        "settlement": true,
        "admin_panel": false
    }'::jsonb
),
(
    'opakowania',
    'Magazyn',
    'Magazyn / Dyspozytor: fizyczna weryfikacja bębnów, protokoły przyjęcia i rejestracja uszkodzeń.',
    true,
    '{
        "view": true,
        "report": true,
        "warehouse_receive": true,
        "settlement": false,
        "admin_panel": false
    }'::jsonb
),
(
    'opakowania',
    'Klient',
    'Dedykowany dostęp dla kontrahentów zewnętrznych do zgłaszania zwrotów bębnów po numerze NIP.',
    true,
    '{
        "view": true,
        "report": true,
        "warehouse_receive": false,
        "settlement": false,
        "admin_panel": false
    }'::jsonb
)
ON CONFLICT (app_id, name) DO UPDATE SET
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    is_system = EXCLUDED.is_system,
    updated_at = timezone('utc'::text, now());

-- Usuń ewentualne stare / zduplikowane nazwy ról z 024, jeśli nie są już używane
DELETE FROM public.app_roles
WHERE app_id = 'opakowania'
  AND name IN ('Specjalista ds. Handlowych', 'Wsparcie Sprzedaży / Księgowość', 'Magazyn / Dyspozytor')
  AND id NOT IN (SELECT DISTINCT role_id FROM public.user_app_permissions WHERE role_id IS NOT NULL);


-- 2. SAMONAPRAWA I SYNCHRONIZACJA RÓL PRACOWNIKÓW W PUBLIC.PROFILES
-- Przywracamy oryginalne role handlowców z tabeli salespeople (gdzie rynek, region i rola są nienaruszone)
UPDATE public.profiles p
SET 
    role = s.role,
    updated_at = timezone('utc'::text, now())
FROM public.salespeople s
WHERE LOWER(p.email) = LOWER(s.email)
  AND s.role IS NOT NULL
  AND s.role <> ''
  AND p.role <> s.role;

-- Ujednolicenie ewentualnych rozszerzonych nazw ról w profiles
UPDATE public.profiles
SET role = 'Specjalista', updated_at = timezone('utc'::text, now())
WHERE role ILIKE '%specjalista ds. handlowych%' OR role ILIKE 'specjalista ds%';

UPDATE public.profiles
SET role = 'Wsparcie', updated_at = timezone('utc'::text, now())
WHERE role ILIKE '%wsparcie sprzedaży%' OR role ILIKE 'wsparcie %';

UPDATE public.profiles
SET role = 'Magazyn', updated_at = timezone('utc'::text, now())
WHERE role ILIKE '%magazyn / dyspozytor%' OR role ILIKE 'magazyn %';


-- 3. SYNCHRONIZACJA TABELI USER_APP_PERMISSIONS DLA OPAKOWAŃ
INSERT INTO public.user_app_permissions (user_id, app_id, role, is_active)
SELECT 
    p.id, 
    'opakowania', 
    p.role,
    true
FROM public.profiles p
WHERE LOWER(p.role) NOT IN ('client', 'klient')
ON CONFLICT (user_id, app_id) DO UPDATE SET
    role = EXCLUDED.role,
    is_active = true,
    updated_at = timezone('utc'::text, now());


-- 4. ODPORNOŚĆ POLITYK RLS (ROW LEVEL SECURITY)
-- Upewniamy się, że polityki RLS akceptują role zarówno z wielkiej jak i małej litery oraz odmiany

-- A) Bębny (drums)
DROP POLICY IF EXISTS "Admin i pracownicy zarządzają bębnami" ON public.drums;
CREATE POLICY "Admin i pracownicy zarządzają bębnami" ON public.drums
    FOR ALL USING (
        LOWER(public.get_my_role()) IN ('admin', 'supervisor', 'dyrektor', 'kierownik', 'wsparcie', 'magazyn', 'specjalista')
        OR public.get_my_role() IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Magazyn', 'Specjalista')
    );

-- B) Profile (profiles)
DROP POLICY IF EXISTS "Admin i pracownicy odczytują wszystkie profile" ON public.profiles;
CREATE POLICY "Admin i pracownicy odczytują wszystkie profile" ON public.profiles
    FOR SELECT USING (
        LOWER(public.get_my_role()) IN ('admin', 'supervisor', 'dyrektor', 'kierownik', 'wsparcie', 'magazyn', 'specjalista')
        OR public.get_my_role() IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Magazyn', 'Specjalista')
        OR id = auth.uid()
    );

-- C) Zgłoszenia zwrotów (return_requests)
DROP POLICY IF EXISTS "Admin i pracownicy zarządzają zgłoszeniami" ON public.return_requests;
CREATE POLICY "Admin i pracownicy zarządzają zgłoszeniami" ON public.return_requests
    FOR ALL USING (
        LOWER(public.get_my_role()) IN ('admin', 'supervisor', 'dyrektor', 'kierownik', 'wsparcie', 'magazyn', 'specjalista')
        OR public.get_my_role() IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Magazyn', 'Specjalista')
    );

-- D) Firmy (companies)
DROP POLICY IF EXISTS "Admini zarządzają firmami" ON public.companies;
CREATE POLICY "Admini zarządzają firmami" ON public.companies
    FOR ALL USING (
        LOWER(public.get_my_role()) IN ('admin', 'supervisor', 'dyrektor', 'kierownik', 'wsparcie', 'magazyn', 'specjalista')
        OR public.get_my_role() IN ('admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Magazyn', 'Specjalista')
    );
