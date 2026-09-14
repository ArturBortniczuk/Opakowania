-- ==============================================================================
-- KOMPLETNA MIGRACJA: EKOSYSTEM MULTI-APP & MODUŁ RURY DLA SUPABASE
-- Kompatybilna z istniejącą bazą Opakowań (public.profiles, companies, salespeople)
-- ==============================================================================

-- 1. TABELA APLIKACJI W EKOSYSTEMIE (ELTRON APPS)
CREATE TABLE IF NOT EXISTS public.apps (
    id VARCHAR(50) PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    url TEXT NOT NULL,
    color VARCHAR(50) DEFAULT 'blue',
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABELA UPRAWNIEŃ UŻYTKOWNIKÓW PER APLIKACJA (RBAC)
CREATE TABLE IF NOT EXISTS public.user_app_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    app_id VARCHAR(50) NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'viewer',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, app_id)
);

-- 3. ZAINICJOWANIE APLIKACJI W REJESTRZE
INSERT INTO public.apps (id, name, description, icon, url, color, is_active, display_order)
VALUES 
    (
        'opakowania', 
        'System Zwrotu Opakowań i Bębnów', 
        'Zarządzanie bębnami kablowymi, rozliczeniami kaucji, wyjątkami i zgłoszeniami odbioru.', 
        'PackageCheck', 
        'https://www.opakowania.grupaeltron.pl', 
        'blue', 
        true, 
        1
    ),
    (
        'rury', 
        'System Zarządzania Rurami & RFQ', 
        'Katalog rur osłonowych, zwojów RHDPE, konfigurator paletyzacji, awizacje dostaw i zapytania ofertowe.', 
        'Layers', 
        'https://www.rury.grupaeltron.pl', 
        'cyan', 
        true, 
        2
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    url = EXCLUDED.url,
    color = EXCLUDED.color,
    display_order = EXCLUDED.display_order;

-- 4. TABELE BIZNESOWE DLA SYSTEMU RUR

-- A) Katalog Rur i Towarów
CREATE TABLE IF NOT EXISTS public.rury (
    towar_idx BIGINT PRIMARY KEY,
    kod_towaru VARCHAR(100) NOT NULL UNIQUE,
    nazwa_towaru VARCHAR(255) NOT NULL,
    dzial VARCHAR(50),
    nazwa_dzialu VARCHAR(255),
    sww VARCHAR(50),
    waga NUMERIC(10, 3) DEFAULT 0,
    objetosc NUMERIC(10, 4) DEFAULT 0,
    ilosc_w_opakowaniu INTEGER DEFAULT 1,
    czas_realizacji_days INTEGER DEFAULT 7,
    jednostka_podstawowa VARCHAR(20) DEFAULT 'm',
    vat NUMERIC(5, 2) DEFAULT 23,
    producent VARCHAR(255),
    nip_producenta VARCHAR(50),
    glowny_dostawca VARCHAR(255),
    nip_dostawcy VARCHAR(50),
    stan_aktualny NUMERIC(12, 2) DEFAULT 0,
    stan_zarezerwowany NUMERIC(12, 2) DEFAULT 0,
    magazyny_stany JSONB DEFAULT '{}'::jsonb,
    ostatnia_cena_zakupu_netto NUMERIC(12, 2) DEFAULT 0,
    cena_katalogowa_netto NUMERIC(12, 2) DEFAULT 0,
    cecha_segment_handel VARCHAR(255),
    cecha_grupa_materialowa VARCHAR(255),
    cecha_rodzaj_towaru VARCHAR(255),
    cecha_standard_bh VARCHAR(255),
    cecha_data_standard_bh DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- B) Parametry Pakowania Rur (Edycja ręczna / konfigurator)
CREATE TABLE IF NOT EXISTS public.rury_opakowania_konfiguracja (
    towar_idx BIGINT PRIMARY KEY REFERENCES public.rury(towar_idx) ON DELETE CASCADE,
    metrow_na_palecie NUMERIC(10, 2) DEFAULT 0,
    sztuk_na_palecie INTEGER DEFAULT 0,
    sztuk_nawiazce INTEGER DEFAULT 0,
    waga_palety_kg NUMERIC(10, 2) DEFAULT 0,
    uwagi TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- C) Awizacje Dostaw na Magazyn
CREATE TABLE IF NOT EXISTS public.awizacje_dostaw (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    numer_awizacji VARCHAR(100) NOT NULL UNIQUE,
    data_dostawy_planowana DATE NOT NULL,
    godzina_slot VARCHAR(50) NOT NULL,
    dostawca_nazwa VARCHAR(255) NOT NULL,
    magazyn VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'Awizowana',
    kierowca_telefon VARCHAR(50),
    nr_rejestracyjny VARCHAR(50),
    szacowana_liczba_palet INTEGER DEFAULT 0,
    szacowana_liczba_bebnow INTEGER DEFAULT 0,
    zawartosc_opis TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- D) Kalendarz Negocjacji i Cenników
