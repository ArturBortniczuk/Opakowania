import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { drumsAPI } from '../utils/supabaseApi';
import {
  Package,
  Search,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpDown,
  MapPin,
  RefreshCw,
  Loader,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Download,
  Check,
  BarChart3,
  X,
  Plus,
  Layers,
  Building2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Tag
} from 'lucide-react';
import * as XLSX from 'xlsx';

const AdminWarehouseDrums = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('data_zwrotu_do_dostawcy');
  const [sortOrder, setSortOrder] = useState('asc');
  
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'empty', 'full'
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [withLocationOnly, setWithLocationOnly] = useState(false);
  const [searchParams] = useSearchParams();
  const urlReadyOnly = searchParams.get('readyOnly') === 'true';
  const [readyOnly, setReadyOnly] = useState(urlReadyOnly);

  const [readyCechy, setReadyCechy] = useState(new Set());

  const [availableSizes, setAvailableSizes] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [showSizesMenu, setShowSizesMenu] = useState(false);

  const [availableMagazyny, setAvailableMagazyny] = useState([]);
  const [selectedMagazyny, setSelectedMagazyny] = useState([]);
  const [showMagazynyMenu, setShowMagazynyMenu] = useState(false);

  // WMS Filter & Analytics States
  const [availableWmsLocations, setAvailableWmsLocations] = useState([]);
  const [selectedWms, setSelectedWms] = useState([]);
  const [wmsInputValue, setWmsInputValue] = useState('');
  const [showWmsMenu, setShowWmsMenu] = useState(false);
  const [wmsSearchFilter, setWmsSearchFilter] = useState('');

  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({
    total: 0,
    urgentCount: 0,
    statusCounts: { empty: 0, full: 0 },
    sizes: [],
    suppliers: [],
    addresses: [],
    appliedWms: []
  });
  
  const [exporting, setExporting] = useState(false);

  const [drumsData, setDrumsData] = useState({
    data: [],
    pagination: {
      page: 1,
      limit: 50,
      total: 0,
      totalPages: 1,
      hasNext: false,
      hasPrev: false
    }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDrums = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);

    try {
      // Dociągnij najnowszy zestaw cech gotowych do zwrotu
      const latestReadyList = await drumsAPI.getReadyForReturnCechy();
      const latestReadySet = new Set(latestReadyList);
      setReadyCechy(latestReadySet);

      const targetPage = options.page !== undefined ? options.page : 1;

      const requestOptions = {
        page: readyOnly ? 1 : targetPage,
        limit: readyOnly ? 5000 : 50,
        sortBy,
        sortOrder,
        search: searchTerm,
        statusFilter,
        urgentOnly,
        withLocationOnly,
        selectedSizes,
        selectedMagazyny,
        selectedWms,
        ...options
      };

      const result = await drumsAPI.getWarehouseDrums(requestOptions);

      if (readyOnly) {
        const filteredData = (result.data || []).filter(drum => latestReadySet.has(drum.cecha || drum.kod_bebna));
        setDrumsData({
          ...result,
          data: filteredData,
          pagination: {
            ...result.pagination,
            page: 1,
            limit: filteredData.length || 50,
            total: filteredData.length,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        });
      } else {
        setDrumsData(result);
      }
    } catch (err) {
      console.error('Błąd pobierania bębnów magazynowych:', err);
      setError('Nie udało się pobrać listy bębnów. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortOrder, searchTerm, statusFilter, urgentOnly, withLocationOnly, readyOnly, selectedSizes, selectedMagazyny, selectedWms]);

  const fetchAnalytics = useCallback(async () => {
    try {
      setAnalyticsLoading(true);
      const data = await drumsAPI.getWarehouseWmsAnalytics({
        selectedWms,
        statusFilter,
        urgentOnly,
        selectedSizes,
        selectedMagazyny
      });
      setAnalyticsData(data);
    } catch (err) {
      console.error('Błąd pobierania analityki WMS:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [selectedWms, statusFilter, urgentOnly, selectedSizes, selectedMagazyny]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(localSearchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearchTerm]);

  useEffect(() => {
    const fetchDropdowns = async () => {
      const [sizes, magazyny, wmsList] = await Promise.all([
        drumsAPI.getWarehouseDrumSizes(),
        drumsAPI.getWarehouseDrumMagazyny(),
        drumsAPI.getWarehouseDrumWmsLocations()
      ]);
      sizes.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
      setAvailableSizes(sizes);
      setAvailableMagazyny(magazyny);
      setAvailableWmsLocations(wmsList || []);
    };
    fetchDropdowns();
  }, []);

  const loadReadyCechy = useCallback(async () => {
    const cechy = await drumsAPI.getReadyForReturnCechy();
    setReadyCechy(new Set(cechy));
  }, []);

  useEffect(() => {
    loadReadyCechy();
  }, [loadReadyCechy]);

  useEffect(() => {
    fetchDrums({ page: 1 });
  }, [fetchDrums]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleToggleReady = async (cecha) => {
    if (!cecha) return;
    const newIsReady = !readyCechy.has(cecha);

    setReadyCechy(prev => {
      const updated = new Set(prev);
      if (newIsReady) updated.add(cecha);
      else updated.delete(cecha);
      return updated;
    });

    await drumsAPI.toggleDrumReadyForReturn(cecha, newIsReady);
  };

  const goToPage = (page) => {
    setDrumsData(prev => ({ ...prev, pagination: { ...prev.pagination, page } }));
    fetchDrums({ page });
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleExportXLSX = async () => {
    try {
      setExporting(true);
      const requestOptions = {
        page: 1,
        limit: 10000,
        sortBy,
        sortOrder,
        search: searchTerm,
        statusFilter,
        urgentOnly,
        withLocationOnly,
        selectedSizes,
        selectedMagazyny,
        selectedWms
      };
      
      const result = await drumsAPI.getWarehouseDrums(requestOptions);
      if (!result.data || result.data.length === 0) {
         alert("Brak danych do eksportu");
         return;
      }
      
      const exportData = result.data.map(drum => ({
         'Cecha/Kod': drum.cecha || drum.kod_bebna,
         'Rozmiar': drum.nazwa || drum.rozmiar_bebna,
         'Status': drum.status,
         'Magazyn': drum.magazyn || '',
         'Lokalizacja WMS': drum.lokalizacja_wms || '',
         'Kablownia (Dostawca)': drum.kon_dostawca || '',
         'Data zwrotu': drum.data_zwrotu_do_dostawcy || 'Własny'
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Magazyn");
      XLSX.writeFile(workbook, `Magazyn_Bebnow_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Błąd eksportu XLSX:', err);
      alert("Wystąpił błąd podczas generowania pliku Excel.");
    } finally {
      setExporting(false);
    }
  };

  const toggleSize = (size) => {
    setSelectedSizes(prev => 
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const toggleMagazyn = (mag) => {
    setSelectedMagazyny(prev => 
      prev.includes(mag) ? prev.filter(m => m !== mag) : [...prev, mag]
    );
  };

  // WMS multi-address handlers
  const handleAddWmsFromInput = (rawInput) => {
    if (!rawInput) return;
    const items = rawInput
      .split(/[\s,;\n]+/)
      .map(s => s.trim().toUpperCase())
      .filter(s => s.length > 0);

    if (items.length > 0) {
      setSelectedWms(prev => {
        const next = [...prev];
        items.forEach(item => {
          if (!next.includes(item)) next.push(item);
        });
        return next;
      });
      setShowAnalytics(true);
    }
    setWmsInputValue('');
  };

  const removeWms = (loc) => {
    setSelectedWms(prev => prev.filter(item => item !== loc));
  };

  const clearAllWms = () => {
    setSelectedWms([]);
    setWmsInputValue('');
  };

  const toggleWmsLocation = (loc) => {
    if (!loc) return;
    const cleanLoc = loc.trim().toUpperCase();
    setSelectedWms(prev =>
      prev.includes(cleanLoc) ? prev.filter(item => item !== cleanLoc) : [...prev, cleanLoc]
    );
    setShowAnalytics(true);
  };

  const isUrgent = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  };

  const isOverdue = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0,0,0,0);
    return date < today;
  };

  const filteredWmsDropdownList = availableWmsLocations.filter(item =>
    !wmsSearchFilter || item.location.toLowerCase().includes(wmsSearchFilter.toLowerCase())
  );

  const DrumCard = ({ drum, index }) => {
    const drumCecha = drum.cecha || drum.kod_bebna;
    const isReady = readyCechy.has(drumCecha);
    const overdue = isOverdue(drum.data_zwrotu_do_dostawcy);
    const urgent = !overdue && isUrgent(drum.data_zwrotu_do_dostawcy);

    let borderColor = 'border-blue-100';
    if (urgent) borderColor = 'border-orange-400 bg-orange-50/30';

    const isWmsSelected = drum.lokalizacja_wms && selectedWms.includes(drum.lokalizacja_wms.trim().toUpperCase());

    return (
      <div
        className={`bg-white/90 backdrop-blur-lg rounded-2xl p-6 shadow-lg border-2 transition-all duration-300 hover:shadow-xl transform hover:scale-[1.02] h-full flex flex-col ${
          isReady ? 'border-emerald-500 bg-emerald-50/20 shadow-emerald-100' : borderColor
        }`}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        {isReady && (
          <div className="mb-3 flex items-center justify-between bg-emerald-100/90 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              GOTOWY DO ZWROTU DO KABLOWNI
            </span>
          </div>
        )}

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
              drum.status === 'pusty na magazynie' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-blue-600 to-indigo-700'
            }`}>
              <Package className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-gray-900 truncate text-lg">{drum.cecha || drum.kod_bebna}</h3>
              <p className="text-gray-600 text-sm truncate">
                {drum.nazwa || drum.rozmiar_bebna}
              </p>
            </div>
          </div>
          
          {urgent ? (
            <Clock className="w-6 h-6 text-orange-500 flex-shrink-0" title="Pilny zwrot (≤ 30 dni)" />
          ) : (
            <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" title="Własny lub termin w normie" />
          )}
        </div>

        <div className="space-y-3 flex-1">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Status</span>
            <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
              drum.status === 'pusty na magazynie' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
            }`}>
              {drum.status}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Magazyn</span>
            <span className="text-sm font-medium text-gray-900 truncate ml-2">
              {drum.magazyn || 'Brak'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Lokalizacja WMS</span>
            {drum.lokalizacja_wms ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleWmsLocation(drum.lokalizacja_wms);
                }}
                className={`text-xs font-bold truncate ml-2 flex items-center px-2 py-1 rounded-lg border transition-all ${
                  isWmsSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
                }`}
                title="Kliknij, aby przefiltrować lub dodać ten adres WMS do analizy"
              >
                <MapPin className="w-3.5 h-3.5 mr-1 shrink-0" />
                {drum.lokalizacja_wms}
              </button>
            ) : (
              <span className="text-sm font-medium text-gray-400 truncate ml-2">Brak</span>
            )}
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Kablownia (Dostawca)</span>
            <span className="text-sm font-medium text-gray-900 truncate ml-2" title={drum.kon_dostawca}>
              {drum.kon_dostawca || 'Nieznany'}
            </span>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <span className="text-sm text-gray-500">Termin zwrotu</span>
            <span className={`text-sm font-bold ${
              urgent ? 'text-orange-600' : (overdue ? 'text-indigo-600' : 'text-gray-900')
            }`}>
              {overdue ? 'Własny (nasz)' : (drum.data_zwrotu_do_dostawcy ?
                new Date(drum.data_zwrotu_do_dostawcy).toLocaleDateString('pl-PL') :
                'Własny')}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleReady(drumCecha);
            }}
            className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 border ${
              isReady
                ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-sm'
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
            }`}
          >
            <CheckCircle className={`w-4 h-4 ${isReady ? 'text-white' : 'text-gray-400'}`} />
            <span>{isReady ? 'Odznacz "Gotowy do zwrotu"' : 'Oznacz jako gotowy do zwrotu'}</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-blue-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-800 bg-clip-text text-transparent">
                  Magazyn Bębnów
                </h1>
                {selectedWms.length > 0 && (
                  <span className="bg-emerald-100 text-emerald-800 font-extrabold text-xs px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1 shadow-xs">
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    WMS: {selectedWms.length === 1 ? selectedWms[0] : `${selectedWms.length} adresy`}
                  </span>
                )}
              </div>
              <p className="text-gray-600 mt-1">
                Zarządzaj bębnami na stanie ({drumsData.pagination.total} szt.)
                {selectedWms.length > 0 && ` • Przefiltrowano po ${selectedWms.length} lokalizacjach WMS`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAnalytics(prev => !prev)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold transition-all shadow-md text-sm border ${
                  showAnalytics
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 shadow-emerald-200 ring-2 ring-emerald-200'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
                }`}
                title="Pokaż/ukryj wykresy i rozkład bębnów na wybranym adresie WMS"
              >
                <BarChart3 className="w-4 h-4" />
                <span>
                  {showAnalytics ? 'Ukryj wykresy WMS' : 'Wykresy bębnów na adresie WMS'}
                  {selectedWms.length > 0 ? ` (${selectedWms.length})` : ''}
                </span>
                {showAnalytics ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
              </button>

              <button
                onClick={() => navigate('/admin/map?filter=pickups')}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl font-bold transition-all shadow-md border border-gray-800 text-sm"
                title="Pokaż czarną pineskę na mapie z bębnami gotowymi do zwrotu do kablowni"
              >
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>Czarna pineska ({readyCechy.size})</span>
              </button>

              <button
                onClick={handleExportXLSX}
                disabled={exporting || loading || drumsData.data.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 rounded-xl font-medium transition-all shadow-sm disabled:opacity-50 text-sm"
              >
                {exporting ? <Loader className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                <span>Eksportuj XLSX</span>
              </button>
              
              <button
                onClick={() => {
                  fetchDrums();
                  fetchAnalytics();
                }}
                disabled={loading}
                className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all duration-200"
                title="Odśwież"
              >
                <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* WMS Analytics & Charts Section */}
          {showAnalytics && (
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-7 shadow-xl border border-emerald-100 mb-8 transition-all relative overflow-hidden animate-fadeIn">
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-emerald-100/50 via-teal-50/20 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none blur-2xl"></div>

              {/* Header Panelu Analityki */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-gray-100 gap-4 relative z-10">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-200">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-extrabold text-gray-900">
                        {selectedWms.length === 1
                          ? `Rozkład bębnów na adresie: ${selectedWms[0]}`
                          : selectedWms.length > 1
                            ? `Rozkład bębnów na ${selectedWms.length} wybranych adresach WMS`
                            : 'Rozkład bębnów na magazynie (wszystkie lokalizacje WMS)'}
                      </h2>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {selectedWms.length > 0
                        ? `Analiza bębnów zlokalizowanych pod kodami: ${selectedWms.join(', ')}`
                        : 'Wybierz lub wpisz konkretne adresy WMS poniżej, aby zawęzić wykresy'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedWms.length > 0 && (
                    <button
                      onClick={clearAllWms}
                      className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition-colors"
                    >
                      Wyczyść filtr WMS
                    </button>
                  )}
                  <button
                    onClick={() => setShowAnalytics(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                    title="Zamknij panel wykresów"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 my-6 relative z-10">
                <div className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-2xl border border-gray-200/70 shadow-xs">
                  <div className="flex items-center justify-between text-gray-500 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider">Bębnów na adresie</span>
                    <Package className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-gray-900">
                    {analyticsLoading ? <Loader className="w-6 h-6 animate-spin text-emerald-600 inline" /> : analyticsData.total}
                    <span className="text-xs font-normal text-gray-500 ml-1.5">szt.</span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    {analyticsData.sizes?.length || 0} różnych rozmiarów
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50/50 to-white p-4 rounded-2xl border border-emerald-100 shadow-xs">
                  <div className="flex items-center justify-between text-emerald-700 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider">Puste (gotowe)</span>
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-700">
                    {analyticsData.statusCounts?.empty || 0}
                    <span className="text-xs font-normal text-emerald-600/80 ml-1.5">
                      ({analyticsData.total > 0 ? Math.round((analyticsData.statusCounts.empty / analyticsData.total) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-600/70 mt-1">
                    Puste bębny gotowe do zwrotu
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50/50 to-white p-4 rounded-2xl border border-blue-100 shadow-xs">
                  <div className="flex items-center justify-between text-blue-700 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider">Z towarem</span>
                    <Layers className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-blue-700">
                    {analyticsData.statusCounts?.full || 0}
                    <span className="text-xs font-normal text-blue-600/80 ml-1.5">
                      ({analyticsData.total > 0 ? Math.round((analyticsData.statusCounts.full / analyticsData.total) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="text-[11px] text-blue-600/70 mt-1">
                    Nawinięty kabel na stanie
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-50/50 to-white p-4 rounded-2xl border border-orange-100 shadow-xs">
                  <div className="flex items-center justify-between text-orange-700 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider">Pilny termin</span>
                    <Clock className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="text-2xl font-black text-orange-700">
                    {analyticsData.urgentCount || 0}
                    <span className="text-xs font-normal text-orange-600/80 ml-1.5">
                      ({analyticsData.total > 0 ? Math.round((analyticsData.urgentCount / analyticsData.total) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="text-[11px] text-orange-600/70 mt-1">
                    Zwrot do kablowni ≤ 30 dni
                  </div>
                </div>
              </div>

              {/* Główna sekcja wykresów */}
              {analyticsLoading ? (
                <div className="py-16 text-center">
                  <Loader className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-2" />
                  <span className="text-sm font-medium text-gray-500">Przeliczanie statystyk dla adresu WMS...</span>
                </div>
              ) : analyticsData.total === 0 ? (
                <div className="py-12 text-center bg-gray-50/80 rounded-2xl border border-dashed border-gray-200">
                  <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-700">Brak bębnów na wybranym adresie WMS</p>
                  <p className="text-xs text-gray-400 mt-1">Sprawdź poprawność wpisanego adresu lub wybierz inną lokalizację z listy.</p>
                </div>
              ) : (
                <div className="space-y-6 relative z-10">
                  {/* Grid 2 głównych wykresów: Rozmiary & Dostawcy */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Wykres 1: Rozkład według Rozmiaru */}
                    <div className="bg-gray-50/70 backdrop-blur-xs rounded-2xl p-5 border border-gray-200/80 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                            Rozkład według Rozmiaru Bębna
                          </h3>
                          <span className="text-xs text-gray-500">
                            {analyticsData.sizes.length} rozmiarów
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-4">
                          Kliknij w słupek rozmiaru, aby dodatkowo przefiltrować listę bębnów.
                        </p>

                        <div className="space-y-3">
                          {analyticsData.sizes.slice(0, 10).map((sz, idx) => {
                            const isSizeActive = selectedSizes.includes(sz.name);
                            return (
                              <div
                                key={idx}
                                onClick={() => toggleSize(sz.name)}
                                className={`group p-2 rounded-xl transition-all cursor-pointer ${
                                  isSizeActive ? 'bg-emerald-100/70 border border-emerald-300' : 'hover:bg-white border border-transparent'
                                }`}
                              >
                                <div className="flex items-center justify-between text-xs mb-1.5">
                                  <span className="font-bold text-gray-800 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:scale-125 transition-transform"></span>
                                    {sz.name}
                                    {isSizeActive && (
                                      <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold">aktywny</span>
                                    )}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-gray-900">{sz.count} szt.</span>
                                    <span className="text-gray-500 font-mono text-[11px] w-9 text-right font-semibold">{sz.percentage}%</span>
                                  </div>
                                </div>
                                <div className="w-full bg-gray-200/80 rounded-full h-3 overflow-hidden shadow-inner">
                                  <div
                                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full transition-all duration-700 ease-out group-hover:brightness-110"
                                    style={{ width: `${Math.max(sz.percentage, 3)}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {analyticsData.sizes.length > 10 && (
                        <div className="mt-3 text-center text-xs text-gray-400 font-medium pt-2 border-t border-gray-200/50">
                          + {analyticsData.sizes.length - 10} kolejnych mniejszych rozmiarów
                        </div>
                      )}
                    </div>

                    {/* Wykres 2: Rozkład według Dostawcy */}
                    <div className="bg-gray-50/70 backdrop-blur-xs rounded-2xl p-5 border border-gray-200/80 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                            Rozkład według Dostawcy (Kablowni)
                          </h3>
                          <span className="text-xs text-gray-500">
                            {analyticsData.suppliers.length} dostawców
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-4">
                          Podział bębnów na danym adresie według kablowni / producenta.
                        </p>

                        <div className="space-y-3">
                          {analyticsData.suppliers.slice(0, 10).map((sup, idx) => (
                            <div key={idx} className="group p-2 rounded-xl transition-all hover:bg-white border border-transparent">
                              <div className="flex items-center justify-between text-xs mb-1.5">
                                <span className="font-bold text-gray-800 truncate max-w-[240px]" title={sup.name}>
                                  {sup.name}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-gray-900">{sup.count} szt.</span>
                                  <span className="text-gray-500 font-mono text-[11px] w-9 text-right font-semibold">{sup.percentage}%</span>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200/80 rounded-full h-3 overflow-hidden shadow-inner">
                                <div
                                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-700 ease-out group-hover:brightness-110"
                                  style={{ width: `${Math.max(sup.percentage, 3)}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {analyticsData.suppliers.length > 10 && (
                        <div className="mt-3 text-center text-xs text-gray-400 font-medium pt-2 border-t border-gray-200/50">
                          + {analyticsData.suppliers.length - 10} kolejnych dostawców
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Wykres 3: Podział na poszczególne Adresy WMS */}
                  {analyticsData.addresses?.length > 1 && (
                    <div className="bg-gray-50/70 backdrop-blur-xs rounded-2xl p-5 border border-gray-200/80 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-gray-200 gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-emerald-600" />
                            Podział bębnów na poszczególne adresy WMS
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Porównanie obłożenia i dominujących rozmiarów w każdej z lokalizacji
                          </p>
                        </div>
                        <span className="text-xs font-bold text-gray-600 bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                          Lokalizacji: {analyticsData.addresses.length}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {analyticsData.addresses.slice(0, 12).map((addr, idx) => {
                          const isOnlyThisSelected = selectedWms.length === 1 && selectedWms[0] === addr.location;
                          return (
                            <div
                              key={idx}
                              className={`p-3.5 rounded-xl border transition-all ${
                                isOnlyThisSelected
                                  ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200'
                                  : 'bg-white border-gray-200/80 hover:border-emerald-200 hover:shadow-xs'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <span className="font-extrabold text-sm text-gray-900 truncate font-mono">
                                    {addr.location}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-black text-gray-900">{addr.count} szt.</span>
                                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                    {addr.percentage}%
                                  </span>
                                </div>
                              </div>

                              <div className="w-full bg-gray-100 rounded-full h-2 mb-3 overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-2 rounded-full"
                                  style={{ width: `${Math.max(addr.percentage, 4)}%` }}
                                ></div>
                              </div>

                              <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[11px] text-gray-400 font-medium">Rozmiary:</span>
                                  {addr.topSizes?.map(([sName, sCount], sIdx) => (
                                    <span key={sIdx} className="text-[10px] font-bold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                                      {sName} ({sCount})
                                    </span>
                                  ))}
                                </div>

                                {!isOnlyThisSelected && (
                                  <button
                                    onClick={() => {
                                      setSelectedWms([addr.location]);
                                      setShowAnalytics(true);
                                    }}
                                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline shrink-0"
                                  >
                                    Filtruj tylko ten
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {analyticsData.addresses.length > 12 && (
                        <div className="mt-3 text-center text-xs text-gray-400 pt-2 border-t border-gray-200/50">
                          + {analyticsData.addresses.length - 12} pozostałych adresów
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Search and Filters */}
          <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-emerald-100 mb-6 relative z-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Szukaj (cecha, dostawca, WMS)..."
                  value={localSearchTerm}
                  onChange={(e) => setLocalSearchTerm(e.target.value)}
                  className="pl-10 w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent cursor-pointer font-medium text-gray-700"
              >
                <option value="all">Wszystkie na magazynie</option>
                <option value="empty">Puste na magazynie</option>
                <option value="full">Z towarem na magazynie</option>
              </select>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSizesMenu(!showSizesMenu)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors text-gray-700 font-medium"
                >
                  <div className="flex items-center">
                    <Filter className="w-4 h-4 mr-2 text-emerald-500" />
                    <span>Rozmiary ({selectedSizes.length > 0 ? selectedSizes.length : 'Wszystkie'})</span>
                  </div>
                  <ChevronLeft className={`w-5 h-5 transition-transform ${showSizesMenu ? '-rotate-90' : ''}`} />
                </button>
                
                {showSizesMenu && (
                  <div className="absolute z-50 mt-2 w-full max-h-60 overflow-auto bg-white border border-gray-200 rounded-xl shadow-xl p-2">
                    {availableSizes.length > 0 ? (
                      availableSizes.map(size => (
                        <label key={size} className="flex items-center p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={selectedSizes.includes(size)}
                            onChange={() => toggleSize(size)}
                            className="w-4 h-4 text-emerald-500 border-gray-300 rounded focus:ring-emerald-500"
                          />
                          <span className="ml-2 text-sm font-medium text-gray-700">{size}</span>
                        </label>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-gray-500 text-center">Brak rozmiarów do wyboru</div>
                    )}
                    {selectedSizes.length > 0 && (
                      <button 
                        onClick={() => setSelectedSizes([])}
                        className="w-full mt-2 p-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium"
                      >
                        Wyczyść wybór
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMagazynyMenu(!showMagazynyMenu)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors text-gray-700 font-medium"
                >
                  <div className="flex items-center">
                    <Filter className="w-4 h-4 mr-2 text-emerald-500" />
                    <span className="truncate">Magazyny ({selectedMagazyny.length > 0 ? selectedMagazyny.length : 'Wszystkie'})</span>
                  </div>
                  <ChevronLeft className={`w-5 h-5 transition-transform flex-shrink-0 ml-2 ${showMagazynyMenu ? '-rotate-90' : ''}`} />
                </button>
                
                {showMagazynyMenu && (
                  <div className="absolute z-50 mt-2 w-full max-h-60 overflow-auto bg-white border border-gray-200 rounded-xl shadow-xl p-2">
                    {availableMagazyny.length > 0 ? (
                      availableMagazyny.map(mag => (
                        <label key={mag} className="flex items-center p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={selectedMagazyny.includes(mag)}
                            onChange={() => toggleMagazyn(mag)}
                            className="w-4 h-4 text-emerald-500 border-gray-300 rounded focus:ring-emerald-500"
                          />
                          <span className="ml-2 text-sm font-medium text-gray-700">{mag}</span>
                        </label>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-gray-500 text-center">Brak magazynów</div>
                    )}
                    {selectedMagazyny.length > 0 && (
                      <button 
                        onClick={() => setSelectedMagazyny([])}
                        className="w-full mt-2 p-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium"
                      >
                        Wyczyść wybór
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Nowy zaawansowany filtr adresów WMS (możliwość wpisania kilku adresów) */}
            <div className="mt-5 pt-5 border-t border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>Filtrowanie po adresie WMS (możesz wpisać lub wybrać kilka adresów):</span>
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAnalytics(!showAnalytics)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>{showAnalytics ? 'Ukryj wykresy' : 'Pokaż wykresy dla tego adresu'}</span>
                  </button>
                  {selectedWms.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllWms}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline"
                    >
                      Wyczyść adresy ({selectedWms.length})
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 relative">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={wmsInputValue}
                    onChange={(e) => setWmsInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        handleAddWmsFromInput(wmsInputValue);
                      }
                    }}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData('text');
                      if (pasted && /[\s,;\n]/.test(pasted)) {
                        e.preventDefault();
                        handleAddWmsFromInput(pasted);
                      }
                    }}
                    placeholder="Wpisz adres WMS (np. PKB-000-000-098, PKB-000-000-097 lub wklej listę)..."
                    className="w-full pl-10 pr-24 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-mono placeholder:font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddWmsFromInput(wmsInputValue)}
                    disabled={!wmsInputValue.trim()}
                    className="absolute right-2 top-2 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:hover:bg-emerald-600 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Dodaj</span>
                  </button>
                </div>

                {/* Dropdown wyboru z listy istniejących lokalizacji WMS */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowWmsMenu(!showWmsMenu)}
                    className="w-full sm:w-auto px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors text-gray-700 text-xs font-bold flex items-center justify-between gap-2 shrink-0"
                  >
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      <span>Lista WMS ({availableWmsLocations.length})</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showWmsMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showWmsMenu && (
                    <div className="absolute right-0 z-50 mt-2 w-80 max-h-80 bg-white border border-gray-200 rounded-2xl shadow-2xl p-3 flex flex-col">
                      <div className="relative mb-2">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                        <input
                          type="text"
                          value={wmsSearchFilter}
                          onChange={(e) => setWmsSearchFilter(e.target.value)}
                          placeholder="Filtruj listę adresów..."
                          className="w-full pl-8 pr-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="overflow-y-auto flex-1 max-h-56 space-y-1">
                        {filteredWmsDropdownList.length > 0 ? (
                          filteredWmsDropdownList.map(({ location, count }) => {
                            const isChecked = selectedWms.includes(location);
                            return (
                              <label
                                key={location}
                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                                  isChecked ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-gray-50 text-gray-700'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleWmsLocation(location)}
                                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                  />
                                  <span className="font-mono truncate">{location}</span>
                                </div>
                                <span className="text-[11px] font-semibold text-gray-400 shrink-0 ml-2">
                                  {count} szt.
                                </span>
                              </label>
                            );
                          })
                        ) : (
                          <div className="p-3 text-center text-xs text-gray-400">Nie znaleziono takiego adresu</div>
                        )}
                      </div>

                      {selectedWms.length > 0 && (
                        <button
                          type="button"
                          onClick={clearAllWms}
                          className="w-full mt-2 pt-2 border-t border-gray-100 text-xs text-red-600 hover:text-red-700 font-bold text-center"
                        >
                          Odznacz wszystkie adresy
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Aktywne Tagi / Chipy wybranych adresów WMS */}
              {selectedWms.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-2">
                  <span className="text-xs font-semibold text-gray-500 mr-1">Wybrane adresy:</span>
                  {selectedWms.map((loc) => {
                    const matchLoc = availableWmsLocations.find(l => l.location === loc);
                    return (
                      <span
                        key={loc}
                        className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs group"
                      >
                        <MapPin className="w-3 h-3 text-emerald-700" />
                        <span>{loc}</span>
                        {matchLoc && (
                          <span className="text-[10px] font-sans font-bold bg-emerald-200/80 text-emerald-800 px-1.5 py-0.2 rounded-full">
                            {matchLoc.count} szt.
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeWms(loc)}
                          className="w-4 h-4 rounded hover:bg-emerald-200 flex items-center justify-center transition-colors text-emerald-700"
                          title="Usuń ten adres z filtra"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  <button
                    type="button"
                    onClick={clearAllWms}
                    className="text-xs text-red-600 hover:text-red-800 font-semibold ml-2 hover:underline"
                  >
                    Wyczyść wszystkie
                  </button>
                </div>
              )}
            </div>
            
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
              <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
                <label className="flex items-center space-x-3 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-emerald-50/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={readyOnly}
                    onChange={(e) => setReadyOnly(e.target.checked)}
                    className="w-5 h-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                  />
                  <span className="font-bold text-emerald-800 text-sm flex items-center">
                    <CheckCircle className="w-4 h-4 mr-1 text-emerald-600" />
                    Tylko gotowe do zwrotu ({readyCechy.size})
                  </span>
                </label>

                <label className="flex items-center space-x-3 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={withLocationOnly}
                    onChange={(e) => setWithLocationOnly(e.target.checked)}
                    className="w-5 h-5 text-emerald-500 rounded border-gray-300 focus:ring-emerald-500"
                  />
                  <span className="font-medium text-gray-700 flex items-center text-sm">
                    <MapPin className="w-4 h-4 mr-1 text-emerald-500" />
                    Z lokalizacją WMS
                  </span>
                </label>

                <label className="flex items-center space-x-3 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={urgentOnly}
                    onChange={(e) => setUrgentOnly(e.target.checked)}
                    className="w-5 h-5 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
                  />
                  <span className="font-medium text-gray-700 flex items-center text-sm">
                    <Clock className="w-4 h-4 mr-1 text-orange-500" />
                    Tylko pilne (≤ 30 dni)
                  </span>
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-500 flex items-center">
                  <Filter className="w-4 h-4 mr-1" />
                  Sortuj:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => handleSort(e.target.value)}
                  className="p-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent cursor-pointer"
                >
                  <option value="data_zwrotu_do_dostawcy">Data zwrotu</option>
                  <option value="kon_dostawca">Dostawca</option>
                  <option value="cecha">Cecha bębna</option>
                  <option value="lokalizacja_wms">Lokalizacja WMS</option>
                </select>
                <button
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="p-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100"
                  title="Zmień kierunek sortowania"
                >
                  <ArrowUpDown className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="w-10 h-10 text-emerald-600 animate-spin" />
            <span className="ml-3 text-lg font-medium text-gray-600">Wczytywanie bębnów...</span>
          </div>
        ) : drumsData.data.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8 items-stretch">
              {drumsData.data.map((drum, index) => (
                <DrumCard key={drum.id || drum.cecha || index} drum={drum} index={index} />
              ))}
            </div>

            {/* Pagination */}
            {drumsData.pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center pb-8">
                <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-md rounded-2xl p-2 shadow-lg border border-gray-100">
                  <button
                    onClick={() => goToPage(1)}
                    disabled={drumsData.pagination.page === 1}
                    className="p-2 text-gray-500 hover:text-emerald-600 disabled:opacity-50 transition-colors"
                  >
                    <ChevronsLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => goToPage(drumsData.pagination.page - 1)}
                    disabled={drumsData.pagination.page === 1}
                    className="p-2 text-gray-500 hover:text-emerald-600 disabled:opacity-50 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  <div className="px-4 py-1 bg-gray-50 rounded-lg text-sm font-medium text-gray-700">
                    Strona {drumsData.pagination.page} z {drumsData.pagination.totalPages}
                  </div>

                  <button
                    onClick={() => goToPage(drumsData.pagination.page + 1)}
                    disabled={drumsData.pagination.page === drumsData.pagination.totalPages}
                    className="p-2 text-gray-500 hover:text-emerald-600 disabled:opacity-50 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => goToPage(drumsData.pagination.totalPages)}
                    disabled={drumsData.pagination.page === drumsData.pagination.totalPages}
                    className="p-2 text-gray-500 hover:text-emerald-600 disabled:opacity-50 transition-colors"
                  >
                    <ChevronsRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 bg-white/80 backdrop-blur-lg rounded-2xl border border-gray-100 shadow-sm">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Brak bębnów na magazynie</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Nie znaleziono bębnów spełniających podane kryteria. Spróbuj zmienić parametry wyszukiwania lub zresetować filtry adresów WMS.
            </p>
            {selectedWms.length > 0 && (
              <button
                onClick={clearAllWms}
                className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
              >
                Wyczyść filtry adresów WMS ({selectedWms.length})
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminWarehouseDrums;
