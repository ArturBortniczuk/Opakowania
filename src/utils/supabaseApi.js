// src/utils/supabaseApi.js
// FINALNA, KOMPLETNA WERSJA - Przeznaczona do pracy z rzeczywistymi danymi z Supabase.

import { supabase, supabaseHelpers } from '../lib/supabase';

// ==================================
//  API do Autoryzacji
// ==================================
export const authAPI = {
  /**
   * Loguje użytkownika lub administratora.
   * @param {string} nip - NIP użytkownika.
   * @param {string} password - Hasło.
   * @param {string} loginMode - 'client' lub 'admin'.
   * @returns {Promise<object>} Obiekt z danymi zalogowanego użytkownika.
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

    // Pobierz nazwę firmy dla klienta lub nazwę dla admina/supervisora
    if (loginMode === 'admin' || user.role === 'supervisor') {
        companyName = user.name || 'Administrator';
    } else {
        const { data: companyData } = await supabase.from('companies').select('name').eq('nip', nip).single();
        if (companyData) {
            companyName = companyData.name;
        }
    }

    // Stwórz spójny obiekt użytkownika do przechowywania w aplikacji
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

  /**
   * Wysyła prośbę o link do ustawienia hasła.
   * @param {string} nip - NIP firmy.
   * @returns {Promise<object>} Odpowiedź z serwera.
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
   * Ustawia nowe hasło dla użytkownika na podstawie tokenu.
   * @param {string} token - Token z linku e-mail.
   * @param {string} password - Nowe hasło.
   * @returns {Promise<object>} Obiekt z danymi zalogowanego użytkownika.
   */
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
    
    // Po udanym ustawieniu hasła, od razu logujemy użytkownika
    return this.signIn(data.user.nip, password, 'client');
  },

  /**
   * Wylogowuje użytkownika.
   */
  logout() {
    localStorage.removeItem('currentUser');
  }
};

