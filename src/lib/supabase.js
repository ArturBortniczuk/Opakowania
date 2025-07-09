// Plik: src/lib/supabase.js
// Opis: Poprawiona inicjalizacja klienta Supabase.
// Create React App wymaga prefiksu REACT_APP_ dla zmiennych środowiskowych.
// Musisz ręcznie dodać te zmienne w panelu Vercel.

import { createClient } from '@supabase/supabase-js'

// WAŻNE: Upewnij się, że w ustawieniach projektu na Vercel
// dodałeś RĘCZNIE poniższe zmienne środowiskowe, kopiując wartości
// ze zmiennych dodanych przez integrację (np. z NEXT_PUBLIC_SUPABASE_URL).
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Ten błąd pojawia się, gdy zmienne środowiskowe nie są poprawnie załadowane.
  throw new Error('Błąd krytyczny: Brak zmiennych środowiskowych Supabase. Sprawdź konfigurację w Vercel.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
