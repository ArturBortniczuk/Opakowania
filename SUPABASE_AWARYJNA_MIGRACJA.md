# 🚨 Procedura Awaryjna: Odtwarzanie Bazy Supabase od Zera

Ten plik zawiera wszystkie kroki, które należy podjąć, jeśli stare konto Supabase zostanie zbanowane i trzeba błyskawicznie postawić aplikację na nowym koncie bez powtarzania starych błędów.

> [!WARNING]
> **NIGDY** nie używaj starego skryptu `recreate_database_full.sql`, ponieważ wstrzykuje on użytkowników bezpośrednio jako "duchy" do `auth.users`, co całkowicie psuje późniejszą rejestrację!

---

## Krok 1: Inicjalizacja nowej bazy
1. Załóż nowy projekt w Supabase.
2. Wklej do **SQL Editora** skrypt `000_final_migration_v2.sql` i go uruchom.

## Krok 2: Poprawki przed importem CSV (Table Editor)
Zanim wgrasz pliki CSV z systemu (np. firmy i bębny), musisz poprawić kilka ograniczeń w bazie:

1. **Firmy (Companies) - Długie telefony:**
   Wejdź w SQL Editor i uruchom:
   ```sql
   ALTER TABLE public.companies ALTER COLUMN phone TYPE TEXT;
   ```
   *Powód: Plik Excela często zawiera 2 numery w jednej komórce, co przekracza limit `VARCHAR(20)`.*

2. **Bębny (Drums) - NIPy z myślnikami i brakująca kolumna:**
   Wejdź w SQL Editor i uruchom:
   ```sql
   -- Dodanie brakującej kolumny
   ALTER TABLE public.drums ADD COLUMN IF NOT EXISTS cena_netto_bebna NUMERIC;

   -- Zwiększenie limitu znaków dla NIPu z myślnikami
   -- (Najpierw zdejmujemy widok i RLS, zmieniamy typ i zakładamy z powrotem)
   DROP VIEW IF EXISTS public.company_client_stats;
   DROP POLICY IF EXISTS "Klient odczytuje swoje bębny" ON public.drums;
   DROP POLICY IF EXISTS "Klient aktualizuje swoje bębny" ON public.drums;
   
   ALTER TABLE public.drums ALTER COLUMN nip TYPE VARCHAR(20);
   ```

Po tych zabiegach wchodzisz w zakładkę **Table Editor** i normalnie wgrywasz CSV z firmami, a potem z bębnami (kreator sam posprząta myślniki dzięki naszemu wyzwalaczowi).

---

## Krok 3: Podmiana kluczy na Vercelu (Pomijamy integrację!)

> [!CAUTION]
> **NIE używaj** przycisku "Install Integration" w Vercelu. Często blokuje on zmienne środowiskowe i łączy z niewłaściwym kontem!

1. Zaloguj się na **Vercel** -> Twój Projekt -> **Settings** -> **Environment Variables**.
2. **Skasuj WSZYSTKIE** zmienne, które mają obok siebie dopisek "Supabase" / "Needs Attention".
3. Dodaj ręcznie **TYLKO** te cztery zmienne z palca:
   - `NEXT_PUBLIC_SUPABASE_URL` = (Nowy URL z Supabase)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (Nowy krótki `sb_publishable_...` LUB stary długi `eyJhbGci...`)
   - `REACT_APP_SUPABASE_URL` = (To samo co w NEXT_PUBLIC)
   - `REACT_APP_SUPABASE_ANON_KEY` = (To samo co w NEXT_PUBLIC)
   - `SUPABASE_SERVICE_ROLE_KEY` = (Twój tajny klucz `sb_secret_...`)
4. Zrób aktualizację tych samych kluczy w lokalnym pliku `.env.local` na komputerze.
5. Przejdź w Vercelu do **Deployments** i kliknij **Redeploy**.

---

## Krok 4: Czyste dodanie Handlowców i Admina (Auth)
Aby uniknąć błędu `Database error creating new user`, wynikającego z rygorystycznego systemu autoryzacji:

1. **Wyłącz wyzwalacz rejestracji w SQL Editorze:**
   ```sql
   DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
   DELETE FROM auth.users; -- Opcjonalnie: czyści bazę duchów, jeśli omyłkowo wgrano stare skrypty
   ```

2. **Stwórz swoje konto Admina:**
   - W Supabase wejdź w **Authentication** -> **Add user**.
   - Dodaj siebie i **koniecznie zaznacz "Auto Confirm User"**.

3. **Dodaj 32 handlowców skryptem:**
   - Na komputerze w terminalu (w folderze projektu) uruchom:
   ```bash
   node scripts/createSalespeopleAccounts.mjs
   ```

4. **Synchronizacja Profili i Włączenie Wyzwalacza:**
   - Wróć do SQL Editora i odpal ten skrypt, który zsynchronizuje wszystkich i nada im role Admina/Kierownika:
   ```sql
   -- Przypisanie Ciebie jako Admina (podmień maila na swojego!)
   INSERT INTO public.profiles (id, email, name, role, status)
   SELECT id, email, 'Administrator', 'admin', 'approved'
   FROM auth.users
   WHERE email = 'a.bortniczuk@grupaeltron.pl'
   ON CONFLICT (id) DO UPDATE SET role = 'admin', status = 'approved';

   -- Synchronizacja reszty handlowców
   INSERT INTO public.profiles (id, email, name, role, status, rodo_accepted)
   SELECT u.id, u.email, s.name, s.role, 'approved', true
   FROM auth.users u
   JOIN public.salespeople s ON u.email = s.email
   ON CONFLICT (id) DO NOTHING;

   -- PONOWNE WŁĄCZENIE WYZWALACZA DLA KLIENTÓW
   CREATE TRIGGER on_auth_user_created
     AFTER INSERT ON auth.users
     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
   ```

To wszystko! Aplikacja jest gotowa do działania.
