// src/utils/supabaseApi.js
<<<<<<< HEAD
// Kompletny, poprawiony plik do komunikacji z Supabase
=======
// Finalna, kompletna i poprawiona wersja pliku do komunikacji z Supabase.
// Ten plik zawiera całą logikę potrzebną do poprawnej autoryzacji oraz pozostałe moduły API.
>>>>>>> f33492158f0d1ce573bec42858dcfd656d5e062f

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
<<<<<<< HEAD
    try {
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
        // --- Logika dla Klienta ---
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
          // Jeśli nie ma firmy, to nie ma też konta klienta.
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
    } catch (error) {
      console.error('Błąd w checkUserStatus:', error);
      throw error;
=======
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
        // Jeśli nie ma firmy, to nie ma też konta klienta.
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
>>>>>>> f33492158f0d1ce573bec42858dcfd656d5e062f
    }
  },

  /**
   * Loguje użytkownika za pomocą funkcji serwerowej 'sign-in'.
   */
  async signIn(nip, password, loginMode) {
<<<<<<< HEAD
    try {
      const { data, error } = await supabase.functions.invoke('sign-in', {
        body: { nip, password, loginMode },
      });

      if (error) {
        console.error('Błąd podczas wywoływania funkcji sign-in:', error);
        const errorMessage = error.message || 'Wystąpił nieznany błąd logowania.';
        throw new Error(errorMessage);
      }
      
      if (!data) {
        throw new Error('Brak odpowiedzi z serwera');
      }
      
      if (data.error) {
        throw new Error(data.error);
      }

      const user = data.user;
      
      let companyName = 'Brak nazwy firmy';
      if (loginMode === 'admin') {
          companyName = 'Grupa Eltron - Administrator';
      } else {
          const { data: companyData } = await supabase
            .from('companies')
            .select('name')
            .eq('nip', nip)
            .single();
          
          if (companyData) {
              companyName = companyData.name;
          }
      }

      return {
        user: {
          id: user.id,
          nip: user.nip,
          username: user.username || user.nip,
          name: user.name,
          email: user.email,
          role: user.role || 'client',
          permissions: user.permissions || [],
          companyName: companyName,
        },
      };
    } catch (error) {
      console.error('Błąd w signIn:', error);
      throw error;
    }
=======
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
        companyName = 'Grupa Eltron - Administrator';
    } else {
        const { data: companyData } = await supabase.from('companies').select('name').eq('nip', nip).single();
        if (companyData) {
            companyName = companyData.name;
        }
    }

    return {
      user: {
        id: user.id,
        nip: user.nip,
        username: user.username || user.nip,
        name: user.name,
        email: user.email,
        role: user.role || 'client',
        permissions: user.permissions || [],
        companyName: companyName,
      },
    };
>>>>>>> f33492158f0d1ce573bec42858dcfd656d5e062f
  },

  /**
   * Ustawia hasło za pomocą funkcji serwerowej 'set-password'.
   * Po udanym ustawieniu hasła, automatycznie loguje użytkownika.
   */
  async setPassword(nip, password, loginMode) {
    if (password.length < 6) {
      throw new Error('Hasło musi mieć co najmniej 6 znaków.');
    }

<<<<<<< HEAD
    try {
      const { data, error } = await supabase.functions.invoke('set-password', {
        body: { nip, password, loginMode },
      });

      if (error) {
        console.error('Błąd podczas wywoływania funkcji set-password:', error);
        const errorMessage = error.message || 'Nie udało się ustawić hasła.';
        throw new Error(errorMessage);
      }
      
      if (!data) {
        throw new Error('Brak odpowiedzi z serwera');
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      return this.signIn(nip, password, loginMode);
    } catch (error) {
      console.error('Błąd w setPassword:', error);
      throw error;
    }
=======
    const { error } = await supabase.functions.invoke('set-password', {
      body: { nip, password, loginMode },
    });

    if (error) {
      const errorMessage = error.context?.data?.error || error.message || 'Nie udało się ustawić hasła.';
      throw new Error(errorMessage);
    }
    
    return this.signIn(nip, password, loginMode);
>>>>>>> f33492158f0d1ce573bec42858dcfd656d5e062f
  },
};

// ==================================
<<<<<<< HEAD
//  API dla Bębnów
// ==================================
=======
//  Pozostałe API (Nietknięte)
// ==================================

>>>>>>> f33492158f0d1ce573bec42858dcfd656d5e062f
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

  async getDrum(id) {
    try {
      const { data, error } = await supabase
        .from('drums')
        .select(`
          *,
          companies ( name, email, phone, address ),
          custom_return_periods ( return_period_days )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get drum error:', error);
      throw error;
    }
  }
};

// ==================================
//  API dla Firm
// ==================================
export const companiesAPI = {
  async getCompanies() {
    try {
      const { data, error } = await supabase
        .from('companies')
<<<<<<< HEAD
        .select(`
          *,
          custom_return_periods(return_period_days),
          drums(count),
          return_requests(count)
        `)
=======
        .select(`*, custom_return_periods(return_period_days), drums(count), return_requests(count)`)
>>>>>>> f33492158f0d1ce573bec42858dcfd656d5e062f
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

  async getCompany(nip) {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          custom_return_periods(return_period_days),
          drums(count),
          return_requests(count)
        `)
        .eq('nip', nip)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get company error:', error);
      throw error;
    }
  },

  async updateCompany(nip, updateData) {
    try {
      const { data, error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('nip', nip)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update company error:', error);
      throw error;
    }
  }
};

