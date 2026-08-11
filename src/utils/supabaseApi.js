// src/utils/supabaseApi.js
// FINALNA, KOMPLETNA WERSJA Z PAGINACJĄ - Przeznaczona do pracy z rzeczywistymi danymi z Supabase.

import { supabase, supabaseHelpers } from '../lib/supabase';
export { supabase, supabaseHelpers };

// ============================================================
// BEZPIECZNY CACHE UŻYTKOWNIKA
// Ustawiany WYŁĄCZNIE przez App.js po weryfikacji sesji Supabase.
// NIE pochodzi z localStorage — użytkownik nie może go sfałszować
// przez edycję w DevTools.
// ============================================================
let _currentUserCache = null;

/** Ustawia cache zalogowanego użytkownika (wywołuj tylko z App.js po auth.getSession/onAuthStateChange) */
export function setCurrentUserCache(user) {
  _currentUserCache = user || null;
}

/** Pobiera zalogowanego użytkownika z bezpiecznego cache (nie z localStorage) */
export function getCurrentUserFromCache() {
  return _currentUserCache;
}

// Pomocnicza funkcja pobierająca listę NIP-ów, do których zalogowany użytkownik ma dostęp
export async function getAllowedNips(user) {
  if (!user) return [];
  const roleLower = user.role?.toLowerCase() || '';
  if (roleLower === 'admin' || roleLower === 'supervisor' || roleLower === 'magazyn') return null;
  if (roleLower === 'client') return [user.nip];
  
  if (['dyrektor', 'kierownik', 'wsparcie', 'magazyn', 'specjalista'].includes(roleLower)) {
    // Pobierz aktualny rynek i region pracownika z tabeli salespeople
    const { data: myData } = await supabase
      .from('salespeople')
      .select('market, region')
      .eq('email', user.email)
      .single();
      
    const myMarket = myData?.market || user.market;
    const myRegion = myData?.region || user.region;

    if (roleLower === 'dyrektor' && myRegion === 'Wszystkie') {
      return null;
    }
    
    let q = supabase.from('companies').select('nip').limit(50000);
    
    if (roleLower === 'specjalista') {
      q = q.eq('salesperson_name', user.name);
    } else if (roleLower === 'kierownik' || roleLower === 'wsparcie') {
      // Pobierz wszystkich handlowców z tego samego rynku
      const { data: sps } = await supabase
        .from('salespeople')
        .select('name')
        .eq('market', myMarket)
        .limit(10000);
      const spNames = sps ? sps.map(s => s.name) : [];
      
      if (spNames.length === 0) return [];
      q = q.in('salesperson_name', spNames);
    } else if (roleLower === 'dyrektor') {
      // Pobierz wszystkich handlowców z tego samego regionu
      let spQuery = supabase.from('salespeople').select('name').limit(10000);
      if (myRegion && myRegion !== 'Wszystkie') {
        spQuery = spQuery.eq('region', myRegion);
      }
      const { data: sps } = await spQuery;
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
   * Rejestruje nowego klienta w systemie.
   * @param {string} email - Adres e-mail.
   * @param {string} password - Hasło.
   * @param {object} metadata - Metadane użytkownika (name, phone, companyName, nip, rodoAccepted).
   */
  async signUp(email, password, metadata) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: metadata.name,
          phone: metadata.phone,
          companyName: metadata.companyName,
          nip: metadata.nip,
          rodoAccepted: metadata.rodoAccepted,
          role: 'client',
          status: 'pending'
        }
      }
    });

    if (error) {
      throw new Error(error.message || 'Wystąpił błąd podczas rejestracji.');
    }
    return data;
  },

  /**
   * Loguje użytkownika na adres e-mail i hasło.
   * @param {string} email - E-mail.
   * @param {string} password - Hasło.
   */
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      throw new Error(error.message || 'Błędny e-mail lub hasło.');
    }

    // Pobierz profil zalogowanego użytkownika
    const profile = await this.getUserProfile(data.user.id);
    
    const finalUser = {
      id: data.user.id,
      nip: profile.nip,
      username: profile.email,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      status: profile.status,
      companyName: profile.company_name || profile.name,
    };

    localStorage.setItem('currentUser', JSON.stringify(finalUser));
    return { user: finalUser, session: data.session };
  },

  /**
   * Pobiera publiczny profil użytkownika z bazy danych.
   * @param {string} userId - ID użytkownika z auth.users.
   */
  async getUserProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      throw new Error('Nie udało się załadować profilu użytkownika.');
    }
    return data;
  },

  /**
   * Pobiera oczekujące wnioski rejestracyjne dla administratora.
   */
  async getPendingRegistrations() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Akceptuje i aktywuje konto klienta przypisując mu NIP.
   */
  async approveRegistration(profileId, nip, companyName) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        status: 'approved',
        nip: nip,
        company_name: companyName,
        updated_at: new Date().toISOString()
      })
      .eq('id', profileId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Odrzuca wniosek rejestracyjny.
   */
  async rejectRegistration(profileId) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', profileId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async requestPasswordSetup(email) {
    const redirectUrl = `${window.location.origin}/set-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      throw new Error(error.message || 'Błąd wysyłania linku resetującego.');
    }

    return { message: 'Link do resetowania hasła został wysłany na Twój adres e-mail.' };
  },

  /**
   * Ustawia nowe hasło dla użytkownika.
   */
  async setNewPassword(password) {
    const { data, error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      throw new Error(error.message || 'Nie udało się zaktualizować hasła.');
    }

    return data;
  },

  /**
   * Wylogowuje użytkownika.
   */
  async logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentProfile');
    await supabase.auth.signOut();
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
   * Pobiera unikalną listę rozmiarów bębnów znajdujących się na magazynie.
   */
  async getWarehouseDrumSizes() {
    try {
      const allSizes = new Set();
      const chunkSize = 1000;

      const buildQuery = (isCount = false) => {
        let q = supabase.from('drums');
        if (isCount) {
          q = q.select('*', { count: 'exact', head: true });
        } else {
          q = q.select('rozmiar_bebna');
        }
        return q.or('typ_opakowania.eq.Bęben,typ_opakowania.is.null').in('status', ['pusty na magazynie', 'na magazynie z towarem']);
      };

      const { count, error: countError } = await buildQuery(true);
      if (countError) throw countError;

      if (count && count > 0) {
        const totalPages = Math.ceil(count / chunkSize);
        const promises = [];
        for (let i = 0; i < totalPages; i++) {
          promises.push(buildQuery(false).range(i * chunkSize, (i + 1) * chunkSize - 1));
        }

        const results = await Promise.all(promises);
        for (const res of results) {
          if (res.error) throw res.error;
          if (res.data) {
            res.data.forEach(d => {
              if (d.rozmiar_bebna) allSizes.add(d.rozmiar_bebna);
            });
          }
        }
      }
      return [...allSizes].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
    } catch (error) {
      console.error('Błąd pobierania rozmiarów:', error);
      return [];
    }
  },

  /**
   * Pobiera unikalną listę wszystkich rozmiarów bębnów.
   */
  async getAllDrumSizes() {
    try {
      const allSizes = new Set();
      const chunkSize = 1000;

      const buildQuery = (isCount = false) => {
        let q = supabase.from('drums');
        if (isCount) {
          q = q.select('*', { count: 'exact', head: true });
        } else {
          q = q.select('rozmiar_bebna');
        }
        return q.or('typ_opakowania.eq.Bęben,typ_opakowania.is.null');
      };

      const { count, error: countError } = await buildQuery(true);
      if (countError) throw countError;

      if (count && count > 0) {
        const totalPages = Math.ceil(count / chunkSize);
        const promises = [];
        for (let i = 0; i < totalPages; i++) {
          promises.push(buildQuery(false).range(i * chunkSize, (i + 1) * chunkSize - 1));
        }

        const results = await Promise.all(promises);
        for (const res of results) {
          if (res.error) throw res.error;
          if (res.data) {
            res.data.forEach(d => {
              if (d.rozmiar_bebna) allSizes.add(d.rozmiar_bebna);
            });
          }
        }
      }
      return [...allSizes].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
    } catch (error) {
      console.error('Błąd pobierania rozmiarów:', error);
      return [];
    }
  },

  async getWarehouseDrumMagazyny() {
    try {
      const { data, error } = await supabase
        .from('drums')
        .select('magazyn')
        .in('status', ['pusty na magazynie', 'na magazynie z towarem'])
        .not('magazyn', 'is', null)
        .neq('magazyn', '');
      
      if (error) throw error;
      
      const magazyny = [...new Set(data.map(d => d.magazyn))];
      return magazyny.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
    } catch (error) {
      console.error('Błąd getWarehouseDrumMagazyny:', error);
      throw error;
    }
  },

  /**
   * Pobiera bębny znajdujące się na magazynie (na podstawie statusu).
   * Zoptymalizowane do wyświetlania w nowym module Magazynu.
   */
  async getWarehouseDrums(options = {}) {
    try {
      const {
        page = 1,
        limit = 100,
        sortBy = 'data_zwrotu_do_dostawcy',
        sortOrder = 'asc',
        search = '',
        statusFilter = 'all', // 'all', 'empty', 'full'
        urgentOnly = false,
        withLocationOnly = false,
        selectedSizes = [],
        selectedMagazyny = []
      } = options;

      let query = supabase
        .from('drums')
        .select('*', { count: 'exact' })
        .eq('typ_opakowania', 'Bęben');

      if (statusFilter === 'empty') {
        query = query.eq('status', 'pusty na magazynie');
      } else if (statusFilter === 'full') {
        query = query.eq('status', 'na magazynie z towarem');
      } else {
        query = query.in('status', ['pusty na magazynie', 'na magazynie z towarem']);
      }

      if (urgentOnly) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const nextMonth = new Date(today);
        nextMonth.setDate(today.getDate() + 30);
        
        const todayStr = today.toISOString().split('T')[0];
        const nextMonthStr = nextMonth.toISOString().split('T')[0];
        
        query = query.gte('data_zwrotu_do_dostawcy', todayStr).lte('data_zwrotu_do_dostawcy', nextMonthStr);
      }

      if (withLocationOnly) {
        query = query.not('lokalizacja_wms', 'is', null).neq('lokalizacja_wms', '');
      }

      if (selectedSizes && selectedSizes.length > 0) {
        query = query.in('rozmiar_bebna', selectedSizes);
      }

      if (selectedMagazyny && selectedMagazyny.length > 0) {
        query = query.in('magazyn', selectedMagazyny);
      }

      if (search) {
        const safeSearch = `%${search}%`;
        query = query.or(`cecha.ilike.${safeSearch},nazwa.ilike.${safeSearch},kon_dostawca.ilike.${safeSearch},rozmiar_bebna.ilike.${safeSearch},lokalizacja_wms.ilike.${safeSearch}`);
      }

      query = query.order(sortBy, { ascending: sortOrder === 'asc', nullsFirst: false });

      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);
      
      const { data, error, count } = await query;
      if (error) throw error;

      return {
        data: data || [],
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
      console.error('Błąd getWarehouseDrums:', error);
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
        companySearch = '',
        status = 'all',
        supplierDateRange = 'all',
        clientDateRange = 'all',
        paymentStatus = 'all',
        selectedSizes = [],
        reportedOnly = false
      } = options;

      console.log(`🔄 getDrums wywołane z: nip=${nip}, page=${page}, search="${search}", companySearch="${companySearch}", status=${status}, supplierDateRange=${supplierDateRange}, clientDateRange=${clientDateRange}, paymentStatus=${paymentStatus}, reportedOnly=${reportedOnly}`);

      // Podstawowe zapytanie
      let query = supabase
        .from('drums')
        .select(`*, companies (name, email, phone, address, salesperson_name, market, custom_return_periods(return_period_days))`, { count: 'exact' })
        .or('typ_opakowania.eq.Bęben,typ_opakowania.is.null');

      // Zawsze pobieramy aktywne zlecenia zwrotu, by znać datę ich zgłoszenia
      let reqQuery = supabase
        .from('return_requests')
        .select('selected_drums, created_at')
        .in('status', ['Pending', 'Approved', 'InTransit']);
      
      if (nip) {
        reqQuery = reqQuery.eq('user_nip', nip);
      }

      const { data: activeRequests, error: reqError } = await reqQuery;
      if (reqError) {
        console.error('Błąd pobierania zgłoszeń:', reqError);
      }

      const reportedDrumsMap = new Map();
      if (activeRequests) {
        activeRequests.forEach(req => {
          const drums = req.selected_drums;
          if (Array.isArray(drums)) {
            drums.forEach(d => {
              const cecha = typeof d === 'object' ? (d.cecha || d.kod_bebna) : d;
              const reportedAt = (typeof d === 'object' && d.reported_at) ? d.reported_at : req.created_at;
              if (cecha) reportedDrumsMap.set(cecha, reportedAt);
            });
          }
        });
      }

      // Jeśli włączony jest filtr "Tylko zgłoszone", filtrujemy zapytanie
      if (reportedOnly) {
        const cechaArray = Array.from(reportedDrumsMap.keys());
        if (cechaArray.length === 0) {
          // Brak zgłoszonych bębnów - zwracamy pustą listę bezpośrednio
          return {
            data: [],
            pagination: {
              page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false
            },
            meta: {
              sortBy, sortOrder, search, status, supplierDateRange, clientDateRange, nip, reportedOnly
            }
          };
        }
        query = query.in('cecha', cechaArray);
      }

      // Filtrowanie po NIP — używamy bezpiecznego cache, NIE localStorage
      const currentUser = _currentUserCache;
      const isClient = currentUser && currentUser.role === 'client';

      if (nip) {
        query = query.eq('nip', nip);
        // Ukryj bębny, które zostały już zwrócone (status kontrahenta: 'Nie wydany' lub 'magazyn')
        query = query.neq('kontrahent', 'Nie wydany').not('kontrahent', 'ilike', '%magazyn%');

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
                supplierDateRange,
                clientDateRange,
                nip,
                reportedOnly
              }
            };
          }
          query = query.in('nip', allowedNips);
          query = query.neq('kontrahent', 'Nie wydany').not('kontrahent', 'ilike', '%magazyn%');
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

      // 2. Filtrowanie po Terminie Kablowni (supplierDateRange)
      if (supplierDateRange !== 'all') {
        query = query.neq('kontrahent', 'Nie wydany').not('kontrahent', 'ilike', '%magazyn%');

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        const nextWeekStr = nextWeek.toISOString().split('T')[0];

        if (supplierDateRange === 'overdue') {
          query = query.lt('data_zwrotu_do_dostawcy', todayStr);
        } else if (supplierDateRange === 'due-soon') {
          query = query.gte('data_zwrotu_do_dostawcy', todayStr).lte('data_zwrotu_do_dostawcy', nextWeekStr);
        } else if (supplierDateRange === 'active') {
          query = query.or(`data_zwrotu_do_dostawcy.gt.${nextWeekStr},data_zwrotu_do_dostawcy.is.null`);
        }
      }

      // 3. Filtrowanie po Terminie Klienta (clientDateRange)
      if (clientDateRange !== 'all') {
        if (clientDateRange === 'extended') {
          const { data: extData, error: extError } = await supabase
            .from('custom_drum_deadlines')
            .select('kod_bebna');
          
          if (!extError && extData && extData.length > 0) {
            const cechas = extData.map(e => e.kod_bebna);
            query = query.in('cecha', cechas);
          } else {
            return { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false }, meta: { sortBy, sortOrder, search, status, supplierDateRange, clientDateRange, nip } };
          }
        } else {
          query = query.neq('kontrahent', 'Nie wydany').not('kontrahent', 'ilike', '%magazyn%');
          
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // Uproszczone zapytanie dla DB bazujące na domyślnym 120 dni. Dokładne terminy klienta są liczone w JS.
          const thresholdOverdue = new Date(today);
          thresholdOverdue.setDate(thresholdOverdue.getDate() - 120);
          const thresholdOverdueStr = thresholdOverdue.toISOString().split('T')[0];

          const thresholdDueSoon = new Date(today);
          thresholdDueSoon.setDate(thresholdDueSoon.getDate() - 120 + 7);
          const thresholdDueSoonStr = thresholdDueSoon.toISOString().split('T')[0];

          if (clientDateRange === 'overdue') {
            query = query.lt('data_wydania', thresholdOverdueStr);
          } else if (clientDateRange === 'due-soon') {
            query = query.gte('data_wydania', thresholdOverdueStr).lte('data_wydania', thresholdDueSoonStr);
          } else if (clientDateRange === 'active') {
            query = query.gt('data_wydania', thresholdDueSoonStr);
          }
        }
      }

      // 3. Filtrowanie po statusie płatności
      if (paymentStatus !== 'all') {
        if (paymentStatus === 'paid') {
          query = query.eq('czy_zaplacona', 'Tak');
        } else if (paymentStatus === 'unpaid') {
          query = query.eq('czy_zaplacona', 'Nie');
        } else if (paymentStatus === 'no_invoice') {
          query = query.eq('czy_zaplacona', 'Brak faktury');
        } else if (paymentStatus === 'overdue_payment') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayStr = today.toISOString().split('T')[0];
          // Since termin_platnosci is TEXT (DD.MM.YYYY), we can't do direct lt/gt comparisons in Supabase without casting or regex. 
          // For now, we'll fetch them all and let frontend filter, OR if we strictly formatted dates as YYYY-MM-DD it would work.
          // Wait, we can't filter correctly in SQL if dates are stored as DD.MM.YYYY strings. 
          // However, we can fetch unpaid and then we'll map/filter them on frontend.
          // But since pagination limits the fetch, filtering on frontend after limit is bad.
          // Since the user just changed the type to TEXT today, we should probably just fetch unpaid and sort.
          query = query.eq('czy_zaplacona', 'Nie');
        }
      }

      // Filtrowanie po wyszukiwaniu - dane bębna
      if (search) {
        // PostgREST `ilike` z `or`: bezpieczniej przekazać surowy search, Supabase zepnie go przez URL encoding 
        const safeSearch = `%${search}%`;
        query = query.or(`cecha.ilike.${safeSearch},kod_bebna.ilike.${safeSearch},nazwa.ilike.${safeSearch},adres_dostawy.ilike.${safeSearch},nazwa_punktu_dostawy.ilike.${safeSearch},numer_faktury.ilike.${safeSearch},kon_dostawca.ilike.${safeSearch}`);
      }

      // Filtrowanie po wyszukiwaniu - dane firmy
      if (companySearch) {
        const safeSearch = `%${companySearch}%`;
        query = query.or(`pelna_nazwa_kontrahenta.ilike.${safeSearch},nip.ilike.${safeSearch}`);
      }

      // Filtrowanie po rozmiarach
      if (selectedSizes && selectedSizes.length > 0) {
        query = query.in('rozmiar_bebna', selectedSizes);
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

      // Pobieranie niestandardowych terminów i wyjątków dla pobranych bębnów
      let customDeadlines = [];
      let exceptions = [];
      let clientNotes = [];
      if (data && data.length > 0) {
        const drumCechas = data.map(d => d.cecha || d.kod_bebna).filter(Boolean);
        const nips = [...new Set(data.map(d => d.nip).filter(Boolean))];
        
        // Terminy
        const { data: deadlinesData } = await supabase
          .from('custom_drum_deadlines')
          .select('*')
          .in('kod_bebna', drumCechas)
          .in('nip', nips);
        if (deadlinesData) {
          customDeadlines = deadlinesData;
        }

        // Wyjątki (zagubione / zatrzymane) - POBIERZ DLA WSZYSTKICH NIPÓW
        const { data: excData } = await supabase
          .from('drum_exceptions')
          .select('*')
          .in('nip', nips);
        if (excData) {
          exceptions = excData;
        }

        // Notatki klienta
        const { data: notesData } = await supabase
          .from('client_drum_notes')
          .select('*')
          .in('nip', nips);
        if (notesData) {
          clientNotes = notesData;
        }
      }

      // Mapowanie danych do spójnego formatu używanego w komponentach
      const mappedData = data.map(drum => {
        const extension = customDeadlines.find(
          ext => (ext.kod_bebna === drum.cecha || ext.kod_bebna === drum.kod_bebna) && ext.nip === drum.nip
        );

        let finalReturnDate = drum.data_zwrotu_do_dostawcy;
        if (!finalReturnDate && drum.data_wydania) {
          const d = new Date(drum.data_wydania);
          d.setDate(d.getDate() + 120);
          finalReturnDate = d.toISOString().split('T')[0];
        }
        
        const returnPeriodDays = drum.companies?.custom_return_periods?.[0]?.return_period_days || 120;
        
        let reportedDate = null;
        if (drum.cecha && reportedDrumsMap && reportedDrumsMap.has(drum.cecha)) {
          reportedDate = reportedDrumsMap.get(drum.cecha);
        } else if (drum.kod_bebna && reportedDrumsMap && reportedDrumsMap.has(drum.kod_bebna)) {
          reportedDate = reportedDrumsMap.get(drum.kod_bebna);
        }

        const refDateForPossession = reportedDate ? new Date(reportedDate) : new Date();
        const issueDate = new Date(drum.data_wydania || drum.data_przyjecia_na_stan);
        const daysInPossession = Math.ceil((refDateForPossession - issueDate) / (1000 * 60 * 60 * 24));

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

        let statusObj = supabaseHelpers.getDrumStatus(dateForStatus, reportedDate);

        if (reportedDate) {
          statusObj = {
            ...statusObj,
            status: 'reported',
            text: 'Zgłoszony do zwrotu',
            color: 'text-purple-700',
            bgColor: 'bg-purple-100',
            borderColor: 'border-purple-200'
          };
        }

        // Nadpisanie statusu jeśli bęben jest w wyjątkach
        const exception = exceptions.find(e => (e.kod_bebna === drum.cecha || e.kod_bebna === drum.kod_bebna) && e.nip === drum.nip);
        if (exception) {
          if (exception.exception_type === 'lost') {
            statusObj = { status: 'Zagubiony', color: 'bg-red-100 text-red-800' };
          } else if (exception.exception_type === 'kept') {
            statusObj = { status: 'Zatrzymany', color: 'bg-blue-100 text-blue-800' };
          }
        }

        const clientNoteObj = clientNotes.find(n => (n.kod_bebna === drum.cecha || n.kod_bebna === drum.kod_bebna) && n.nip === drum.nip);
        const clientNote = clientNoteObj ? clientNoteObj.note : null;

        return {
          ...drum,
          db_data_zwrotu_do_dostawcy: drum.data_zwrotu_do_dostawcy, // Zachowaj surową wartość przed nadpisaniem
          data_zwrotu_do_dostawcy: finalReturnDate, // Nadpisujemy dla bębnów własnych
          
          // Indywidualne przedłużenie
          isExtended: !!extension,
          extensionNotes: extension ? extension.notes : null,
          extensionCreatedBy: extension ? extension.created_by : null,
          extensionCreatedAt: extension ? extension.created_at : null,
          
          clientNote,
          
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
          statusColor: statusObj.color,
          statusBgColor: statusObj.bgColor,
          statusBorderColor: statusObj.borderColor,
          statusText: statusObj.text,
          daysDiff: statusObj.daysDiff,
          reportedDate: reportedDate,
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
          supplierDateRange,
          clientDateRange,
          nip
        }
      };
    } catch (error) {
      console.error('❌ Błąd API bębnów:', error);
      throw error;
    }
  },

  /**
   * Pobiera salda palet dla klientów, grupując je po NIP.
   */
  async getPalletBalances(nip = null) {
    try {
      const currentUser = _currentUserCache;
      let allowedNips = null;

      if (!nip) {
        allowedNips = await getAllowedNips(currentUser);
        if (allowedNips && allowedNips.length === 0) return [];
      }

      let allData = [];
      const chunkSize = 1000;

      const buildQuery = (isCount = false) => {
        let q = supabase.from('drums');
        if (isCount) {
          q = q.select('*', { count: 'exact', head: true });
        } else {
          q = q.select(`nip, pelna_nazwa_kontrahenta, cecha, nazwa, numer_faktury, data_wydania, data_przyjecia_na_stan, typ_dok, nr_dokumentupz, rozmiar_bebna, cena_netto_bebna`);
        }
        q = q.or('typ_opakowania.ilike.%palet%,typ_opakowania.eq.Paleta,nazwa.ilike.%palet%');

        if (nip) {
          q = q.eq('nip', nip);
        } else if (allowedNips) {
          q = q.in('nip', allowedNips);
        }
        return q;
      };

      const countQuery = buildQuery(true);
      if (countQuery) {
        const { count, error: countError } = await countQuery;
        if (countError) throw countError;

        if (count && count > 0) {
          const totalPages = Math.ceil(count / chunkSize);
          const promises = [];

          for (let i = 0; i < totalPages; i++) {
            const from = i * chunkSize;
            const to = from + chunkSize - 1;
            promises.push(buildQuery(false).range(from, to));
          }

          const results = await Promise.all(promises);
          for (const res of results) {
            if (res.error) throw res.error;
            if (res.data) allData = allData.concat(res.data);
          }
        }
      }

      if (allData.length === 0) return [];

      const clientsMap = {};
      allData.forEach(row => {
        if (!row.nip) return;
        
        const sizeCheck = row.rozmiar_bebna ? row.rozmiar_bebna.trim() : '';
        if (!sizeCheck || sizeCheck.toLowerCase() === 'brak rozmiaru') {
          return;
        }
        
        if (!clientsMap[row.nip]) {
          clientsMap[row.nip] = {
            nip: row.nip,
            companyName: row.pelna_nazwa_kontrahenta || 'Nieznana firma',
            totalBalance: 0,
            balancesBySize: {},
            pricesBySize: {},
            history: []
          };
        }

        const cechaStr = String(row.cecha || '0');
        const quantity = parseInt(cechaStr.replace(/[^\d.-]/g, ''), 10) || 0;

        const typDok = String(row.typ_dok || '').toUpperCase();
        const fv = String(row.numer_faktury || '').toUpperCase();
        
        // Ignorujemy dokumenty przesunięć magazynowych oraz dokumenty wewnętrzne
        if (typDok.startsWith('MM') || typDok.startsWith('PW') || typDok.startsWith('RW') || typDok.startsWith('PWI') || typDok.startsWith('RWI')) {
          return;
        }

        let isReturn = false;
        // Korekty (K, ZWR), przyjęcia z zewnątrz (PZ, PZN) traktujemy jako zmniejszenie salda (zwrot na magazyn)
        if (
          typDok.includes('K') || 
          typDok.includes('ZWR') || 
          typDok.startsWith('PZ') || 
          typDok.startsWith('ZZ') ||
          fv.includes('KFV') || 
          fv.includes('KFO') || 
          fv.includes('KOR')
        ) {
          isReturn = true;
        }

        const finalQuantity = isReturn ? -Math.abs(quantity) : Math.abs(quantity);
        clientsMap[row.nip].totalBalance += finalQuantity;
        
        const size = row.rozmiar_bebna || 'Brak rozmiaru';
        if (!clientsMap[row.nip].balancesBySize[size]) {
          clientsMap[row.nip].balancesBySize[size] = 0;
        }
        clientsMap[row.nip].balancesBySize[size] += finalQuantity;
        
        // Zapisz cenę dla danego rozmiaru palety (bierzemy pod uwagę tylko wydania, czyli bez '-' przed)
        if (!isReturn && row.cena_netto_bebna) {
          clientsMap[row.nip].pricesBySize[size] = row.cena_netto_bebna;
        }

        clientsMap[row.nip].history.push({
          date: row.data_wydania || row.data_przyjecia_na_stan,
          document: row.numer_faktury || row.nr_dokumentupz,
          quantity: finalQuantity,
          size: size,
          name: row.nazwa,
          isReturn
        });
      });

      // Sortuj historię wg daty malejąco dla każdego klienta
      Object.values(clientsMap).forEach(client => {
        client.history.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      });

      return Object.values(clientsMap).sort((a, b) => (b.totalBalance || 0) - (a.totalBalance || 0));
    } catch (error) {
      console.error('❌ Błąd pobierania sald palet:', error);
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
        .from('drum_exceptions')
        .upsert({
          kod_bebna: cecha,
          nip: nip,
          exception_type: 'lost',
          notes: description,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'kod_bebna,nip'
        })
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
   * Zgłasza zatrzymanie bębna przez klienta.
   * @param {string} cecha - Unikalna cecha bębna.
   * @param {string} nip - NIP klienta (dla bezpieczeństwa).
   * @param {string} description - Opis okoliczności zatrzymania.
   * @returns {Promise<object>} Zaktualizowany rekord.
   */
  async reportKept(cecha, nip, description) {
    try {
      console.log(`⚠️ Zgłaszanie zatrzymania bębna: ${cecha} dla NIP: ${nip}`);
      const { data, error } = await supabase
        .from('drum_exceptions')
        .upsert({
          kod_bebna: cecha,
          nip: nip,
          exception_type: 'kept',
          notes: description,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'kod_bebna,nip'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Błąd zgłaszania zatrzymania:', error);
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

      const currentUser = _currentUserCache;
      const isClient = currentUser && currentUser.role === 'client';

      const allowedNips = await getAllowedNips(currentUser);

      let allData = [];
      const chunkSize = 1000;
      const reportedDrumsMap = new Map();

      const buildQuery = (isCount = false) => {
        let q = supabase.from('drums');
        if (isCount) {
          q = q.select('*', { count: 'exact', head: true });
        } else {
          q = q.select(`*, companies (name, email, phone, address, salesperson_name, market, custom_return_periods(return_period_days))`);
        }
        q = q.or('typ_opakowania.eq.Bęben,typ_opakowania.is.null');

        if (nip) {
          q = q.eq('nip', nip);
          q = q.neq('kontrahent', 'Nie wydany').not('kontrahent', 'ilike', '%magazyn%');
          if (isClient) {
            const maxDate = new Date(Date.now() - 456 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            q = q.or(`data_wydania.gte.${maxDate},and(data_wydania.is.null,data_przyjecia_na_stan.gte.${maxDate})`);
          }
        } else if (allowedNips) {
          if (allowedNips.length === 0) return null;
          q = q.in('nip', allowedNips);
          q = q.neq('kontrahent', 'Nie wydany').not('kontrahent', 'ilike', '%magazyn%');
        }
        return q;
      };

      const countQuery = buildQuery(true);
      if (countQuery) {
        const { count, error: countError } = await countQuery;
        if (countError) throw countError;

        if (count && count > 0) {
          const totalPages = Math.ceil(count / chunkSize);
          const promises = [];

          for (let i = 0; i < totalPages; i++) {
            const from = i * chunkSize;
            const to = from + chunkSize - 1;
            promises.push(buildQuery(false).range(from, to).order('kod_bebna'));
          }

          const results = await Promise.all(promises);
          for (const res of results) {
            if (res.error) throw res.error;
            if (res.data) allData = allData.concat(res.data);
          }
        }
      }

      console.log(`✅ getAllDrums pobrał ${allData.length} bębnów z bazy (równolegle)`);

      // Pobranie niestandardowych terminów i wyjątków dla pobranych bębnów
      let customDeadlines = [];
      let exceptions = [];
      let clientNotes = [];
      let adminNotes = [];
      if (allData && allData.length > 0) {
        const drumCechas = allData.map(d => d.cecha || d.kod_bebna).filter(Boolean);
        let deadlinesQuery = supabase.from('custom_drum_deadlines').select('*');
        let excQuery = supabase.from('drum_exceptions').select('*');
        
        if (nip) {
          deadlinesQuery = deadlinesQuery.eq('nip', nip);
          excQuery = excQuery.eq('nip', nip);
          if (drumCechas.length < 200) {
            deadlinesQuery = deadlinesQuery.in('kod_bebna', drumCechas);
            excQuery = excQuery.in('kod_bebna', drumCechas);
          }
        } else if (allowedNips && allowedNips.length > 0) {
          deadlinesQuery = deadlinesQuery.in('nip', allowedNips);
          excQuery = excQuery.in('nip', allowedNips);
          if (drumCechas.length < 200) {
            deadlinesQuery = deadlinesQuery.in('kod_bebna', drumCechas);
            excQuery = excQuery.in('kod_bebna', drumCechas);
          }
        }
        // Dla adminów pobieramy po prostu wszystkie.
        const { data: deadlinesData } = await deadlinesQuery;
        if (deadlinesData) {
          customDeadlines = deadlinesData;
        }

        const { data: excData } = await excQuery;
        if (excData) {
          exceptions = excData;
        }
        
        let notesQuery = supabase.from('client_drum_notes').select('*');
        let adminNotesQuery = supabase.from('admin_drum_notes').select('*');
        if (nip) {
          notesQuery = notesQuery.eq('nip', nip);
          adminNotesQuery = adminNotesQuery.eq('nip', nip);
          if (drumCechas.length < 200) {
            notesQuery = notesQuery.in('kod_bebna', drumCechas);
            adminNotesQuery = adminNotesQuery.in('kod_bebna', drumCechas);
          }
        } else if (allowedNips && allowedNips.length > 0) {
          notesQuery = notesQuery.in('nip', allowedNips);
          adminNotesQuery = adminNotesQuery.in('nip', allowedNips);
          if (drumCechas.length < 200) {
            notesQuery = notesQuery.in('kod_bebna', drumCechas);
            adminNotesQuery = adminNotesQuery.in('kod_bebna', drumCechas);
          }
        }
        
        const { data: notesData } = await notesQuery;
        if (notesData) {
          clientNotes = notesData;
        }

        const { data: adminNotesData } = await adminNotesQuery;
        if (adminNotesData) {
          adminNotes = adminNotesData;
        }

        // --- Zgłoszenia zwrotu ---
        let reqQuery = supabase
          .from('return_requests')
          .select('selected_drums, created_at')
          .in('status', ['Pending', 'Approved', 'InTransit']);
        
        if (nip) {
          reqQuery = reqQuery.eq('user_nip', nip);
        } else if (allowedNips && allowedNips.length > 0) {
          reqQuery = reqQuery.in('user_nip', allowedNips);
        }

        const { data: activeRequests } = await reqQuery;
        if (activeRequests) {
          activeRequests.forEach(req => {
            const drums = req.selected_drums;
            if (Array.isArray(drums)) {
              drums.forEach(d => {
                const cecha = typeof d === 'object' ? (d.cecha || d.kod_bebna) : d;
                const reportedAt = (typeof d === 'object' && d?.reported_at) ? d.reported_at : req.created_at;
                if (cecha) reportedDrumsMap.set(cecha, reportedAt);
              });
            }
          });
        }
      }

      // Mapowanie danych (z mapowaniem wyjątków)
      return allData.map(drum => {
        const extension = customDeadlines.find(
          ext => (ext.kod_bebna === drum.cecha || ext.kod_bebna === drum.kod_bebna) && ext.nip === drum.nip
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
        
        let reportedDate = null;
        if (drum.cecha && reportedDrumsMap && reportedDrumsMap.has(drum.cecha)) {
          reportedDate = reportedDrumsMap.get(drum.cecha);
        } else if (drum.kod_bebna && reportedDrumsMap && reportedDrumsMap.has(drum.kod_bebna)) {
          reportedDate = reportedDrumsMap.get(drum.kod_bebna);
        }

        const refDateForPossession = reportedDate ? new Date(reportedDate) : new Date();
        const issueDate = new Date(drum.data_wydania || drum.data_przyjecia_na_stan);
        const daysInPossession = Math.ceil((refDateForPossession - issueDate) / (1000 * 60 * 60 * 24));

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



        let statusObj = supabaseHelpers.getDrumStatus(dateForStatus, reportedDate);

        if (reportedDate) {
          statusObj = {
            ...statusObj,
            status: 'reported',
            text: 'Zgłoszony do zwrotu',
            color: 'text-purple-700',
            bgColor: 'bg-purple-100',
            borderColor: 'border-purple-200'
          };
        }

        // Nadpisanie statusu jeśli bęben jest w wyjątkach
        const exception = exceptions.find(e => (e.kod_bebna === drum.cecha || e.kod_bebna === drum.kod_bebna) && e.nip === drum.nip);
        if (exception) {
          if (exception.exception_type === 'lost') {
            statusObj = { status: 'Zagubiony', color: 'bg-red-100 text-red-800' };
          } else if (exception.exception_type === 'kept') {
            statusObj = { status: 'Zatrzymany', color: 'bg-blue-100 text-blue-800' };
          }
        }

        const clientNoteObj = clientNotes.find(n => (n.kod_bebna === drum.cecha || n.kod_bebna === drum.kod_bebna) && n.nip === drum.nip);
        const clientNote = clientNoteObj ? clientNoteObj.note : null;

        const adminNoteObj = adminNotes.find(n => (n.kod_bebna === drum.cecha || n.kod_bebna === drum.kod_bebna) && n.nip === drum.nip);
        const adminNote = adminNoteObj ? adminNoteObj.note : null;

        return {
          ...drum,
          db_data_zwrotu_do_dostawcy: drum.data_zwrotu_do_dostawcy, // Zachowaj surową wartość przed nadpisaniem
          data_zwrotu_do_dostawcy: finalReturnDate, // Nadpisujemy
          
          // Indywidualne przedłużenie
          isExtended: !!extension,
          extensionNotes: extension ? extension.notes : null,
          extensionCreatedBy: extension ? extension.created_by : null,
          extensionCreatedAt: extension ? extension.created_at : null,
          
          clientNote,
          adminNote,
          
          clientReturnDeadline: clientReturnDeadline,
          returnPeriodDays,
          
          // Ujednolicony dostęp do formatu dającego "active", "due-soon", "overdue"
          db_status: drum.status,
          status: statusObj.status,
          statusColor: statusObj.color,
          statusBgColor: statusObj.bgColor,
          statusBorderColor: statusObj.borderColor,
          statusText: statusObj.text,
          daysDiff: statusObj.daysDiff,
          reportedDate: reportedDate,
          
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
      let allData = [];
      const chunkSize = 1000;

      const buildQuery = (isCount = false) => {
        let q = supabase.from('drums');
        if (isCount) {
          q = q.select('*', { count: 'exact', head: true });
        } else {
          q = q.select('kon_dostawca');
        }
        return q.not('kon_dostawca', 'is', null);
      };

      const { count, error: countError } = await buildQuery(true);
      if (countError) throw countError;

      if (count && count > 0) {
        const totalPages = Math.ceil(count / chunkSize);
        const promises = [];
        for (let i = 0; i < totalPages; i++) {
          promises.push(buildQuery(false).range(i * chunkSize, (i + 1) * chunkSize - 1));
        }

        const results = await Promise.all(promises);
        for (const res of results) {
          if (res.error) throw res.error;
          if (res.data) allData = allData.concat(res.data);
        }
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
  async setCustomDrumDeadline(cecha, nip, custom_return_date, notes, username) {
    try {
      console.log(`💾 Zapisywanie przedłużenia bębna ${cecha} (NIP: ${nip}) do ${custom_return_date}`);
      const { data, error } = await supabase
        .from('custom_drum_deadlines')
        .upsert({
          kod_bebna: cecha,
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
   * @param {string} cecha - Cecha bębna.
   * @param {string} nip - NIP klienta.
   * @returns {Promise<object>} Wynik operacji.
   */
  async deleteCustomDrumDeadline(cecha, nip) {
    try {
      console.log(`🗑️ Usuwanie przedłużenia bębna ${cecha} (NIP: ${nip})`);
      const { data, error } = await supabase
        .from('custom_drum_deadlines')
        .delete()
        .eq('kod_bebna', cecha)
        .eq('nip', nip);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Błąd usuwania niestandardowego terminu zwrotu:', error);
      throw error;
    }
  },

  /**
   * Zapisuje notatkę klienta dla bębna.
   * @param {string} cecha - Unikalna cecha bębna.
   * @param {string} nip - NIP klienta.
   * @param {string} note - Treść notatki.
   * @returns {Promise<object>} Zaktualizowany rekord.
   */
  async saveDrumNote(cecha, nip, note) {
    try {
      console.log(`📝 Zapisywanie notatki dla bębna: ${cecha}, NIP: ${nip}`);
      const { data, error } = await supabase
        .from('client_drum_notes')
        .upsert({
          kod_bebna: cecha,
          nip: nip,
          note: note,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'kod_bebna,nip'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Błąd zapisywania notatki:', error);
      throw error;
    }
  },

  /**
   * Zapisuje notatkę administratora dla bębna.
   * @param {string} cecha - Unikalna cecha bębna.
   * @param {string} nip - NIP klienta.
   * @param {string} note - Treść notatki.
   * @returns {Promise<object>} Zaktualizowany rekord.
   */
  async saveAdminDrumNote(cecha, nip, note) {
    try {
      console.log(`📝 Zapisywanie notatki administratora dla bębna: ${cecha}, NIP: ${nip}`);
      const { data, error } = await supabase
        .from('admin_drum_notes')
        .upsert({
          kod_bebna: cecha,
          nip: nip,
          note: note,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'kod_bebna,nip'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Błąd zapisywania notatki administratora:', error);
      throw error;
    }
  },

  /**
   * Pobiera listę cech bębnów oznaczonych jako gotowe do zwrotu do kablowni.
   */
  async getReadyForReturnCechy() {
    try {
      const { data, error } = await supabase
        .from('ready_for_return_drums')
        .select('cecha, is_ready')
        .eq('is_ready', true);

      let dbSet = new Set();
      if (!error && data) {
        data.forEach(item => dbSet.add(item.cecha));
      }

      try {
        const local = JSON.parse(localStorage.getItem('warehouse_ready_drums') || '{}');
        Object.keys(local).forEach(k => {
          if (local[k]) dbSet.add(k);
        });
      } catch (e) {}

      return Array.from(dbSet);
    } catch (err) {
      console.warn('Nie udało się pobrać gotowych bębnów z bazy, odczytuję z pamięci lokalnej:', err);
      try {
        const local = JSON.parse(localStorage.getItem('warehouse_ready_drums') || '{}');
        return Object.keys(local).filter(k => local[k]);
      } catch (e) {
        return [];
      }
    }
  },

  /**
   * Przełącza status bębna magazynowego na "Gotowy do zwrotu do kablowni".
   */
  async toggleDrumReadyForReturn(cecha, isReady, username = 'Administrator') {
    if (!cecha) return;
    
    try {
      const local = JSON.parse(localStorage.getItem('warehouse_ready_drums') || '{}');
      if (isReady) local[cecha] = true;
      else delete local[cecha];
      localStorage.setItem('warehouse_ready_drums', JSON.stringify(local));
    } catch (e) {}

    try {
      const { data, error } = await supabase
        .from('ready_for_return_drums')
        .upsert({
          cecha: cecha,
          is_ready: isReady,
          updated_by: username,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'cecha'
        });

      if (error && error.code === '42P01') {
        console.warn('Tabela ready_for_return_drums nie istnieje w bazie - użyto pamięci lokalnej.');
      } else if (error) {
        console.error('Błąd zapisu stanu gotowości do zwrotu:', error);
      }
      return data;
    } catch (err) {
      console.warn('Błąd połączenia z bazą przy zmianie stanu gotowości:', err);
    }
  },
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

      const currentUser = _currentUserCache;

      let query = supabase
        .from('company_client_stats')
        .select('*', { count: 'exact' });

      // Filtrowanie uprawnień poprzez wspólny mechanizm
      const allowedNips = await getAllowedNips(currentUser);
      if (allowedNips !== null) {
        if (allowedNips.length === 0) {
          return {
            data: [],
            pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
          };
        }
        query = query.in('nip', allowedNips);
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
      
      const currentUser = _currentUserCache;
      
      const allowedNips = await getAllowedNips(currentUser);
      
      const applyFilters = (query) => {
        if (allowedNips !== null) {
          if (allowedNips.length === 0) {
            // Trick by zapytanie zwróciło 0 rekordów jeśli użytkownik nie ma żadnych klientów
            return query.eq('nip', 'BRAK_DOSTEPU_000');
          }
          return query.in('nip', allowedNips);
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
   * Pobiera adres email handlowca po imieniu i nazwisku.
   * @param {string} salespersonName - Imię i nazwisko opiekuna.
   * @returns {Promise<string|null>} Email opiekuna.
   */
  async getSalespersonEmail(salespersonName) {
    if (!salespersonName) return null;
    try {
      const { data, error } = await supabase
        .from('salespeople')
        .select('email')
        .eq('name', salespersonName)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Błąd pobierania emaila handlowca:', error);
        return null;
      }
      return data?.email || null;
    } catch (err) {
      console.error('Błąd getSalespersonEmail:', err);
      return null;
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
/**
 * Zwraca sformatowany unikalny miesięczny numer zgłoszenia w formacie ZO/XXXX/MM/RR.
 * @param {object} req - Obiekt zgłoszenia zwrotu.
 * @param {Array} [allRequests] - Opcjonalna tablica wszystkich zgłoszeń do wyliczenia kolejności jeśli brak pola w DB.
 * @returns {string} Sformatowany numer np. "ZO/0001/07/26".
 */
export function getRequestDisplayId(req, allRequests = null) {
  if (!req) return '';
  
  if (req.request_number && typeof req.request_number === 'string' && req.request_number.startsWith('ZO/')) {
    return req.request_number;
  }

  const createdAt = req.created_at ? new Date(req.created_at) : new Date();
  if (isNaN(createdAt.getTime())) {
    return req.id ? `#${req.id}` : '';
  }

  const yr = String(createdAt.getFullYear()).slice(-2);
  const mo = String(createdAt.getMonth() + 1).padStart(2, '0');

  let seqNum = null;

  if (Array.isArray(allRequests) && allRequests.length > 0) {
    const sameMonthReqs = allRequests
      .filter(r => {
        if (!r || !r.created_at) return false;
        const d = new Date(r.created_at);
        return !isNaN(d.getTime()) && 
               d.getFullYear() === createdAt.getFullYear() && 
               d.getMonth() === createdAt.getMonth();
      })
      .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0) || (a.id - b.id));

    const index = sameMonthReqs.findIndex(r => r.id === req.id);
    if (index !== -1) {
      seqNum = index + 1;
    }
  }

  if (!seqNum) {
    seqNum = req.id || 1;
  }

  const seqStr = String(seqNum).padStart(4, '0');
  return `ZO/${seqStr}/${mo}/${yr}`;
}

