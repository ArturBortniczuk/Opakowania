-- Skrypt tworzący konta dla pracowników magazynu w Supabase Auth
-- Domyślne hasło dla wszystkich to: Magazyn2026! (użytkownicy mogą je potem zmienić)

DO $$
DECLARE
    default_password text := crypt('Magazyn2026!', gen_salt('bf'));
BEGIN
    -- 1. Mateusz Bagiński
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'm.baginski@grupaeltron.pl') THEN
        INSERT INTO auth.users (
            id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), 'authenticated', 'authenticated', 'm.baginski@grupaeltron.pl', default_password, now(),
            '{"provider":"email","providers":["email"]}',
            '{"name":"Mateusz Bagiński", "role":"Specjalista", "status":"approved", "department":"Magazyn"}',
            now(), now()
        );
    END IF;

    -- 2. Marcin Pawlak
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'm.pawlak@grupaeltron.pl') THEN
        INSERT INTO auth.users (
            id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), 'authenticated', 'authenticated', 'm.pawlak@grupaeltron.pl', default_password, now(),
            '{"provider":"email","providers":["email"]}',
            '{"name":"Marcin Pawlak", "role":"Specjalista", "status":"approved", "department":"Magazyn"}',
            now(), now()
        );
    END IF;

    -- 3. Michał Borkowski
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'm.borkowski@grupaeltron.pl') THEN
        INSERT INTO auth.users (
            id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), 'authenticated', 'authenticated', 'm.borkowski@grupaeltron.pl', default_password, now(),
            '{"provider":"email","providers":["email"]}',
            '{"name":"Michał Borkowski", "role":"Specjalista", "status":"approved", "department":"Magazyn"}',
            now(), now()
        );
    END IF;

    -- 4. Kamil Gryka
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'k.gryka@grupaeltron.pl') THEN
        INSERT INTO auth.users (
            id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), 'authenticated', 'authenticated', 'k.gryka@grupaeltron.pl', default_password, now(),
            '{"provider":"email","providers":["email"]}',
            '{"name":"Kamil Gryka", "role":"Specjalista", "status":"approved", "department":"Magazyn"}',
            now(), now()
        );
    END IF;

    -- 5. Paweł Opolski
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'p.opolski@grupaeltron.pl') THEN
        INSERT INTO auth.users (
            id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), 'authenticated', 'authenticated', 'p.opolski@grupaeltron.pl', default_password, now(),
            '{"provider":"email","providers":["email"]}',
            '{"name":"Paweł Opolski", "role":"Specjalista", "status":"approved", "department":"Magazyn"}',
            now(), now()
        );
    END IF;

    -- 6. Mateusz Klewinowski
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'mateusz.klewinowski@grupaeltron.pl') THEN
        INSERT INTO auth.users (
            id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), 'authenticated', 'authenticated', 'mateusz.klewinowski@grupaeltron.pl', default_password, now(),
            '{"provider":"email","providers":["email"]}',
            '{"name":"Mateusz Klewinowski", "role":"Specjalista", "status":"approved", "department":"Magazyn"}',
            now(), now()
        );
    END IF;

END $$;
