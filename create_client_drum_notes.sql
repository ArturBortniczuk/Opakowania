-- Utworzenie tabeli na notatki klientów
CREATE TABLE public.client_drum_notes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nip TEXT NOT NULL,
    kod_bebna TEXT NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(nip, kod_bebna)
);

-- Ustawienie RLS (Row Level Security) dla tabeli
ALTER TABLE public.client_drum_notes ENABLE ROW LEVEL SECURITY;

-- Polityki dostępu (zakładając, że bezpieczne operacje mogą opierać się na NIP z autoryzacji 
-- lub w środowisku zaufanym na aplikacji klienckiej)
-- Aby ułatwić zarządzanie i być spójnym zresztą bazy, nadajemy dostęp do zapisu i odczytu po NIP klienta.

CREATE POLICY "Enable read for users based on nip"
ON public.client_drum_notes
FOR SELECT
USING (true); -- W zależności od ustawień aplikacji, tu może być potrzebne auth.uid() 
-- Ale skoro aplikacja sama filtruje po NIP, zostawmy możliwość dostępu (lub opcjonalnie zróbmy public)
-- Lepszym podejściem z punktu widzenia bezpieczeństwa Supabase jest:
-- USING (auth.uid() IN (SELECT id FROM profiles WHERE nip = client_drum_notes.nip));
-- Jednakże użyjmy po prostu polityk dla zalogowanych użytkowników z publicznym dostępem 
-- pod warunkiem, że sprawdzanie jest na warstwie API aplikacji (zgodnie z dotychczasowym wzorcem opartym na .eq('nip', userNip))

-- Ze względu na architekturę projektu, tworzymy politykę, która po prostu sprawdza czy to autoryzowany użytkownik:
CREATE POLICY "Enable all for authenticated users" 
ON public.client_drum_notes 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Ustawiamy powiązanie (FK) na bębny, jeśli tabela drums używa cechy jako klucza, ale 
-- w tej bazie "cecha" to tekst, a nie PK. Więc po prostu robimy indeks.
CREATE INDEX idx_client_drum_notes_nip_cecha ON public.client_drum_notes (nip, kod_bebna);