/**
 * Zwraca informacje i style dla danej metody odbioru zgłoszenia.
 * @param {string} type - Typ odbioru ('spedycja', 'magazyn_bialystok', 'magazyn_zielonka')
 * @returns {object} { value, label, shortLabel, badgeClass, dotClass }
 */
export function getPickupTypeInfo(type) {
  const normalized = String(type || 'spedycja').toLowerCase().trim();

  if (normalized.includes('bialystok') || normalized.includes('białystok')) {
    return {
      value: 'magazyn_bialystok',
      label: 'Magazyn Białystok',
      shortLabel: 'Białystok',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotClass: 'bg-emerald-500'
    };
  }

  if (normalized.includes('zielonka')) {
    return {
      value: 'magazyn_zielonka',
      label: 'Magazyn Zielonka',
      shortLabel: 'Zielonka',
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
      dotClass: 'bg-purple-500'
    };
  }

  return {
    value: 'spedycja',
    label: 'Spedycja',
    shortLabel: 'Spedycja',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500'
  };
}

// ==================================
/**
 * Pomocnicza funkcja parsująca dowolny format daty (np. 3.08.2026, 03.08.2026, 2026-08-03, ISO)
 * na bezpieczny format YYYY-MM-DD dla kolumn typu DATE w PostgreSQL (z domyślnym fallbackiem na dzisiejszą datę).
 */
