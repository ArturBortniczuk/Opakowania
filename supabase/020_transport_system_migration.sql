-- ==============================================================================
-- KOMPLETNA MIGRACJA: MODUŁ TRANSPORT, SPEDYCJA & AWIZACJE DLA SUPABASE
-- Ekosystem Multi-App Grupy Eltron (Opakowania + Rury + Transport)
-- ==============================================================================

-- 1. ZAINICJOWANIE APLIKACJI TRANSPORT W REJESTRZE APLIKACJI (ELTRON APPS)
INSERT INTO public.apps (id, name, description, icon, url, color, is_active, display_order)
VALUES 
    (
        'transport', 
        'System Transportowy & Logistyka', 
        'Planowanie tras, zlecenia spedycyjne, obsługa kurierów, awizacje dostaw kabli, wyceny przewozów i oceny jakości.', 
        'Truck', 
        'https://www.transport.grupaeltron.pl', 
        'emerald', 
        true, 
        3
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    url = EXCLUDED.url,
    color = EXCLUDED.color,
    is_active = EXCLUDED.is_active,
    display_order = EXCLUDED.display_order;

-- 2. TABELE BIZNESOWE DLA SYSTEMU TRANSPORTU

-- A) Słownik Budów / MPK
CREATE TABLE IF NOT EXISTS public.constructions (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    mpk VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- B) Słownik Opakowań / Nośników Transportowych / Lokalizacji
CREATE TABLE IF NOT EXISTS public.packagings (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255),
    weight NUMERIC(10, 2) DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'kg',
    description VARCHAR(255),
    client_name VARCHAR(255),
    city VARCHAR(255),
    postal_code VARCHAR(20),
    street VARCHAR(255),
    latitude NUMERIC(10, 6),
    longitude NUMERIC(10, 6),
    status VARCHAR(50),
    transport_id INTEGER,
    external_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- C) Tabela Główna Transportów Własnych
CREATE TABLE IF NOT EXISTS public.transports (
    id BIGSERIAL PRIMARY KEY,
    source_warehouse VARCHAR(100) NOT NULL,
    destination_city VARCHAR(255) NOT NULL,
    postal_code VARCHAR(20),
    street VARCHAR(255),
    latitude NUMERIC(10, 6),
    longitude NUMERIC(10, 6),
    distance NUMERIC(10, 2),
    driver_id INTEGER,
    vehicle_id INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    wz_number VARCHAR(100),
    client_name VARCHAR(255),
    real_client_name VARCHAR(255),
    market VARCHAR(100),
    loading_level VARCHAR(50),
    notes TEXT,
    is_cyclical BOOLEAN DEFAULT false,
    delivery_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    requester_name VARCHAR(255),
    requester_email VARCHAR(255),
    mpk VARCHAR(50),
    goods_description TEXT,
    responsible_constructions TEXT,
    cost NUMERIC(10, 2) DEFAULT 0,
    connected_transport_id INTEGER,
    packaging_id INTEGER,
    distance_km INTEGER,
    week_number INTEGER,
    year_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- D) Tabela Spedycji / Zleceń Zewnętrznych
CREATE TABLE IF NOT EXISTS public.spedycje (
    id BIGSERIAL PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'new',
    order_number VARCHAR(100),
    created_by VARCHAR(255),
    created_by_email VARCHAR(255),
    responsible_person VARCHAR(255),
    responsible_email VARCHAR(255),
    mpk VARCHAR(50),
    location TEXT,
    location_data TEXT,
    delivery_data TEXT,
    loading_contact VARCHAR(255),
    unloading_contact VARCHAR(255),
    delivery_date DATE,
    documents TEXT,
    notes TEXT,
    response_data TEXT,
    completed_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    distance_km INTEGER,
    order_sent BOOLEAN DEFAULT false,
    order_sent_at TIMESTAMP WITH TIME ZONE,
    order_sent_by VARCHAR(255),
    order_recipient VARCHAR(255),
    order_data TEXT,
    client_name VARCHAR(255),
    source_client_name VARCHAR(255),
    goods_description TEXT,
    responsible_constructions TEXT,
    merged_transports TEXT,
    week_number INTEGER,
    year_number INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- E) Tabela Kurierów / Przesyłek Paczkowych
