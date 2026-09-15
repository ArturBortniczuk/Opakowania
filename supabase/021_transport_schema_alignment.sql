-- ==============================================================================
-- UZUPEŁNIENIE KOLUMN DLA MODUŁU TRANSPORT (DOPASOWANIE DO BAZY PRODUKCYJNEJ NEON)
-- ==============================================================================

-- 1. Tabela packagings (Lokalizacje odbioru opakowań)
ALTER TABLE public.packagings 
    ADD COLUMN IF NOT EXISTS description VARCHAR(255),
    ADD COLUMN IF NOT EXISTS client_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS city VARCHAR(255),
    ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS street VARCHAR(255),
    ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 6),
    ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 6),
    ADD COLUMN IF NOT EXISTS status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS transport_id INTEGER,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    ADD COLUMN IF NOT EXISTS external_id VARCHAR(100);

-- 2. Tabela transports (Transporty własne)
ALTER TABLE public.transports 
    ADD COLUMN IF NOT EXISTS connected_transport_id INTEGER,
    ADD COLUMN IF NOT EXISTS packaging_id INTEGER,
    ADD COLUMN IF NOT EXISTS distance_km INTEGER;

-- 3. Tabela spedycje (Zlecenia spedycyjne)
ALTER TABLE public.spedycje 
    ADD COLUMN IF NOT EXISTS source_client_name VARCHAR(255);

-- 4. Tabela transport_detailed_ratings (Szczegółowe oceny)
ALTER TABLE public.transport_detailed_ratings 
    ADD COLUMN IF NOT EXISTS other_problem BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS closed_by VARCHAR(255),
    ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS resolution_comment TEXT,
    ADD COLUMN IF NOT EXISTS admin_resolution TEXT,
    ADD COLUMN IF NOT EXISTS resolution_added_by TEXT,
    ADD COLUMN IF NOT EXISTS resolution_added_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now();
