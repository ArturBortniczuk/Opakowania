CREATE TABLE IF NOT EXISTS public.admin_drum_notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nip TEXT NOT NULL,
  kod_bebna TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(nip, kod_bebna)
);

ALTER TABLE public.admin_drum_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dostęp dla autoryzowanych" ON public.admin_drum_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);
