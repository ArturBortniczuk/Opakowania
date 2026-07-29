-- 008_add_pickup_type_to_returns.sql
-- Dodanie pola pickup_type do tabeli public.return_requests

ALTER TABLE public.return_requests 
ADD COLUMN IF NOT EXISTS pickup_type VARCHAR(50) DEFAULT 'spedycja';

-- Uzupełnienie wartości dla istniejących zgłoszeń
UPDATE public.return_requests 
SET pickup_type = 'spedycja' 
WHERE pickup_type IS NULL OR pickup_type = '';
