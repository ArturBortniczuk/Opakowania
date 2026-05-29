import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Brak zmiennych środowiskowych Supabase. Sprawdź plik .env.local.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseHelpers = {
  getDrumStatus(returnDate: string | null) {
    if (!returnDate) {
      return {
        status: 'own',
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-100',
        borderColor: 'border-indigo-200',
        text: 'Własny',
        daysDiff: null
      };
    }

    const now = new Date();
    const returnDateTime = new Date(returnDate);
    now.setHours(0, 0, 0, 0);
    returnDateTime.setHours(0, 0, 0, 0);

    const daysDiff = Math.ceil((returnDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff < 0) {
      return {
        status: 'overdue',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-200',
        text: 'Przeterminowany',
        daysDiff: Math.abs(daysDiff)
      };
    } else if (daysDiff <= 14) {
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
