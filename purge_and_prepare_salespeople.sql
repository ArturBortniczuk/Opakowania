-- SQL: Czyszczenie osieroconych rekordów Auth i przygotowanie tabeli profili pod migrację
-- Uruchom ten skrypt w Supabase SQL Editor przed uruchomieniem skryptu Node.js!

-- 1. Usunięcie wszelkich powiązań klucza obcego w public.profiles, aby móc ją bezpiecznie zmodyfikować
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Usunięcie osieroconych danych użytkowników i tożsamości z tabel systemowych auth
-- Usuwamy dane dla adresów e-mail handlowców pobranych z tabeli salespeople
DELETE FROM auth.users 
WHERE email IN (SELECT email FROM public.salespeople);

DELETE FROM auth.identities 
WHERE provider_id IN (SELECT email FROM public.salespeople)
   OR identity_data->>'email' IN (SELECT email FROM public.salespeople)
   OR user_id NOT IN (SELECT id FROM auth.users); -- Usuwa wszelkie osierocone tożsamości

-- 3. Usunięcie profili handlowców z public.profiles (zostaną automatycznie utworzone na nowo z poprawnymi UUID)
DELETE FROM public.profiles 
WHERE role IN ('Dyrektor', 'Kierownik', 'Wsparcie', 'Specjalista') 
   OR email IN (SELECT email FROM public.salespeople);

-- 4. Upewnienie się, że tabela public.profiles ma poprawny klucz obcy z ON DELETE CASCADE do auth.users
-- Jeśli profil nie ma dopasowanego użytkownika auth (np. stare śmieci), usuwamy go, aby zachować spójność referencyjną
DELETE FROM public.profiles WHERE id NOT IN (SELECT id FROM auth.users);

-- Dodanie poprawnego ograniczenia klucza obcego
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Odświeżenie schematu PostgREST
NOTIFY pgrst, 'reload schema';
