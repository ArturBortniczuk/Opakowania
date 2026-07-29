-- 009_add_urgent_reason.sql
-- Dodanie pola urgent_reason do tabeli public.return_requests

ALTER TABLE public.return_requests 
ADD COLUMN IF NOT EXISTS urgent_reason TEXT;
