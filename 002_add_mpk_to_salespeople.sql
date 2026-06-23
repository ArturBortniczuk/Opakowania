-- Dodanie kolumny MPK do tabeli handlowców
ALTER TABLE public.salespeople ADD COLUMN IF NOT EXISTS mpk TEXT;

-- Aktualizacja wartości MPK na podstawie przypisanego rynku
UPDATE public.salespeople SET mpk = '522-01-999' WHERE market = 'Podlaski';
UPDATE public.salespeople SET mpk = '522-02-999' WHERE market = 'Lubelski';
UPDATE public.salespeople SET mpk = '522-03-999' WHERE market = 'Mazowiecki';
UPDATE public.salespeople SET mpk = '522-04-999' WHERE market = 'Pomorski';
UPDATE public.salespeople SET mpk = '522-05-999' WHERE market = 'Małopolski';
UPDATE public.salespeople SET mpk = '522-06-999' WHERE market = 'Dolnośląski';
UPDATE public.salespeople SET mpk = '522-07-999' WHERE market = 'Wielkopolski';
UPDATE public.salespeople SET mpk = '522-08-999' WHERE market = 'Śląski';

-- Opcjonalnie: możemy też zapisać gdzieś MPK magazynowe, ale one zazwyczaj 
-- są wywoływane globalnie dla placówki, więc na razie przypisaliśmy rynki.
