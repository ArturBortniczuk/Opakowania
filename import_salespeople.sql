-- SQL: Import handlowców i modyfikacja widoku statystyk firm
-- Uruchom ten skrypt w Supabase SQL Editor!

-- 1. Tworzenie tabeli salespeople
CREATE TABLE IF NOT EXISTS public.salespeople (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    stanowisko TEXT,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('Dyrektor', 'Kierownik', 'Wsparcie', 'Specjalista')),
    market TEXT,
    region TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_first_login BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Włączenie RLS (Row Level Security) dla nowej tabeli
ALTER TABLE public.salespeople ENABLE ROW LEVEL SECURITY;

-- Polityka RLS dla tabeli salespeople (spójna z resztą systemu)
DROP POLICY IF EXISTS "Zarządzanie handlowcami dla wszystkich" ON public.salespeople;
CREATE POLICY "Zarządzanie handlowcami dla wszystkich" 
ON public.salespeople 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Czyszczenie starych rekordów, aby uniknąć konfliktów przy ponownym uruchomieniu
TRUNCATE public.salespeople CASCADE;

-- 2. Wstawianie danych handlowców (hasło domyślne to Eltron123!)
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Mateusz Kalinowski', 'Dyrektor ds. Kluczowych Klientów', 'm.kalinowski@grupaeltron.pl', '8 8 5   8 5 1   2 2 3', 'Dyrektor', 'Podlaski', 'Wszystkie', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Paweł Rogowski', 'Kierownik Rynku Podlaskiego', 'p.rogowski@grupaeltron.pl', '7 8 5   8 8 0   2 0 0', 'Kierownik', 'Podlaski', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Krzysztof Zarzecki', 'Dyrektor ds. Inwestycji Infrastrukturalnych', 'k.zarzecki@grupaeltron.pl', '5 0 5   0 2 4   5 1 7', 'Dyrektor', 'Podlaski', 'Wszystkie', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Paulina Lewkowicz', 'Specjalistka ds. Inwestycji Infrastrukturalnych', 'p.lewkowicz@grupaeltron.pl', '8 8 7 9 7 1 7 1 5', 'Wsparcie', 'Podlaski', 'Wszystkie', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Mateusz Magnuszewski', 'Specjalista ds. Techniczno - Handlowych', 'm.magnuszewski@grupaeltron.pl', '8 8 5   5 6 0   8 1 2', 'Specjalista', 'Podlaski', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Karol Kulesza', 'Specjalista ds. Techniczno - Handlowych', 'k.kulesza@grupaeltron.pl', '8 8 5 5 0 2 9 4 1', 'Specjalista', 'Podlaski', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Paulina Walejewska', 'Główna Specjalistka ds. Wsparcia Sprzedaży', 'handelpodlaski@grupaeltron.pl', '6 0 7   1 5 2   3 3 6', 'Wsparcie', 'Podlaski', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Bartłomiej Klimaszewski', 'Specjalista ds. Techniczno - Handlowych', 'b.klimaszewski@grupaeltron.pl', '6 0 9   9 9 8   6 3 0', 'Specjalista', 'Podlaski', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Aneta Wasilewska', 'Specjalistka ds. Wsparcia Sprzedaży', 'a.wasilewska@grupaeltron.pl', '8 8 5   8 5 1   2 7 0', 'Wsparcie', 'Podlaski', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Karol Rzepniewski', 'Kierownik Rynku Mazowieckiego', 'k.rzepniewski@grupaeltron.pl', '6 0 7   1 5 1   3 9 2', 'Kierownik', 'Mazowiecki', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Michał Berliński', 'Specjalista ds. Techniczno - Handlowych', 'm.berlinski@grupaeltron.pl', '6 9 1 1 1 3 7 4 2', 'Specjalista', 'Mazowiecki', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Justyna Zaleska', 'Specjalistka ds. Wsparcia Sprzedaży', 'handelmazowiecki@grupaeltron.pl', '6 6 1   6 1 3   2 9 9', 'Wsparcie', 'Mazowiecki', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Marcin Misztela', 'Specjalista ds. Techniczno - Handlowych', 'm.misztela@grupaeltron.pl', '6 6 7   8 0 0   7 3 1', 'Specjalista', 'Mazowiecki', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Mariusz Tryc', 'Specjalista ds. Techniczno - Handlowych', 'm.tryc@grupaeltron.pl', '6 0 9 8 8 0 3 3 1', 'Specjalista', 'Mazowiecki', 'Wschód', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Maciej Durajczyk', 'Dyrektor Sprzedaży Regionalnej - Region Północ', 'm.durajczyk@grupaeltron.pl', '6 9 1   2 2 7   2 8 0', 'Dyrektor', 'Pomorski', 'Północ', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Wojciech Paździorko', 'Kierownik Rynku Pomorskiego', 'w.pazdziorko@grupaeltron.pl', '8 8 7 6 5 0 7 2 4', 'Kierownik', 'Pomorski', 'Północ', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Joanna Drewing', 'Specjalistka ds. Wsparcia Sprzedaży', 'handelpomorski@grupaeltron.pl', '6 9 1 1 1 9 3 3 6', 'Wsparcie', 'Pomorski', 'Północ', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Mikołaj Jędrzejczak', 'Specjalista ds. Techniczno - Handlowych', 'm.jedrzejczak@grupaeltron.pl', '6 9 1 6 7 0 6 1 1', 'Specjalista', 'Pomorski', 'Północ', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Mikołaj Sadowczyk', 'Kierownik Rynku Wielkopolskiego', 'm.sadowczyk@grupaeltron.pl', '8 8 5 5 6 1 3 2 1', 'Kierownik', 'Wielkopolski', 'Północ', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Błażej Maroń', 'Specjalista ds. Techniczno - Handlowych', 'b.maron@grupaeltron.pl', '6 9 1 3 6 0 9 6 6', 'Specjalista', 'Wielkopolski', 'Północ', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Roksana Namyślak', 'Specjalistka ds. Wsparcia Sprzedaży', 'handelwielkopolski@grupaeltron.pl', '6 0 7   1 2 6   9 4 3', 'Wsparcie', 'Wielkopolski', 'Północ', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Łukasz Wasak', 'Dyrektor Sprzedaży Regionalnej - Region Południe', 'l.wasak@grupaeltron.pl', '6 9 1 6 7 0 6 0 8', 'Dyrektor', 'Lubelski', 'Południe', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Adrian Chotyniec', 'Kierownik Rynku Lubelskiego', 'a.chotyniec@grupaeltron.pl', '8 8 5   2 2 0   1 7 7', 'Kierownik', 'Lubelski', 'Południe', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Barbara Chrzanowska', 'Specjalistka ds. Wsparcia Sprzedaży', 'handellubelski@grupaeltron.pl', '6 0 7   1 5 0   5 1 0', 'Wsparcie', 'Lubelski', 'Południe', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Przemysław Ziętek', 'Specjalista ds. Techniczno - Handlowych', 'p.zietek@grupaeltron.pl', '6 0 9 8 8 1 0 1 9', 'Specjalista', 'Lubelski', 'Południe', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Marcin Szafraniec', 'Kierownik Rynku Małopolskiego', 'm.szafraniec@grupaeltron.pl', '8 8 5   5 0 2   9 4 0', 'Kierownik', 'Małopolski', 'Południe', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Monika Ładniak - Kamińska', 'Specjalistka ds. Wsparcia Sprzedaży', 'handelmalopolski@grupaeltron.pl', '8 8 7   1 3 3   7 3 0', 'Wsparcie', 'Małopolski', 'Południe', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Mariusz Szafrański', 'Specjalista ds. Techniczno - Handlowych', 'm.szafranski@grupaeltron.pl', '6 9 5   8 8 3   0 2 5', 'Specjalista', 'Małopolski', 'Południe', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Grzegorz Górny', 'Kierownik Rynku Śląskiego', 'g.gorny@grupaeltron.pl', '6 0 9   7 7 4   1 1 3', 'Kierownik', 'Śląski', 'Śląsk', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Łukasz Korgul', 'Kierownik Rynku Dolnośląskiego', 'l.korgul@grupaeltron.pl', '6 0 7   1 5 3   5 7 8', 'Kierownik', 'Dolnośląski', 'Śląsk', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Joanna Gabryś', 'Specjalistka ds. Wsparcia Sprzedaży', 'handeldolnoslaski@grupaeltron.pl', '6 6 7 8 0 1 0 1 0', 'Wsparcie', 'Dolnośląski', 'Śląsk', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');
INSERT INTO public.salespeople (name, stanowisko, email, phone, role, market, region, password_hash) VALUES ('Maksymilian Bala', 'Specjalista ds. Techniczno - Handlowych', 'm.bala@grupaeltron.pl', '6 6 7   8 0 2   1 1 2', 'Specjalista', 'Dolnośląski', 'Śląsk', '$2a$12$MishPOn0qzYwpPpynJjoqezObcu/iuQe1lXxuklwe/PfKOlFhrq96');

-- 3. Aktualizacja widoku company_client_stats, aby zawierał region handlowca
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

-- Odświeżenie PostgREST
NOTIFY pgrst, 'reload schema';