CREATE TABLE IF NOT EXISTS public.kuriers (
    id BIGSERIAL PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'new',
    created_by_email VARCHAR(255),
    magazine_source VARCHAR(255),
    magazine_destination VARCHAR(255),
    recipient_name VARCHAR(255),
    recipient_address TEXT,
    recipient_phone VARCHAR(50),
    recipient_city VARCHAR(255),
    package_description TEXT,
    order_data TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- F) Tabela Ocen Podstawowych
CREATE TABLE IF NOT EXISTS public.transport_ratings (
    id BIGSERIAL PRIMARY KEY,
    transport_id BIGINT NOT NULL,
    rater_email VARCHAR(255) NOT NULL,
    rater_name VARCHAR(255),
    rating INTEGER NOT NULL DEFAULT 5,
    is_positive BOOLEAN DEFAULT true,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- G) Tabela Szczegółowych Ocen Jakości Transportu
CREATE TABLE IF NOT EXISTS public.transport_detailed_ratings (
    id BIGSERIAL PRIMARY KEY,
    transport_id BIGINT NOT NULL,
    rater_email VARCHAR(255) NOT NULL,
    rater_name VARCHAR(255),
    rated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    driver_professional BOOLEAN,
    driver_tasks_completed BOOLEAN,
    cargo_complete BOOLEAN,
    cargo_correct BOOLEAN,
    delivery_notified BOOLEAN,
    delivery_on_time BOOLEAN,
    comment TEXT,
    other_problem BOOLEAN DEFAULT false,
    is_closed BOOLEAN DEFAULT false,
    closed_by VARCHAR(255),
    closed_at TIMESTAMP,
    resolution_comment TEXT,
    admin_resolution TEXT,
    resolution_added_by TEXT,
    resolution_added_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT now()
);

-- H) Tabela Parametrów Wyceny Transportu
CREATE TABLE IF NOT EXISTS public.valuation_settings (
    id BIGSERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'number',
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- I) Tabela Awizacji Kabli i Opakowań
CREATE TABLE IF NOT EXISTS public.cable_advices (
    id BIGSERIAL PRIMARY KEY,
    supplier VARCHAR(100) NOT NULL,
    order_type VARCHAR(50) NOT NULL,
    order_number VARCHAR(100) NOT NULL,
    unloading_place VARCHAR(100) NOT NULL,
    cable_voltage VARCHAR(50) NOT NULL,
    cable_guidelines VARCHAR(100),
    cable_name VARCHAR(255),
    cable_cross_section VARCHAR(100),
    quantity NUMERIC(12, 2) DEFAULT 0,
    packagings_data TEXT,
    preliminary_date_from DATE,
    preliminary_date_to DATE,
    final_date_from DATE,
    final_date_to DATE,
    status VARCHAR(50) DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- J) Katalog Kabli i Specyfikacji Technicznych
