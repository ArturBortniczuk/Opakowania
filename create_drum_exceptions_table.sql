-- SQL: Tworzenie tabeli na trwałe wyjątki bębnów (zagubione / zatrzymane)
-- Uruchom ten skrypt w Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.drum_exceptions (
  id SERIAL PRIMARY KEY,
  kod_bebna VARCHAR(50) NOT NULL,
  nip VARCHAR(10) NOT NULL REFERENCES public.companies(nip) ON DELETE CASCADE,
  exception_type VARCHAR(20) NOT NULL CHECK (exception_type IN ('lost', 'kept')),
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (kod_bebna, nip)
);

-- Włączenie RLS (Row Level Security) dla tabeli
ALTER TABLE public.drum_exceptions ENABLE ROW LEVEL SECURITY;

-- Usunięcie starej polityki, jeśli istnieje
DROP POLICY IF EXISTS "Zarządzanie wyjątkami dla wszystkich" ON public.drum_exceptions;

-- Utworzenie nowej polityki zezwalającej na wszystkie operacje (Select, Insert, Update, Delete)
CREATE POLICY "Zarządzanie wyjątkami dla wszystkich" 
ON public.drum_exceptions 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Odświeżenie pamięci podręcznej PostgREST
NOTIFY pgrst, 'reload schema';
