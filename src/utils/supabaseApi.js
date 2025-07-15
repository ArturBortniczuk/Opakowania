// src/utils/supabaseApi.js
// ZAKTUALIZOWANA WERSJA - rzeczywiste dane z Supabase

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
//  API do Bębnów (rzeczywiste dane)
// ==================================
export const drumsAPI = {
  async getDrums(nip = null) {
    try {
      let query = supabase
        .from('drums')
        .select(`
          *,
          companies:nip (
            name,
            email,
            phone,
            address,
            custom_return_periods (
              return_period_days
            )
          )
        `);

      if (nip) {
        query = query.eq('nip', nip);
      }

      const { data, error } = await query.order('kod_bebna');
      
      if (error) throw error;

      return data.map(drum => {
        const returnPeriodDays = drum.companies?.custom_return_periods?.[0]?.return_period_days || 85;
        const status = supabaseHelpers.getDrumStatus(drum.data_zwrotu_do_dostawcy);
        
        // Oblicz dni w posiadaniu
        const issueDate = drum.data_wydania ? new Date(drum.data_wydania) : new Date(drum.data_przyjecia_na_stan);
        const now = new Date();
        const daysInPossession = issueDate ? Math.ceil((now - issueDate) / (1000 * 60 * 60 * 24)) : 0;
        
        // Oblicz dni przeterminowania dla przeterminowanych bębnów
        const returnDate = new Date(drum.data_zwrotu_do_dostawcy);
        const overdueDays = status.status === 'overdue' ? Math.ceil((now - returnDate) / (1000 * 60 * 60 * 24)) : 0;
        
        return {
          ...drum,
          // Mapowanie nazw kolumn na format używany w aplikacji
          KOD_BEBNA: drum.kod_bebna,
          NAZWA: drum.nazwa,
          CECHA: drum.cecha,
          DATA_ZWROTU_DO_DOSTAWCY: drum.data_zwrotu_do_dostawcy,
          KON_DOSTAWCA: drum.kon_dostawca,
          PELNA_NAZWA_KONTRAHENTA: drum.companies?.name || drum.pelna_nazwa_kontrahenta || 'Brak danych firmy',
          NIP: drum.nip,
          TYP_DOK: drum.typ_dok,
          NR_DOKUMENTUPZ: drum.nr_dokumentupz,
          'Data przyjęcia na stan': drum.data_przyjecia_na_stan,
          KONTRAHENT: drum.kontrahent,
          STATUS: drum.status,
          DATA_WYDANIA: drum.data_wydania,
          
          // Dodatkowe pola dla komponentów
          company: drum.companies?.name || drum.pelna_nazwa_kontrahenta || 'Brak danych firmy',
          companyPhone: drum.companies?.phone,
          companyEmail: drum.companies?.email,
          companyAddress: drum.companies?.address,
          returnPeriodDays,
          daysInPossession,
          overdueDays,
          
          // Status z helpera
          ...status
        };
      });
    } catch (error) {
      console.error('Błąd API bębnów:', error);
      throw error;
    }
  },

  async getDrum(kodBebna) {
    try {
      const { data, error } = await supabase
        .from('drums')
        .select(`
          *,
          companies:nip (
            name,
            email,
            phone,
            address
          )
        `)
        .eq('kod_bebna', kodBebna)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd pobierania bębna:', error);
      throw error;
    }
  }
};

// ==================================
//  API do Firm (rzeczywiste dane)
// ==================================
export const companiesAPI = {
  async getCompanies() {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          custom_return_periods (
            return_period_days
          )
        `)
        .order('name');

      if (error) throw error;

      // Pobierz dodatkowe statystyki dla każdej firmy
      const enrichedData = await Promise.all(
        data.map(async (company) => {
          // Policz bębny
          const { count: drumsCount } = await supabase
            .from('drums')
            .select('*', { count: 'exact', head: true })
            .eq('nip', company.nip);

          // Policz zgłoszenia
          const { count: requestsCount } = await supabase
            .from('return_requests')
            .select('*', { count: 'exact', head: true })
            .eq('user_nip', company.nip);

          return {
            ...company,
            drumsCount: drumsCount || 0,
            totalRequests: requestsCount || 0,
            returnPeriodDays: company.custom_return_periods?.[0]?.return_period_days || 85,
            status: 'Aktywny',
            lastActivity: company.created_at || new Date().toISOString().split('T')[0]
          };
        })
      );

      return enrichedData;
    } catch (error) {
      console.error('Błąd API firm:', error);
      throw error;
    }
  },

  async getCompany(nip) {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          custom_return_periods (
            return_period_days
          )
        `)
        .eq('nip', nip)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd pobierania firmy:', error);
      throw error;
    }
  },

  async updateCompany(nip, updates) {
    try {
      const { data, error } = await supabase
        .from('companies')
        .update(updates)
        .eq('nip', nip)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd aktualizacji firmy:', error);
      throw error;
    }
  }
};

