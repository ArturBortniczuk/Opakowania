-- 013_fix_request_number_trigger.sql
-- Naprawa wyzwalacza numeracji zgłoszeń zwrotu ZO/XXXX/MM/RR
-- Dodanie SECURITY DEFINER zapewnia, że SELECT MAX(...) widzi wszystkie zgłoszenia z danego miesiąca,
-- omijając ograniczenia RLS dla poszczególnych klientów.

CREATE OR REPLACE FUNCTION public.set_return_request_number()
RETURNS TRIGGER AS $$
DECLARE
  req_date TIMESTAMP WITH TIME ZONE;
  yr TEXT;
  mo TEXT;
  ym_key TEXT;
  next_seq INT;
  formatted_num TEXT;
BEGIN
  -- Jeśli request_number jest już ręcznie przekazany, zachowujemy go
  IF NEW.request_number IS NOT NULL AND NEW.request_number != '' THEN
    RETURN NEW;
  END IF;

  req_date := COALESCE(NEW.created_at, CURRENT_TIMESTAMP);
  yr := to_char(req_date, 'YY');
  mo := to_char(req_date, 'MM');
  ym_key := to_char(req_date, 'YYYY-MM');

  -- Blokada współbieżności dla danej kombinacji rok-miesiąc
  PERFORM pg_advisory_xact_lock(hashtext('return_req_num_' || ym_key));

  -- Obliczenie kolejnego numeru dla danego miesiąca (SECURITY DEFINER omija RLS i widzi wszystkie zgłoszenia z tego miesiąca)
  SELECT COALESCE(MAX(
    CASE 
      WHEN request_number ~ '^ZO/[0-9]+/[0-9]{2}/[0-9]{2}$' 
      THEN CAST(split_part(request_number, '/', 2) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO next_seq
  FROM public.return_requests
  WHERE to_char(created_at, 'YYYY-MM') = ym_key;

  formatted_num := 'ZO/' || lpad(next_seq::text, 4, '0') || '/' || mo || '/' || yr;
  NEW.request_number := formatted_num;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_set_return_request_number ON public.return_requests;

CREATE TRIGGER trigger_set_return_request_number
BEFORE INSERT ON public.return_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_return_request_number();