// ==================================
//  API dla Zwrotów
// ==================================
export const returnsAPI = {
  async getReturns(nip = null) {
    try {
<<<<<<< HEAD
      let query = supabase
        .from('return_requests')
        .select(`*, companies(name)`);
      
      if (nip) {
        query = query.eq('user_nip', nip);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      
=======
      let query = supabase.from('return_requests').select(`*, companies(name)`);
      if (nip) {
        query = query.eq('user_nip', nip);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
>>>>>>> f33492158f0d1ce573bec42858dcfd656d5e062f
      return data;
    } catch (error) {
      console.error('Returns API error:', error);
      throw error;
    }
  },

  async createReturn(returnData) {
    try {
      const { data, error } = await supabase
        .from('return_requests')
        .insert([returnData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create return error:', error);
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
      console.error('Update return status error:', error);
      throw error;
    }
  }
};

// ==================================
//  API dla Okresów Zwrotu
// ==================================
export const returnPeriodsAPI = {
  async getReturnPeriods() {
    try {
      const { data, error } = await supabase
        .from('custom_return_periods')
        .select(`*, companies(name, email, phone)`)
        .order('companies(name)');
<<<<<<< HEAD
      
=======
>>>>>>> f33492158f0d1ce573bec42858dcfd656d5e062f
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Return periods API error:', error);
      throw error;
    }
  },

  async getReturnPeriod(nip) {
    try {
      const { data, error } = await supabase
        .from('custom_return_periods')
        .select('*')
        .eq('nip', nip)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
      return data;
    } catch (error) {
      console.error('Get return period error:', error);
      throw error;
    }
  },

  async updateReturnPeriod(nip, days) {
    try {
      const { data, error } = await supabase
        .from('custom_return_periods')
        .upsert(
          { 
            nip, 
            return_period_days: days,
            updated_at: new Date().toISOString()
          },
          { 
            onConflict: 'nip',
            ignoreDuplicates: false 
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update return period error:', error);
      throw error;
    }
  }
};

// ==================================
//  API dla Statystyk
// ==================================
export const statsAPI = {
  async getDashboardStats(nip = null) {
    try {
      const now = new Date().toISOString();
<<<<<<< HEAD
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      
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
          supabase.from('drums').select('*', { count: 'exact', head: true })
            .eq('nip', nip)
            .lt('data_zwrotu_do_dostawcy', now),
          supabase.from('drums').select('*', { count: 'exact', head: true })
            .eq('nip', nip)
            .gte('data_zwrotu_do_dostawcy', now)
            .lte('data_zwrotu_do_dostawcy', sevenDaysFromNow),
          supabase.from('return_requests').select('*', { count: 'exact', head: true })
            .eq('user_nip', nip),
          supabase.from('return_requests').select('*', { count: 'exact', head: true })
            .eq('user_nip', nip)
            .eq('status', 'Pending')
        ]);
        
        return {
          totalDrums: totalDrums || 0,
          activeDrums: (totalDrums || 0) - (overdueDrums || 0) - (dueSoonDrums || 0),
          pendingReturns: overdueDrums || 0,
          recentReturns: dueSoonDrums || 0,
          totalRequests: totalRequests || 0,
          pendingRequests: pendingRequests || 0
        };
      } else {
        // Statystyki dla administratora
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
          supabase.from('drums').select('*', { count: 'exact', head: true })
            .lt('data_zwrotu_do_dostawcy', now),
          supabase.from('drums').select('*', { count: 'exact', head: true })
            .gte('data_zwrotu_do_dostawcy', now)
            .lte('data_zwrotu_do_dostawcy', sevenDaysFromNow),
          supabase.from('return_requests').select('*', { count: 'exact', head: true }),
          supabase.from('return_requests').select('*', { count: 'exact', head: true })
            .eq('status', 'Pending'),
          supabase.from('return_requests').select('*', { count: 'exact', head: true })
            .eq('status', 'Approved'),
          supabase.from('return_requests').select('*', { count: 'exact', head: true })
            .eq('status', 'Completed')
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
      }
=======
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
>>>>>>> f33492158f0d1ce573bec42858dcfd656d5e062f
    } catch (error) {
      console.error('Stats API error:', error);
      throw error;
    }
<<<<<<< HEAD
  },
=======
  }
};
>>>>>>> f33492158f0d1ce573bec42858dcfd656d5e062f

  async getAdminStats() {
    return this.getDashboardStats(null);
  }
};

// ==================================
//  Obsługa błędów
// ==================================
export const handleAPIError = (error, setError = null) => {
  console.error('Supabase API Error:', error);
  
  const errorMessage = error.message || 'Wystąpił błąd podczas połączenia z bazą danych';
  
  if (setError) {
    setError(errorMessage);
  }
  
  // Jeśli token jest nieprawidłowy, przekieruj do logowania
  if (errorMessage.includes('token') || errorMessage.includes('unauthorized')) {
    // Opcjonalnie: wyczyść localStorage i przekieruj
    // localStorage.removeItem('currentUser');
    // window.location.href = '/';
  }
  
  return errorMessage;
};

// ==================================
//  Export domyślny
// ==================================
export default {
  authAPI,
  drumsAPI,
  companiesAPI,
  returnsAPI,
  returnPeriodsAPI,
  statsAPI,
  handleAPIError
};