// Plik: src/lib/supabase.js
// Opis: Poprawiona inicjalizacja klienta Supabase z przywróconym obiektem supabaseHelpers.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Błąd krytyczny: Brak zmiennych środowiskowych Supabase. Sprawdź konfigurację w Vercel.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper functions
export const supabaseHelpers = {
  getDrumStatus(returnDate) {
    if (!returnDate) {
      return {
        status: 'unknown',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-200',
        text: 'Brak daty',
        daysDiff: null
      };
    }

    const now = new Date();
    const returnDateTime = new Date(returnDate);
    // Resetujemy czas do północy, aby uniknąć problemów ze strefami czasowymi
    now.setHours(0, 0, 0, 0);
    returnDateTime.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.ceil((returnDateTime - now) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 0) {
      return {
        status: 'overdue',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-200',
        text: 'Przeterminowany',
        daysDiff: Math.abs(daysDiff)
      };
    } else if (daysDiff <= 7) {
      return {
        status: 'due-soon',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        borderColor: 'border-yellow-200',
        text: `Za ${daysDiff} dni`,
        daysDiff
      };
    } else {
      return {
        status: 'active',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        borderColor: 'border-green-200',
        text: 'Aktywny',
        daysDiff
      };
    }
  }
};
