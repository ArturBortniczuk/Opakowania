-- ==============================================================================
-- MIGRACJA: CENTRALNY SYSTEM RÓL I UPRAWNIEŃ (RBAC) DLA EKOSYSTEMU ELTRON
-- Kompatybilna z aplikacjami: portal (narzedzia), transport, opakowania, rury
-- ==============================================================================

-- 1. TABELA RÓL W APLIKACJACH (APP ROLES)
CREATE TABLE IF NOT EXISTS public.app_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id VARCHAR(50) NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (app_id, name)
);

-- 2. ROZBUDOWA TABELI USER_APP_PERMISSIONS
ALTER TABLE public.user_app_permissions 
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.app_roles(id) ON DELETE SET NULL;

ALTER TABLE public.user_app_permissions 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- 3. INDEKSY
CREATE INDEX IF NOT EXISTS idx_app_roles_app_id ON public.app_roles(app_id);
CREATE INDEX IF NOT EXISTS idx_user_app_permissions_role_id ON public.user_app_permissions(role_id);

-- 4. RLS DLA APP_ROLES
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view app roles" ON public.app_roles;
CREATE POLICY "Anyone can view app roles" ON public.app_roles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert app roles" ON public.app_roles;
CREATE POLICY "Admins can insert app roles" ON public.app_roles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'admin' OR LOWER(profiles.email) = 'a.bortniczuk@grupaeltron.pl')
        )
    );

DROP POLICY IF EXISTS "Admins can update app roles" ON public.app_roles;
CREATE POLICY "Admins can update app roles" ON public.app_roles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'admin' OR LOWER(profiles.email) = 'a.bortniczuk@grupaeltron.pl')
        )
    );

DROP POLICY IF EXISTS "Admins can delete custom app roles" ON public.app_roles;
CREATE POLICY "Admins can delete custom app roles" ON public.app_roles
    FOR DELETE USING (
        is_system = false AND
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'admin' OR LOWER(profiles.email) = 'a.bortniczuk@grupaeltron.pl')
        )
    );

-- 5. SEEDOWANIE STANDARDOWYCH RÓL I UPRAWNIEŃ DLA WSZYSTKICH SYSTEMÓW

-- A. TRANSPORT
INSERT INTO public.app_roles (app_id, name, description, is_system, permissions)
VALUES 
(
    'transport',
    'Administrator',
    'Pełny dostęp do wszystkich funkcji systemu transportowego, giełdy, stawek i konfiguracji.',
    true,
    '{
        "calendar": { "view": true, "edit": true },
        "transport": { "markAsCompleted": true },
        "transport_requests": { "add": true, "view_own": true, "approve": true, "view_all": true },
        "spedycja": { "view": true, "add": true, "respond": true, "sendOrder": true, "unmerge": true },
        "admin": { "valuation": true, "packagings": true, "constructions": true, "cable_advices": true, "users": true }
    }'::jsonb
),
(
    'transport',
    'Koordynator / Dyspozytor',
    'Zarządzanie transportami, przydział zleceń do kierowców, akceptacja wniosków i giełda spedycyjna.',
    true,
    '{
        "calendar": { "view": true, "edit": true },
        "transport": { "markAsCompleted": true },
        "transport_requests": { "add": true, "view_own": true, "approve": true, "view_all": true },
        "spedycja": { "view": true, "add": true, "respond": true, "sendOrder": true, "unmerge": true },
        "admin": { "valuation": true, "packagings": true, "constructions": true, "cable_advices": true, "users": false }
    }'::jsonb
),
(
    'transport',
    'Magazynier (Ogólny)',
    'Podgląd i edycja kalendarza, załadunki, oznaczanie realizacji i akceptacja wniosków transportowych.',
    true,
    '{
        "calendar": { "view": true, "edit": true },
        "transport": { "markAsCompleted": true },
        "transport_requests": { "add": true, "view_own": true, "approve": true, "view_all": true },
        "spedycja": { "view": true, "add": false, "respond": false, "sendOrder": false, "unmerge": false },
        "admin": { "valuation": false, "packagings": false, "constructions": false, "cable_advices": true, "users": false }
    }'::jsonb
),
(
    'transport',
    'Magazynier Białystok',
    'Magazyn centralny Białystok - zarządzanie kalendarzem transportów i awizacjami dostaw kabli.',
    true,
    '{
        "calendar": { "view": true, "edit": true },
        "transport": { "markAsCompleted": true },
        "transport_requests": { "add": true, "view_own": true, "approve": true, "view_all": true },
        "spedycja": { "view": true, "add": false, "respond": false, "sendOrder": false, "unmerge": false },
        "admin": { "valuation": false, "packagings": false, "constructions": false, "cable_advices": true, "users": false }
    }'::jsonb
),
(
    'transport',
    'Magazynier Zielonka',
    'Oddział Zielonka - obsługa transportów lokalnych i kalendarza dostaw.',
    true,
    '{
        "calendar": { "view": true, "edit": true },
        "transport": { "markAsCompleted": true },
        "transport_requests": { "add": true, "view_own": true, "approve": true, "view_all": true },
        "spedycja": { "view": true, "add": false, "respond": false, "sendOrder": false, "unmerge": false },
        "admin": { "valuation": false, "packagings": false, "constructions": false, "cable_advices": true, "users": false }
    }'::jsonb
),
(
    'transport',
    'Handlowiec / Pracownik',
    'Składanie wniosków transportowych, podgląd kalendarza i wycena tras.',
    true,
    '{
        "calendar": { "view": true, "edit": false },
        "transport": { "markAsCompleted": false },
        "transport_requests": { "add": true, "view_own": true, "approve": false, "view_all": false },
        "spedycja": { "view": true, "add": true, "respond": false, "sendOrder": false, "unmerge": false },
        "admin": { "valuation": false, "packagings": false, "constructions": false, "cable_advices": false, "users": false }
    }'::jsonb
),
(
    'transport',
    'Kierowca',
    'Podgląd tras i oznaczanie realizacji dostaw transportowych.',
    true,
    '{
        "calendar": { "view": true, "edit": false },
        "transport": { "markAsCompleted": true },
        "transport_requests": { "add": false, "view_own": false, "approve": false, "view_all": false },
        "spedycja": { "view": false, "add": false, "respond": false, "sendOrder": false, "unmerge": false },
        "admin": { "valuation": false, "packagings": false, "constructions": false, "cable_advices": false, "users": false }
    }'::jsonb
)
ON CONFLICT (app_id, name) DO UPDATE SET
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    is_system = EXCLUDED.is_system,
    updated_at = timezone('utc'::text, now());

