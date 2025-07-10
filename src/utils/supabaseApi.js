// src/utils/supabaseApi.js
// Finalna, kompletna i poprawiona wersja pliku do komunikacji z Supabase.

import { supabase, supabaseHelpers } from '../lib/supabase';

// ==================================
//  API do Autoryzacji (POPRAWIONA WERSJA)
// ==================================
export const authAPI = {
  /**
   * Sprawdza, czy użytkownik (klient lub admin) może się zalogować.
   * Ustala, czy konto istnieje i czy ma już ustawione hasło.
   * @param {string} nip - Numer NIP.
   * @param {'client' | 'admin'} loginMode - Tryb logowania.
   * @returns {Promise<{exists: boolean, hasPassword: boolean, userData: object | null}>}
   */
  async checkUserStatus(nip, loginMode) {
    if (loginMode === 'admin') {
      // --- Logika dla Administratora ---
      const { data, error } = await supabase
        .from('admin_users')
        .select('name, password_hash')
        .eq('nip', nip)
        .maybeSingle();

      if (error) {
        console.error('Błąd przy sprawdzaniu admina:', error);
        throw new Error('Błąd serwera przy weryfikacji administratora.');
      }

      if (!data) {
        return { exists: false, hasPassword: false, userData: null };
      }

      return { exists: true, hasPassword: !!data.password_hash, userData: data };

    } else {
      // --- Logika dla Klienta (POPRAWIONA) ---
      // 1. Sprawdź, czy firma o danym NIP istnieje w tabeli 'companies'.
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('name, email')
        .eq('nip', nip)
        .maybeSingle();

      if (companyError) {
        console.error('Błąd przy sprawdzaniu firmy:', companyError);
        throw new Error('Błąd serwera przy weryfikacji firmy.');
      }

      if (!companyData) {
        return { exists: false, hasPassword: false, userData: null };
      }

      // 2. Firma istnieje. Teraz sprawdzamy, czy ma już konto w tabeli 'users'.
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('password_hash')
        .eq('nip', nip)
        .maybeSingle();

      if (userError) {
        console.error('Błąd przy sprawdzaniu użytkownika klienta:', userError);
        throw new Error('Błąd serwera przy weryfikacji użytkownika.');
      }
      
      return {
        exists: true,
        hasPassword: !!(userData && userData.password_hash),
        userData: companyData,
      };
    }
  },

  /**
   * Loguje użytkownika za pomocą funkcji serwerowej 'sign-in'.
   */
  async signIn(nip, password, loginMode) {
    const { data, error } = await supabase.functions.invoke('sign-in', {
      body: { nip, password, loginMode },
    });

    if (error) {
      const errorMessage = error.context?.data?.error || error.message || 'Wystąpił nieznany błąd logowania.';
      throw new Error(errorMessage);
    }
    
    if (data.error) {
      throw new Error(data.error);
    }

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

    const finalUser = {
      id: user.id,
      nip: user.nip,
      username: user.username || user.nip,
      name: user.name,
      email: user.email,
      role: user.role || loginMode,
      permissions: user.permissions || [],
      companyName: companyName,
    };
    
    localStorage.setItem('currentUser', JSON.stringify(finalUser));
    return { user: finalUser };
  },

  /**
   * Ustawia hasło za pomocą funkcji serwerowej 'set-password'.
   */
  async setPassword(nip, password, loginMode) {
    if (password.length < 6) {
      throw new Error('Hasło musi mieć co najmniej 6 znaków.');
    }

    const { data, error } = await supabase.functions.invoke('set-password', {
      body: { nip, password, loginMode },
    });

    if (error) {
      const errorMessage = error.context?.data?.error || error.message || 'Nie udało się ustawić hasła.';
      throw new Error(errorMessage);
    }
    
    if (data.error) {
      throw new Error(data.error);
    }

    return this.signIn(nip, password, loginMode);
  },
};

// --- Reszta Twojego oryginalnego kodu ---

export const drumsAPI = {
  async getDrums(nip = null) {
    try {
      let query = supabase
        .from('drums')
        .select(`
          *,
          companies ( name, email, phone, address ),
          custom_return_periods ( return_period_days )
        `);

      if (nip) {
        query = query.eq('nip', nip);
      }

      const { data, error } = await query.order('kod_bebna');
      if (error) throw error;

      return data.map(drum => {
        const returnPeriodDays = drum.custom_return_periods?.[0]?.return_period_days || 85;
        const status = supabaseHelpers.getDrumStatus(drum.data_zwrotu_do_dostawcy);
        
        return {
          ...drum,
          KOD_BEBNA: drum.kod_bebna,
          NAZWA: drum.nazwa,
          CECHA: drum.cecha,
          DATA_ZWROTU_DO_DOSTAWCY: drum.data_zwrotu_do_dostawcy,
          KON_DOSTAWCA: drum.kon_dostawca,
          PELNA_NAZWA_KONTRAHENTA: drum.companies?.name || 'Brak danych firmy',
          NIP: drum.nip,
          TYP_DOK: drum.typ_dok,
          NR_DOKUMENTUPZ: drum.nr_dokumentupz,
          'Data przyjęcia na stan': drum.data_przyjecia_na_stan,
          KONTRAHENT: drum.kontrahent,
          STATUS: drum.status,
          DATA_WYDANIA: drum.data_wydania,
          company: drum.companies?.name || 'Brak danych firmy',
          companyPhone: drum.companies?.phone,
          companyEmail: drum.companies?.email,
          companyAddress: drum.companies?.address,
          returnPeriodDays,
          ...status
        };
      });
    } catch (error) {
      console.error('Drums API error:', error);
      throw error;
    }
  },
};

