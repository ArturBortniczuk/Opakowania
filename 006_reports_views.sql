-- 006_reports_views.sql
-- Skrypt tworzący zoptymalizowane widoki i funkcje do generowania kompleksowych raportów
-- Zastosowanie funkcji zwracających JSONB pozwala na jednorazowe pobranie zagregowanych danych.

-- 1. Funkcja: Pobieranie ogólnych statystyk bębnów pogrupowanych dla wykresów
CREATE OR REPLACE FUNCTION get_drums_analytics(allowed_nips text[] DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  -- Tworzymy tymczasowe zapytanie uwzględniające filtrowanie po NIP (dla handlowców)
  -- Jeżeli allowed_nips to pusta tablica, zwracamy pusty wynik
  IF allowed_nips IS NOT NULL AND array_length(allowed_nips, 1) = 0 THEN
    RETURN '{}'::jsonb;
  END IF;

  WITH filtered_drums AS (
    SELECT * FROM drums 
    WHERE (typ_opakowania = 'Bęben' OR typ_opakowania IS NULL)
      AND (allowed_nips IS NULL OR nip = ANY(allowed_nips))
  )
  SELECT jsonb_build_object(
    'total_count', COALESCE((SELECT COUNT(*) FROM filtered_drums), 0),
    'by_status', COALESCE((
      SELECT jsonb_object_agg(status, count)
      FROM (
        SELECT COALESCE(status, 'Nieznany') as status, COALESCE(COUNT(*), 0) as count 
        FROM filtered_drums 
        GROUP BY COALESCE(status, 'Nieznany')
      ) s
    ), '{}'::jsonb),
    'by_size', COALESCE((
      SELECT jsonb_object_agg(rozmiar, count)
      FROM (
        SELECT COALESCE(rozmiar_bebna, 'Inny') as rozmiar, COALESCE(COUNT(*), 0) as count 
        FROM filtered_drums 
        WHERE rozmiar_bebna IS NOT NULL AND rozmiar_bebna != ''
        GROUP BY rozmiar_bebna
        ORDER BY count DESC
        LIMIT 15
      ) s
    ), '{}'::jsonb),
    'by_supplier', COALESCE((
      SELECT jsonb_object_agg(supplier, count)
      FROM (
        SELECT COALESCE(kon_dostawca, 'Nieznany') as supplier, COALESCE(COUNT(*), 0) as count 
        FROM filtered_drums 
        WHERE kon_dostawca IS NOT NULL AND kon_dostawca != ''
        GROUP BY kon_dostawca
        ORDER BY count DESC
        LIMIT 15
      ) s
    ), '{}'::jsonb),
    'by_payment', COALESCE((
      SELECT jsonb_object_agg(payment, count)
      FROM (
        SELECT COALESCE(czy_zaplacona, 'Nieznany') as payment, COALESCE(COUNT(*), 0) as count 
        FROM filtered_drums 
        GROUP BY COALESCE(czy_zaplacona, 'Nieznany')
      ) s
    ), '{}'::jsonb),
    'overdue_count', COALESCE((
      SELECT COUNT(*) FROM filtered_drums 
      WHERE data_zwrotu_do_dostawcy < CURRENT_DATE
    ), 0)
  ) INTO result;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Funkcja: Pobieranie analityki zwrotów (trendy miesięczne, statusy)
CREATE OR REPLACE FUNCTION get_returns_analytics(allowed_nips text[] DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  IF allowed_nips IS NOT NULL AND array_length(allowed_nips, 1) = 0 THEN
    RETURN '{}'::jsonb;
  END IF;

  WITH filtered_returns AS (
    SELECT * FROM return_requests 
    WHERE (allowed_nips IS NULL OR user_nip = ANY(allowed_nips))
  )
  SELECT jsonb_build_object(
    'total_count', COALESCE((SELECT COUNT(*) FROM filtered_returns), 0),
    'by_status', COALESCE((
      SELECT jsonb_object_agg(status, count)
      FROM (
        SELECT COALESCE(status, 'Nieznany') as status, COALESCE(COUNT(*), 0) as count 
        FROM filtered_returns 
        GROUP BY COALESCE(status, 'Nieznany')
      ) s
    ), '{}'::jsonb),
    'monthly_trends', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('month', month, 'requests', COALESCE(requests_count, 0)))
      FROM (
        SELECT 
          to_char(created_at, 'YYYY-MM') as month, 
          COUNT(*) as requests_count
        FROM filtered_returns
        WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY to_char(created_at, 'YYYY-MM')
        ORDER BY month ASC
      ) m
    ), '[]'::jsonb),
    'avg_processing_time_days', COALESCE((
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400)::numeric, 1)
      FROM filtered_returns
      WHERE status = 'Completed'
    ), 0)
  ) INTO result;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Funkcja: Analityka klientów (TOP Klienci, zadłużenia bębnowe)
CREATE OR REPLACE FUNCTION get_clients_analytics(allowed_nips text[] DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  IF allowed_nips IS NOT NULL AND array_length(allowed_nips, 1) = 0 THEN
    RETURN '{}'::jsonb;
  END IF;

  WITH active_drums AS (
    SELECT nip, COALESCE(COUNT(*), 0) as drums_count,
           COALESCE(SUM(CASE WHEN data_zwrotu_do_dostawcy < CURRENT_DATE THEN 1 ELSE 0 END), 0) as overdue_count
    FROM drums
    WHERE (typ_opakowania = 'Bęben' OR typ_opakowania IS NULL)
      AND nip IS NOT NULL AND nip != ''
      AND kontrahent != 'Nie wydany' AND kontrahent NOT ILIKE '%magazyn%'
      AND status != 'Lost'
      AND (allowed_nips IS NULL OR nip = ANY(allowed_nips))
    GROUP BY nip
  )
  SELECT jsonb_build_object(
    'total_companies', COALESCE((
      SELECT COUNT(*) FROM companies WHERE (allowed_nips IS NULL OR nip = ANY(allowed_nips))
    ), 0),
    'top_clients_by_drums', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'nip', d.nip, 
        'name', COALESCE(c.name, COALESCE(c.pelna_nazwa_kontrahenta, 'Nieznana firma')),
        'drums_count', d.drums_count,
        'overdue_count', d.overdue_count
      ))
      FROM active_drums d
      LEFT JOIN companies c ON c.nip = d.nip
      ORDER BY d.drums_count DESC
      LIMIT 10
    ), '[]'::jsonb),
    'clients_with_overdue', COALESCE((
      SELECT COUNT(*) FROM active_drums WHERE overdue_count > 0
    ), 0)
  ) INTO result;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
