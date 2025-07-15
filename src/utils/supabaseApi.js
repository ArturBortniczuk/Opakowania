// src/utils/supabaseApi.js
// WERSJA DO OSTATECZNEGO DEBUGOWANIA

import { supabase, supabaseHelpers } from '../lib/supabase';

// ==================================
//  API do Autoryzacji (bez zmian)
// ==================================
export const authAPI = {
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
    if (loginMode === 'admin' || user.role === 'supervisor') {
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
      name: user.name || companyName,
      email: user.email,
      role: user.role || loginMode,
      is_first_login: user.is_first_login,
      companyName: companyName,
    };
    
    localStorage.setItem('currentUser', JSON.stringify(finalUser));
    return { user: finalUser };
  },

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

  async setNewPassword(token, password) {
    if (!password || password.length < 6) {
      throw new Error('Hasło musi mieć co najmniej 6 znaków.');
    }
    
    const { data, error } = await supabase.functions.invoke('set-new-password', {
      body: { token, password },
    });

    if (error) {
      const errorMessage = error.context?.data?.error || error.message || 'Nie udało się ustawić hasła. Link mógł wygasnąć.';
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
//  API do Bębnów (WERSJA DEBUGUJĄCA)
// ==================================
export const drumsAPI = {
  async getDrums(nip = null) {
    try {
      // --- ZMIANA DO DEBUGOWANIA ---
      // Upraszczamy zapytanie do absolutnego minimum.
      // Pobieramy WSZYSTKIE bębny, bez relacji i bez filtrowania po NIP.
      console.log("DEBUG: Wywołanie getDrums bez filtrowania NIP.");
      let query = supabase.from('drums').select('*');

      // Jeśli chcesz przetestować filtrowanie, odkomentuj poniższy blok
      /*
      if (nip) {
        console.log(`DEBUG: Dodano filtr NIP: ${nip}`);
        query = query.eq('nip', nip);
      }
      */

      const { data, error, count } = await query.order('kod_bebna');
      
      console.log("DEBUG: Odpowiedź z Supabase:", { data, error, count });

      if (error) {
        console.error("DEBUG: Błąd w zapytaniu Supabase:", error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.warn("DEBUG: Zapytanie do bazy danych zwróciło 0 bębnów.");
      }

      // Mapowanie danych do spójnego formatu używanego w komponentach
      return data.map(drum => {
        const status = supabaseHelpers.getDrumStatus(drum.data_zwrotu_do_dostawcy);
        const issueDate = new Date(drum.data_wydania || drum.data_przyjecia_na_stan);
        const daysInPossession = Math.ceil((new Date() - issueDate) / (1000 * 60 * 60 * 24));

        return {
          ...drum,
          KOD_BEBNA: drum.kod_bebna,
          NAZWA: drum.nazwa,
          CECHA: drum.cecha,
          DATA_ZWROTU_DO_DOSTAWCY: drum.data_zwrotu_do_dostawcy,
          KON_DOSTAWCA: drum.kon_dostawca,
          PELNA_NAZWA_KONTRAHENTA: drum.pelna_nazwa_kontrahenta, // Bezpośrednio z bębna
          NIP: drum.nip,
          TYP_DOK: drum.typ_dok,
          NR_DOKUMENTUPZ: drum.nr_dokumentupz,
          'Data przyjęcia na stan': drum.data_przyjecia_na_stan,
          KONTRAHENT: drum.kontrahent,
          STATUS: drum.status,
          DATA_WYDANIA: drum.data_wydania,
          
          company: drum.pelna_nazwa_kontrahenta, // Bezpośrednio z bębna
          daysInPossession: daysInPossession > 0 ? daysInPossession : 0,
          ...status
        };
      });
    } catch (error) {
      console.error('Błąd API bębnów:', error);
      throw error;
    }
  },
  // Reszta API pozostaje bez zmian
};

// ==================================
//  Reszta API (bez zmian)
// ==================================
export const companiesAPI = {
  async getCompanies() {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select(`*, custom_return_periods(return_period_days)`)
        .order('name');
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd API firm:', error);
      throw error;
    }
  },
};
export const returnsAPI = {
  async getReturns(nip = null) {
    try {
      let query = supabase.from('return_requests').select(`*, companies:user_nip (name)`);
      if (nip) {
        query = query.eq('user_nip', nip);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(req => ({ ...req, company_name: req.companies?.name || req.company_name }));
    } catch (error) {
      console.error('Błąd API zwrotów:', error);
      throw error;
    }
  },
  async createReturn(returnData) {
    try {
      const { data, error } = await supabase.from('return_requests').insert([{ ...returnData, status: 'Pending', priority: 'Normal' }]).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd tworzenia zwrotu:', error);
      throw error;
    }
  },
  async updateReturnStatus(id, status) {
    try {
      const { data, error } = await supabase.from('return_requests').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd aktualizacji statusu zwrotu:', error);
      throw error;
    }
  }
};
export const returnPeriodsAPI = {
  async getReturnPeriods() {
    try {
      const { data, error } = await supabase.from('custom_return_periods').select(`*, companies:nip (name, email, phone)`).order('nip');
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd API terminów zwrotu:', error);
      throw error;
    }
  },
  async updateReturnPeriod(nip, days) {
    try {
      const { data, error } = await supabase.from('custom_return_periods').upsert({ nip, return_period_days: days, updated_at: new Date().toISOString() }, { onConflict: 'nip' }).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd aktualizacji terminu zwrotu:', error);
      throw error;
    }
  }
};
export const statsAPI = {
  async getDashboardStats(nip = null) {
    try {
      const now = new Date().toISOString();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      if (nip) {
        const [{ count: totalDrums }, { count: activeDrums }, { count: pendingReturns }, { count: recentReturns }] = await Promise.all([
          supabase.from('drums').select('*', { count: 'exact', head: true }).eq('nip', nip),
          supabase.from('drums').select('*', { count: 'exact', head: true }).eq('nip', nip).gt('data_zwrotu_do_dostawcy', now),
          supabase.from('return_requests').select('*', { count: 'exact', head: true }).eq('user_nip', nip).eq('status', 'Pending'),
          supabase.from('drums').select('*', { count: 'exact', head: true }).eq('nip', nip).gte('data_wydania', thirtyDaysAgo)
        ]);
        return { totalDrums: totalDrums || 0, activeDrums: activeDrums || 0, pendingReturns: pendingReturns || 0, recentReturns: recentReturns || 0 };
      }
      const [{ count: totalClients }, { count: totalDrums }, { count: pendingReturns }, { count: overdueReturns }, { count: activeRequests }, { count: completedRequests }] = await Promise.all([
        supabase.from('companies').select('*', { count: 'exact', head: true }),
        supabase.from('drums').select('*', { count: 'exact', head: true }),
        supabase.from('return_requests').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
        supabase.from('drums').select('*', { count: 'exact', head: true }).lt('data_zwrotu_do_dostawcy', now),
        supabase.from('return_requests').select('*', { count: 'exact', head: true }).in('status', ['Pending', 'Approved']),
        supabase.from('return_requests').select('*', { count: 'exact', head: true }).eq('status', 'Completed').gte('updated_at', thirtyDaysAgo)
      ]);
      return { totalClients: totalClients || 0, totalDrums: totalDrums || 0, pendingReturns: pendingReturns || 0, overdueReturns: overdueReturns || 0, activeRequests: activeRequests || 0, completedRequests: completedRequests || 0 };
    } catch (error) {
      console.error('Błąd API statystyk:', error);
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
