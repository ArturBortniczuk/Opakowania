-- ==============================================================================
-- 023_DATABASE_CLEANUP_AND_OPTIMIZATION.SQL
-- Czyszczenie starych tabel tymczasowych, optymalizacja indeksów,
-- audyt uprawnień oraz ścisła izolacja klientów zewnętrznych.
-- ==============================================================================

-- 1. CZYSZCZENIE ZBĘDNYCH TABEL TYMCZASOWYCH I STARYCH SESJI
DROP TABLE IF EXISTS public.users_temp CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.transport_rating_summary CASCADE;

-- 2. INDEKSY WYDAJNOŚCIOWE DLA TRANSPORTU I SPEDYCJI
CREATE INDEX IF NOT EXISTS idx_transports_delivery_status ON public.transports(delivery_date, status);
CREATE INDEX IF NOT EXISTS idx_transports_requester_email ON public.transports(requester_email);
CREATE INDEX IF NOT EXISTS idx_transports_wz_number ON public.transports(wz_number);
CREATE INDEX IF NOT EXISTS idx_transports_mpk ON public.transports(mpk);

CREATE INDEX IF NOT EXISTS idx_spedycje_created_status ON public.spedycje(created_at, status);
CREATE INDEX IF NOT EXISTS idx_spedycje_resp_email ON public.spedycje(responsible_email);
CREATE INDEX IF NOT EXISTS idx_spedycje_created_by_email ON public.spedycje(created_by_email);
CREATE INDEX IF NOT EXISTS idx_spedycje_order_number ON public.spedycje(order_number);

CREATE INDEX IF NOT EXISTS idx_cable_advices_status ON public.cable_advices(status);
CREATE INDEX IF NOT EXISTS idx_cable_advices_order_number ON public.cable_advices(order_number);
CREATE INDEX IF NOT EXISTS idx_cable_advices_dates ON public.cable_advices(preliminary_date_from, preliminary_date_to);

CREATE INDEX IF NOT EXISTS idx_kuriers_status ON public.kuriers(status);
CREATE INDEX IF NOT EXISTS idx_kuriers_created_by ON public.kuriers(created_by_email);

CREATE INDEX IF NOT EXISTS idx_transport_ratings_tid ON public.transport_ratings(transport_id);
CREATE INDEX IF NOT EXISTS idx_transport_detailed_ratings_tid ON public.transport_detailed_ratings(transport_id);

-- 3. INDEKSY DLA OPAKOWAŃ I RUR
CREATE INDEX IF NOT EXISTS idx_drums_kod_nip ON public.drums(kod_bebna, nip);
CREATE INDEX IF NOT EXISTS idx_drums_nip ON public.drums(nip);
CREATE INDEX IF NOT EXISTS idx_drums_status ON public.drums(status);

CREATE INDEX IF NOT EXISTS idx_return_requests_user_nip ON public.return_requests(user_nip);
CREATE INDEX IF NOT EXISTS idx_return_requests_status ON public.return_requests(status);
CREATE INDEX IF NOT EXISTS idx_return_requests_created_at ON public.return_requests(created_at);

CREATE INDEX IF NOT EXISTS idx_profiles_lower_email ON public.profiles(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON public.profiles(role, status);

CREATE INDEX IF NOT EXISTS idx_user_app_perms_user_app ON public.user_app_permissions(user_id, app_id);

-- 4. WERYFIKACJA I ŚCISŁA IZOLACJA UPRAWNIEŃ KLIENTÓW ZEWNĘTRZNYCH
-- Zapewnia, że żaden użytkownik z rolą 'client' lub 'klient' nie ma dostępu do innych aplikacji niż 'opakowania'
DELETE FROM public.user_app_permissions
WHERE app_id IN ('transport', 'rury', 'portal')
  AND user_id IN (
    SELECT id FROM public.profiles WHERE LOWER(role) IN ('client', 'klient')
  );

-- 5. UPRAWNIENIA PRACOWNIKÓW
-- Upewnij się, że wszyscy pracownicy mają dostęp do Transportu, Opakowań i Rur
INSERT INTO public.user_app_permissions (user_id, app_id, role, is_active)
SELECT 
    p.id, 
    'transport', 
    CASE WHEN LOWER(p.role) = 'admin' THEN 'admin' ELSE 'pracownik' END,
    true
FROM public.profiles p
WHERE LOWER(p.role) NOT IN ('client', 'klient')
ON CONFLICT (user_id, app_id) DO NOTHING;

INSERT INTO public.user_app_permissions (user_id, app_id, role, is_active)
SELECT 
    p.id, 
    'opakowania', 
    p.role,
    true
FROM public.profiles p
WHERE LOWER(p.role) NOT IN ('client', 'klient')
ON CONFLICT (user_id, app_id) DO NOTHING;

INSERT INTO public.user_app_permissions (user_id, app_id, role, is_active)
SELECT 
    p.id, 
    'rury', 
    CASE 
        WHEN LOWER(p.role) = 'admin' THEN 'kierownik'
        WHEN LOWER(p.role) = 'magazyn' THEN 'magazyn'
        ELSE 'viewer'
    END,
    true
FROM public.profiles p
WHERE LOWER(p.role) NOT IN ('client', 'klient')
ON CONFLICT (user_id, app_id) DO NOTHING;
