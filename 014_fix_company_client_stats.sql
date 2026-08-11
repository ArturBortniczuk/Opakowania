-- 014_fix_company_client_stats.sql
-- Naprawa widoku company_client_stats: zliczanie tylko bębnów (z pominięciem palet) oraz bezpieczne rzutowanie dat (TEXT/DATE)

CREATE OR REPLACE VIEW public.company_client_stats 
WITH (security_invoker = true) AS
SELECT 
  c.nip,
  c.name,
  c.email,
  c.phone,
  c.address,
  c.created_at,
  c.salesperson_name,
  c.market,
  s.region as salesperson_region,
  COALESCE(d.drums_count, 0)::INTEGER as "drumsCount",
  COALESCE(d.overdue_drums, 0)::INTEGER as "overdueDrums",
  COALESCE(r.pending_requests, 0)::INTEGER as "pendingRequests",
  COALESCE(r.total_requests, 0)::INTEGER as "totalRequests"
FROM public.companies c
LEFT JOIN public.salespeople s ON c.salesperson_name = s.name
LEFT JOIN (
  SELECT 
    nip, 
    COUNT(*)::INTEGER as drums_count,
    COUNT(*) FILTER (
      WHERE COALESCE(
        NULLIF(data_zwrotu_do_dostawcy, '')::date,
        (NULLIF(data_wydania, '')::date + INTERVAL '120 days')::date
      ) < CURRENT_DATE 
    )::INTEGER as overdue_drums
  FROM public.drums
  WHERE (typ_opakowania = 'Bęben' OR typ_opakowania IS NULL)
    AND (kontrahent IS NOT NULL AND kontrahent <> 'Nie wydany' AND kontrahent NOT ILIKE '%magazyn%')
  GROUP BY nip
) d ON c.nip = d.nip
LEFT JOIN (
  SELECT 
    user_nip, 
    COUNT(*) FILTER (WHERE status = 'Pending')::INTEGER as pending_requests,
    COUNT(*)::INTEGER as total_requests
  FROM public.return_requests
  GROUP BY user_nip
) r ON c.nip = r.user_nip;
