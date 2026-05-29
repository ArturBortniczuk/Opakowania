// src/utils/supabaseApi.js
// FINALNA, KOMPLETNA WERSJA Z PAGINACJĄ - Przeznaczona do pracy z rzeczywistymi danymi z Supabase.

import { supabase, supabaseHelpers } from '../lib/supabase';

// Pomocnicza funkcja pobierająca listę NIP-ów, do których zalogowany użytkownik ma dostęp
export async function getAllowedNips(user) {
  if (!user) return [];
  if (user.role === 'admin' || user.role === 'supervisor') return null;
  if (user.role === 'client') return [user.nip];
  
  if (['Dyrektor', 'Kierownik', 'Wsparcie', 'Specjalista'].includes(user.role)) {
    if (user.role === 'Dyrektor' && user.region === 'Wszystkie') {
      return null;
    }
    
    let q = supabase.from('companies').select('nip');
    
    if (user.role === 'Specjalista') {
      q = q.eq('salesperson_name', user.name);
    } else if (user.role === 'Wsparcie' || user.role === 'Kierownik') {
      q = q.eq('market', user.market);
    } else if (user.role === 'Dyrektor') {
      const { data: sps } = await supabase
        .from('salespeople')
        .select('name')
        .eq('region', user.region);
      const spNames = sps ? sps.map(s => s.name) : [];
      
      if (spNames.length === 0) return [];
      q = q.in('salesperson_name', spNames);
    }
    
    const { data, error } = await q;
    if (error) {
      console.error('Błąd pobierania przypisanych NIP-ów:', error);
      return [];
    }
    return data ? data.map(c => c.nip) : [];
  }
  
  return [];
}

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
   * Pobiera bębny na podstawie listy cech.
   * @param {Array} cechy - Lista cech bębnów.
   * @returns {Promise<Array>} Lista bębnów.
   */
  async getDrumsByCechy(cechy) {
    if (!cechy || cechy.length === 0) return [];
    try {
      const { data, error } = await supabase
        .from('drums')
        .select('*')
        .in('cecha', cechy);
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd pobierania bębnów po cechach:', error);
      throw error;
    }
  },

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
        sortBy = 'cecha',
        sortOrder = 'asc',
        search = '',
        status = 'all',
        dateRange = 'all'
      } = options;

      console.log(`🔄 getDrums wywołane z: nip=${nip}, page=${page}, search="${search}", status=${status}, date=${dateRange}`);

      // Podstawowe zapytanie
      let query = supabase
        .from('drums')
        .select(`*, companies (name, email, phone, address, custom_return_periods(return_period_days))`, { count: 'exact' });

      // Filtrowanie po NIP
      const userStr = localStorage.getItem('currentUser');
      const currentUser = userStr ? JSON.parse(userStr) : null;
      const isClient = currentUser && currentUser.role === 'client';

      if (nip) {
        query = query.eq('nip', nip);
        // Ukryj bębny, które zostały już zwrócone (status kontrahenta: 'Nie wydany')
        query = query.neq('kontrahent', 'Nie wydany');

        if (isClient) {
          const maxDate = new Date(Date.now() - 456 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          query = query.or(`data_wydania.gte.${maxDate},and(data_wydania.is.null,data_przyjecia_na_stan.gte.${maxDate})`);
        }
      } else {
        const allowedNips = await getAllowedNips(currentUser);
        if (allowedNips) {
          if (allowedNips.length === 0) {
            return {
              data: [],
              pagination: {
                page,
                limit,
                total: 0,
                totalPages: 0,
                hasNext: false,
                hasPrev: false
              },
              meta: {
                sortBy,
                sortOrder,
                search,
                status,
                dateRange,
                nip
              }
            };
          }
          query = query.in('nip', allowedNips);
        }
      }

      // 1. Filtrowanie po Statusie Bębna (status = dbStatus)
      if (status === 'zagubione') {
        query = query.eq('status', 'Lost');
      } else {
        query = query.neq('status', 'Lost'); // Domyślnie NIE pokazuj zagubionych na głównej liście

        if (status === 'magazyn') {
          // Bębny na magazynie (Nie wydane)
          query = query.or('kontrahent.eq.Nie wydany,kontrahent.ilike.%magazyn%');
        } else if (status === 'wydane') {
          // Wydane u klientów (Z pominięciem własnych/nie wydanych)
          query = query.neq('kontrahent', 'Nie wydany').not('kontrahent', 'ilike', '%magazyn%');
        }
      }

      // 2. Filtrowanie po Terminie (dateRange)
      if (dateRange !== 'all') {
        if (dateRange === 'extended') {
          const { data: extData, error: extError } = await supabase
            .from('custom_drum_deadlines')
            .select('kod_bebna');
          
          if (!extError && extData && extData.length > 0) {
            const codes = extData.map(e => e.kod_bebna);
            query = query.in('kod_bebna', codes);
          } else {
            // Brak bębnów o przedłużonym terminie - zwracamy puste wyniki paginacji
            return {
              data: [],
              pagination: {
                page,
                limit,
                total: 0,
                totalPages: 0,
                hasNext: false,
                hasPrev: false
              },
              meta: {
                sortBy,
                sortOrder,
                search,
                status,
                dateRange,
                nip
              }
            };
          }
        } else {
          // Tylko dla bębnów 'wydanych' ma sens filtr terminu w głównej mierze
          query = query.neq('kontrahent', 'Nie wydany').not('kontrahent', 'ilike', '%magazyn%');

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayStr = today.toISOString().split('T')[0];

          const nextWeek = new Date(today);
          nextWeek.setDate(today.getDate() + 7);
          const nextWeekStr = nextWeek.toISOString().split('T')[0];

          if (dateRange === 'overdue') {
            query = query.lt('data_zwrotu_do_dostawcy', todayStr);
          } else if (dateRange === 'due-soon') {
            query = query.gte('data_zwrotu_do_dostawcy', todayStr).lte('data_zwrotu_do_dostawcy', nextWeekStr);
          } else if (dateRange === 'active') {
            // Aktywne = data zwrotu jest > za tydzień LUB jest to bęben własny (brak daty zwrotu)
            query = query.or(`data_zwrotu_do_dostawcy.gt.${nextWeekStr},data_zwrotu_do_dostawcy.is.null`);
          }
        }
      }

      // Filtrowanie po wyszukiwaniu - PRIORYTET DLA CECHY
      if (search) {
        // PostgREST `ilike` z `or`: bezpieczniej przekazać surowy search, Supabase zepnie go przez URL encoding 
        const safeSearch = `%${search}%`;
        query = query.or(`cecha.ilike.${safeSearch},kod_bebna.ilike.${safeSearch},nazwa.ilike.${safeSearch},pelna_nazwa_kontrahenta.ilike.${safeSearch},adres_dostawy.ilike.${safeSearch},nazwa_punktu_dostawy.ilike.${safeSearch},numer_faktury.ilike.${safeSearch},kon_dostawca.ilike.${safeSearch}`);
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

      // Pobieranie niestandardowych terminów dla pobranych bębnów
      let customDeadlines = [];
      if (data && data.length > 0) {
        const drumCodes = data.map(d => d.kod_bebna);
        const nips = [...new Set(data.map(d => d.nip).filter(Boolean))];
        const { data: deadlinesData } = await supabase
          .from('custom_drum_deadlines')
          .select('*')
          .in('kod_bebna', drumCodes)
          .in('nip', nips);
        if (deadlinesData) {
          customDeadlines = deadlinesData;
        }
      }

      // Mapowanie danych do spójnego formatu używanego w komponentach
      const mappedData = data.map(drum => {
        const extension = customDeadlines.find(
          ext => ext.kod_bebna === drum.kod_bebna && ext.nip === drum.nip
        );

        let finalReturnDate = drum.data_zwrotu_do_dostawcy;
        if (!finalReturnDate && drum.data_wydania) {
          const d = new Date(drum.data_wydania);
          d.setDate(d.getDate() + 120);
          finalReturnDate = d.toISOString().split('T')[0];
        }
        
        const returnPeriodDays = drum.companies?.custom_return_periods?.[0]?.return_period_days || 120;
        const issueDate = new Date(drum.data_wydania || drum.data_przyjecia_na_stan);
        const daysInPossession = Math.ceil((new Date() - issueDate) / (1000 * 60 * 60 * 24));

        let clientReturnDeadline = null;
        if (extension) {
          clientReturnDeadline = extension.custom_return_date;
        } else {
          const clientReturnDeadlineDate = new Date(issueDate);
          if (!isNaN(clientReturnDeadlineDate.getTime())) {
            clientReturnDeadlineDate.setDate(clientReturnDeadlineDate.getDate() + returnPeriodDays);
            clientReturnDeadline = clientReturnDeadlineDate.toISOString().split('T')[0];
          }
        }

        const dateForStatus = extension
          ? extension.custom_return_date
          : (isClient && clientReturnDeadline
              ? clientReturnDeadline
              : finalReturnDate);

        const statusObj = supabaseHelpers.getDrumStatus(dateForStatus);

        return {
          ...drum,
          db_data_zwrotu_do_dostawcy: drum.data_zwrotu_do_dostawcy, // Zachowaj surową wartość przed nadpisaniem
          data_zwrotu_do_dostawcy: finalReturnDate, // Nadpisujemy dla bębnów własnych
          
          // Indywidualne przedłużenie
          isExtended: !!extension,
          extensionNotes: extension ? extension.notes : null,
          extensionCreatedBy: extension ? extension.created_by : null,
          extensionCreatedAt: extension ? extension.created_at : null,
          
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
          clientReturnDeadline: clientReturnDeadline,

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
          dateRange,
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

      const userStr = localStorage.getItem('currentUser');
      const currentUser = userStr ? JSON.parse(userStr) : null;
      const isClient = currentUser && currentUser.role === 'client';

      const allowedNips = await getAllowedNips(currentUser);

      let allData = [];
      let pageIndex = 0;
      const chunkSize = 1000;

      while (true) {
        const from = pageIndex * chunkSize;
        const to = from + chunkSize - 1;
        
        let chunkQuery = supabase
          .from('drums')
          .select(`*, companies (name, email, phone, address, custom_return_periods(return_period_days))`)
          .range(from, to)
          .order('kod_bebna');

        if (nip) {
          chunkQuery = chunkQuery.eq('nip', nip);
          chunkQuery = chunkQuery.neq('kontrahent', 'Nie wydany');

          if (isClient) {
            const maxDate = new Date(Date.now() - 456 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            chunkQuery = chunkQuery.or(`data_wydania.gte.${maxDate},and(data_wydania.is.null,data_przyjecia_na_stan.gte.${maxDate})`);
          }
        } else if (allowedNips) {
          if (allowedNips.length === 0) {
            break;
          }
          chunkQuery = chunkQuery.in('nip', allowedNips);
        }

        const { data, error } = await chunkQuery;
        if (error) throw error;

        if (!data || data.length === 0) {
          break;
        }

        allData = allData.concat(data);
        if (data.length < chunkSize) {
          break;
        }
        pageIndex++;
      }

      console.log(`✅ getAllDrums pobrał ${allData.length} bębnów z bazy w ${pageIndex + 1} zapytaniach`);

      // Pobranie niestandardowych terminów dla pobranych bębnów
      let customDeadlines = [];
      if (allData && allData.length > 0) {
        let deadlinesQuery = supabase.from('custom_drum_deadlines').select('*');
        if (nip) {
          deadlinesQuery = deadlinesQuery.eq('nip', nip);
        } else if (allowedNips && allowedNips.length > 0) {
          deadlinesQuery = deadlinesQuery.in('nip', allowedNips);
        }
        const { data: deadlinesData } = await deadlinesQuery;
        if (deadlinesData) {
          customDeadlines = deadlinesData;
        }
      }

      // Mapowanie danych (identyczne jak w getDrums)
      return allData.map(drum => {
        const extension = customDeadlines.find(
          ext => ext.kod_bebna === drum.kod_bebna && ext.nip === drum.nip
        );

        // Obliczenie wirtualnej daty zwrotu dla bębnów 'Własnych' (120 dni od wydania)
        let finalReturnDate = drum.data_zwrotu_do_dostawcy;
        if (!finalReturnDate && drum.data_wydania) {
          const d = new Date(drum.data_wydania);
          d.setDate(d.getDate() + 120);
          finalReturnDate = d.toISOString().split('T')[0];
        }

        // Zabezpieczone pobieranie dni z relacji
        const returnPeriodDays = drum.companies?.custom_return_periods?.[0]?.return_period_days || 120;
        
        // Obliczamy STATUS TERMINOWY
        const issueDate = new Date(drum.data_wydania || drum.data_przyjecia_na_stan);
        const daysInPossession = Math.ceil((new Date() - issueDate) / (1000 * 60 * 60 * 24));

        let clientReturnDeadline = null;
        if (extension) {
          clientReturnDeadline = extension.custom_return_date;
        } else {
          const clientReturnDeadlineDate = new Date(issueDate);
          if (!isNaN(clientReturnDeadlineDate.getTime())) {
            clientReturnDeadlineDate.setDate(clientReturnDeadlineDate.getDate() + returnPeriodDays);
            clientReturnDeadline = clientReturnDeadlineDate.toISOString().split('T')[0];
          }
        }

        const dateForStatus = extension
          ? extension.custom_return_date
          : (isClient && clientReturnDeadline
              ? clientReturnDeadline
              : finalReturnDate);

        const statusObj = supabaseHelpers.getDrumStatus(dateForStatus);

        return {
          ...drum,
          db_data_zwrotu_do_dostawcy: drum.data_zwrotu_do_dostawcy, // Zachowaj surową wartość przed nadpisaniem
          data_zwrotu_do_dostawcy: finalReturnDate, // Nadpisujemy
          
          // Indywidualne przedłużenie
          isExtended: !!extension,
          extensionNotes: extension ? extension.notes : null,
          extensionCreatedBy: extension ? extension.created_by : null,
          extensionCreatedAt: extension ? extension.created_at : null,
          
          clientReturnDeadline: clientReturnDeadline,
          returnPeriodDays,
          
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
  },

  /**
   * Pobiera listę unikalnych dostawców z tabeli bębnów.
   * @returns {Promise<Array<string>>} Lista unikalnych dostawców
   */
  async getUniqueSuppliers() {
    try {
      // Pobieramy wszystkie wartości kon_dostawca z bazy przy użyciu paginacji
      let allData = [];
      let pageIndex = 0;
      const chunkSize = 1000;

      while (true) {
        const from = pageIndex * chunkSize;
        const to = from + chunkSize - 1;
        
        const { data, error } = await supabase
          .from('drums')
          .select('kon_dostawca')
          .not('kon_dostawca', 'is', null)
          .range(from, to);

        if (error) throw error;

        if (!data || data.length === 0) {
          break;
        }

        allData = allData.concat(data);
        if (data.length < chunkSize) {
          break;
        }
        pageIndex++;
      }

      // Wyodrębniamy unikalne wartości, usuwamy puste i sortujemy
      const uniqueSuppliers = [...new Set(allData.map(item => item.kon_dostawca.trim()))]
        .filter(supplier => supplier.length > 0)
        .sort((a, b) => a.localeCompare(b));

      return uniqueSuppliers;
    } catch (error) {
      console.error('Błąd pobierania unikalnych dostawców:', error);
      return [];
    }
  },

  /**
   * Zapisuje lub aktualizuje indywidualne przedłużenie terminu zwrotu bębna.
   * @param {string} kod_bebna - Kod bębna.
   * @param {string} nip - NIP klienta.
   * @param {string} custom_return_date - Nowa data zwrotu (YYYY-MM-DD).
   * @param {string} notes - Uzasadnienie przedłużenia.
   * @param {string} username - Nazwa specjalisty wprowadzającego zmianę.
   * @returns {Promise<object>} Zapisany rekord.
   */
  async setCustomDrumDeadline(kod_bebna, nip, custom_return_date, notes, username) {
    try {
      console.log(`💾 Zapisywanie przedłużenia bębna ${kod_bebna} (NIP: ${nip}) do ${custom_return_date}`);
      const { data, error } = await supabase
        .from('custom_drum_deadlines')
        .upsert({
          kod_bebna,
          nip,
          custom_return_date,
          notes,
          created_by: username,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'kod_bebna,nip'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Błąd zapisu niestandardowego terminu zwrotu:', error);
      throw error;
    }
  },

  /**
   * Usuwa indywidualne przedłużenie terminu zwrotu bębna, przywracając termin domyślny.
   * @param {string} kod_bebna - Kod bębna.
   * @param {string} nip - NIP klienta.
   * @returns {Promise<object>} Wynik operacji.
   */
  async deleteCustomDrumDeadline(kod_bebna, nip) {
    try {
      console.log(`🗑️ Usuwanie przedłużenia bębna ${kod_bebna} (NIP: ${nip})`);
      const { data, error } = await supabase
        .from('custom_drum_deadlines')
        .delete()
        .eq('kod_bebna', kod_bebna)
        .eq('nip', nip);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Błąd usuwania niestandardowego terminu zwrotu:', error);
      throw error;
    }
  }
};

// ==================================
//  API do Firm
// ==================================
export const companiesAPI = {
  /**
   * Pobiera listę firm wraz z dodatkowymi statystykami (serwerowa paginacja, szukanie, filtrowanie).
   * @param {object} options - Opcje paginacji, wyszukiwania i filtrowania.
   * @returns {Promise<object>} Obiekt z danymi firm i metadanymi paginacji.
   */
  async getCompanies(options = {}) {
    try {
      const {
        page = 1,
        limit = 1000,
        sortBy = 'name',
        sortOrder = 'asc',
        search = '',
        filterStatus = 'all'
      } = options;

      console.log(`🔄 getCompanies - strona ${page}, limit ${limit}, szukaj: "${search}", filtr: ${filterStatus}, sort: ${sortBy} ${sortOrder}`);

      const userStr = localStorage.getItem('currentUser');
      const currentUser = userStr ? JSON.parse(userStr) : null;

      let query = supabase
        .from('company_client_stats')
        .select('*', { count: 'exact' });

      // Filtrowanie uprawnień dla handlowców
      if (currentUser && ['Dyrektor', 'Kierownik', 'Wsparcie', 'Specjalista'].includes(currentUser.role)) {
        if (currentUser.role === 'Specjalista') {
          query = query.eq('salesperson_name', currentUser.name);
        } else if (currentUser.role === 'Wsparcie' || currentUser.role === 'Kierownik') {
          query = query.eq('market', currentUser.market);
        } else if (currentUser.role === 'Dyrektor') {
          if (currentUser.region !== 'Wszystkie') {
            query = query.eq('salesperson_region', currentUser.region);
          }
        }
      }

      // Wyszukiwanie
      if (search) {
        const safeSearch = `%${search}%`;
        query = query.or(`name.ilike.${safeSearch},nip.ilike.${safeSearch},email.ilike.${safeSearch},salesperson_name.ilike.${safeSearch},market.ilike.${safeSearch}`);
      }

      // Filtrowanie
      if (filterStatus === 'active') {
        query = query.gt('drumsCount', 0);
      } else if (filterStatus === 'no-drums') {
        query = query.eq('drumsCount', 0);
      } else if (filterStatus === 'pending') {
        query = query.gt('pendingRequests', 0);
      }

      // Sortowanie
      let dbSortBy = sortBy;
      if (sortBy === 'lastActivity') {
        dbSortBy = 'created_at';
      }
      query = query.order(dbSortBy, { ascending: sortOrder === 'asc' });

      // Paginacja
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      
      if (error) {
        if (error.code === '42P01') {
          throw new Error('Widok w bazie danych "company_client_stats" nie istnieje. Uruchom skrypt SQL "create_company_client_stats_view.sql" w panelu Supabase, aby utworzyć wymagany widok.');
        }
        throw error;
      }

      const mappedData = (data || []).map(company => ({
        ...company,
        returnPeriodDays: 120, // domyślna wartość lub powiązana z custom
        status: 'Aktywny',
        lastActivity: company.created_at || new Date().toISOString().split('T')[0]
      }));

      return {
        data: mappedData,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasNext: page < Math.ceil((count || 0) / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Błąd API getCompanies:', error);
      throw error;
    }
  },

  /**
   * Pobiera globalne statystyki klientów (ogółem, z bębnami, z oczekującymi zwrotami, bez bębnów).
   * Wykorzystuje ultra-lekkie zapytania count: 'exact', head: true.
   * @returns {Promise<object>} Statystyki globalne.
   */
  async getGlobalStats() {
    try {
      console.log('🔄 getGlobalStats - pobieranie statystyk globalnych...');
      
      const userStr = localStorage.getItem('currentUser');
      const currentUser = userStr ? JSON.parse(userStr) : null;
      
      const applyFilters = (query) => {
        if (currentUser && ['Dyrektor', 'Kierownik', 'Wsparcie', 'Specjalista'].includes(currentUser.role)) {
          if (currentUser.role === 'Specjalista') {
            return query.eq('salesperson_name', currentUser.name);
          } else if (currentUser.role === 'Wsparcie' || currentUser.role === 'Kierownik') {
            return query.eq('market', currentUser.market);
          } else if (currentUser.role === 'Dyrektor') {
            if (currentUser.region !== 'Wszystkie') {
              return query.eq('salesperson_region', currentUser.region);
            }
          }
        }
        return query;
      };

      const [totalRes, activeRes, pendingRes, noDrumsRes] = await Promise.all([
        applyFilters(supabase.from('company_client_stats').select('*', { count: 'exact', head: true })),
        applyFilters(supabase.from('company_client_stats').select('*', { count: 'exact', head: true }).gt('drumsCount', 0)),
        applyFilters(supabase.from('company_client_stats').select('*', { count: 'exact', head: true }).gt('pendingRequests', 0)),
        applyFilters(supabase.from('company_client_stats').select('*', { count: 'exact', head: true }).eq('drumsCount', 0))
      ]);

      if (totalRes.error) {
        if (totalRes.error.code === '42P01') {
          throw new Error('Widok w bazie danych "company_client_stats" nie istnieje. Uruchom skrypt SQL "create_company_client_stats_view.sql" w panelu Supabase.');
        }
        throw totalRes.error;
      }

      return {
        total: totalRes.count || 0,
        withDrums: activeRes.count || 0,
        withPending: pendingRes.count || 0,
        noDrums: noDrumsRes.count || 0
      };
    } catch (error) {
      console.error('Błąd API getGlobalStats:', error);
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
      } else {
        const userStr = localStorage.getItem('currentUser');
        const currentUser = userStr ? JSON.parse(userStr) : null;
        const allowedNips = await getAllowedNips(currentUser);
        if (allowedNips) {
          if (allowedNips.length === 0) {
            return [];
          }
          query = query.in('user_nip', allowedNips);
        }
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
   * Aktualizuje zgłoszenie zwrotu (status, daty, numer korekty itp.).
   * @param {number} id - ID zgłoszenia.
   * @param {object} updates - Obiekt z polami do aktualizacji (np. { status, transport_date }).
   * @returns {Promise<object>} Zaktualizowane zgłoszenie.
   */
  async updateReturnStatus(id, updates) {
    try {
      // Jeśli updates jest stringiem, traktujemy to jako sam status (kompatybilność wsteczna)
      const updatePayload = typeof updates === 'string' 
        ? { status: updates } 
        : updates;

      const { data, error } = await supabase
        .from('return_requests')
        .update({ 
          ...updatePayload, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd aktualizacji zgłoszenia zwrotu:', error);
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
        // Statystyki dla klienta - idealnie zsynchronizowane z widokami klienta
        console.log(`👤 Liczenie bębnów dla klienta ${nip}...`);

        const [userDrums, { count: pendingReturns }] = await Promise.all([
          drumsAPI.getAllDrums(nip),
          supabase.from('return_requests').select('*', { count: 'exact', head: true }).eq('user_nip', nip).eq('status', 'Pending')
        ]);

        const thirtyDaysAgoStr = thirtyDaysAgo.split('T')[0];
        
        const totalDrums = userDrums.length;
        const activeDrums = userDrums.filter(d => d.status === 'Aktywny').length;
        const recentReturns = userDrums.filter(d => d.data_wydania && d.data_wydania >= thirtyDaysAgoStr).length;

        console.log(`✅ Statystyki klienta ${nip}: ${totalDrums} bębnów, ${activeDrums} aktywnych`);
        return {
          totalDrums,
          activeDrums,
          pendingReturns: pendingReturns || 0,
          recentReturns
        };
      }

      // Statystyki dla admina - NAPRAWIONE: head: true oznacza że pobieramy TYLKO COUNT
      console.log(`👨‍💼 Liczenie statystyk dla administratora/handlowca...`);

      const userStr = localStorage.getItem('currentUser');
      const currentUser = userStr ? JSON.parse(userStr) : null;
      const allowedNips = await getAllowedNips(currentUser);

      const applyNipFilter = (query, field = 'nip') => {
        if (allowedNips) {
          if (allowedNips.length === 0) {
            return query.eq(field, '0000000000_none');
          }
          return query.in(field, allowedNips);
        }
        return query;
      };

      const [
        { count: totalClients },
        { count: totalDrums },
        { count: pendingReturns },
        { count: overdueReturns },
        { count: activeRequests },
        { count: completedRequests }
      ] = await Promise.all([
        applyNipFilter(supabase.from('companies').select('*', { count: 'exact', head: true })),
        applyNipFilter(supabase.from('drums').select('*', { count: 'exact', head: true })),
        applyNipFilter(supabase.from('return_requests').select('*', { count: 'exact', head: true }).eq('status', 'Pending'), 'user_nip'),
        applyNipFilter(supabase.from('drums').select('*', { count: 'exact', head: true }).lt('data_zwrotu_do_dostawcy', now)),
        applyNipFilter(supabase.from('return_requests').select('*', { count: 'exact', head: true }).in('status', ['Pending', 'Approved']), 'user_nip'),
        applyNipFilter(supabase.from('return_requests').select('*', { count: 'exact', head: true }).eq('status', 'Completed').gte('updated_at', thirtyDaysAgo), 'user_nip')
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
      const fourteenDaysFromNow = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      const [
        { count: totalDrums },
        { count: activeDrums },
        { count: overdueDrums },
        { count: dueSoonDrums }
      ] = await Promise.all([
        // Wszystkie bębny
        supabase.from('drums').select('*', { count: 'exact', head: true }),
        // Aktywne (termin zwrotu w przyszłości, więcej niż 14 dni)
        supabase.from('drums').select('*', { count: 'exact', head: true }).gt('data_zwrotu_do_dostawcy', fourteenDaysFromNow),
        // Przeterminowane (termin zwrotu w przeszłości)
        supabase.from('drums').select('*', { count: 'exact', head: true }).lt('data_zwrotu_do_dostawcy', now),
        // Zbliża się termin (między dziś a 14 dni)
        supabase.from('drums').select('*', { count: 'exact', head: true })
          .gte('data_zwrotu_do_dostawcy', now)
          .lte('data_zwrotu_do_dostawcy', fourteenDaysFromNow)
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
//  API do Zasad Zwrotów
// ==================================
export const rulesAPI = {
  async getRules() {
    try {
      const { data, error } = await supabase
        .from('supplier_return_rules')
        .select('*')
        .order('supplier_name', { ascending: true })
        .order('max_days_overdue', { ascending: true });

      if (error) {
        if (error.code === '42P01') {
          // Tabela może jeszcze nie istnieć
          return [];
        }
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('Błąd podczas pobierania zasad zwrotów:', error);
      return [];
    }
  },
  async addRule(rule) {
    try {
      const { data, error } = await supabase
        .from('supplier_return_rules')
        .insert([rule])
        .select();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd dodawania reguły:', error);
      throw error;
    }
  },
  async deleteRule(id) {
    try {
      const { error } = await supabase
        .from('supplier_return_rules')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Błąd usuwania reguły:', error);
      throw error;
    }
  }
};

// ==================================
//  API do Profili Pracowników
// ==================================
export const profilesAPI = {
  /**
   * Pobiera profile pracowników dla danej firmy.
   * @param {string} companyNip - NIP firmy.
   * @returns {Promise<Array>} Lista profili.
   */
  async getProfiles(companyNip) {
    try {
      const { data, error } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('company_nip', companyNip)
        .order('created_at', { ascending: true });

      if (error) {
        if (error.code === '42P01') {
          // Tabela może jeszcze nie istnieć
          return [];
        }
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('Błąd podczas pobierania profili:', error);
      return [];
    }
  },

  /**
   * Tworzy nowy profil pracownika.
   * @param {object} profileData - Dane profilu ({ company_nip, name, email, phone }).
   * @returns {Promise<object>} Utworzony profil.
   */
  async createProfile(profileData) {
    try {
      const { data, error } = await supabase
        .from('client_profiles')
        .insert([profileData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd podczas tworzenia profilu:', error);
      throw error;
    }
  },

  /**
   * Usuwa profil pracownika.
   * @param {number} id - ID profilu.
   * @returns {Promise<boolean>} Czy usunięto pomyślnie.
   */
  async deleteProfile(id) {
    try {
      const { error } = await supabase
        .from('client_profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Błąd podczas usuwania profilu:', error);
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
    return data?.return_period_days || 120; // Domyślny termin 120 dni
  } catch (error) {
    console.error('Błąd pobierania terminu zwrotu:', error);
    return 120; // Zwróć domyślny w razie błędu
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