// Plik: src/utils/supabaseApi.js
// Opis: Całkowicie przebudowana, uproszczona i bezpieczniejsza logika API.

import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';

export const authAPI = {
  /**
   * Sprawdza, czy użytkownik (klient lub admin) istnieje i czy ma ustawione hasło.
   * @param {string} nip - Numer NIP.
   * @param {'client' | 'admin'} loginMode - Tryb logowania.
   * @returns {Promise<{exists: boolean, hasPassword: boolean, userData: object|null}>}
   */
  async checkUserStatus(nip, loginMode) {
    const table = loginMode === 'admin' ? 'admin_users' : 'users';
    
    const { data, error } = await supabase
      .from(table)
      .select('password_hash, name, nip, role, email, id, username, permissions')
      .eq('nip', nip)
      .maybeSingle(); // Używamy maybeSingle, aby brak rekordu nie był błędem

    if (error) {
      console.error('Check user error:', error);
      throw new Error('Błąd podczas sprawdzania użytkownika.');
    }

    if (!data) {
      return { exists: false, hasPassword: false, userData: null };
    }

    return {
      exists: true,
      hasPassword: !!data.password_hash, // Sprawdza, czy pole nie jest null/puste
      userData: data,
    };
  },

  /**
   * Loguje użytkownika z istniejącym hasłem.
   * @param {string} nip - Numer NIP.
   * @param {string} password - Hasło.
   * @param {object} userData - Dane użytkownika z checkUserStatus.
   * @returns {Promise<{user: object}>}
   */
  async signIn(nip, password, userData) {
    if (!password) {
      throw new Error('Hasło jest wymagane.');
    }
    
    // Prawdziwa weryfikacja z bcrypt powinna być w Edge Function.
    // Na potrzeby tego etapu, wykonujemy ją tutaj.
    const isValidPassword = await bcrypt.compare(password, userData.password_hash);
    if (!isValidPassword) {
      throw new Error('Nieprawidłowe hasło.');
    }

    if (userData.role === 'admin' || userData.role === 'supervisor') {
      await supabase
        .from('admin_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userData.id);
    } else {
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('nip', nip);
    }

    return {
      user: {
        id: userData.id,
        nip: userData.nip,
        username: userData.username,
        name: userData.name,
        email: userData.email,
        role: userData.role || 'client',
        permissions: userData.permissions,
        companyName: userData.role === 'client' ? userData.name : 'Grupa Eltron - Administrator',
      },
    };
  },

  /**
   * Ustawia hasło dla nowego użytkownika.
   * UWAGA: W przyszłości przenieś tę logikę do Supabase Edge Function dla bezpieczeństwa.
   * @param {string} nip - Numer NIP.
   * @param {string} password - Nowe hasło.
   * @param {'client' | 'admin'} loginMode - Tryb logowania.
   * @returns {Promise<{user: object}>}
   */
  async setPassword(nip, password, loginMode) {
    if (password.length < 6) {
      throw new Error('Hasło musi mieć co najmniej 6 znaków.');
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    const table = loginMode === 'admin' ? 'admin_users' : 'users';
    
    const { error } = await supabase
      .from(table)
      .update({ password_hash: passwordHash, is_first_login: false })
      .eq('nip', nip);

    if (error) {
      console.error('Set password error:', error);
      throw new Error('Nie udało się ustawić hasła.');
    }
    
    // Po pomyślnym ustawieniu hasła, "logujemy" użytkownika
    const { userData } = await this.checkUserStatus(nip, loginMode);
    return this.signIn(nip, password, userData);
  },
};

// Pozostałe funkcje API pozostają bez zmian
export const drumsAPI = { /* ... bez zmian ... */ };
export const companiesAPI = { /* ... bez zmian ... */ };
export const returnsAPI = { /* ... bez zmian ... */ };
export const returnPeriodsAPI = { /* ... bez zmian ... */ };
export const statsAPI = { /* ... bez zmian ... */ };

export const handleAPIError = (error, setError = null) => {
  console.error('Supabase API Error:', error);
  const errorMessage = error.message || 'Wystąpił błąd podczas połączenia z bazą danych';
  if (setError) {
    setError(errorMessage);
  }
  return errorMessage;
};
