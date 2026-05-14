-- Dodanie brakujących kolumn do tabeli zgłoszeń
ALTER TABLE return_requests 
ADD COLUMN IF NOT EXISTS transport_date DATE,
ADD COLUMN IF NOT EXISTS correction_number TEXT;

-- Opcjonalnie: odświeżenie cache'u PostgREST (jeśli kolumny już były a nadal jest błąd)
NOTIFY pgrst, 'reload schema';
