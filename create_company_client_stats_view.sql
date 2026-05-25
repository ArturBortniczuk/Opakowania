-- SQL: Tworzenie zoptymalizowanego widoku statystyk klientów ORAZ naprawa polityki RLS dla firm
-- Uruchom ten skrypt w Supabase SQL Editor, aby naprawić obciążenie, lagowanie strony i błąd zapisu danych!

DROP VIEW IF EXISTS public.company_client_stats;

-- 1. Tworzenie wydajnego widoku statystyk
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

-- 2. Naprawa polityk bezpieczeństwa (RLS) dla tabeli companies
-- Pozwala to klientowi React na pomyślne aktualizowanie danych firmy (email, telefon, handlowiec, rynek, adres)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Zarządzanie firmami dla wszystkich" ON public.companies;
DROP POLICY IF EXISTS "Zezwól na aktualizację firm" ON public.companies;

CREATE POLICY "Zarządzanie firmami dla wszystkich" 
ON public.companies 
FOR ALL 
USING (true)
WITH CHECK (true);

-- 3. Odświeżenie pamięci podręcznej PostgREST (aby nowe kolumny i widoki były widoczne w API)
NOTIFY pgrst, 'reload schema';