// ==================================
//  API do Zwrotów (rzeczywiste dane)
// ==================================
export const returnsAPI = {
  async getReturns(nip = null) {
    try {
      let query = supabase
        .from('return_requests')
        .select(`
          *,
          companies:user_nip (
            name
          )
        `);
      
      if (nip) {
        query = query.eq('user_nip', nip);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data.map(request => ({
        ...request,
        company_name: request.companies?.name || request.company_name
      }));
    } catch (error) {
      console.error('Błąd API zwrotów:', error);
      throw error;
    }
  },

  async createReturn(returnData) {
    try {
      const { data, error } = await supabase
        .from('return_requests')
        .insert([{
          ...returnData,
          status: 'Pending',
          priority: 'Normal',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd tworzenia zwrotu:', error);
      throw error;
    }
  },

  async updateReturnStatus(id, status) {
    try {
      const { data, error } = await supabase
        .from('return_requests')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd aktualizacji statusu zwrotu:', error);
      throw error;
    }
  }
};

// ==================================
//  API do Terminów Zwrotu (rzeczywiste dane)
// ==================================
export const returnPeriodsAPI = {
  async getReturnPeriods() {
    try {
      const { data, error } = await supabase
        .from('custom_return_periods')
        .select(`
          *,
          companies:nip (
            name,
            email,
            phone
          )
        `)
        .order('nip');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd API terminów zwrotu:', error);
      throw error;
    }
  },

  async getReturnPeriod(nip) {
    try {
      const { data, error } = await supabase
        .from('custom_return_periods')
        .select('return_period_days')
        .eq('nip', nip)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data?.return_period_days || 85;
    } catch (error) {
      console.error('Błąd pobierania terminu zwrotu:', error);
      return 85; // Domyślny termin
    }
  },

  async updateReturnPeriod(nip, days) {
    try {
      const { data, error } = await supabase
        .from('custom_return_periods')
        .upsert({
          nip,
          return_period_days: days,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd aktualizacji terminu zwrotu:', error);
      throw error;
    }
  }
};

// ==================================
//  API do Statystyk (rzeczywiste dane)
// ==================================
export const statsAPI = {
  async getDashboardStats(nip = null) {
    try {
      const now = new Date().toISOString();
      const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      
      if (nip) {
        // Statystyki dla konkretnego klienta
        const [
          { count: totalDrums },
          { count: overdueDrums },
          { count: dueSoonDrums },
          { count: totalRequests },
          { count: pendingRequests }
        ] = await Promise.all([
          supabase.from('drums').select('*', { count: 'exact', head: true }).eq('nip', nip),
          supabase.from('drums').select('*', { count: 'exact', head: true }).eq('nip', nip).lt('data_zwrotu_do_dostawcy', now),
          supabase.from('drums').select('*', { count: 'exact', head: true }).eq('nip', nip).gte('data_zwrotu_do_dostawcy', now).lte('data_zwrotu_do_dostawcy', weekFromNow),
          supabase.from('return_requests').select('*', { count: 'exact', head: true }).eq('user_nip', nip),
          supabase.from('return_requests').select('*', { count: 'exact', head: true }).eq('user_nip', nip).eq('status', 'Pending')
        ]);

        return {
          totalDrums: totalDrums || 0,
          activeDrums: (totalDrums || 0) - (overdueDrums || 0) - (dueSoonDrums || 0),
          pendingReturns: overdueDrums || 0,
          recentReturns: dueSoonDrums || 0,
          totalRequests: totalRequests || 0,
          pendingRequests: pendingRequests || 0
        };
      }

      // Statystyki dla admina
      const [
        { count: totalClients },
        { count: totalDrums },
        { count: overdueDrums },
        { count: dueSoonDrums },
        { count: totalRequests },
        { count: pendingRequests },
        { count: approvedRequests },
        { count: completedRequests }
      ] = await Promise.all([
        supabase.from('companies').select('*', { count: 'exact', head: true }),
        supabase.from('drums').select('*', { count: 'exact', head: true }),
        supabase.from('drums').select('*', { count: 'exact', head: true }).lt('data_zwrotu_do_dostawcy', now),
        supabase.from('drums').select('*', { count: 'exact', head: true }).gte('data_zwrotu_do_dostawcy', now).lte('data_zwrotu_do_dostawcy', weekFromNow),
        supabase.from('return_requests').select('*', { count: 'exact', head: true }),
        supabase.from('return_requests').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
        supabase.from('return_requests').select('*', { count: 'exact', head: true }).eq('status', 'Approved'),
        supabase.from('return_requests').select('*', { count: 'exact', head: true }).eq('status', 'Completed')
      ]);

      return {
        totalClients: totalClients || 0,
        totalDrums: totalDrums || 0,
        activeDrums: (totalDrums || 0) - (overdueDrums || 0) - (dueSoonDrums || 0),
        pendingReturns: pendingRequests || 0,
        overdueReturns: overdueDrums || 0,
        activeRequests: (pendingRequests || 0) + (approvedRequests || 0),
        completedRequests: completedRequests || 0,
        totalRequests: totalRequests || 0
      };
    } catch (error) {
      console.error('Błąd API statystyk:', error);
      throw error;
    }
  }
};

// ==================================
//  Helper Functions
// ==================================
export const getReturnPeriodForClient = async (nip) => {
  return await returnPeriodsAPI.getReturnPeriod(nip);
};

export const handleAPIError = (error, setError = null) => {
  console.error('Błąd API Supabase:', error);
  const errorMessage = error.message || 'Wystąpił nieznany błąd. Spróbuj ponownie.';
  if (setError) {
    setError(errorMessage);
  }
  return errorMessage;
};
