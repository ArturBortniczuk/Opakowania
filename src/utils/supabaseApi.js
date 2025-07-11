// Plik: src/utils/supabaseApi.js
// Opis: Zaktualizowana i bezpieczna wersja pliku do komunikacji z Supabase.
// Usunięto niebezpieczne funkcje i dodano obsługę nowego przepływu rejestracji/resetowania hasła.

import { supabase, supabaseHelpers } from '../lib/supabase';

// ==================================
//  API do Autoryzacji (Bezpieczna Wersja)
// ==================================
export const authAPI = {
  /**
   * Loguje użytkownika (klienta lub admina) za pomocą NIP i hasła.
   * Wywołuje funkcję Edge 'sign-in', która bezpiecznie weryfikuje dane.
   * @param {string} nip - Numer NIP użytkownika.
   * @param {string} password - Hasło użytkownika.
   * @param {'client' | 'admin'} loginMode - Tryb logowania.
   * @returns {Promise<{user: object}>} Obiekt z danymi zalogowanego użytkownika.
   */
  async signIn(nip, password, loginMode) {
    const { data, error } = await supabase.functions.invoke('sign-in', {
      body: { nip, password, loginMode },
    });

    if (error) {
      // Przechwytywanie błędu z funkcji Edge i rzucanie go dalej
      const errorMessage = error.context?.data?.error || error.message || 'Wystąpił nieznany błąd logowania.';
      throw new Error(errorMessage);
    }
    
    if (data.error) {
      throw new Error(data.error);
    }

    // Po pomyślnym zalogowaniu, pobieramy dodatkowe dane, np. nazwę firmy
    const user = data.user;
    let companyName = 'Brak nazwy firmy';
    if (loginMode === 'admin') {
        companyName = user.name || 'Administrator';
    } else {
        const { data: companyData } = await supabase.from('companies').select('name').eq('nip', nip).single();
        if (companyData) {
            companyName = companyData.name;
        }
    }

    // Tworzymy finalny obiekt użytkownika do przechowywania w stanie aplikacji
    const finalUser = {
      id: user.id,
      nip: user.nip,
      username: user.username || user.nip,
      name: user.name,
      email: user.email,
      role: user.role || loginMode,
      is_first_login: user.is_first_login, // Ważne dla wymuszenia zmiany hasła
      companyName: companyName,
    };
    
    localStorage.setItem('currentUser', JSON.stringify(finalUser));
    return { user: finalUser };
  },

  /**
   * (NOWA FUNKCJA) Inicjuje proces ustawiania/resetowania hasła.
   * Wywołuje funkcję Edge, która wysyła e-mail z linkiem do klienta.
   * @param {string} nip - Numer NIP firmy.
   * @returns {Promise<{message: string}>} Potwierdzenie wysłania.
   */
  async requestPasswordSetup(nip) {
    const { data, error } = await supabase.functions.invoke('request-password-setup', {
      body: { nip },
    });

    if (error) {
      const errorMessage = error.context?.data?.error || error.message || 'Wystąpił błąd.';
      throw new Error(errorMessage);
    }
    
    return data;
  },

  /**
   * (NOWA FUNKCJA) Ustawia nowe hasło dla użytkownika przy użyciu jednorazowego tokenu.
   * Wywoływana po kliknięciu linku z e-maila.
   * @param {string} token - Jednorazowy token z adresu URL.
   * @param {string} password - Nowe hasło podane przez użytkownika.
   * @returns {Promise<{user: object}>} Obiekt z danymi zalogowanego użytkownika.
   */
  async setNewPassword(token, password) {
    if (!password || password.length < 6) {
      throw new Error('Hasło musi mieć co najmniej 6 znaków.');
    }
    
    const { data, error } = await supabase.functions.invoke('set-new-password', {
      body: { token, password },
    });

    if (error) {
      const errorMessage = error.context?.data?.error || error.message || 'Nie udało się ustawić hasła.';
      throw new Error(errorMessage);
    }

    if (data.error) {
      throw new Error(data.error);
    }
    
    // Po pomyślnym ustawieniu hasła, od razu logujemy użytkownika
    // Wykorzystujemy NIP zwrócony przez funkcję backendową
    return this.signIn(data.user.nip, password, 'client');
  },

  /**
   * Wylogowuje użytkownika, czyszcząc dane z localStorage.
   */
  logout() {
    localStorage.removeItem('currentUser');
    // Tutaj można dodać ewentualne wywołanie supabase.auth.signOut(), jeśli używasz wbudowanej autoryzacji
  }
};


// ==================================
//  Pozostałe API (bez zmian)
// ==================================

export const drumsAPI = {
  // ... (twoje istniejące funkcje drumsAPI)
};

export const companiesAPI = {
  // ... (twoje istniejące funkcje companiesAPI)
};

export const returnsAPI = {
  // ... (twoje istniejące funkcje returnsAPI)
};

// ... i tak dalej dla pozostałych sekcji API.

/**
 * Ogólna funkcja do obsługi błędów z API.
 * @param {Error} error - Obiekt błędu.
 * @param {Function | null} setError - Opcjonalna funkcja do ustawiania stanu błędu w komponencie.
 * @returns {string} Komunikat błędu.
 */
export const handleAPIError = (error, setError = null) => {
  console.error('Błąd API Supabase:', error);
  const errorMessage = error.message || 'Wystąpił nieznany błąd. Spróbuj ponownie.';
  
  if (setError) {
    setError(errorMessage);
  }
  
  return errorMessage;
};
