-- ============================================================
-- FIX BEZPIECZEŃSTWA: Polityki RLS
-- Uruchom w Supabase SQL Editor
-- ============================================================

-- 1. Naprawa polityki INSERT na profiles
--    Stara polityka pozwalała wstawić profil z dowolną rolą (nawet admin)
--    przez niezalogowanego użytkownika przez API!
DROP POLICY IF EXISTS "Zezwól na rejestrację profilu" ON public.profiles;

CREATE POLICY "Zezwól na rejestrację profilu"
ON public.profiles FOR INSERT
WITH CHECK (
  auth.uid() = id        -- tylko dla własnego konta
  AND role = 'client'    -- tylko rola klienta przy rejestracji
);

-- 2. Naprawa supplier_return_rules — za szeroka polityka FOR ALL (true)
--    Każdy zalogowany klient mógł edytować/usuwać reguły zwrotów!
DROP POLICY IF EXISTS "Zarządzanie zasadami dla zalogowanych" ON public.supplier_return_rules;
DROP POLICY IF EXISTS "Każdy odczytuje zasady zwrotów dostawców" ON public.supplier_return_rules;
DROP POLICY IF EXISTS "Admin zarządza zasadami zwrotów dostawców" ON public.supplier_return_rules;

-- Tylko odczyt dla wszystkich zalogowanych
CREATE POLICY "Każdy odczytuje zasady zwrotów dostawców"
ON public.supplier_return_rules FOR SELECT
USING (auth.role() = 'authenticated');

-- Tylko admin i supervisor mogą modyfikować
CREATE POLICY "Admin zarządza zasadami zwrotów dostawców"
ON public.supplier_return_rules FOR ALL
USING (
  public.get_my_role() IN ('admin', 'supervisor')
);

-- 3. Upewniamy się że salespeople nie są edytowalne przez klientów
ALTER TABLE IF EXISTS public.salespeople ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pracownicy odczytują handlowców" ON public.salespeople;
CREATE POLICY "Pracownicy odczytują handlowców"
ON public.salespeople FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin zarządza handlowcami" ON public.salespeople;
CREATE POLICY "Admin zarządza handlowcami"
ON public.salespeople FOR ALL
USING (
  public.get_my_role() IN ('admin', 'supervisor')
);

-- Odśwież schemat PostgREST
NOTIFY pgrst, 'reload schema';
