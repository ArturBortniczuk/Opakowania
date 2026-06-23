-- Tworzenie tabeli katalogu kabli
CREATE TABLE IF NOT EXISTS public.cables_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    cross_section TEXT NOT NULL,
    shape TEXT,
    working_core_diameter NUMERIC,
    insulation_thickness NUMERIC,
    insulated_core_diameter NUMERIC,
    outer_sheath_thickness NUMERIC,
    outer_diameter NUMERIC,
    bending_radius NUMERIC,
    weight_kg_km NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tworzenie tabeli wymiarów bębnów
CREATE TABLE IF NOT EXISTS public.drum_dimensions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outer_diameter NUMERIC,
    width NUMERIC,
    inner_diameter NUMERIC,
    weight NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Uprawnienia
ALTER TABLE public.cables_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drum_dimensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dostęp do katalogu kabli dla wszystkich" ON public.cables_catalog FOR SELECT USING (true);
CREATE POLICY "Dostęp do wymiarów bębnów dla wszystkich" ON public.drum_dimensions FOR SELECT USING (true);
CREATE POLICY "Zarządzanie katalogiem dla adminów" ON public.cables_catalog FOR ALL USING (public.get_my_role() IN ('admin', 'supervisor', 'magazyn'));
CREATE POLICY "Zarządzanie bębnami dla adminów" ON public.drum_dimensions FOR ALL USING (public.get_my_role() IN ('admin', 'supervisor', 'magazyn'));
