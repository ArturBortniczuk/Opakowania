-- SQL: Tworzenie zoptymalizowanego widoku statystyk klientów
-- Uruchom ten skrypt w Supabase SQL Editor, aby naprawić obciążenie i lagowanie strony!

DROP VIEW IF EXISTS public.company_client_stats;

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
  COALESCE(d.drums_count, 0)::INTEGER as "drumsCount",
  COALESCE(d.overdue_drums, 0)::INTEGER as "overdueDrums",
  COALESCE(r.pending_requests, 0)::INTEGER as "pendingRequests",
  COALESCE(r.total_requests, 0)::INTEGER as "totalRequests"
FROM public.companies c
LEFT JOIN (
  SELECT 
    nip, 
    COUNT(*)::INTEGER as drums_count,
    COUNT(*) FILTER (
      WHERE COALESCE(data_zwrotu_do_dostawcy, data_wydania + 120) < CURRENT_DATE 
      AND (kontrahent <> 'Nie wydany')
    )::INTEGER as overdue_drums
  FROM public.drums
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

-- Odświeżenie pamięci podręcznej PostgREST
NOTIFY pgrst, 'reload schema';
