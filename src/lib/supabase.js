// Plik: src/lib/supabase.js
// Opis: Poprawiona inicjalizacja klienta Supabase z przywróconym obiektem supabaseHelpers.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === 'undefined') {
  console.error('Brak klucza Supabase! URL:', !!supabaseUrl, 'Key:', !!supabaseAnonKey);
  throw new Error('Błąd krytyczny: Brak zmiennych środowiskowych Supabase. Sprawdź plik .env.local lub konfigurację Vercel.');
}

function getCookieDomain() {
  if (typeof window === 'undefined') return '';
  const host = window.location.hostname;
  if (host.includes('grupaeltron.pl')) {
    return '; domain=.grupaeltron.pl';
  }
  return '';
}

export const cookieStorage = {
  getItem: (key) => {
    if (typeof document === 'undefined') return null;
    const name = key + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i].trim();
      if (c.indexOf(name) === 0) {
        try {
          return decodeURIComponent(c.substring(name.length));
        } catch {
          return c.substring(name.length);
        }
      }
    }
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    if (typeof document === 'undefined') return;
    const domainStr = getCookieDomain();
    const isSecure = window.location.protocol === 'https:' ? '; Secure' : '';
    const maxAge = 60 * 60 * 24 * 30; // 30 dni
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax${domainStr}${isSecure}`;
    try {
      localStorage.setItem(key, value);
    } catch {}
  },
  removeItem: (key) => {
    if (typeof document === 'undefined') return;
    const domainStr = getCookieDomain();
    document.cookie = `${key}=; path=/; max-age=0; SameSite=Lax${domainStr}`;
    try {
      localStorage.removeItem(key);
    } catch {}
  }
};

console.log('🔧 Inicjalizacja Supabase ze wspólnym SSO (.grupaeltron.pl)...');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'eltron_auth_token',
    storage: cookieStorage
  }
});

// Helper functions
export const supabaseHelpers = {
  getDrumStatus(returnDate, reportedDate = null) {
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

    const now = reportedDate ? new Date(reportedDate) : new Date();
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
