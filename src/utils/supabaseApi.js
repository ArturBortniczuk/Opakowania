// Plik: src/utils/supabaseApi.js
// Opis: Kompletna, bezpieczna wersja pliku do komunikacji z Supabase.
// Zawiera nową logikę autoryzacji oraz wszystkie pozostałe funkcje API.

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
      is_first_login: user.is_first_login,
      companyName: companyName,
    };
    
    localStorage.setItem('currentUser', JSON.stringify(finalUser));
    return { user: finalUser };
  },

  /**
   * Inicjuje proces ustawiania/resetowania hasła.
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
   * Ustawia nowe hasło dla użytkownika przy użyciu jednorazowego tokenu.
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
    
    return this.signIn(data.user.nip, password, 'client');
  },

  logout() {
    localStorage.removeItem('currentUser');
  }
};


// ==================================
//  Pozostałe API
// ==================================

export const drumsAPI = {
  async getDrums(nip = null) {
    try {
      let query = supabase
        .from('drums')
        .select(`*, companies ( name, email, phone, address ), custom_return_periods ( return_period_days )`);

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
  console.error('Błąd API Supabase:', error);
  const errorMessage = error.message || 'Wystąpił nieznany błąd. Spróbuj ponownie.';
  if (setError) {
    setError(errorMessage);
  }
  return errorMessage;
};
