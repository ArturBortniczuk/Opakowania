import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { drumsAPI, companiesAPI } from '../utils/supabaseApi';
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

const AdminDrumsList = ({ initialFilter = {} }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [localSearchTerm, setLocalSearchTerm] = useState(''); // DODANE: Lokalny stan dla inputa
  const [sortBy, setSortBy] = useState('cecha');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterStatus, setFilterStatus] = useState((initialFilter && initialFilter.clientNip) ? 'client' : 'all');
  const [filterClient, setFilterClient] = useState((initialFilter && initialFilter.clientNip) || '');
  const [filterDateRange, setFilterDateRange] = useState('all');
  const [selectedDrum, setSelectedDrum] = useState(null);
  const [showDrumDetails, setShowDrumDetails] = useState(false);

  // DODANE: Stan paginacji
  const [drumsData, setDrumsData] = useState({
    data: [],
    pagination: {
      page: 1,
      limit: 300, // 300 na stronę dla adminów
      total: 0,
      totalPages: 1,
      hasNext: false,
      hasPrev: false
    }
  });

  const [companies, setCompanies] = useState([]);
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
        limit: 100,
        sortBy,
        sortOrder,
        search: searchTerm,
        status: filterStatus,
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
  }, [sortBy, sortOrder, searchTerm, filterStatus, filterClient]);

  // Pobierz firmy
  const fetchCompanies = async () => {
    try {
      const companiesData = await companiesAPI.getCompanies();
      setCompanies(companiesData);
    } catch (err) {
      console.error('Błąd podczas pobierania firm:', err);
    }
  };

  // Pobierz dane przy pierwszym ładowaniu i zmianie parametrów
  // DODANE: Debounce dla wyszukiwania
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(localSearchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [localSearchTerm]);

  useEffect(() => {
    fetchDrums({ page: 1 }); // Resetuj do pierwszej strony przy zmianie filtrów
  }, [sortBy, sortOrder, searchTerm, filterStatus, filterClient]);

  // Pobierz firmy na starcie
  useEffect(() => {
    fetchCompanies();
  }, []);

  // Obsługa początkowego filtra
  useEffect(() => {
    if (initialFilter) {
      if (initialFilter.nip) {
        setFilterClient(initialFilter.nip);
      }
      if (initialFilter.status) {
        setFilterStatus(initialFilter.status);
      }
    }
  }, [initialFilter]);

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
    setShowDrumDetails(true);
  };

  const handleRefresh = async () => {
    await fetchDrums();
    await fetchCompanies();
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

        if (fileName.endsWith('.csv')) {
          console.log('📄 Tryb CSV...');

          const csvContent = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Błąd odczytu CSV'));
            reader.readAsText(file, 'UTF-8');
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

        if (result.success) {
          const message = `✅ SUKCES!\n\n${result.message}\n\n` +
            `📊 Format: ${fileName.endsWith('.csv') ? 'CSV' : 'XLSX'}\n` +
            `🇵🇱 Polskie znaki: ${result.hasPolishChars ? 'OK' : 'Brak'}\n` +
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

  // ZACHOWANE: Statystyki z twojego kodu
  const getStatistics = () => {
    const total = drumsData.data.length;
    const overdue = drumsData.data.filter(d => d.status === 'overdue').length;
    const dueSoon = drumsData.data.filter(d => d.status === 'due-soon').length;
    const active = drumsData.data.filter(d => d.status === 'active').length;

    return { total, overdue, dueSoon, active };
  };

  const stats = getStatistics();

  // ZACHOWANE: DrumCard z twojego kodu
  const DrumCard = ({ drum, index }) => (
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
            <h3 className="font-bold text-gray-900 truncate text-lg">{drum.cecha || drum.kod_bebna}</h3>
            <p className="text-gray-600 text-sm truncate">
              {drum.cecha ? `${drum.kod_bebna} • ${drum.nazwa}` : drum.nazwa}
            </p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${drum.color || 'bg-gray-100 text-gray-600'}`}>
          {drum.text || drum.status}
        </div>
      </div>

      <div className="space-y-3 flex-1">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Firma</span>
          <span className="text-sm font-medium text-gray-900 truncate ml-2">
            {drum.company || drum.pelna_nazwa_kontrahenta}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">NIP</span>
          <span className="text-sm font-medium text-gray-900">{drum.nip}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Termin zwrotu</span>
          <span className="text-sm font-medium text-gray-900">
            {drum.DATA_ZWROTU_DO_DOSTAWCY ?
              new Date(drum.DATA_ZWROTU_DO_DOSTAWCY).toLocaleDateString('pl-PL') :
              'Brak'
            }
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Dni w posiadaniu</span>
          <span className="text-sm font-medium text-gray-900">
            {drum.daysInPossession || (drum.DATA_WYDANIA ? Math.floor((new Date() - new Date(drum.DATA_WYDANIA)) / (1000 * 60 * 60 * 24)) : 0)}
          </span>
        </div>
      </div>

      <div className="flex space-x-2 mt-4">
        <button
          onClick={() => handleViewDrum(drum)}
          className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-xl font-medium hover:bg-blue-700 transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
        >
          <Eye className="w-4 h-4" />
          <span>Szczegóły</span>
        </button>

        <button
          onClick={() => navigate('/admin/clients', { state: { clientNip: drum.nip } })}
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

  // ZACHOWANE: DrumDetailsModal z twojego kodu
  const DrumDetailsModal = () => {
    if (!showDrumDetails || !selectedDrum) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={() => setShowDrumDetails(false)} // DODANE: Zamykanie po kliknięciu w tło
      >
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()} // DODANE: Zapobieganie zamykaniu po kliknięciu w treść
        >
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Szczegóły bębna {selectedDrum.cecha || selectedDrum.kod_bebna}</h2>
              <button
                onClick={() => setShowDrumDetails(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Informacje o bębnie</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Kod bębna</label>
                    <p className="text-gray-900">{selectedDrum.kod_bebna}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nazwa</label>
                    <p className="text-gray-900">{selectedDrum.nazwa}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Cecha</label>
                    <p className="text-gray-900 font-medium">{selectedDrum.cecha || 'Brak'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Dostawca</label>
                    <p className="text-gray-900">{selectedDrum.kon_dostawca}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Dokument</label>
                    <p className="text-gray-900">{selectedDrum.nr_dokumentupz}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Informacje o kliencie</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nazwa firmy</label>
                    <p className="text-gray-900">{selectedDrum.company || selectedDrum.pelna_nazwa_kontrahenta}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">NIP</label>
                    <p className="text-gray-900">{selectedDrum.nip}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Kontrahent</label>
                    <p className="text-gray-900">{selectedDrum.kontrahent}</p>
                  </div>
                  {selectedDrum.companyEmail && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="text-gray-900">{selectedDrum.companyEmail}</p>
                    </div>
                  )}
                  {selectedDrum.companyPhone && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Telefon</label>
                      <p className="text-gray-900">{selectedDrum.companyPhone}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Data wydania</span>
                  <span className="font-medium">
                    {selectedDrum.data_wydania
                      ? new Date(selectedDrum.data_wydania).toLocaleDateString('pl-PL')
                      : 'Brak'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Data przyjęcia na stan</span>
                  <span className="font-medium">
                    {selectedDrum.data_przyjecia_na_stan
                      ? new Date(selectedDrum.data_przyjecia_na_stan).toLocaleDateString('pl-PL')
                      : 'Brak'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Termin zwrotu</span>
                  <span className="font-medium">
                    {selectedDrum.data_zwrotu_do_dostawcy
                      ? new Date(selectedDrum.data_zwrotu_do_dostawcy).toLocaleDateString('pl-PL')
                      : 'Brak'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Dni w posiadaniu</span>
                  <span className="font-medium">{selectedDrum.daysInPossession || 0} dni</span>
                </div>
              </div>
            </div>
          </div >
        </div >
      </div >
    );
  };

  // DODANE: Komponent paginacji
  const PaginationControls = () => (
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
  );

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

  return (error) {
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
              {/* PRZYCISK IMPORT CSV/XLSX */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
          </div>

          {/* Search and Filters */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-blue-100 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Szukaj bębnów..."
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
                <option value="all">Wszystkie statusy</option>
                <option value="active">Aktywne</option>
                <option value="due-soon">Zbliża się termin</option>
                <option value="overdue">Przeterminowane</option>
              </select>

              <select
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
                className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Wszyscy klienci</option>
                {companies.map(company => (
                  <option key={company.nip} value={company.nip}>
                    {company.name}
                  </option>
                ))}
              </select>

              <select
                value={filterDateRange}
                onChange={(e) => setFilterDateRange(e.target.value)}
                className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Wszystkie terminy</option>
                <option value="this-week">Ten tydzień</option>
                <option value="this-month">Ten miesiąc</option>
                <option value="overdue">Przeterminowane</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results - ZMIENIONE: używa drumsData.data zamiast filteredAndSortedDrums */}
        {drumsData.data.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8 items-stretch">
              {drumsData.data.map((drum, index) => (
                <DrumCard key={drum.kod_bebna || index} drum={drum} index={index} />
              ))}
            </div>

            {/* DODANE: Paginacja */}
            {drumsData.pagination.totalPages > 1 && <PaginationControls />}
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
        <DrumDetailsModal />
      </div>
    </div>
  );
};

export default AdminDrumsList;