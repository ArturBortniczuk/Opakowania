// src/utils/supabaseApi.js
// FINALNA, KOMPLETNA WERSJA Z PAGINACJĄ - Przeznaczona do pracy z rzeczywistymi danymi z Supabase.

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
//  API do Bębnów Z PAGINACJĄ
// ==================================
export const drumsAPI = {
  /**
   * Pobiera listę bębnów, opcjonalnie filtrując po NIP z paginacją.
   * @param {string|null} nip - NIP klienta do filtrowania.
   * @param {object} options - Opcje paginacji i sortowania.
   * @returns {Promise<object>} Obiekt z danymi bębnów, paginacją i metadanymi.
   */
  async getDrums(nip = null, options = {}) {
    try {
      const {
        page = 1,
        limit = 100,
        sortBy = 'cecha', // ZMIANA: Domyślne sortowanie po 'cecha'
        sortOrder = 'asc',
        search = '',
        status = 'all'
      } = options;

      console.log(`🔄 getDrums wywołane z: nip=${nip}, page=${page}, limit=${limit}, search="${search}"`);

      // Podstawowe zapytanie
      let query = supabase
        .from('drums')
        .select(`*, companies (name, email, phone, address, custom_return_periods(return_period_days))`, { count: 'exact' });

      // Filtrowanie po NIP
      if (nip) {
        query = query.eq('nip', nip);
        // Ukryj bębny, które zostały już zwrócone (status kontrahenta: 'Nie wydany')
        query = query.neq('kontrahent', 'Nie wydany');
      }

      // Filtrowanie po wyliczonym statusie (active, due-soon, overdue) zależnym od daty
      query = query.neq('status', 'Lost'); // Domyślnie NIE pokazuj zagubionych na głównej liście

      if (status !== 'all') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Supabase toleruje daty jako stringi 'YYYY-MM-DD'
        const todayStr = today.toISOString().split('T')[0];

        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        const nextWeekStr = nextWeek.toISOString().split('T')[0];

        if (status === 'overdue') {
          query = query.lt('data_zwrotu_do_dostawcy', todayStr);
        } else if (status === 'due-soon') {
          query = query.gte('data_zwrotu_do_dostawcy', todayStr).lte('data_zwrotu_do_dostawcy', nextWeekStr);
        } else if (status === 'active') {
          // Aktywne = data zwrotu jest > za tydzień LUB jest to bęben własny (brak daty zwrotu)
          query = query.or(`data_zwrotu_do_dostawcy.gt.${nextWeekStr},data_zwrotu_do_dostawcy.is.null`);
        }
      }

      // Filtrowanie po wyszukiwaniu - PRIORYTET DLA CECHY
      if (search) {
        // PostgREST `ilike` z `or`: bezpieczniej przekazać surowy search, Supabase zepnie go przez URL encoding 
        const safeSearch = `%${search}%`;
        query = query.or(`cecha.ilike.${safeSearch},kod_bebna.ilike.${safeSearch},nazwa.ilike.${safeSearch},pelna_nazwa_kontrahenta.ilike.${safeSearch},adres_dostawy.ilike.${safeSearch},nazwa_punktu_dostawy.ilike.${safeSearch},numer_faktury.ilike.${safeSearch}`);
      }

      // Sortowanie
      let dbSortBy = sortBy;
      if (sortBy === 'KOD_BEBNA') dbSortBy = 'kod_bebna';
      else if (sortBy === 'NAZWA') dbSortBy = 'nazwa';
      else if (sortBy === 'CECHA') dbSortBy = 'cecha';
      else if (sortBy === 'DATA_ZWROTU_DO_DOSTAWCY') dbSortBy = 'data_zwrotu_do_dostawcy';

      query = query.order(dbSortBy, { ascending: sortOrder === 'asc' });

      // Paginacja - KLUCZOWE!
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      console.log(`✅ Pobrano ${data?.length || 0} rekordów z ${count || 0} łącznie`);

      // Mapowanie danych do spójnego formatu używanego w komponentach
      const mappedData = data.map(drum => {
        let finalReturnDate = drum.data_zwrotu_do_dostawcy;
        if (!finalReturnDate && drum.data_wydania) {
          const d = new Date(drum.data_wydania);
          d.setDate(d.getDate() + 120);
          finalReturnDate = d.toISOString().split('T')[0];
        }
        
        const returnPeriodDays = drum.companies?.custom_return_periods?.[0]?.return_period_days || 180;
        const statusObj = supabaseHelpers.getDrumStatus(finalReturnDate);
        const issueDate = new Date(drum.data_wydania || drum.data_przyjecia_na_stan);
        const daysInPossession = Math.ceil((new Date() - issueDate) / (1000 * 60 * 60 * 24));

        const clientReturnDeadline = new Date(issueDate);
        if (!isNaN(clientReturnDeadline.getTime())) {
          clientReturnDeadline.setDate(clientReturnDeadline.getDate() + returnPeriodDays);
        }

        return {
          ...drum,
          data_zwrotu_do_dostawcy: finalReturnDate, // Nadpisujemy dla bębnów własnych
          // Zachowaj oryginalne nazwy kolumn z bazy
          kod_bebna: drum.kod_bebna,
          nazwa: drum.nazwa,
          cecha: drum.cecha,
          kon_dostawca: drum.kon_dostawca,
          pelna_nazwa_kontrahenta: drum.companies?.name || drum.pelna_nazwa_kontrahenta,
          nip: drum.nip,
          typ_dok: drum.typ_dok,
          nr_dokumentupz: drum.nr_dokumentupz,
          data_przyjecia_na_stan: drum.data_przyjecia_na_stan,
          kontrahent: drum.kontrahent,
          db_status: drum.status,
          status: statusObj.status, // Używamy statusu obliczonego na podstawie finalReturnDate
          data_wydania: drum.data_wydania,
          adres_dostawy: drum.adres_dostawy,
          nazwa_punktu_dostawy: drum.nazwa_punktu_dostawy,
          numer_faktury: drum.numer_faktury,

          // Obliczone pola
          returnPeriodDays,
          clientReturnDeadline: !isNaN(clientReturnDeadline.getTime()) ? clientReturnDeadline.toISOString() : null,

          // DODATKOWO: Zachowaj kompatybilność z WIELKIMI LITERAMI (stary kod)
          KOD_BEBNA: drum.kod_bebna,
          NAZWA: drum.nazwa,
          CECHA: drum.cecha,
          DATA_ZWROTU_DO_DOSTAWCY: finalReturnDate, // Nadpisujemy
          KON_DOSTAWCA: drum.kon_dostawca,
          PELNA_NAZWA_KONTRAHENTA: drum.companies?.name || drum.pelna_nazwa_kontrahenta,
          NIP: drum.nip,
          TYP_DOK: drum.typ_dok,
          NR_DOKUMENTUPZ: drum.nr_dokumentupz,
          'Data przyjęcia na stan': drum.data_przyjecia_na_stan,
          KONTRAHENT: drum.kontrahent,
          STATUS: statusObj.status, // Używamy statusu obliczonego na podstawie finalReturnDate
          DATA_WYDANIA: drum.data_wydania,
          ADRES_DOSTAWY: drum.adres_dostawy,
          NAZWA_PUNKTU_DOSTAWY: drum.nazwa_punktu_dostawy,
          NUMER_FAKTURY: drum.numer_faktury,

          company: drum.companies?.name || drum.pelna_nazwa_kontrahenta,
          companyPhone: drum.companies?.phone,
          companyEmail: drum.companies?.email,
          companyAddress: drum.companies?.address,
          daysInPossession: daysInPossession > 0 ? daysInPossession : 0,
          ...statusObj
        };
      });

      // Zwróć dane z metadanymi paginacji
      return {
        data: mappedData,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasNext: page < Math.ceil((count || 0) / limit),
          hasPrev: page > 1
        },
        meta: {
          sortBy,
          sortOrder,
          search,
          status,
          nip
        }
      };
    } catch (error) {
      console.error('❌ Błąd API bębnów:', error);
      throw error;
    }
  },

  /**
   * Zgłasza zagubienie bębna.
   * @param {string} cecha - Unikalna cecha bębna.
   * @param {string} nip - NIP klienta (dla bezpieczeństwa).
   * @param {string} description - Opis okoliczności zagubienia.
   * @returns {Promise<object>} Zaktualizowany rekord.
   */
  async reportLost(cecha, nip, description) {
    try {
      console.log(`⚠️ Zgłaszanie zagubienia bębna: ${cecha} dla NIP: ${nip}`);
      const { data, error } = await supabase
        .from('drums')
        .update({
          status: 'Lost',
          uwagi: description, // Zakładamy pole 'uwagi' lub podobne, jeśli nie ma to stworzymy w migracji lub użyjemy innego
          updated_at: new Date().toISOString()
        })
        .eq('cecha', cecha)
        .eq('nip', nip) // Dodatkowe zabezpieczenie
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Błąd zgłaszania zagubienia:', error);
      throw error;
    }
  },

  /**
   * WSTECZNA KOMPATYBILNOŚĆ: Pobiera WSZYSTKIE bębny bez paginacji (dla starych komponentów)
   * @param {string|null} nip - NIP klienta do filtrowania.
   * @returns {Promise<Array>} Lista wszystkich bębnów.
   */
  async getAllDrums(nip = null) {
    try {
      console.log('🔄 getAllDrums - pobieranie WSZYSTKICH bębnów...');

      let query = supabase
        .from('drums')
        .select(`*, companies (name, email, phone, address, custom_return_periods(return_period_days))`);

      if (nip) {
        query = query.eq('nip', nip);
      }

      // USUWAMY LIMIT - pobieramy wszystko
      const { data, error } = await query.order('kod_bebna');

      if (error) throw error;

      console.log(`✅ getAllDrums pobrał ${data.length} bębnów z bazy`);

      // Mapowanie danych (identyczne jak w getDrums)
      return data.map(drum => {
        // Obliczenie wirtualnej daty zwrotu dla bębnów 'Własnych' (120 dni od wydania)
        let finalReturnDate = drum.data_zwrotu_do_dostawcy;
        if (!finalReturnDate && drum.data_wydania) {
          const d = new Date(drum.data_wydania);
          d.setDate(d.getDate() + 120);
          finalReturnDate = d.toISOString().split('T')[0];
        }

        // Zabezpieczone pobieranie dni z relacji
        const returnPeriodDays = drum.companies?.custom_return_periods?.[0]?.return_period_days || 180;
        
        // Obliczamy STATUS TERMINOWY
        const statusObj = supabaseHelpers.getDrumStatus(finalReturnDate);
        const issueDate = new Date(drum.data_wydania || drum.data_przyjecia_na_stan);
        const daysInPossession = Math.ceil((new Date() - issueDate) / (1000 * 60 * 60 * 24));

        const clientReturnDeadline = new Date(issueDate);
        if (!isNaN(clientReturnDeadline.getTime())) {
          clientReturnDeadline.setDate(clientReturnDeadline.getDate() + returnPeriodDays);
        }

        return {
          ...drum,
          data_zwrotu_do_dostawcy: finalReturnDate, // Nadpisujemy
          
          // Ujednolicony dostęp do formatu dającego "active", "due-soon", "overdue"
          db_status: drum.status,
          status: statusObj.status,
          
          // Kompatybilność z WIELKIMI LITERAMI
          KOD_BEBNA: drum.kod_bebna,
          NAZWA: drum.nazwa,
          CECHA: drum.cecha,
          DATA_ZWROTU_DO_DOSTAWCY: finalReturnDate, // Nadpisujemy
          KON_DOSTAWCA: drum.kon_dostawca,
          PELNA_NAZWA_KONTRAHENTA: drum.companies?.name || drum.pelna_nazwa_kontrahenta,
          NIP: drum.nip,
          TYP_DOK: drum.typ_dok,
          NR_DOKUMENTUPZ: drum.nr_dokumentupz,
          'Data przyjęcia na stan': drum.data_przyjecia_na_stan,
          KONTRAHENT: drum.kontrahent,
          STATUS: statusObj.status, // Używamy statusu obliczonego na podstawie finalReturnDate
          DATA_WYDANIA: drum.data_wydania,
          ADRES_DOSTAWY: drum.adres_dostawy,
          NAZWA_PUNKTU_DOSTAWY: drum.nazwa_punktu_dostawy,
          NUMER_FAKTURY: drum.numer_faktury,

          company: drum.companies?.name || drum.pelna_nazwa_kontrahenta,
          companyPhone: drum.companies?.phone,
          companyEmail: drum.companies?.email,
          companyAddress: drum.companies?.address,
          daysInPossession: daysInPossession > 0 ? daysInPossession : 0,
          ...statusObj
        };
      });
    } catch (error) {
      console.error('❌ Błąd API wszystkich bębnów:', error);
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

      if (error) throw error;

      // Mapowanie danych (bez zbędnych zapytań do bazy)
      const mappedData = data.map(company => ({
        ...company,
        returnPeriodDays: company.custom_return_periods?.[0]?.return_period_days || 85,
        status: 'Aktywny', // Domyślny status
        lastActivity: company.created_at || new Date().toISOString().split('T')[0]
      }));

      return mappedData;
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
//  API do Statystyk (NAPRAWIONE - BEZ LIMITU 1000)
// ==================================
export const statsAPI = {
  /**
   * Pobiera statystyki dashboardu dla klienta lub administratora.
   * NAPRAWIONE: Używa head: true i count: 'exact' żeby nie było limitu 1000
   * @param {string|null} nip - NIP klienta (jeśli dotyczy).
   * @returns {Promise<object>} Obiekt ze statystykami.
   */
  async getDashboardStats(nip = null) {
    try {
      const now = new Date().toISOString();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      console.log(`🔄 Pobieranie statystyk dla NIP: ${nip || 'ADMIN'}`);

      if (nip) {
        // Statystyki dla klienta - NAPRAWIONE: head: true oznacza że pobieramy TYLKO COUNT
        console.log(`👤 Liczenie bębnów dla klienta ${nip}...`);

        const [
          { count: totalDrums },
          { count: activeDrums },
          { count: pendingReturns },
          { count: recentReturns }
        ] = await Promise.all([
          supabase.from('drums').select('*', { count: 'exact', head: true }).eq('nip', nip),
          supabase.from('drums').select('*', { count: 'exact', head: true }).eq('nip', nip).gt('data_zwrotu_do_dostawcy', now),
          supabase.from('return_requests').select('*', { count: 'exact', head: true }).eq('user_nip', nip).eq('status', 'Pending'),
          supabase.from('drums').select('*', { count: 'exact', head: true }).eq('nip', nip).gte('data_wydania', thirtyDaysAgo)
        ]);

        console.log(`✅ Statystyki klienta ${nip}: ${totalDrums} bębnów, ${activeDrums} aktywnych`);
        return {
          totalDrums: totalDrums || 0,
          activeDrums: activeDrums || 0,
          pendingReturns: pendingReturns || 0,
          recentReturns: recentReturns || 0
        };
      }

      // Statystyki dla admina - NAPRAWIONE: head: true oznacza że pobieramy TYLKO COUNT
      console.log(`👨‍💼 Liczenie statystyk dla administratora...`);

      const [
        { count: totalClients },
        { count: totalDrums },
        { count: pendingReturns },
        { count: overdueReturns },
        { count: activeRequests },
        { count: completedRequests }
      ] = await Promise.all([
        supabase.from('companies').select('*', { count: 'exact', head: true }),
        supabase.from('drums').select('*', { count: 'exact', head: true }), // ⭐ TO JEST KLUCZ - BEZ LIMITU!
        supabase.from('return_requests').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
        supabase.from('drums').select('*', { count: 'exact', head: true }).lt('data_zwrotu_do_dostawcy', now),
        supabase.from('return_requests').select('*', { count: 'exact', head: true }).in('status', ['Pending', 'Approved']),
        supabase.from('return_requests').select('*', { count: 'exact', head: true }).eq('status', 'Completed').gte('updated_at', thirtyDaysAgo)
      ]);

      console.log(`✅ Statystyki admina: ${totalDrums} bębnów, ${totalClients} klientów, ${pendingReturns} zwrotów`);

      return {
        totalClients: totalClients || 0,
        totalDrums: totalDrums || 0,
        pendingReturns: pendingReturns || 0,
        overdueReturns: overdueReturns || 0,
        activeRequests: activeRequests || 0,
        completedRequests: completedRequests || 0
      };

    } catch (error) {
      console.error('❌ Błąd API statystyk:', error);
      throw error;
    }
  },

  /**
   * Pobiera szczegółowe statystyki bębnów (dla raportów).
   * @returns {Promise<object>} Szczegółowe statystyki.
   */
  async getDetailedDrumStats() {
    try {
      console.log('🔄 Pobieranie szczegółowych statystyk bębnów...');

      const now = new Date().toISOString();
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const [
        { count: totalDrums },
        { count: activeDrums },
        { count: overdueDrums },
        { count: dueSoonDrums }
      ] = await Promise.all([
        // Wszystkie bębny
        supabase.from('drums').select('*', { count: 'exact', head: true }),
        // Aktywne (termin zwrotu w przyszłości, więcej niż 7 dni)
        supabase.from('drums').select('*', { count: 'exact', head: true }).gt('data_zwrotu_do_dostawcy', sevenDaysFromNow),
        // Przeterminowane (termin zwrotu w przeszłości)
        supabase.from('drums').select('*', { count: 'exact', head: true }).lt('data_zwrotu_do_dostawcy', now),
        // Zbliża się termin (między dziś a 7 dni)
        supabase.from('drums').select('*', { count: 'exact', head: true })
          .gte('data_zwrotu_do_dostawcy', now)
          .lte('data_zwrotu_do_dostawcy', sevenDaysFromNow)
      ]);

      console.log(`✅ Szczegółowe statystyki: ${totalDrums} łącznie, ${overdueDrums} przeterminowane, ${dueSoonDrums} zbliża się termin`);

      return {
        totalDrums: totalDrums || 0,
        activeDrums: activeDrums || 0,
        overdueDrums: overdueDrums || 0,
        dueSoonDrums: dueSoonDrums || 0
      };
    } catch (error) {
      console.error('❌ Błąd szczegółowych statystyk:', error);
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