import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { drumsAPI, companiesAPI, getCurrentUserFromCache } from '../utils/supabaseApi';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { pl } from 'date-fns/locale/pl';
import * as XLSX from 'xlsx';

import {
  Package,
  Search,
  Filter,
  Calendar,
  Building2,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpDown,
  Eye,
  FileText,
  MapPin,
  Truck,
  Download,
  RefreshCw,
  Upload,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader
} from 'lucide-react';

registerLocale('pl', pl);

const AdminDrumsList = ({ initialFilter = {} }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = getCurrentUserFromCache();

  const urlSearchTerm = searchParams.get('searchTerm');
  const urlOpenModal = searchParams.get('openModal') === 'true';
  const urlClientNip = searchParams.get('clientNip');
  const urlFilterStatus = searchParams.get('filterStatus');

  const initialSearch = urlSearchTerm || initialFilter.searchTerm || '';

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [localSearchTerm, setLocalSearchTerm] = useState(initialSearch); // DODANE: Lokalny stan dla inputa
  const [sortBy, setSortBy] = useState('cecha');
  const [sortOrder, setSortOrder] = useState('asc');
  
  const initialStatus = urlFilterStatus || 'all';
  const [filterStatus, setFilterStatus] = useState(initialStatus);
  const [filterDateRange, setFilterDateRange] = useState('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('all');
  const [selectedDrum, setSelectedDrum] = useState(null);
  const [showDrumDetails, setShowDrumDetails] = useState(false);

  // NOWE: Stany formularza przedłużania terminu zwrotu
  const [customReturnDate, setCustomReturnDate] = useState(null);
  const [extensionNotes, setExtensionNotes] = useState('');
  const [savingExtension, setSavingExtension] = useState(false);

  // DODANE: Stan paginacji
  const [drumsData, setDrumsData] = useState({
    data: [],
    pagination: {
      page: 1,
      limit: 99, // 99 na stronę dla adminów (podzielne przez 3)
      total: 0,
      totalPages: 1,
      hasNext: false,
      hasPrev: false
    }
  });


  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [importLoading, setImportLoading] = useState(false);

  // DODANE: Funkcja pobierająca bębny z paginacją
  const fetchDrums = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const requestOptions = {
        page: drumsData.pagination.page,
        limit: 99,
        sortBy,
        sortOrder,
        search: searchTerm,
        status: filterStatus,
        dateRange: filterDateRange,
        paymentStatus: filterPaymentStatus,
        ...options
      };

      console.log(`🔄 Admin pobiera bębny, strona: ${requestOptions.page}`);

      // Admin pobiera WSZYSTKIE bębny (bez filtra NIP)
      const result = await drumsAPI.getDrums(null, requestOptions);

      console.log(`✅ Admin pobrał ${result.data.length} bębnów ze strony ${result.pagination.page}/${result.pagination.totalPages}`);
      console.log(`📊 Łącznie w bazie: ${result.pagination.total} bębnów`);

      setDrumsData(result);
    } catch (err) {
      console.error('❌ Błąd podczas pobierania bębnów:', err);
      setError('Nie udało się pobrać listy bębnów. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortOrder, searchTerm, filterStatus, filterDateRange, filterPaymentStatus]);


  // DODANE: Debounce dla wyszukiwania
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(localSearchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [localSearchTerm]);

  useEffect(() => {
    fetchDrums({ page: 1 }); // Resetuj do pierwszej strony przy zmianie filtrów
  }, [sortBy, sortOrder, searchTerm, filterStatus, filterDateRange, filterPaymentStatus]);
  useEffect(() => {
    if (initialFilter && initialFilter.status) {
      setFilterStatus(initialFilter.status);
    }
  }, [initialFilter]);

  // DODANE: Auto-otwieranie modala
  useEffect(() => {
    if (urlOpenModal && urlSearchTerm && !loading && !showDrumDetails && drumsData.data.length > 0) {
      const targetDrum = drumsData.data.find(d => 
        d.kod_bebna === urlSearchTerm || 
        d.cecha === urlSearchTerm
      );
      if (targetDrum) {
        setSelectedDrum(targetDrum);
        setShowDrumDetails(true);
      }
    }
  }, [drumsData.data, urlOpenModal, urlSearchTerm, loading, showDrumDetails]);

  const handleCloseModal = () => {
    setShowDrumDetails(false);
    if (urlOpenModal) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('openModal');
      setSearchParams(newParams);
    }
  };

  // DODANE: Funkcje nawigacji po stronach
  const goToPage = (page) => {
    setDrumsData(prev => ({ ...prev, pagination: { ...prev.pagination, page } }));
    fetchDrums({ page });
  };

  const nextPage = () => {
    if (drumsData.pagination.hasNext) {
      goToPage(drumsData.pagination.page + 1);
    }
  };

  const prevPage = () => {
    if (drumsData.pagination.hasPrev) {
      goToPage(drumsData.pagination.page - 1);
    }
  };

  const firstPage = () => goToPage(1);
  const lastPage = () => goToPage(drumsData.pagination.totalPages);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleViewDrum = (drum) => {
    setSelectedDrum(drum);
    setCustomReturnDate(drum.isExtended && drum.clientReturnDeadline ? new Date(drum.clientReturnDeadline) : null);
    setExtensionNotes(drum.isExtended ? (drum.extensionNotes || '') : '');
    setShowDrumDetails(true);
  };

  const handleSaveExtension = async () => {
    if (!customReturnDate) {
      alert('Proszę wybrać datę zwrotu.');
      return;
    }
    
    setSavingExtension(true);
    try {
      const dateStr = customReturnDate.toISOString().split('T')[0];
      const currentUser = getCurrentUserFromCache();
      const username = currentUser ? (currentUser.name || currentUser.username) : 'Specjalista';
      
      await drumsAPI.setCustomDrumDeadline(
        selectedDrum.cecha || selectedDrum.kod_bebna,
        selectedDrum.nip,
        dateStr,
        extensionNotes,
        username
      );
      
      alert('Zapisano pomyślnie nowy termin zwrotu!');
      
      // Odśwież dane na liście
      await fetchDrums();
      
      // Zaktualizuj selectedDrum
      setSelectedDrum(prev => ({
        ...prev,
        isExtended: true,
        clientReturnDeadline: dateStr,
        extensionNotes: extensionNotes,
        extensionCreatedBy: username,
        extensionCreatedAt: new Date().toISOString()
      }));
    } catch (err) {
      console.error('Błąd zapisu przedłużenia:', err);
      alert('Nie udało się zapisać zmian: ' + err.message);
    } finally {
      setSavingExtension(false);
    }
  };

  const handleClearExtension = async () => {
    if (!window.confirm('Czy na pewno chcesz usunąć to przedłużenie i przywrócić domyślny termin?')) {
      return;
    }
    
    setSavingExtension(true);
    try {
      await drumsAPI.deleteCustomDrumDeadline(
        selectedDrum.cecha || selectedDrum.kod_bebna,
        selectedDrum.nip
      );
      
      alert('Usunięto przedłużenie i przywrócono domyślny termin.');
      
      // Odśwież dane na liście
      await fetchDrums();
      
      // Zaktualizuj selectedDrum
      setSelectedDrum(prev => {
        const issueDate = new Date(prev.data_wydania || prev.data_przyjecia_na_stan);
        const returnPeriodDays = prev.companies?.custom_return_periods?.[0]?.return_period_days || 120;
        const d = new Date(issueDate);
        d.setDate(d.getDate() + returnPeriodDays);
        const clientReturnDeadline = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : null;
        
        return {
          ...prev,
          isExtended: false,
          clientReturnDeadline: clientReturnDeadline,
          extensionNotes: null,
          extensionCreatedBy: null,
          extensionCreatedAt: null
        };
      });
      
      setCustomReturnDate(null);
      setExtensionNotes('');
    } catch (err) {
      console.error('Błąd usuwania przedłużenia:', err);
      alert('Nie udało się przywrócić terminu domyślnego: ' + err.message);
    } finally {
      setSavingExtension(false);
    }
  };

  const handleRefresh = async () => {
    await fetchDrums();
  };

  // ZACHOWANE: Funkcja importu z twojego kodu
  const handleImportFile = async () => {
    if (!window.confirm('⚠️ UWAGA: To zastąpi WSZYSTKIE dane w tabeli drums. Kontynuować?')) {
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.xls';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
        alert('❌ Proszę wybrać plik CSV lub XLSX');
        return;
      }

      // SPRAWDŹ ROZMIAR PLIKU
      const maxFileSize = 50 * 1024 * 1024; // 50MB limit
      if (file.size > maxFileSize) {
        alert(`❌ Plik jest za duży: ${Math.round(file.size / 1024 / 1024)}MB. Maksymalny rozmiar: 50MB`);
        return;
      }

      console.log(`📁 Plik: ${file.name}, rozmiar: ${Math.round(file.size / 1024)}KB`);

      setImportLoading(true);

      try {
        let bodyData;
        let contentType;
        let hasPolish = false;

        if (fileName.endsWith('.csv')) {
          console.log('📄 Tryb CSV...');

          const csvContent = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              try {
                const arrayBuffer = e.target.result;
                const uint8 = new Uint8Array(arrayBuffer);

                let decodedText = '';
                // 1. Spróbuj zdekodować jako UTF-8 z fatal: true
                try {
                  const decoder = new TextDecoder('utf-8', { fatal: true });
                  decodedText = decoder.decode(uint8);
                  console.log('✅ CSV odczytany pomyślnie jako UTF-8');
                } catch (utf8Error) {
                  console.warn('⚠️ Niepoprawny format UTF-8, próba dekodowania jako Windows-1250...', utf8Error);
                  // 2. Jeśli UTF-8 rzuci błąd, spróbuj Windows-1250 (CP1250)
                  const decoder = new TextDecoder('windows-1250');
                  decodedText = decoder.decode(uint8);
                  console.log('✅ CSV odczytany pomyślnie jako Windows-1250');
                }

                // Wykryj obecność polskich znaków diakrytycznych
                hasPolish = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(decodedText);
                console.log(`🇵🇱 Czy wykryto polskie znaki w pliku CSV: ${hasPolish ? 'Tak' : 'Nie'}`);

                resolve(decodedText);
              } catch (decodeError) {
                reject(decodeError);
              }
            };
            reader.onerror = () => reject(new Error('Błąd odczytu CSV'));
            reader.readAsArrayBuffer(file);
          });

          // SPRAWDŹ LICZBĘ LINII
          const lines = csvContent.split('\n').filter(line => line.trim());
          console.log(`📊 CSV ma ${lines.length} linii`);

          if (lines.length > 10000) {
            const proceed = window.confirm(
              `⚠️ UWAGA: Plik ma ${lines.length} linii.\n\n` +
              'Duże pliki mogą powodować problemy z pamięcią.\n' +
              'Zalecamy podzielenie na mniejsze części.\n\n' +
              'Czy kontynuować?'
            );
            if (!proceed) {
              setImportLoading(false);
              return;
            }
          }

          bodyData = csvContent;
          contentType = 'text/plain; charset=utf-8';

        } else {
          console.log('📊 Tryb XLSX...');

          if (file.size > 50 * 1024 * 1024) {
            alert('❌ Plik XLSX jest za duży. Maksymalny rozmiar dla Excel: 50MB');
            setImportLoading(false);
            return;
          }

          const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const base64Data = e.target.result.split(',')[1];
              resolve(base64Data);
            };
            reader.onerror = () => reject(new Error('Błąd odczytu XLSX'));
            reader.readAsDataURL(file);
          });

          bodyData = JSON.stringify({
            type: 'xlsx',
            data: base64,
            filename: file.name
          });
          contentType = 'application/json; charset=utf-8';
        }

        const response = await fetch(
          'https://pobafitamzkzcfptuaqj.supabase.co/functions/v1/clever-action',
          {
            method: 'POST',
            headers: {
              'Content-Type': contentType,
              'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY || ''}`
            },
            body: bodyData,
            timeout: 300000
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Błąd HTTP:', response.status, errorText);
          throw new Error(`Błąd serwera ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('📝 Odpowiedź serwera:', result);

        if (!fileName.endsWith('.csv')) {
          hasPolish = result.hasPolishChars || false;
        }

        if (result.success) {
          const message = `✅ SUKCES!\n\n${result.message}\n\n` +
            `📊 Format: ${fileName.endsWith('.csv') ? 'CSV' : 'XLSX'}\n` +
            `🇵🇱 Polskie znaki: ${hasPolish ? 'OK' : 'Brak'}\n` +
            `📦 Importowano: ${result.imported} rekordów\n` +
            `🏢 Dodano firm: ${result.companiesAdded || 0}\n` +
            `⚠️ Pominięto: ${result.skipped || 0} błędnych`;

          alert(message);
          await handleRefresh();
        } else {
          throw new Error(result.message || 'Nieznany błąd importu');
        }

      } catch (error) {
        console.error('❌ Błąd importu:', error);

        let userMessage = `❌ Błąd importu: ${error.message}`;

        if (error.message.includes('Maximum call stack')) {
          userMessage = `❌ Plik jest za duży lub zawiera błędy formatowania.\n\n` +
            `💡 Rozwiązania:\n` +
            `• Podziel plik na mniejsze części (max 2000 wierszy)\n` +
            `• Sprawdź czy nie ma uszkodzonych znaków w danych\n` +
            `• Użyj XLSX zamiast CSV dla lepszej kompatybilności`;
        } else if (error.message.includes('Failed to fetch')) {
          userMessage += '\n\n🔧 Sprawdź połączenie internetowe lub spróbuj ponownie za chwilę.';
        }

        alert(userMessage);
      } finally {
        setImportLoading(false);
      }
    };

    input.click();
  };

  const [allAdminDrums, setAllAdminDrums] = useState([]);
  const [dynamicStats, setDynamicStats] = useState({
    total: '-',
    overdue: '-',
    dueSoon: '-',
    active: '-',
    extended: '-'
  });

  useEffect(() => {
    const fetchAllDrums = async () => {
      try {
        const allDrums = await drumsAPI.getAllDrums();
        setAllAdminDrums(allDrums || []);
      } catch (err) {
        console.error('Error fetching all drums for stats:', err);
      }
    };
    fetchAllDrums();
  }, []);

  useEffect(() => {
    if (!allAdminDrums || allAdminDrums.length === 0) return;

    let filtered = allAdminDrums;

    // 1. Wyszukiwanie (Search)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(d => 
        (d.cecha || '').toLowerCase().includes(term) ||
        (d.kod_bebna || '').toLowerCase().includes(term) ||
        (d.nazwa || '').toLowerCase().includes(term) ||
        (d.pelna_nazwa_kontrahenta || d.company || '').toLowerCase().includes(term) ||
        (d.adres_dostawy || '').toLowerCase().includes(term) ||
        (d.nazwa_punktu_dostawy || '').toLowerCase().includes(term) ||
        (d.numer_faktury || '').toLowerCase().includes(term)
      );
    }

    // 2. Filtr stanu magazynowego (Status)
    if (filterStatus !== 'all') {
      if (filterStatus === 'zagubione') {
        filtered = filtered.filter(d => d.status === 'Lost' || d.db_status === 'Lost');
      } else {
        filtered = filtered.filter(d => d.status !== 'Lost' && d.db_status !== 'Lost');
        if (filterStatus === 'magazyn') {
          filtered = filtered.filter(d => d.kontrahent === 'Nie wydany' || (d.kontrahent && d.kontrahent.toLowerCase().includes('magazyn')));
        } else if (filterStatus === 'wydane') {
          filtered = filtered.filter(d => d.kontrahent !== 'Nie wydany' && !(d.kontrahent && d.kontrahent.toLowerCase().includes('magazyn')));
        }
      }
    }

    // 3. Filtr terminu (Date Range)
    if (filterDateRange !== 'all') {
      if (filterDateRange === 'extended') {
        filtered = filtered.filter(d => d.isExtended);
      } else {
        // 'active', 'due-soon', 'overdue' pokrywa się z polem status
        filtered = filtered.filter(d => d.status === filterDateRange);
    }

    setDynamicStats({
      total: filtered.length,
      overdue: filtered.filter(d => d.status === 'overdue').length,
      dueSoon: filtered.filter(d => d.status === 'due-soon').length,
      active: filtered.filter(d => d.status === 'active').length,
      extended: filtered.filter(d => d.isExtended).length
    });
  }, [allAdminDrums, searchTerm, filterStatus, filterDateRange]);

  const stats = dynamicStats;

  const DrumCard = ({ drum, index }) => {
    const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

    return (
      <div
        className={`bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border transition-all duration-300 hover:shadow-xl transform hover:scale-[1.02] h-full flex flex-col ${drum.borderColor || 'border-gray-200'}`}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-gray-900 truncate text-lg">{drum.cecha || drum.kod_bebna || 'Brak cechy'}</h3>
              <p className="text-gray-600 text-sm truncate">
                {drum.cecha ? `${drum.kod_bebna} • ${drum.rozmiar_bebna || 'Brak rozmiaru'}` : (drum.rozmiar_bebna || 'Brak rozmiaru')}
              </p>
            </div>
          </div>
          <div 
            className={`w-4 h-4 rounded-full shadow-sm cursor-help ${drum.color?.replace('text-', 'bg-') || 'bg-gray-400'}`}
            title={drum.text || drum.status}
          />
        </div>

        <div className="space-y-3 flex-1">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Firma</span>
            <span className="text-sm font-medium text-gray-900 truncate ml-2">
              {drum.company || drum.pelna_nazwa_kontrahenta || 'Brak nazwy'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">NIP</span>
            <span className="text-sm font-medium text-gray-900">{drum.nip || 'Brak NIP'}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Nr faktury</span>
            <span className="text-sm font-medium text-gray-900 truncate ml-2">
              {drum.numer_faktury || 'Brak faktury'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Lokalizacja</span>
            <span className="text-sm font-medium text-gray-900 truncate ml-2" title={drum.adres_dostawy || drum.nazwa_punktu_dostawy}>
              {drum.adres_dostawy || drum.nazwa_punktu_dostawy || 'Brak lokalizacji'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Zwrot do dostawcy</span>
            <span className="text-sm font-medium text-gray-900">
              {drum.DATA_ZWROTU_DO_DOSTAWCY ?
                new Date(drum.DATA_ZWROTU_DO_DOSTAWCY).toLocaleDateString('pl-PL') :
                <span className="text-indigo-600 font-semibold">Własny</span>
              }
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Zwrot od klienta</span>
            <span className="text-sm font-medium text-gray-900 flex items-center space-x-1">
              {drum.clientReturnDeadline ? (
                <>
                  <span className={drum.isExtended ? "text-indigo-600 font-semibold" : ""}>
                    {new Date(drum.clientReturnDeadline).toLocaleDateString('pl-PL')}
                  </span>
                  {drum.isExtended && (
                    <span 
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 cursor-help"
                      title={drum.extensionNotes || "Indywidualny termin zwrotu"}
                    >
                      Przedłużony
                    </span>
                  )}
                </>
              ) : (
                'Brak terminu'
              )}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Dni w posiadaniu</span>
            <span className="text-sm font-medium text-gray-900">
              {drum.daysInPossession || 0}
            </span>
          </div>

          {!isAdmin && (
            <div className="pt-3 mt-3 border-t border-gray-100 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Opłacony?</span>
                <span className={`text-sm font-bold ${drum.czy_zaplacona === 'Tak' ? 'text-green-600' : drum.czy_zaplacona === 'Nie' ? 'text-red-600' : 'text-gray-600'}`}>
                  {drum.czy_zaplacona || 'Brak danych'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Termin płatności</span>
                <span className="text-sm font-medium text-gray-900">
                  {drum.termin_platnosci || 'Brak terminu'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Kabel na bębnie</span>
                <span className="text-sm font-medium text-gray-900 truncate max-w-[150px]" title={drum.nawiniety_kabel || 'Brak'}>
                  {drum.nawiniety_kabel || 'Brak kabla'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Ilość kabla</span>
                <span className="text-sm font-medium text-gray-900">
                  {drum.ilosc_kabla ? `${drum.ilosc_kabla} m` : 'Brak'}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex space-x-2 mt-4">
          <button
            onClick={() => handleOpenModal(drum)}
            className="flex-1 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors duration-200 font-medium text-sm flex items-center justify-center space-x-2"
          >
            <span>Szczegóły</span>
          </button>
          
          <button
            onClick={() => navigate(`/admin/clients?clientNip=${drum.nip}`)}
            className="bg-gray-100 text-gray-700 py-2 px-3 rounded-xl font-medium hover:bg-gray-200 transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
          >
            <Building2 className="w-4 h-4" />
            <span>Klient</span>
          </button>

          {drum.status === 'overdue' && (
            <button
              onClick={() => navigate('/admin/returns')}
              className="bg-red-600 text-white py-2 px-3 rounded-xl font-medium hover:bg-red-700 transition-all duration-200 flex items-center justify-center text-sm"
            >
              <Truck className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  // loading check removed from here to prevent unmounting

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Błąd ładowania</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }



  const handleExportExcel = async () => {
    try {
      // Pobierz wszystko (do 10 000 rekordów) z obecnymi filtrami
      const result = await drumsAPI.getDrums(urlClientNip || null, {
        page: 1,
        limit: 10000,
        sortBy,
        sortOrder,
        search: searchTerm,
        status: filterStatus,
        dateRange: filterDateRange
      });

      if (!result.data || result.data.length === 0) {
        alert('Brak danych do wyeksportowania.');
        return;
      }

      const exportData = result.data.map(drum => ({
        'Kod bębna / Cecha': drum.cecha || drum.kod_bebna,
        'Nazwa bębna': drum.nazwa,
        'Firma': drum.pelna_nazwa_kontrahenta,
        'NIP': drum.nip,
        'Status': drum.status,
        'Data wydania': drum.data_wydania || drum.data_przyjecia_na_stan,
        'Termin zwrotu': drum.data_zwrotu_do_dostawcy,
        'Dni w posiadaniu': drum.daysInPossession,
        'Cena netto': drum.cena_netto_bebna || drum.CENA_NETTO_BEBNA,
        'Adres dostawy': drum.adres_dostawy,
        'Numer faktury': drum.numer_faktury,
        'Notatka': drum.clientNote || '',
        'Przedłużony': drum.isExtended ? 'Tak' : 'Nie'
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Bębny");
      XLSX.writeFile(workbook, `Bebny_Eksport_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Błąd eksportu:', err);
      alert('Nie udało się wyeksportować pliku.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Wszystkie bębny</h1>
              <p className="text-gray-600">
                Zarządzaj bazą {drumsData.pagination.total} bębnów
              </p>
            </div>

            <div className="flex items-center space-x-4">
              {/* Eksport XLS */}
              <button
                onClick={handleExportExcel}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2 transition-all duration-200"
              >
                <Download className="w-4 h-4" />
                <span>Eksport do Excel</span>
              </button>

              {/* PRZYCISK IMPORT CSV/XLSX (TYLKO DLA ADMINA) */}
              {currentUser?.role?.toLowerCase() === 'admin' && (
                <button
                  onClick={handleImportFile}
                  disabled={importLoading || loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all duration-200"
                >
                  {importLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Importuję...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Import CSV/XLSX</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => navigate('/return')}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-colors duration-200 flex items-center space-x-2 font-semibold"
              >
                <Truck className="w-4 h-4" />
                <span>Nowe zgłoszenie</span>
              </button>

              <button
                onClick={handleRefresh}
                disabled={loading}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                title="Odśwież"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Stats Cards - POPRAWIONE: używa pagination.total zamiast filteredAndSortedDrums.length */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-blue-100">
              <div className="flex items-center">
                <Package className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Wszystkie bębny</p>
                  <p className="text-2xl font-bold text-gray-900">{drumsData.pagination.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-green-100">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Aktywne</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-yellow-100">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Zbliża się termin</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.dueSoon}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-red-100">
              <div className="flex items-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Przeterminowane</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.overdue}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-indigo-100">
              <div className="flex items-center">
                <Calendar className="w-8 h-8 text-indigo-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Przedłużone</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.extended}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-blue-100 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Szukaj po kodzie, ceche, dostawcy, fakturze lub adresie..."
                  value={localSearchTerm}
                  onChange={(e) => setLocalSearchTerm(e.target.value)}
                  className="pl-10 w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Wszystkie stany magazynowe</option>
                <option value="wydane">Wydane u klientów</option>
                <option value="magazyn">Na magazynie</option>
                <option value="zagubione">Zagubione / Inne</option>
              </select>

              <select
                value={filterDateRange}
                onChange={(e) => setFilterDateRange(e.target.value)}
                className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Wszystkie terminy</option>
                <option value="active">Bez przekroczeń (Aktywne)</option>
                <option value="due-soon">Zbliża się termin</option>
                <option value="overdue">Przeterminowane</option>
                <option value="extended">Przedłużone terminy</option>
              </select>

              <select
                value={filterPaymentStatus}
                onChange={(e) => setFilterPaymentStatus(e.target.value)}
                className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Wszystkie płatności</option>
                <option value="paid">Opłacone (Tak)</option>
                <option value="unpaid">Nieopłacone (Nie)</option>
                <option value="no_invoice">Brak faktury</option>
                <option value="overdue_payment">Zaległe po terminie</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results - ZMIENIONE: używa drumsData.data zamiast filteredAndSortedDrums */}
        {drumsData.data.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8 items-stretch">
              {drumsData.data.map((drum, index) => (
                <DrumCard key={drum.id || drum.cecha || index} drum={drum} index={index} />
              ))}
            </div>

            {/* DODANE: Paginacja */}
            {drumsData.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-blue-100 mt-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={prevPage}
                    disabled={!drumsData.pagination.hasPrev}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Poprzednia
                  </button>
                  <button
                    onClick={nextPage}
                    disabled={!drumsData.pagination.hasNext}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Następna
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Wyświetlane <span className="font-medium">{((drumsData.pagination.page - 1) * drumsData.pagination.limit) + 1}</span> do{' '}
                      <span className="font-medium">
                        {Math.min(drumsData.pagination.page * drumsData.pagination.limit, drumsData.pagination.total)}
                      </span>{' '}
                      z <span className="font-medium">{drumsData.pagination.total}</span> bębnów
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={firstPage}
                        disabled={!drumsData.pagination.hasPrev}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={prevPage}
                        disabled={!drumsData.pagination.hasPrev}
                        className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>

                      {/* Numerowanie stron */}
                      {[...Array(Math.min(5, drumsData.pagination.totalPages))].map((_, idx) => {
                        let pageNum;
                        if (drumsData.pagination.totalPages <= 5) {
                          pageNum = idx + 1;
                        } else if (drumsData.pagination.page <= 3) {
                          pageNum = idx + 1;
                        } else if (drumsData.pagination.page >= drumsData.pagination.totalPages - 2) {
                          pageNum = drumsData.pagination.totalPages - 4 + idx;
                        } else {
                          pageNum = drumsData.pagination.page - 2 + idx;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => goToPage(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${drumsData.pagination.page === pageNum
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        onClick={nextPage}
                        disabled={!drumsData.pagination.hasNext}
                        className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <button
                        onClick={lastPage}
                        disabled={!drumsData.pagination.hasNext}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm || filterStatus !== 'all' ? 'Nie znaleziono bębnów' : 'Brak bębnów'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || filterStatus !== 'all'
                ? 'Spróbuj zmienić kryteria wyszukiwania lub filtry'
                : 'Nie znaleziono bębnów przypisanych do Twojego konta'
              }
            </p>
            {(searchTerm || filterStatus !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200"
              >
                Wyczyść filtry
              </button>
            )}
          </div>
        )}
        {/* Modal szczegółów bębna */}
        {showDrumDetails && selectedDrum && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={handleCloseModal}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Szczegóły bębna {selectedDrum.cecha || selectedDrum.kod_bebna}</h2>
                  <button
                    onClick={handleCloseModal}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2 border-gray-100">Informacje o bębnie</h3>
                    <div className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Kod bębna</span>
                        <span className="text-sm font-medium text-gray-900">{selectedDrum.kod_bebna || 'Brak'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Nazwa</span>
                        <span className="text-sm font-medium text-gray-900 text-right max-w-[200px] truncate" title={selectedDrum.nazwa}>{selectedDrum.nazwa || 'Brak'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Rozmiar</span>
                        <span className="text-sm font-medium text-gray-900">{selectedDrum.rozmiar_bebna || 'Brak'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Cecha</span>
                        <span className="text-sm font-medium text-gray-900">{selectedDrum.cecha || 'Brak'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Dostawca</span>
                        <span className="text-sm font-medium text-gray-900 text-right max-w-[200px] truncate" title={selectedDrum.kon_dostawca}>{selectedDrum.kon_dostawca || 'Brak'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Dokument</span>
                        <span className="text-sm font-medium text-gray-900 text-right max-w-[200px] truncate" title={selectedDrum.nr_dokumentupz}>{selectedDrum.nr_dokumentupz || 'Brak'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Lokalizacja</span>
                        <span className="text-sm font-medium text-gray-900 text-right max-w-[200px] truncate" title={selectedDrum.adres_dostawy || selectedDrum.nazwa_punktu_dostawy}>{selectedDrum.adres_dostawy || selectedDrum.nazwa_punktu_dostawy || 'Brak adresu'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Nr faktury</span>
                        <span className="text-sm font-medium text-gray-900 text-right max-w-[200px] truncate" title={selectedDrum.numer_faktury}>{selectedDrum.numer_faktury || 'Brak'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2 border-gray-100">Informacje o kliencie</h3>
                      <div className="space-y-3 bg-blue-50/30 p-4 rounded-xl border border-blue-100/50">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-500">Firma</span>
                          <span className="text-sm font-medium text-gray-900 text-right max-w-[200px] truncate" title={selectedDrum.company || selectedDrum.pelna_nazwa_kontrahenta}>{selectedDrum.company || selectedDrum.pelna_nazwa_kontrahenta || 'Brak'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-500">NIP</span>
                          <span className="text-sm font-medium text-gray-900">{selectedDrum.nip || 'Brak'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-500">Email</span>
                          <span className="text-sm font-medium text-gray-900">{selectedDrum.companyEmail || 'Brak'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-500">Telefon</span>
                          <span className="text-sm font-medium text-gray-900">{selectedDrum.companyPhone || 'Brak'}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2 border-gray-100">Płatności i kable</h3>
                      <div className="space-y-3 bg-emerald-50/30 p-4 rounded-xl border border-emerald-100/50">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-500">Opłacony?</span>
                          <span className={`text-sm font-bold ${selectedDrum.czy_zaplacona === 'Tak' ? 'text-emerald-600' : selectedDrum.czy_zaplacona === 'Nie' ? 'text-red-600' : 'text-gray-600'}`}>
                            {selectedDrum.czy_zaplacona || 'Brak danych'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-500">Termin płatności</span>
                          <span className="text-sm font-medium text-gray-900">{selectedDrum.termin_platnosci || 'Brak terminu'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-500">Kabel na bębnie</span>
                          <span className="text-sm font-medium text-gray-900 text-right max-w-[200px] truncate" title={selectedDrum.nawiniety_kabel}>{selectedDrum.nawiniety_kabel || 'Brak kabla'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-500">Ilość kabla</span>
                          <span className="text-sm font-medium text-gray-900">{selectedDrum.ilosc_kabla ? `${selectedDrum.ilosc_kabla} m` : 'Brak'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2 border-gray-100">Harmonogram / Timeline</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-center">
                      <p className="text-xs text-gray-500 mb-1">Wydanie</p>
                      <p className="font-semibold text-sm text-gray-900">
                        {selectedDrum.data_wydania ? new Date(selectedDrum.data_wydania).toLocaleDateString('pl-PL') : 'Brak'}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-center">
                      <p className="text-xs text-gray-500 mb-1">Przyjęcie</p>
                      <p className="font-semibold text-sm text-gray-900">
                        {selectedDrum.data_przyjecia_na_stan ? new Date(selectedDrum.data_przyjecia_na_stan).toLocaleDateString('pl-PL') : 'Brak'}
                      </p>
                    </div>
                    <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 text-center">
                      <p className="text-xs text-indigo-500/80 mb-1">Zwrot (klient)</p>
                      <p className="font-semibold text-sm text-indigo-900">
                        {selectedDrum.clientReturnDeadline ? new Date(selectedDrum.clientReturnDeadline).toLocaleDateString('pl-PL') : 'Brak'}
                      </p>
                    </div>
                    <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 text-center">
                      <p className="text-xs text-blue-500/80 mb-1">Zwrot (dostawca)</p>
                      <p className="font-semibold text-sm text-blue-900">
                        {selectedDrum.data_zwrotu_do_dostawcy ? new Date(selectedDrum.data_zwrotu_do_dostawcy).toLocaleDateString('pl-PL') : <span className="text-indigo-600">Własny</span>}
                      </p>
                    </div>
                    <div className="bg-gray-900 p-3 rounded-lg border border-gray-800 text-center shadow-md">
                      <p className="text-xs text-gray-400 mb-1">W posiadaniu</p>
                      <p className="font-bold text-sm text-white">
                        {selectedDrum.daysInPossession || 0} dni
                      </p>
                    </div>
                  </div>
                </div>

                {/* Indywidualne przedłużenie terminu zwrotu (Tylko dla Admina) */}
                {currentUser?.role?.toLowerCase() === 'admin' && (
                  <div className="mt-6 pt-6 border-t border-indigo-100 bg-indigo-50/30 -mx-6 -mb-6 p-6 rounded-b-2xl">
                    <h3 className="text-lg font-bold text-indigo-900 mb-3 flex items-center space-x-2">
                      <Calendar className="w-5 h-5 text-indigo-600" />
                      <span>Indywidualne przedłużenie terminu zwrotu</span>
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Nowy termin zwrotu
                        </label>
                        <DatePicker
                          selected={customReturnDate}
                          onChange={(date) => setCustomReturnDate(date)}
                          dateFormat="dd.MM.yyyy"
                          locale="pl"
                          className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer bg-white"
                          placeholderText="Wybierz nową datę"
                          minDate={selectedDrum.data_wydania ? new Date(selectedDrum.data_wydania) : new Date()}
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Uzasadnienie / Notatka
                        </label>
                        <input
                          type="text"
                          value={extensionNotes}
                          onChange={(e) => setExtensionNotes(e.target.value)}
                          className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-sm"
                          placeholder="np. Ustalone z klientem, opóźnienie inwestycji do końca roku."
                        />
                      </div>
                    </div>
                    
                    <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        {selectedDrum.isExtended && (
                          <p className="text-xs text-gray-500">
                            Wprowadził: <span className="font-semibold">{selectedDrum.extensionCreatedBy || "Brak"}</span>
                            {selectedDrum.extensionCreatedAt && ` (${new Date(selectedDrum.extensionCreatedAt).toLocaleDateString('pl-PL')})`}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex space-x-3 justify-end">
                        {selectedDrum.isExtended && (
                          <button
                            onClick={handleClearExtension}
                            disabled={savingExtension}
                            className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-xl font-medium hover:bg-red-100 transition-colors duration-200 text-sm disabled:opacity-50"
                          >
                            Przywróć domyślny termin
                          </button>
                        )}
                        <button
                          onClick={handleSaveExtension}
                          disabled={savingExtension || !customReturnDate}
                          className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all duration-200 text-sm shadow-md hover:shadow-lg flex items-center space-x-2 disabled:opacity-50"
                        >
                          {savingExtension ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                              <span>Zapisywanie...</span>
                            </>
                          ) : (
                            <span>Zapisywanie</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDrumsList;