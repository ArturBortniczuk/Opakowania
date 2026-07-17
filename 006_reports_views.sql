-- 006_reports_views.sql
-- Skrypt tworzący zoptymalizowane widoki i funkcje do generowania kompleksowych raportów

-- 1. Funkcja: Pobieranie ogólnych statystyk bębnów pogrupowanych dla wykresów
CREATE OR REPLACE FUNCTION get_drums_analytics(allowed_nips text[] DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
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
      WHERE data_zwrotu_do_dostawcy < CURRENT_DATE::text
        AND data_zwrotu_do_dostawcy != ''
    ), 0),
    'lost_count', COALESCE((
      SELECT COUNT(*) FROM filtered_drums WHERE COALESCE(status, '') = 'Lost'
    ), 0),
    'longest_overdue', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'cecha', o.cecha,
        'nazwa', o.nazwa,
        'dni_przeterminowania', o.dni_przeterminowania
      ))
      FROM (
        SELECT cecha, nazwa, CURRENT_DATE - data_zwrotu_do_dostawcy::date as dni_przeterminowania
        FROM filtered_drums
        WHERE data_zwrotu_do_dostawcy < CURRENT_DATE::text
          AND data_zwrotu_do_dostawcy != ''
          AND status != 'Lost'
        ORDER BY data_zwrotu_do_dostawcy::date ASC
        LIMIT 5
      ) o
    ), '[]'::jsonb)
  ) INTO result;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Funkcja: Pobieranie analityki zwrotów
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


-- 3. Funkcja: Analityka klientów
CREATE OR REPLACE FUNCTION get_clients_analytics(allowed_nips text[] DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  IF allowed_nips IS NOT NULL AND array_length(allowed_nips, 1) = 0 THEN
    RETURN '{}'::jsonb;
  END IF;

  WITH active_drums AS (
    SELECT nip, MAX(pelna_nazwa_kontrahenta) as pelna_nazwa, COALESCE(COUNT(*), 0) as drums_count,
           COALESCE(SUM(CASE WHEN data_zwrotu_do_dostawcy < CURRENT_DATE::text AND data_zwrotu_do_dostawcy != '' THEN 1 ELSE 0 END), 0) as overdue_count
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
        'nip', tc.nip, 
        'name', tc.name,
        'drums_count', tc.drums_count,
        'overdue_count', tc.overdue_count
      ))
      FROM (
        SELECT d.nip, 
               COALESCE(c.name, d.pelna_nazwa, 'Nieznana firma') as name, 
               d.drums_count, 
               d.overdue_count
        FROM active_drums d
        LEFT JOIN companies c ON c.nip = d.nip
        ORDER BY d.drums_count DESC
        LIMIT 10
      ) tc
    ), '[]'::jsonb),
    'clients_with_overdue', COALESCE((
      SELECT COUNT(*) FROM active_drums WHERE overdue_count > 0
    ), 0),
    'top_debtors', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'nip', td.nip,
        'name', td.name,
        'unpaid_count', td.unpaid_count
      ))
      FROM (
        SELECT u.nip, 
               COALESCE(c.name, u.pelna_nazwa, 'Nieznana firma') as name, 
               u.unpaid_count
        FROM (
          SELECT nip, MAX(pelna_nazwa_kontrahenta) as pelna_nazwa, COUNT(*) as unpaid_count
          FROM drums
          WHERE czy_zaplacona = 'Nie'
            AND nip IS NOT NULL AND nip != ''
            AND (allowed_nips IS NULL OR nip = ANY(allowed_nips))
          GROUP BY nip
          ORDER BY unpaid_count DESC
          LIMIT 5
        ) u
        LEFT JOIN companies c ON c.nip = u.nip
        ORDER BY u.unpaid_count DESC
      ) td
    ), '[]'::jsonb)
  ) INTO result;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Funkcja: Analityka palet (NOWA)
CREATE OR REPLACE FUNCTION get_pallets_analytics(allowed_nips text[] DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  IF allowed_nips IS NOT NULL AND array_length(allowed_nips, 1) = 0 THEN
    RETURN '{}'::jsonb;
  END IF;

  WITH filtered_pallets AS (
    SELECT * FROM drums 
    WHERE typ_opakowania = 'Paleta'
      AND (allowed_nips IS NULL OR nip = ANY(allowed_nips))
  )
  SELECT jsonb_build_object(
    'total_count', COALESCE((SELECT COUNT(*) FROM filtered_pallets), 0),
    'by_size', COALESCE((
      SELECT jsonb_object_agg(rozmiar, count)
      FROM (
        SELECT COALESCE(rozmiar_bebna, 'Inna') as rozmiar, COALESCE(COUNT(*), 0) as count 
        FROM filtered_pallets 
        WHERE rozmiar_bebna IS NOT NULL AND rozmiar_bebna != ''
        GROUP BY rozmiar_bebna
        ORDER BY count DESC
        LIMIT 15
      ) s
    ), '{}'::jsonb),
    'total_issued', COALESCE((
      SELECT COUNT(*) FROM filtered_pallets 
      WHERE kontrahent != 'Nie wydany' AND kontrahent NOT ILIKE '%magazyn%'
    ), 0),
    'total_warehouse', COALESCE((
      SELECT COUNT(*) FROM filtered_pallets 
      WHERE kontrahent = 'Nie wydany' OR kontrahent ILIKE '%magazyn%'
    ), 0),
    'top_pallet_debtors', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'nip', td.nip,
        'name', td.name,
        'pallets_count', td.pallets_count
      ))
      FROM (
        SELECT u.nip, 
               COALESCE(c.name, u.pelna_nazwa, 'Nieznana firma') as name, 
               u.pallets_count
        FROM (
          SELECT nip, MAX(pelna_nazwa_kontrahenta) as pelna_nazwa, COUNT(*) as pallets_count
          FROM filtered_pallets
          WHERE nip IS NOT NULL AND nip != ''
            AND kontrahent != 'Nie wydany' AND kontrahent NOT ILIKE '%magazyn%'
          GROUP BY nip
          ORDER BY pallets_count DESC
          LIMIT 10
        ) u
        LEFT JOIN companies c ON c.nip = u.nip
        ORDER BY u.pallets_count DESC
      ) td
    ), '[]'::jsonb)
  ) INTO result;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
