-- 016_fix_request_number_trigger.sql
-- Wymuszenie SECURITY DEFINER dla wyzwalacza numeracji zgłoszeń zwrotu ZO/XXXX/MM/RR
-- 
-- PROBLEM:
-- Z powodu włączonego RLS (Row Level Security) na tabeli return_requests,
-- klient tworzący zgłoszenie widział w zapytaniu SELECT MAX(request_number) tylko swoje własne rekordy.
-- W efekcie każdy nowy klient otrzymywał osobną numerację zaczynając od ZO/0001/MM/RR.
--
-- ROZWIĄZANIE:
-- Oznaczenie funkcji set_return_request_number() jako SECURITY DEFINER.
-- Dzięki temu funkcja wyzwalacza wykonuje się z uprawnieniami właściciela (postgres),
-- omijając RLS dla klientów i widząc globalnie wszystkie zgłoszenia ze wszystkich firm w danym miesiącu.

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
  -- Jeśli request_number jest już ręcznie przekazany i ma prawidłowy format ZO/XXXX/MM/RR, zachowujemy go
  IF NEW.request_number IS NOT NULL AND NEW.request_number != '' AND NEW.request_number ~ '^ZO/[0-9]+/[0-9]{2}/[0-9]{2}$' THEN
    RETURN NEW;
  END IF;

  req_date := COALESCE(NEW.created_at, CURRENT_TIMESTAMP);
  yr := to_char(req_date, 'YY');
  mo := to_char(req_date, 'MM');
  ym_key := to_char(req_date, 'YYYY-MM');

  -- Blokada współbieżności dla danego miesiąca (zapobiega konfliktom przy jednoczesnym zapisie)
  PERFORM pg_advisory_xact_lock(hashtext('return_req_num_' || ym_key));

  -- Obliczenie kolejnego globalnego numeru sekwencyjnego dla danego miesiąca (omija RLS)
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

-- Ponowne przypięcie wyzwalacza
DROP TRIGGER IF EXISTS trigger_set_return_request_number ON public.return_requests;

CREATE TRIGGER trigger_set_return_request_number
BEFORE INSERT ON public.return_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_return_request_number();

-- Opcjonalna funkcja pomocnicza RPC do pobierania kolejnego numeru zgłoszenia
CREATE OR REPLACE FUNCTION public.get_next_return_request_number()
RETURNS TEXT AS $$
DECLARE
  req_date TIMESTAMP WITH TIME ZONE := CURRENT_TIMESTAMP;
  yr TEXT := to_char(req_date, 'YY');
  mo TEXT := to_char(req_date, 'MM');
  ym_key TEXT := to_char(req_date, 'YYYY-MM');
  next_seq INT;
BEGIN
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

  RETURN 'ZO/' || lpad(next_seq::text, 4, '0') || '/' || mo || '/' || yr;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_next_return_request_number() TO authenticated, anon;