CREATE TABLE IF NOT EXISTS public.kalendarz_negocjacji (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dostawca_nazwa VARCHAR(255) NOT NULL,
    dostawca_kod VARCHAR(50),
    temat VARCHAR(255) NOT NULL,
    data_spotkania TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'Zaplanowane',
    wygasanie_cennika_data DATE,
    notatki TEXT,
    wynegocjowany_rabat_procent NUMERIC(5, 2) DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- E) Zapytania Ofertowe (RFQ)
CREATE TABLE IF NOT EXISTS public.zapytania_ofertowe (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    numer_zapytania VARCHAR(100) NOT NULL UNIQUE,
    data_wystawienia DATE DEFAULT CURRENT_DATE,
    dostawca_kod VARCHAR(50),
    dostawca_nazwa VARCHAR(255) NOT NULL,
    klient_target_nazwa VARCHAR(255),
    termin_realizacji_target DATE,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    suma_waga_kg NUMERIC(12, 2) DEFAULT 0,
    suma_objetosc_m3 NUMERIC(12, 3) DEFAULT 0,
    uwagi_generalne TEXT,
    status VARCHAR(50) DEFAULT 'Szkic',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- F) Feedback & Zgłoszenia Użytkowników
CREATE TABLE IF NOT EXISTS public.rury_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    user_name TEXT,
    comment TEXT NOT NULL,
    screenshot TEXT,
    current_tab TEXT,
    status VARCHAR(50) DEFAULT 'Nowy',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. FUNKCJE POMOCNICZE (SECURITY DEFINER) DLA UPRAWNIEŃ

-- Pobieranie roli użytkownika dla danej aplikacji
CREATE OR REPLACE FUNCTION public.get_user_app_role(p_app_id TEXT)
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role 
    FROM public.user_app_permissions 
    WHERE user_id = auth.uid() 
      AND app_id = p_app_id 
      AND is_active = true 
    LIMIT 1;

    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Sprawdzanie czy użytkownik ma dostęp do danej aplikacji
CREATE OR REPLACE FUNCTION public.is_app_allowed(p_app_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_app_permissions 
        WHERE user_id = auth.uid() 
          AND app_id = p_app_id 
          AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 6. AUTOMATYCZNA MIGRACJA ISTNIEJĄCYCH UŻYTKOWNIKÓW (Z public.profiles)
-- Przypisuje uprawnienia pracownikom do modułu 'opakowania' oraz 'rury'
DO $$
DECLARE
    r RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        FOR r IN SELECT id, role, status FROM public.profiles LOOP
            -- Jeśli użytkownik to klient: dostęp tylko do Opakowań
            IF r.role = 'client' THEN
                INSERT INTO public.user_app_permissions (user_id, app_id, role, is_active)
                VALUES (r.id, 'opakowania', 'client', (r.status = 'approved'))
                ON CONFLICT (user_id, app_id) DO NOTHING;
            ELSE
                -- Pracownicy wewnętrzni (admin, Dyrektor, Kierownik, Wsparcie, Magazyn, Specjalista)
                -- Dostęp do Opakowań:
                INSERT INTO public.user_app_permissions (user_id, app_id, role, is_active)
                VALUES (r.id, 'opakowania', r.role, true)
                ON CONFLICT (user_id, app_id) DO NOTHING;

                -- Dostęp do Rur:
                INSERT INTO public.user_app_permissions (user_id, app_id, role, is_active)
                VALUES (
                    r.id, 
                    'rury', 
                    CASE 
                        WHEN r.role IN ('admin', 'Dyrektor', 'Kierownik') THEN 'kierownik'
                        WHEN r.role IN ('Specjalista', 'Wsparcie') THEN 'zakupy_rfq'
                        WHEN r.role = 'Magazyn' THEN 'magazyn'
                        ELSE 'viewer'
                    END, 
                    true
                )
                ON CONFLICT (user_id, app_id) DO NOTHING;
            END IF;
        END LOOP;
    END IF;
END $$;

-- 7. REGULARNE TRIGGERY DLA NOWYCH UŻYTKOWNIKÓW
CREATE OR REPLACE FUNCTION public.handle_new_user_app_permissions()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT;
    v_status TEXT;
BEGIN
    v_role := COALESCE(new.raw_user_meta_data->>'role', 'client');
    v_status := COALESCE(new.raw_user_meta_data->>'status', 'pending');

    IF v_role = 'client' THEN
        INSERT INTO public.user_app_permissions (user_id, app_id, role, is_active)
        VALUES (new.id, 'opakowania', 'client', (v_status = 'approved'))
        ON CONFLICT (user_id, app_id) DO NOTHING;
    ELSE
        INSERT INTO public.user_app_permissions (user_id, app_id, role, is_active)
        VALUES (new.id, 'opakowania', v_role, true)
        ON CONFLICT (user_id, app_id) DO NOTHING;

        INSERT INTO public.user_app_permissions (user_id, app_id, role, is_active)
        VALUES (new.id, 'rury', 'viewer', true)
        ON CONFLICT (user_id, app_id) DO NOTHING;
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. WŁĄCZENIE I KONFIGURACJA ROW LEVEL SECURITY (RLS)

ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_app_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rury ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rury_opakowania_konfiguracja ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.awizacje_dostaw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kalendarz_negocjacji ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zapytania_ofertowe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rury_feedback ENABLE ROW LEVEL SECURITY;

-- Czyszczenie starych polityk (jeśli istnieją)
DROP POLICY IF EXISTS "Apps visible to everyone" ON public.apps;
DROP POLICY IF EXISTS "Users can read own permissions" ON public.user_app_permissions;
DROP POLICY IF EXISTS "Admins can manage permissions" ON public.user_app_permissions;
DROP POLICY IF EXISTS "Rury viewable by rury users" ON public.rury;
DROP POLICY IF EXISTS "Rury editable by staff" ON public.rury;
DROP POLICY IF EXISTS "Rury config viewable" ON public.rury_opakowania_konfiguracja;
DROP POLICY IF EXISTS "Rury config editable" ON public.rury_opakowania_konfiguracja;
DROP POLICY IF EXISTS "Awizacje viewable" ON public.awizacje_dostaw;
DROP POLICY IF EXISTS "Awizacje editable" ON public.awizacje_dostaw;
DROP POLICY IF EXISTS "Negocjacje viewable" ON public.kalendarz_negocjacji;
DROP POLICY IF EXISTS "Negocjacje editable" ON public.kalendarz_negocjacji;
DROP POLICY IF EXISTS "RFQ viewable" ON public.zapytania_ofertowe;
DROP POLICY IF EXISTS "RFQ editable" ON public.zapytania_ofertowe;
DROP POLICY IF EXISTS "Feedback insertable by users" ON public.rury_feedback;
DROP POLICY IF EXISTS "Feedback viewable by staff" ON public.rury_feedback;

-- Polityki dla Apps
CREATE POLICY "Apps visible to everyone" ON public.apps 
    FOR SELECT USING (true);

-- Polityki dla User App Permissions
CREATE POLICY "Users can read own permissions" ON public.user_app_permissions 
    FOR SELECT USING (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'Dyrektor'));

