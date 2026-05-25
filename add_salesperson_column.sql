-- Dodanie kolumny salesperson_name do tabeli companies (jeśli jeszcze nie istnieje)
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS salesperson_name TEXT;

-- Dodanie kolumny market do tabeli companies (jeśli jeszcze nie istnieje)
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS market TEXT;

-- Odświeżenie pamięci podręcznej PostgREST (aby nowe kolumny były widoczne w API)
NOTIFY pgrst, 'reload schema';
