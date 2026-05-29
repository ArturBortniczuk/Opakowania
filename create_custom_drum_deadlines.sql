-- SQL: Tworzenie tabeli indywidualnych przedłużeń terminów zwrotu bębnów
-- Uruchom ten skrypt w Supabase SQL Editor!

CREATE TABLE IF NOT EXISTS public.custom_drum_deadlines (
  id SERIAL PRIMARY KEY,
  kod_bebna VARCHAR(50) NOT NULL,
  nip VARCHAR(10) NOT NULL REFERENCES public.companies(nip) ON DELETE CASCADE,
  custom_return_date DATE NOT NULL,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (kod_bebna, nip)
);

-- Włączenie RLS (Row Level Security) dla tabeli
ALTER TABLE public.custom_drum_deadlines ENABLE ROW LEVEL SECURITY;

-- Usunięcie starej polityki, jeśli istnieje
DROP POLICY IF EXISTS "Zarządzanie terminami dla wszystkich" ON public.custom_drum_deadlines;

-- Utworzenie nowej polityki zezwalającej na wszystkie operacje (Select, Insert, Update, Delete)
CREATE POLICY "Zarządzanie terminami dla wszystkich" 
ON public.custom_drum_deadlines 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Odświeżenie pamięci podręcznej PostgREST
NOTIFY pgrst, 'reload schema';
