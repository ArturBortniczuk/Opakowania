-- Tworzenie tabeli katalogu kabli
CREATE TABLE IF NOT EXISTS public.cables_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    cross_section TEXT NOT NULL,
    shape TEXT,
    working_core_diameter TEXT,
    insulation_thickness TEXT,
    insulated_core_diameter TEXT,
    outer_sheath_thickness TEXT,
    outer_diameter TEXT,
    bending_radius TEXT,
    weight_kg_km TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tworzenie tabeli wymiarów bębnów
CREATE TABLE IF NOT EXISTS public.drum_dimensions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outer_diameter TEXT,
    width TEXT,
    inner_diameter TEXT,
    weight TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Uprawnienia
ALTER TABLE public.cables_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drum_dimensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dostęp do katalogu kabli dla wszystkich" ON public.cables_catalog FOR SELECT USING (true);
CREATE POLICY "Dostęp do wymiarów bębnów dla wszystkich" ON public.drum_dimensions FOR SELECT USING (true);
CREATE POLICY "Zarządzanie katalogiem dla adminów" ON public.cables_catalog FOR ALL USING (public.get_my_role() IN ('admin', 'supervisor', 'magazyn'));
CREATE POLICY "Zarządzanie bębnami dla adminów" ON public.drum_dimensions FOR ALL USING (public.get_my_role() IN ('admin', 'supervisor', 'magazyn'));