CREATE TABLE IF NOT EXISTS public.cables_catalog (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cross_section VARCHAR(100) NOT NULL,
    shape VARCHAR(50),
    working_core_diameter NUMERIC(8, 2),
    insulation_thickness NUMERIC(8, 2),
    outer_diameter NUMERIC(8, 2),
    bending_radius NUMERIC(8, 2),
    weight_kg_km NUMERIC(10, 2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- K) Słowniki Awizacji Kabli
CREATE TABLE IF NOT EXISTS public.cable_dictionaries (
    id BIGSERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    value VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. DOMYŚLNE WARTOŚCI DLA SŁOWNIKÓW I USTAWIEŃ WYCENY

-- Wycena transportu
INSERT INTO public.valuation_settings (key, name, value, type, description)
VALUES 
    ('base_rate', 'Stawka bazowa (stała opłata)', '100', 'number', 'Podstawowa opłata doliczana do każdego transportu (PLN)'),
    ('rate_per_km', 'Stawka za kilometr', '3.5', 'number', 'Stawka za każdy kilometr trasy (PLN)'),
    ('weight_threshold', 'Próg wagowy (kg)', '1000', 'number', 'Waga, od której naliczany jest mnożnik za wagę'),
    ('weight_multiplier', 'Mnożnik za wagę (%)', '10', 'percentage', 'O ile procent rośnie cena po przekroczeniu progu wagowego'),
    ('length_threshold', 'Próg długości (m)', '6', 'number', 'Długość ładunku, od której naliczany jest mnożnik'),
    ('length_multiplier', 'Mnożnik za długość (%)', '15', 'percentage', 'O ile procent rośnie cena po przekroczeniu progu długości'),
    ('urgent_threshold_days', 'Pilny transport (dni)', '2', 'number', 'Liczba dni lub mniej do dostawy, która oznacza transport pilny'),
    ('urgent_multiplier', 'Mnożnik za transport pilny (%)', '20', 'percentage', 'Dopłata procentowa za szybki termin realizacji')
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    value = EXCLUDED.value,
    type = EXCLUDED.type,
    description = EXCLUDED.description;

-- Słowniki kabli
INSERT INTO public.cable_dictionaries (category, value, is_active)
VALUES 
    ('supplier', 'NKT', true),
    ('supplier', 'ELPAR', true),
    ('supplier', 'NEXANS', true),
    ('order_type', 'ZD', true),
    ('order_type', 'ZDS', true),
    ('order_type', 'ZDH', true),
    ('order_type', 'ZDB', true),
    ('unloading_place', 'WMS Zielonka', true),
    ('unloading_place', 'WMS Białystok', true),
    ('cable_voltage', 'NN', true),
    ('cable_voltage', 'WN', true),
    ('cable_guidelines', 'PGE', true),
    ('cable_guidelines', 'Tauron', true),
    ('cable_guidelines', 'ENEA', true),
    ('warehouse', 'Magazyn Główny', true)
ON CONFLICT DO NOTHING;

-- 4. WIDOK STATYSTYK OCEN TRANSPORTÓW
CREATE OR REPLACE VIEW public.transport_rating_summary AS
SELECT 
    transport_id,
    COUNT(*) as total_ratings,
    
    -- Statystyki dla kategorii Kierowca
    COUNT(CASE WHEN driver_professional = true THEN 1 END) as driver_professional_positive,
    COUNT(CASE WHEN driver_professional = false THEN 1 END) as driver_professional_negative,
    COUNT(CASE WHEN driver_tasks_completed = true THEN 1 END) as driver_tasks_positive,
    COUNT(CASE WHEN driver_tasks_completed = false THEN 1 END) as driver_tasks_negative,
    
    -- Statystyki dla kategorii Towar
    COUNT(CASE WHEN cargo_complete = true THEN 1 END) as cargo_complete_positive,
    COUNT(CASE WHEN cargo_complete = false THEN 1 END) as cargo_complete_negative,
    COUNT(CASE WHEN cargo_correct = true THEN 1 END) as cargo_correct_positive,
    COUNT(CASE WHEN cargo_correct = false THEN 1 END) as cargo_correct_negative,
    
    -- Statystyki dla kategorii Organizacja dostawy
    COUNT(CASE WHEN delivery_notified = true THEN 1 END) as delivery_notified_positive,
    COUNT(CASE WHEN delivery_notified = false THEN 1 END) as delivery_notified_negative,
    COUNT(CASE WHEN delivery_on_time = true THEN 1 END) as delivery_on_time_positive,
    COUNT(CASE WHEN delivery_on_time = false THEN 1 END) as delivery_on_time_negative,
    
    -- Ogólny wynik (średnia wszystkich pozytywnych ocen w %)
    ROUND(
        (
            COUNT(CASE WHEN driver_professional = true THEN 1 END) +
            COUNT(CASE WHEN driver_tasks_completed = true THEN 1 END) +
            COUNT(CASE WHEN cargo_complete = true THEN 1 END) +
            COUNT(CASE WHEN cargo_correct = true THEN 1 END) +
            COUNT(CASE WHEN delivery_notified = true THEN 1 END) +
            COUNT(CASE WHEN delivery_on_time = true THEN 1 END)
        )::decimal / 
        NULLIF(
            COUNT(CASE WHEN driver_professional IS NOT NULL THEN 1 END) +
            COUNT(CASE WHEN driver_tasks_completed IS NOT NULL THEN 1 END) +
            COUNT(CASE WHEN cargo_complete IS NOT NULL THEN 1 END) +
            COUNT(CASE WHEN cargo_correct IS NOT NULL THEN 1 END) +
            COUNT(CASE WHEN delivery_notified IS NOT NULL THEN 1 END) +
            COUNT(CASE WHEN delivery_on_time IS NOT NULL THEN 1 END), 0
        ) * 100, 1
    ) as overall_rating_percentage
    
FROM public.transport_detailed_ratings
GROUP BY transport_id;

-- 5. TRIGGERY DLA AUTOMATYCZNEGO OBLICZANIA NUMERU TYGODNIA I ROKU
CREATE OR REPLACE FUNCTION public.fn_set_transport_week_year()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.completed_at IS NOT NULL THEN
        NEW.week_number := EXTRACT(WEEK FROM NEW.completed_at AT TIME ZONE 'UTC');
        NEW.year_number := EXTRACT(ISOYEAR FROM NEW.completed_at AT TIME ZONE 'UTC');
    ELSIF NEW.created_at IS NOT NULL THEN
        NEW.week_number := EXTRACT(WEEK FROM NEW.created_at AT TIME ZONE 'UTC');
        NEW.year_number := EXTRACT(ISOYEAR FROM NEW.created_at AT TIME ZONE 'UTC');
    END IF;
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_transports_week_year ON public.transports;
CREATE TRIGGER trg_transports_week_year
    BEFORE INSERT OR UPDATE ON public.transports
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_set_transport_week_year();

DROP TRIGGER IF EXISTS trg_spedycje_week_year ON public.spedycje;
CREATE TRIGGER trg_spedycje_week_year
    BEFORE INSERT OR UPDATE ON public.spedycje
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_set_transport_week_year();

-- 6. POLITYKI BEZPIECZEŃSTWA (ROW LEVEL SECURITY - RLS)
ALTER TABLE public.constructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packagings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spedycje ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kuriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_detailed_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valuation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cable_advices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cables_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cable_dictionaries ENABLE ROW LEVEL SECURITY;

-- Polityki dostępu (Authenticated users / Service Role)
DO $$
BEGIN
    -- Odczyt dla zalogowanych użytkowników
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'transport_authenticated_all_access' AND tablename = 'transports') THEN
        CREATE POLICY transport_authenticated_all_access ON public.transports FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'spedycje_authenticated_all_access' AND tablename = 'spedycje') THEN
        CREATE POLICY spedycje_authenticated_all_access ON public.spedycje FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'kuriers_authenticated_all_access' AND tablename = 'kuriers') THEN
        CREATE POLICY kuriers_authenticated_all_access ON public.kuriers FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ratings_authenticated_all_access' AND tablename = 'transport_ratings') THEN
        CREATE POLICY ratings_authenticated_all_access ON public.transport_ratings FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'detailed_ratings_authenticated_all_access' AND tablename = 'transport_detailed_ratings') THEN
        CREATE POLICY detailed_ratings_authenticated_all_access ON public.transport_detailed_ratings FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cable_advices_authenticated_all_access' AND tablename = 'cable_advices') THEN
        CREATE POLICY cable_advices_authenticated_all_access ON public.cable_advices FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cables_catalog_read_all' AND tablename = 'cables_catalog') THEN
        CREATE POLICY cables_catalog_read_all ON public.cables_catalog FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'valuation_settings_read_all' AND tablename = 'valuation_settings') THEN
        CREATE POLICY valuation_settings_read_all ON public.valuation_settings FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'constructions_read_all' AND tablename = 'constructions') THEN
        CREATE POLICY constructions_read_all ON public.constructions FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cable_dictionaries_read_all' AND tablename = 'cable_dictionaries') THEN
        CREATE POLICY cable_dictionaries_read_all ON public.cable_dictionaries FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'packagings_read_all' AND tablename = 'packagings') THEN
        CREATE POLICY packagings_read_all ON public.packagings FOR SELECT TO authenticated USING (true);
    END IF;
END $$;
