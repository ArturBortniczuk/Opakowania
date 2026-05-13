-- Tabela definiująca zasady zwrotów bębnów dla poszczególnych dostawców
CREATE TABLE IF NOT EXISTS public.supplier_return_rules (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier_name text NOT NULL,        -- Nazwa dostawcy (odpowiada KON_DOSTAWCA)
    max_days_overdue integer NOT NULL,  -- Maksymalne dopuszczalne opóźnienie w dniach dla danej stawki (np. 30 oznacza od 1 do 30 dni)
                                        -- Wartość 0 lub mniejsza oznacza brak opóźnienia (zwrot w terminie)
    return_percentage numeric NOT NULL, -- Jaki procent wartości bębna zwracamy (np. 75, 100)
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Przykładowe wstawienie danych (zgodnie z życzeniem - NKT opóźnienie do 30 dni = 75%)
INSERT INTO public.supplier_return_rules (supplier_name, max_days_overdue, return_percentage)
VALUES 
    ('NKT', 0, 100),   -- Zwrot w terminie lub przed terminem = 100%
    ('NKT', 30, 75),   -- Zwrot spóźniony do 30 dni = 75%
    ('NKT', 60, 50);   -- Zwrot spóźniony do 60 dni = 50%

-- Opcjonalne zabezpieczenia RLS (pozwalające na odczyt przez klientów, żeby aplikacja mogła kalkulować % w locie)
ALTER TABLE public.supplier_return_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Odczyt zasad zwrotów dla wszystkich" 
ON public.supplier_return_rules FOR SELECT 
USING (true);
