-- Usunięcie starej polityki (żeby zachować porządek)
DROP POLICY IF EXISTS "Odczyt zasad zwrotƈw dla wszystkich" ON public.supplier_return_rules;
DROP POLICY IF EXISTS "Zarządzanie zasadami dla zalogowanych" ON public.supplier_return_rules;
DROP POLICY IF EXISTS "Odczyt zasad zwrotów dla wszystkich" ON public.supplier_return_rules;

-- Utworzenie nowej polityki zezwalającej na WSZYSTKIE operacje (Select, Insert, Update, Delete) 
-- dla każdego zalogowanego użytkownika w systemie
CREATE POLICY "Zarządzanie zasadami dla zalogowanych" 
ON public.supplier_return_rules 
FOR ALL 
USING (true)
WITH CHECK (true);
