-- Tworzenie tabeli wątków czatu (chat_threads)
CREATE TABLE IF NOT EXISTS public.chat_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    client_name TEXT,
    company_name TEXT,
    nip TEXT,
    status TEXT DEFAULT 'open',
    last_message TEXT,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    unread_admin_count INT DEFAULT 0,
    unread_client_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tworzenie tabeli wiadomości (chat_messages)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sender_role TEXT NOT NULL, -- 'client' lub 'staff'
    sender_name TEXT,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeksy dla wydajności
CREATE INDEX IF NOT EXISTS idx_chat_threads_client ON public.chat_threads(client_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_updated ON public.chat_threads(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON public.chat_messages(thread_id, created_at ASC);

-- Włączenie Row Level Security (RLS)
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Polityki RLS
DROP POLICY IF EXISTS "Klienci widzą swoje wątki" ON public.chat_threads;
DROP POLICY IF EXISTS "Klienci tworzą swoje wątki" ON public.chat_threads;
DROP POLICY IF EXISTS "Klienci aktualizują swoje wątki" ON public.chat_threads;
DROP POLICY IF EXISTS "Pracownicy widzą wszystkie wątki" ON public.chat_threads;

CREATE POLICY "Klienci widzą swoje wątki" ON public.chat_threads
    FOR SELECT USING (auth.uid() = client_user_id);

CREATE POLICY "Klienci tworzą swoje wątki" ON public.chat_threads
    FOR INSERT WITH CHECK (auth.uid() = client_user_id);

CREATE POLICY "Klienci aktualizują swoje wątki" ON public.chat_threads
    FOR UPDATE USING (auth.uid() = client_user_id);

CREATE POLICY "Pracownicy widzą wszystkie wątki" ON public.chat_threads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND LOWER(profiles.role) IN ('admin', 'supervisor', 'dyrektor', 'kierownik', 'wsparcie', 'magazyn', 'specjalista')
        )
    );

DROP POLICY IF EXISTS "Klienci widzą wiadomości ze swoich wątków" ON public.chat_messages;
DROP POLICY IF EXISTS "Klienci wysyłają wiadomości do swoich wątków" ON public.chat_messages;
DROP POLICY IF EXISTS "Pracownicy zarządzają wszystkimi wiadomościami" ON public.chat_messages;

CREATE POLICY "Klienci widzą wiadomości ze swoich wątków" ON public.chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chat_threads
            WHERE chat_threads.id = chat_messages.thread_id
            AND chat_threads.client_user_id = auth.uid()
        )
    );

CREATE POLICY "Klienci wysyłają wiadomości do swoich wątków" ON public.chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_threads
            WHERE chat_threads.id = chat_messages.thread_id
            AND chat_threads.client_user_id = auth.uid()
        )
    );

CREATE POLICY "Pracownicy zarządzają wszystkimi wiadomościami" ON public.chat_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND LOWER(profiles.role) IN ('admin', 'supervisor', 'dyrektor', 'kierownik', 'wsparcie', 'magazyn', 'specjalista')
        )
    );

-- Dodanie do publikacji Supabase Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'chat_threads'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Publikacja realtime istnieje lub brak uprawnień: %', SQLERRM;
END $$;