-- B. OPAKOWANIA
INSERT INTO public.app_roles (app_id, name, description, is_system, permissions)
VALUES 
(
    'opakowania',
    'Administrator',
    'Pełny dostęp do bazy bębnów, kaucji, protokołów i konfiguracji systemu.',
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
    'Magazyn / Dyspozytor',
    'Fizyczna weryfikacja bębnów, protokoły przyjęcia i rejestracja uszkodzeń.',
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
    'Wsparcie Sprzedaży / Księgowość',
    'Rozliczanie kaucji, wystawianie faktur korygujących i nadzór finansowy.',
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
    'Specjalista ds. Handlowych',
    'Zgłaszanie odbiorów bębnów od klientów i monitorowanie statusów.',
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
    'Klient',
    'Dedykowany dostęp dla klientów zewnętrznych do zgłaszania zwrotów bębnów.',
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

-- C. RURY
INSERT INTO public.app_roles (app_id, name, description, is_system, permissions)
VALUES 
(
    'rury',
    'Administrator',
    'Pełne zarządzanie katalogiem rur, cenami, kalkulatorem i RFQ.',
    true,
    '{
        "catalog_view": true,
        "catalog_manage": true,
        "pallet_calculator": true,
        "advices_manage": true,
        "rfq_manage": true,
        "rfq_pricing": true
    }'::jsonb
),
(
    'rury',
    'Kierownik Magazynu / Działu',
    'Nadzór nad pakietami, awizacjami dostaw i zapytaniami ofertowymi.',
    true,
    '{
        "catalog_view": true,
        "catalog_manage": false,
        "pallet_calculator": true,
        "advices_manage": true,
        "rfq_manage": true,
        "rfq_pricing": true
    }'::jsonb
),
(
    'rury',
    'Zakupy & RFQ',
    'Cenniki hutnicze, negocjacje dostawców i kalkulacje ofertowe.',
    true,
    '{
        "catalog_view": true,
        "catalog_manage": false,
        "pallet_calculator": true,
        "advices_manage": false,
        "rfq_manage": true,
        "rfq_pricing": true
    }'::jsonb
),
(
    'rury',
    'Magazynier',
    'Weryfikacja dostaw rur, awizacje i pakowanie wiązek.',
    true,
    '{
        "catalog_view": true,
        "catalog_manage": false,
        "pallet_calculator": true,
        "advices_manage": true,
        "rfq_manage": false,
        "rfq_pricing": false
    }'::jsonb
),
(
    'rury',
    'Podgląd (Viewer)',
    'Podgląd stanów magazynowych i parametrów technicznych rur.',
    true,
    '{
        "catalog_view": true,
        "catalog_manage": false,
        "pallet_calculator": true,
        "advices_manage": false,
        "rfq_manage": false,
        "rfq_pricing": false
    }'::jsonb
)
ON CONFLICT (app_id, name) DO UPDATE SET
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    is_system = EXCLUDED.is_system,
    updated_at = timezone('utc'::text, now());
