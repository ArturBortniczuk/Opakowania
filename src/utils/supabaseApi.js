// Plik: src/utils/supabaseApi.js
// Opis: Finalna, poprawiona wersja logiki API.

import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';

export const authAPI = {
  /**
   * Sprawdza, czy użytkownik (klient lub admin) istnieje i czy ma ustawione hasło.
   */
  async checkUserStatus(nip, loginMode) {
    const table = loginMode === 'admin' ? 'admin_users' : 'users';
    
    const { data, error } = await supabase
      .from(table)
      .select('password_hash, name, nip, role, email, id, username, permissions')
      .eq('nip', nip)
      .maybeSingle();

    if (error) {
      console.error('Check user error:', error);
      throw new Error('Błąd podczas sprawdzania użytkownika.');
    }

    if (!data) {
      return { exists: false, hasPassword: false, userData: null };
    }

    return {
      exists: true,
      hasPassword: !!data.password_hash,
      userData: data,
    };
  },

  /**
   * Loguje użytkownika z istniejącym hasłem.
   */
  async signIn(nip, password, userData, loginMode) {
    if (!password) {
      throw new Error('Hasło jest wymagane.');
    }
    
    const isValidPassword = await bcrypt.compare(password, userData.password_hash);
    if (!isValidPassword) {
      throw new Error('Nieprawidłowe hasło.');
    }

    const table = loginMode === 'admin' ? 'admin_users' : 'users';
    const updateColumn = loginMode === 'admin' ? 'id' : 'nip';
    const updateValue = loginMode === 'admin' ? userData.id : nip;

    await supabase
      .from(table)
      .update({ last_login: new Date().toISOString() })
      .eq(updateColumn, updateValue);

    return {
      user: {
        id: userData.id,
        nip: userData.nip,
        username: userData.username,
        name: userData.name,
        email: userData.email,
        role: userData.role || 'client',
        permissions: userData.permissions,
        companyName: loginMode === 'client' ? userData.name : 'Grupa Eltron - Administrator',
      },
    };
  },

  /**
   * Ustawia hasło dla nowego użytkownika.
   */
  async setPassword(nip, password, loginMode) {
    if (password.length < 6) {
      throw new Error('Hasło musi mieć co najmniej 6 znaków.');
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    const table = loginMode === 'admin' ? 'admin_users' : 'users';
    
    // KLUCZOWA ZMIANA: Tworzymy obiekt do aktualizacji
    // i dodajemy `is_first_login` tylko dla klientów.
    const updateData = {
      password_hash: passwordHash,
    };
    if (loginMode === 'client') {
      updateData.is_first_login = false;
    }
    
    const { error } = await supabase
      .from(table)
      .update(updateData)
      .eq('nip', nip);

    if (error) {
      console.error('Set password error:', error);
      throw new Error('Nie udało się ustawić hasła.');
    }
    
    const { userData } = await this.checkUserStatus(nip, loginMode);
    return this.signIn(nip, password, userData, loginMode);
  },
};

// Pozostałe funkcje API (drumsAPI, companiesAPI, etc.) pozostają bez zmian.
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