CREATE POLICY "Admins can manage permissions" ON public.user_app_permissions 
    FOR ALL USING (public.get_my_role() IN ('admin', 'Dyrektor'));

-- Polityki dla Rur
CREATE POLICY "Rury viewable by rury users" ON public.rury 
    FOR SELECT USING (public.is_app_allowed('rury') OR public.get_my_role() IN ('admin', 'Dyrektor'));

CREATE POLICY "Rury editable by staff" ON public.rury 
    FOR ALL USING (public.get_user_app_role('rury') IN ('admin', 'kierownik', 'zakupy_rfq', 'magazyn') OR public.get_my_role() IN ('admin', 'Dyrektor'));

-- Polityki dla Konfiguracji Pakowania
CREATE POLICY "Rury config viewable" ON public.rury_opakowania_konfiguracja 
    FOR SELECT USING (public.is_app_allowed('rury') OR public.get_my_role() IN ('admin', 'Dyrektor'));

CREATE POLICY "Rury config editable" ON public.rury_opakowania_konfiguracja 
    FOR ALL USING (public.get_user_app_role('rury') IN ('admin', 'kierownik', 'magazyn', 'zakupy_rfq') OR public.get_my_role() IN ('admin', 'Dyrektor'));

-- Polityki dla Awizacji Dostaw
CREATE POLICY "Awizacje viewable" ON public.awizacje_dostaw 
    FOR SELECT USING (public.is_app_allowed('rury') OR public.get_my_role() IN ('admin', 'Dyrektor'));

CREATE POLICY "Awizacje editable" ON public.awizacje_dostaw 
    FOR ALL USING (public.is_app_allowed('rury') OR public.get_my_role() IN ('admin', 'Dyrektor'));

-- Polityki dla Kalendarza i Negocjacji
CREATE POLICY "Negocjacje viewable" ON public.kalendarz_negocjacji 
    FOR SELECT USING (public.is_app_allowed('rury') OR public.get_my_role() IN ('admin', 'Dyrektor'));

CREATE POLICY "Negocjacje editable" ON public.kalendarz_negocjacji 
    FOR ALL USING (public.get_user_app_role('rury') IN ('admin', 'kierownik', 'zakupy_rfq') OR public.get_my_role() IN ('admin', 'Dyrektor'));

-- Polityki dla RFQ (Zapytań ofertowych)
CREATE POLICY "RFQ viewable" ON public.zapytania_ofertowe 
    FOR SELECT USING (public.is_app_allowed('rury') OR public.get_my_role() IN ('admin', 'Dyrektor'));

CREATE POLICY "RFQ editable" ON public.zapytania_ofertowe 
    FOR ALL USING (public.get_user_app_role('rury') IN ('admin', 'kierownik', 'zakupy_rfq') OR public.get_my_role() IN ('admin', 'Dyrektor'));

-- Polityki dla Feedbacku
CREATE POLICY "Feedback insertable by users" ON public.rury_feedback 
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Feedback viewable by staff" ON public.rury_feedback 
    FOR SELECT USING (public.is_app_allowed('rury') OR public.get_my_role() IN ('admin', 'Dyrektor'));
