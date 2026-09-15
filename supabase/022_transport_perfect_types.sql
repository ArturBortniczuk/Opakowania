-- ==============================================================================
-- DOSZLIFOWANIE TYPÓW I POLUZOWANIE LIMITÓW DLACZEGO WARTOŚCI PRODUKCYJNYCH
-- ==============================================================================

-- 1. Zmiana ograniczeń NOT NULL i typów dla packagings
ALTER TABLE public.packagings ALTER COLUMN name DROP NOT NULL;

-- 2. Dodanie kolumny is_active w cables_catalog
ALTER TABLE public.cables_catalog ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Zmiana typów kolumn na TEXT w transports (brak limitów długości tekstu)
ALTER TABLE public.transports ALTER COLUMN source_warehouse TYPE TEXT;
ALTER TABLE public.transports ALTER COLUMN destination_city TYPE TEXT;
ALTER TABLE public.transports ALTER COLUMN postal_code TYPE TEXT;
ALTER TABLE public.transports ALTER COLUMN street TYPE TEXT;
ALTER TABLE public.transports ALTER COLUMN wz_number TYPE TEXT;
ALTER TABLE public.transports ALTER COLUMN client_name TYPE TEXT;
ALTER TABLE public.transports ALTER COLUMN real_client_name TYPE TEXT;
ALTER TABLE public.transports ALTER COLUMN market TYPE TEXT;
ALTER TABLE public.transports ALTER COLUMN loading_level TYPE TEXT;
ALTER TABLE public.transports ALTER COLUMN requester_name TYPE TEXT;
ALTER TABLE public.transports ALTER COLUMN requester_email TYPE TEXT;
ALTER TABLE public.transports ALTER COLUMN mpk TYPE TEXT;
ALTER TABLE public.transports ALTER COLUMN status TYPE TEXT;

-- 4. Zmiana ograniczeń i typów w spedycje
ALTER TABLE public.spedycje ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE public.spedycje ALTER COLUMN order_number TYPE TEXT;
ALTER TABLE public.spedycje ALTER COLUMN created_by TYPE TEXT;
ALTER TABLE public.spedycje ALTER COLUMN created_by_email TYPE TEXT;
ALTER TABLE public.spedycje ALTER COLUMN responsible_person TYPE TEXT;
ALTER TABLE public.spedycje ALTER COLUMN responsible_email TYPE TEXT;
ALTER TABLE public.spedycje ALTER COLUMN mpk TYPE TEXT;
ALTER TABLE public.spedycje ALTER COLUMN loading_contact TYPE TEXT;
ALTER TABLE public.spedycje ALTER COLUMN unloading_contact TYPE TEXT;
ALTER TABLE public.spedycje ALTER COLUMN documents TYPE TEXT;
ALTER TABLE public.spedycje ALTER COLUMN completed_by TYPE TEXT;
ALTER TABLE public.spedycje ALTER COLUMN order_sent_by TYPE TEXT;
ALTER TABLE public.spedycje ALTER COLUMN order_recipient TYPE TEXT;
ALTER TABLE public.spedycje ALTER COLUMN client_name TYPE TEXT;
ALTER TABLE public.spedycje ALTER COLUMN source_client_name TYPE TEXT;
ALTER TABLE public.spedycje ALTER COLUMN status TYPE TEXT;

-- 5. Usunięcie twardych kluczy obcych z ocen (dla zachowania ocen historycznych transportów)
ALTER TABLE public.transport_ratings DROP CONSTRAINT IF EXISTS transport_ratings_transport_id_fkey;
ALTER TABLE public.transport_detailed_ratings DROP CONSTRAINT IF EXISTS transport_detailed_ratings_transport_id_fkey;