export const companiesAPI = {
  async getCompanies() {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select(`*, custom_return_periods(return_period_days), drums(count), return_requests(count)`)
        .order('name');

      if (error) throw error;

      return data.map(company => ({
        ...company,
        drumsCount: company.drums?.[0]?.count || 0,
        totalRequests: company.return_requests?.[0]?.count || 0,
        returnPeriodDays: company.custom_return_periods?.[0]?.return_period_days || 85
      }));
    } catch (error) {
      console.error('Companies API error:', error);
      throw error;
    }
  },
};

export const returnsAPI = {
  async getReturns(nip = null) {
    try {
      let query = supabase.from('return_requests').select(`*, companies(name)`);
      if (nip) {
        query = query.eq('user_nip', nip);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Returns API error:', error);
      throw error;
    }
  },
};

export const returnPeriodsAPI = {
  async getReturnPeriods() {
    try {
      const { data, error } = await supabase
        .from('custom_return_periods')
        .select(`*, companies(name, email, phone)`)
        .order('companies(name)');
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Return periods API error:', error);
      throw error;
    }
  },
};

export const statsAPI = {
  async getDashboardStats(nip = null) {
    try {
      const now = new Date().toISOString();
      if (nip) {
        const [{ count: totalDrums }, { count: overdueDrums }, { count: dueSoonDrums }, { count: totalRequests }, { count: pendingRequests }] = await Promise.all([
          supabase.from('drums').select('*', { count: 'exact', head: true }).eq('nip', nip),
          supabase.from('drums').select('*', { count: 'exact', head: true }).eq('nip', nip).lt('data_zwrotu_do_dostawcy', now),
          supabase.from('drums').select('*', { count: 'exact', head: true }).eq('nip', nip).gte('data_zwrotu_do_dostawcy', now).lte('data_zwrotu_do_dostawcy', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
          supabase.from('return_requests').select('*', { count: 'exact', head: true }).eq('user_nip', nip),
          supabase.from('return_requests').select('*', { count: 'exact', head: true }).eq('user_nip', nip).eq('status', 'Pending')
        ]);
        return { totalDrums: totalDrums || 0, activeDrums: (totalDrums || 0) - (overdueDrums || 0) - (dueSoonDrums || 0), pendingReturns: overdueDrums || 0, recentReturns: dueSoonDrums || 0, totalRequests: totalRequests || 0, pendingRequests: pendingRequests || 0 };
      }
      const [{ count: totalClients }, { count: totalDrums }, { count: overdueDrums }, { count: dueSoonDrums }, { count: totalRequests }, { count: pendingRequests }, { count: approvedRequests }, { count: completedRequests }] = await Promise.all([
        supabase.from('companies').select('*', { count: 'exact', head: true }),
        supabase.from('drums').select('*', { count: 'exact', head: true }),
        supabase.from('drums').select('*', { count: 'exact', head: true }).lt('data_zwrotu_do_dostawcy', now),
        supabase.from('drums').select('*', { count: 'exact', head: true }).gte('data_zwrotu_do_dostawcy', now).lte('data_zwrotu_do_dostawcy', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('return_requests').select('*', { count: 'exact', head: true }),
        supabase.from('return_requests').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
        supabase.from('return_requests').select('*', { count: 'exact', head: true }).eq('status', 'Approved'),
        supabase.from('return_requests').select('*', { count: 'exact', head: true }).eq('status', 'Completed')
      ]);
      return { totalClients: totalClients || 0, totalDrums: totalDrums || 0, activeDrums: (totalDrums || 0) - (overdueDrums || 0) - (dueSoonDrums || 0), pendingReturns: pendingRequests || 0, overdueReturns: overdueDrums || 0, activeRequests: (pendingRequests || 0) + (approvedRequests || 0), completedRequests: completedRequests || 0, totalRequests: totalRequests || 0 };
    } catch (error) {
      console.error('Stats API error:', error);
      throw error;
    }
  }
};

export const handleAPIError = (error, setError = null) => {
  console.error('Supabase API Error:', error);
  const errorMessage = error.message || 'Wystąpił błąd podczas połączenia z bazą danych';
  if (setError) {
    setError(errorMessage);
  }
  return errorMessage;
};
