-- Dodanie kolumny salesperson_name do tabeli companies
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS salesperson_name TEXT;

-- Odświeżenie pamięci podręcznej PostgREST (aby kolumna była natychmiast widoczna w API Supabase)
NOTIFY pgrst, 'reload schema';