export function parseToIsoDate(dateVal, defaultDate = null) {
  const getFallback = () => {
    if (defaultDate) return defaultDate;
    return new Date().toISOString().split('T')[0];
  };

  if (!dateVal || dateVal === '' || dateVal === 'null' || dateVal === 'undefined') {
    return getFallback();
  }
  if (typeof dateVal !== 'string') {
    if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
      return dateVal.toISOString().split('T')[0];
    }
    return getFallback();
  }

  const trimmed = dateVal.trim();
  if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
    return getFallback();
  }

  // 1. Format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.split('T')[0];
  }

  // 2. Format DD.MM.YYYY (np. 3.08.2026 lub 03.08.2026)
  const parts = trimmed.split('.');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    if (year.length === 4) {
      return `${year}-${month}-${day}`;
    }
  }

  // 3. Fallback przez Date constructor
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return getFallback();
}

// ==================================
export const returnsAPI = {
  getRequestDisplayId,
  getPickupTypeInfo,

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
        const currentUser = _currentUserCache;
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
      return data.map(req => {
        let fixedReq = { ...req, company_name: req.companies?.name || req.company_name };

        // Auto-naprawa konkretnego zgłoszenia ZO/0018/08/26 uszkodzonego przez dawny błąd scalania
        if (fixedReq.company_name?.includes('503-09-27/2019') || (!fixedReq.user_nip && fixedReq.notes?.includes('ZO/0002/08/26')) || (fixedReq.request_number?.includes('0018') && fixedReq.loading_hours === 'Brak')) {
          fixedReq.user_nip = '8852434220';
          fixedReq.company_name = 'Mixel firma elektryczna Kowalski Tomasz';
          fixedReq.street = 'Topolowa 3';
          fixedReq.postal_code = '37-450';
          fixedReq.city = 'Stalowa Wola';
          fixedReq.email = 'magazyn@mixel.com.pl';
          fixedReq.loading_hours = '06:00 - 14:00';
          fixedReq.available_equipment = 'Wózek widłowy.';

          supabase.from('return_requests').update({
            user_nip: '8852434220',
            company_name: 'Mixel firma elektryczna Kowalski Tomasz',
            street: 'Topolowa 3',
            postal_code: '37-450',
            city: 'Stalowa Wola',
            email: 'magazyn@mixel.com.pl',
            loading_hours: '06:00 - 14:00',
            available_equipment: 'Wózek widłowy.'
          }).eq('id', req.id).then(() => {});
        }

        return fixedReq;
      });
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
      const nowIso = new Date().toISOString();
      const createdAt = returnData.created_at || nowIso;

      // Zapewniamy, że każdy bęben/paleta w zgłoszeniu ma zapisaną swoją pierwotną datę zgłoszenia (reported_at)
      const enrichedDrums = Array.isArray(returnData.selected_drums) 
        ? returnData.selected_drums.map(item => {
            if (typeof item === 'object' && item !== null) {
              return {
                ...item,
                reported_at: item.reported_at || createdAt
              };
            }
            return {
              cecha: item,
              type: 'drum',
              reported_at: createdAt
            };
          })
        : [];

      const initialStatus = returnData.status || 'Pending';
      const initialHistory = Array.isArray(returnData.status_history) && returnData.status_history.length > 0
        ? returnData.status_history
        : [{
            status: initialStatus,
            timestamp: createdAt,
            updated_by: returnData.profile_name || returnData.user_name || _currentUserCache?.name || 'Klient',
            note: returnData.notes ? 'Utworzono zgłoszenie zwrotu' : 'Zgłoszenie wniesione'
          }];

      // Zapewniamy prawidłowy user_nip spełniający klucz obcy w tabeli companies
      let safeNip = returnData.user_nip;
      if (!safeNip || safeNip.trim() === '') {
        if (returnData.company_name) {
          const { data: comp } = await supabase
            .from('companies')
            .select('nip')
            .ilike('name', `%${returnData.company_name.trim()}%`)
            .limit(1)
            .maybeSingle();
          if (comp && comp.nip) {
            safeNip = comp.nip;
          }
        }
        if (!safeNip || safeNip.trim() === '') {
          safeNip = '8852434220'; // Domyślny fallback NIP dla zgłoszeń z uszkodzonym NIP
        }
      }

      const payload = {
        ...returnData,
        user_nip: safeNip,
        status: initialStatus,
        priority: returnData.priority || 'Normal',
        pickup_type: returnData.pickup_type || 'spedycja',
        collection_date: parseToIsoDate(returnData.collection_date),
        selected_drums: enrichedDrums,
        status_history: initialHistory,
        status_updated_at: nowIso
      };

      let { data, error } = await supabase
        .from('return_requests')
        .insert([payload])
        .select()
        .single();

      if (error) {
        if (error.message?.includes('status_history') || error.message?.includes('status_updated_at') || error.message?.includes('request_number') || error.message?.includes('pickup_type') || error.code === 'PGRST204') {
          console.warn('Niektóre opcjonalne kolumny nie istnieją w bazie DB - powtarzanie zapisu bez opcjonalnych pól');
          delete payload.status_history;
          delete payload.status_updated_at;
          delete payload.request_number;
          delete payload.pickup_type;
          const retry = await supabase
            .from('return_requests')
            .insert([payload])
            .select()
            .single();
          if (retry.error) throw retry.error;
          return retry.data;
        }
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Błąd tworzenia zwrotu:', error);
      throw error;
    }
  },

  /**
   * Aktualizuje zgłoszenie zwrotu (status, daty, numer korekty itp.) z archiwizacją zmian.
   * @param {number} id - ID zgłoszenia.
   * @param {object|string} updates - Obiekt z polami do aktualizacji (np. { status, transport_date }).
   * @param {object|null} currentUser - Opcjonalnie zalogowany użytkownik dokonujący zmiany.
   * @returns {Promise<object>} Zaktualizowane zgłoszenie.
   */
  async updateReturnStatus(id, updates, currentUser = null) {
    try {
      const updatePayload = typeof updates === 'string' 
        ? { status: updates } 
        : { ...updates };

      const nowIso = new Date().toISOString();
      updatePayload.updated_at = nowIso;

      if (updatePayload.collection_date !== undefined) {
        updatePayload.collection_date = parseToIsoDate(updatePayload.collection_date);
      }

      // Jeśli następuje zmiana statusu, pobieramy obecny stan zgłoszenia i archiwizujemy historię
      if (updatePayload.status) {
        try {
          const { data: currentReq } = await supabase
            .from('return_requests')
            .select('*')
            .eq('id', id)
            .single();

          if (currentReq) {
            let history = Array.isArray(currentReq.status_history) ? [...currentReq.status_history] : [];
            if (history.length === 0) {
              history.push({
                status: currentReq.status || 'Pending',
                timestamp: currentReq.created_at || nowIso,
                updated_by: 'System',
                note: 'Zgłoszenie początkowe'
              });
            }

            if (currentReq.status !== updatePayload.status || updatePayload.forceHistoryLog) {
              const activeUser = currentUser || _currentUserCache;
              const updatedBy = activeUser?.name || activeUser?.email || 'Administrator';
              history.push({
                status: updatePayload.status,
                timestamp: nowIso,
                updated_by: updatedBy,
                note: updatePayload.notes || (updatePayload.correction_number ? `Korekta: ${updatePayload.correction_number}` : '')
              });
              updatePayload.status_history = history;
              updatePayload.status_updated_at = nowIso;
            }
          }
        } catch (fetchErr) {
          console.warn('Nie udało się zapisać historii statusu:', fetchErr);
        }
      }

      let { data, error } = await supabase
        .from('return_requests')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.message?.includes('status_history') || error.message?.includes('status_updated_at') || error.message?.includes('urgent_reason') || error.code === 'PGRST204') {
          console.warn('Brak kolumny status_history w bazie DB - ponawianie update bez tych pól');
          delete updatePayload.status_history;
          delete updatePayload.status_updated_at;
          delete updatePayload.urgent_reason;
          const retry = await supabase
            .from('return_requests')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single();
          if (retry.error) throw retry.error;
          return retry.data;
        }
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Błąd aktualizacji zgłoszenia zwrotu:', error);
      throw error;
    }
  },

  /**
   * Usuwa zgłoszenie lub tablicę zgłoszeń o danych ID.
   * @param {number|Array<number>} idOrIds - ID zgłoszenia lub tablica ID zgłoszeń.
   * @returns {Promise<boolean>}
   */
  async deleteReturn(idOrIds) {
    try {
      const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
      const { error } = await supabase
        .from('return_requests')
        .delete()
        .in('id', ids);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Błąd usuwania zgłoszenia:', error);
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

      const currentUser = _currentUserCache;
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
        applyNipFilter(supabase.from('drums').select('*', { count: 'exact', head: true }).or('typ_opakowania.eq.Bęben,typ_opakowania.is.null').neq('kontrahent', 'Nie wydany').not('kontrahent', 'ilike', '%magazyn%')),
        applyNipFilter(supabase.from('return_requests').select('*', { count: 'exact', head: true }).eq('status', 'Pending'), 'user_nip'),
        applyNipFilter(supabase.from('drums').select('*', { count: 'exact', head: true }).or('typ_opakowania.eq.Bęben,typ_opakowania.is.null').lt('data_zwrotu_do_dostawcy', now)),
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
        supabase.from('drums').select('*', { count: 'exact', head: true }).or('typ_opakowania.eq.Bęben,typ_opakowania.is.null'),
        // Aktywne (termin zwrotu w przyszłości, więcej niż 14 dni)
        supabase.from('drums').select('*', { count: 'exact', head: true }).or('typ_opakowania.eq.Bęben,typ_opakowania.is.null').gt('data_zwrotu_do_dostawcy', fourteenDaysFromNow),
        // Przeterminowane (termin zwrotu w przeszłości)
        supabase.from('drums').select('*', { count: 'exact', head: true }).or('typ_opakowania.eq.Bęben,typ_opakowania.is.null').lt('data_zwrotu_do_dostawcy', now),
        // Zbliża się termin (między dziś a 14 dni)
        supabase.from('drums').select('*', { count: 'exact', head: true })
          .or('typ_opakowania.eq.Bęben,typ_opakowania.is.null')
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
//  API do Raportów i Dashboardów
// ==================================
export const reportsAPI = {
  /**
   * Pobiera zaawansowane analityki bębnów korzystając z RPC
   */
  async getDrumsAnalytics() {
    try {
      const currentUser = _currentUserCache;
      const allowedNips = await getAllowedNips(currentUser);
      
      const { data, error } = await supabase.rpc('get_drums_analytics', {
        allowed_nips: allowedNips
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd pobierania analityki bębnów:', error);
      return {};
    }
  },

  /**
   * Pobiera zaawansowane analityki zwrotów korzystając z RPC
   */
  async getReturnsAnalytics() {
    try {
      const currentUser = _currentUserCache;
      const allowedNips = await getAllowedNips(currentUser);

      const { data, error } = await supabase.rpc('get_returns_analytics', {
        allowed_nips: allowedNips
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd pobierania analityki zwrotów:', error);
      return {};
    }
  },

  /**
   * Pobiera zaawansowane analityki klientów korzystając z RPC
   */
  async getClientsAnalytics() {
    try {
      const currentUser = _currentUserCache;
      const allowedNips = await getAllowedNips(currentUser);

      const { data, error } = await supabase.rpc('get_clients_analytics', {
        allowed_nips: allowedNips
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd pobierania analityki klientów:', error);
      return {};
    }
  },

  /**
   * Pobiera zaawansowane analityki palet korzystając z RPC
   */
  async getPalletsAnalytics() {
    try {
      const currentUser = _currentUserCache;
      const allowedNips = await getAllowedNips(currentUser);

      const { data, error } = await supabase.rpc('get_pallets_analytics', {
        allowed_nips: allowedNips
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd pobierania analityki palet:', error);
      return {};
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

export const getSalespersonMpk = async (salespersonName) => {
  try {
    const { data, error } = await supabase
      .from('salespeople')
      .select('mpk')
      .eq('name', salespersonName)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data?.mpk || null;
  } catch (err) {
    console.error('Błąd pobierania mpk handlowca:', err);
    return null;
  }
};

export const transportAPI = {
  createTransportOrder: async (transportData) => {
    // Adres docelowy aplikacji transportowej.
    const transportApiUrl = process.env.REACT_APP_TRANSPORT_API_URL || 'https://transport.grupaeltron.pl/api/spedycje/webhook';
    const secretKey = 'eltron-opakowania-integration-secret-key-2026';

    try {
      const response = await fetch(transportApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secretKey}`
        },
        body: JSON.stringify(transportData)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Błąd tworzenia zlecenia w systemie Transport');
      }

      return data;
    } catch (error) {
      console.error('Błąd integracji z Transportem:', error);
      throw error;
    }
  }
};