// ==================================
//  API do Bębnów
// ==================================
export const drumsAPI = {
  /**
   * Pobiera listę bębnów, opcjonalnie filtrując po NIP.
   * @param {string|null} nip - NIP klienta do filtrowania.
   * @returns {Promise<Array>} Lista obiektów bębnów.
   */
  async getDrums(nip = null) {
    try {
      let query = supabase
        .from('drums')
        .select(`*, companies (name, email, phone, address)`);

      if (nip) {
        query = query.eq('nip', nip);
      }

      const { data, error } = await query.order('kod_bebna');
      
      if (error) throw error;

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
          PELNA_NAZWA_KONTRAHENTA: drum.companies?.name || drum.pelna_nazwa_kontrahenta,
          NIP: drum.nip,
          TYP_DOK: drum.typ_dok,
          NR_DOKUMENTUPZ: drum.nr_dokumentupz,
          'Data przyjęcia na stan': drum.data_przyjecia_na_stan,
          KONTRAHENT: drum.kontrahent,
          STATUS: drum.status,
          DATA_WYDANIA: drum.data_wydania,
          
          company: drum.companies?.name || drum.pelna_nazwa_kontrahenta,
          companyPhone: drum.companies?.phone,
          companyEmail: drum.companies?.email,
          companyAddress: drum.companies?.address,
          daysInPossession: daysInPossession > 0 ? daysInPossession : 0,
          ...status
        };
      });
    } catch (error) {
      console.error('Błąd API bębnów:', error);
      throw error;
    }
  },

  /**
   * Pobiera pojedynczy bęben po jego kodzie.
   * @param {string} kodBebna - Kod bębna.
   * @returns {Promise<object>} Obiekt bębna.
   */
  async getDrum(kodBebna) {
    try {
      const { data, error } = await supabase
        .from('drums')
        .select(`*, companies:nip (name, email, phone, address)`)
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
//  API do Firm
// ==================================
export const companiesAPI = {
  /**
   * Pobiera listę wszystkich firm wraz z dodatkowymi statystykami.
   * @returns {Promise<Array>} Lista obiektów firm.
   */
  async getCompanies() {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select(`*, custom_return_periods(return_period_days)`)
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
            status: 'Aktywny', // Domyślny status
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

  /**
   * Pobiera dane pojedynczej firmy po NIP.
   * @param {string} nip - NIP firmy.
   * @returns {Promise<object>} Obiekt firmy.
   */
  async getCompany(nip) {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select(`*, custom_return_periods(return_period_days)`)
        .eq('nip', nip)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd pobierania firmy:', error);
      throw error;
    }
  },

  /**
   * Aktualizuje dane firmy.
   * @param {string} nip - NIP firmy do aktualizacji.
   * @param {object} updates - Obiekt z danymi do aktualizacji.
   * @returns {Promise<object>} Zaktualizowany obiekt firmy.
   */
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
//  API do Zwrotów
// ==================================
export const returnsAPI = {
  /**
   * Pobiera listę zgłoszeń zwrotu.
   * @param {string|null} nip - NIP klienta do filtrowania.
   * @returns {Promise<Array>} Lista zgłoszeń.
   */
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

  /**
   * Tworzy nowe zgłoszenie zwrotu.
   * @param {object} returnData - Dane formularza zwrotu.
   * @returns {Promise<object>} Utworzone zgłoszenie.
   */
  async createReturn(returnData) {
    try {
      const { data, error } = await supabase
        .from('return_requests')
        .insert([{ ...returnData, status: 'Pending', priority: 'Normal' }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd tworzenia zwrotu:', error);
      throw error;
    }
  },

  /**
   * Aktualizuje status zgłoszenia zwrotu.
   * @param {number} id - ID zgłoszenia.
   * @param {string} status - Nowy status.
   * @returns {Promise<object>} Zaktualizowane zgłoszenie.
   */
  async updateReturnStatus(id, status) {
    try {
      const { data, error } = await supabase
        .from('return_requests')
        .update({ status, updated_at: new Date().toISOString() })
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
//  API do Terminów Zwrotu
// ==================================
export const returnPeriodsAPI = {
  /**
   * Pobiera wszystkie niestandardowe terminy zwrotu.
   * @returns {Promise<Array>} Lista niestandardowych terminów.
   */
  async getReturnPeriods() {
    try {
      const { data, error } = await supabase
        .from('custom_return_periods')
        .select(`*, companies:nip (name, email, phone)`)
        .order('nip');
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd API terminów zwrotu:', error);
      throw error;
    }
  },

  /**
   * Aktualizuje lub tworzy niestandardowy termin zwrotu.
   * @param {string} nip - NIP klienta.
   * @param {number} days - Liczba dni.
   * @returns {Promise<object>} Zaktualizowany/utworzony rekord.
   */
  async updateReturnPeriod(nip, days) {
    try {
      const { data, error } = await supabase
        .from('custom_return_periods')
        .upsert({ nip, return_period_days: days, updated_at: new Date().toISOString() }, { onConflict: 'nip' })
        .select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd aktualizacji terminu zwrotu:', error);
      throw error;
    }
  }
};

// ==================================
//  API do Statystyk
// ==================================
export const statsAPI = {
  /**
   * Pobiera statystyki dla dashboardu (klienta lub admina).
   * @param {string|null} nip - NIP klienta (jeśli dotyczy).
   * @returns {Promise<object>} Obiekt ze statystykami.
   */
  async getDashboardStats(nip = null) {
    try {
      const now = new Date().toISOString();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      if (nip) { // Statystyki dla klienta
        const [{ count: totalDrums }, { count: activeDrums }, { count: pendingReturns }, { count: recentReturns }] = await Promise.all([
          supabase.from('drums').select('*', { count: 'exact', head: true }).eq('nip', nip),
          supabase.from('drums').select('*', { count: 'exact', head: true }).eq('nip', nip).gt('data_zwrotu_do_dostawcy', now),
          supabase.from('return_requests').select('*', { count: 'exact', head: true }).eq('user_nip', nip).eq('status', 'Pending'),
          supabase.from('drums').select('*', { count: 'exact', head: true }).eq('nip', nip).gte('data_wydania', thirtyDaysAgo)
        ]);
        return { totalDrums: totalDrums || 0, activeDrums: activeDrums || 0, pendingReturns: pendingReturns || 0, recentReturns: recentReturns || 0 };
      }

      // Statystyki dla admina
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

// ==================================
//  Funkcje pomocnicze
// ==================================
/**
 * Pobiera niestandardowy okres zwrotu dla klienta lub domyślny.
 * @param {string} nip - NIP klienta.
 * @returns {Promise<number>} Liczba dni na zwrot.
 */
export const getReturnPeriodForClient = async (nip) => {
  try {
    const { data, error } = await supabase
      .from('custom_return_periods')
      .select('return_period_days')
      .eq('nip', nip)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Ignoruj błąd "Not Found"
    return data?.return_period_days || 85; // Domyślny termin 85 dni
  } catch (error) {
    console.error('Błąd pobierania terminu zwrotu:', error);
    return 85; // Zwróć domyślny w razie błędu
  }
};

/**
 * Globalny handler błędów API.
 * @param {Error} error - Obiekt błędu.
 * @param {Function|null} setError - Funkcja do ustawiania stanu błędu w komponencie.
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
