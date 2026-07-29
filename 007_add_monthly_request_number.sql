-- 007_add_monthly_request_number.sql
-- Skrypt dodający miesięczną numerację zgłoszeń zwrotów ZO/XXXX/MM/RR

-- 1. Dodanie kolumny request_number do tabeli return_requests
ALTER TABLE public.return_requests 
ADD COLUMN IF NOT EXISTS request_number VARCHAR(50);

-- 2. Tworzenie funkcji wyzwalacza generującej numer ZO/XXXX/MM/RR
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

  -- Obliczenie kolejnego numeru dla danego miesiąca
  SELECT COALESCE(MAX(
    CASE 
      WHEN request_number ~ '^ZO/[0-9]{4}/[0-9]{2}/[0-9]{2}$' 
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
$$ LANGUAGE plpgsql;

-- 3. Podpięcie wyzwalacza pod tabelę return_requests
DROP TRIGGER IF EXISTS trigger_set_return_request_number ON public.return_requests;

CREATE TRIGGER trigger_set_return_request_number
BEFORE INSERT ON public.return_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_return_request_number();

-- 4. Wypełnienie istniejących rekordów w bazie numerami ZO/XXXX/MM/RR
DO $$
DECLARE
  rec RECORD;
  current_ym TEXT := '';
  seq_counter INT := 0;
  yr TEXT;
  mo TEXT;
  formatted_num TEXT;
BEGIN
  FOR rec IN 
    SELECT id, created_at 
    FROM public.return_requests 
    WHERE request_number IS NULL OR request_number = ''
    ORDER BY created_at ASC, id ASC
  LOOP
    IF to_char(rec.created_at, 'YYYY-MM') <> current_ym THEN
      current_ym := to_char(rec.created_at, 'YYYY-MM');
      SELECT COALESCE(MAX(
        CASE 
          WHEN request_number ~ '^ZO/[0-9]{4}/[0-9]{2}/[0-9]{2}$' 
          THEN CAST(split_part(request_number, '/', 2) AS INTEGER)
          ELSE 0
        END
      ), 0)
      INTO seq_counter
      FROM public.return_requests
      WHERE to_char(created_at, 'YYYY-MM') = current_ym;
    END IF;

    seq_counter := seq_counter + 1;
    yr := to_char(rec.created_at, 'YY');
    mo := to_char(rec.created_at, 'MM');
    formatted_num := 'ZO/' || lpad(seq_counter::text, 4, '0') || '/' || mo || '/' || yr;

    UPDATE public.return_requests
    SET request_number = formatted_num
    WHERE id = rec.id;
  END LOOP;
END $$;
