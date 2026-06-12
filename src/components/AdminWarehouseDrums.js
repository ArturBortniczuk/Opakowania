import React, { useState, useEffect, useCallback } from 'react';
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
  Filter
} from 'lucide-react';

const AdminWarehouseDrums = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('data_zwrotu_do_dostawcy');
  const [sortOrder, setSortOrder] = useState('asc');
  
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'empty', 'full'
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [withLocationOnly, setWithLocationOnly] = useState(false);

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
      const requestOptions = {
        page: drumsData.pagination.page,
        limit: 50,
        sortBy,
        sortOrder,
        search: searchTerm,
        statusFilter,
        urgentOnly,
        withLocationOnly,
        ...options
      };

      const result = await drumsAPI.getWarehouseDrums(requestOptions);
      setDrumsData(result);
    } catch (err) {
      console.error('Błąd pobierania bębnów magazynowych:', err);
      setError('Nie udało się pobrać listy bębnów. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortOrder, searchTerm, statusFilter, urgentOnly, withLocationOnly]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(localSearchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearchTerm]);

  useEffect(() => {
    fetchDrums({ page: 1 });
  }, [sortBy, sortOrder, searchTerm, statusFilter, urgentOnly, withLocationOnly]);

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

  const DrumCard = ({ drum, index }) => {
    const overdue = isOverdue(drum.data_zwrotu_do_dostawcy);
    const urgent = !overdue && isUrgent(drum.data_zwrotu_do_dostawcy);
    
    // Jeśli przeterminowany, traktujemy go jako "Własny" - bez czerwonego alarmu
    let borderColor = 'border-blue-100';
    if (urgent) borderColor = 'border-orange-400 bg-orange-50/30';

    return (
      <div
        className={`bg-white/90 backdrop-blur-lg rounded-2xl p-6 shadow-lg border-2 transition-all duration-300 hover:shadow-xl transform hover:scale-[1.02] h-full flex flex-col ${borderColor}`}
        style={{ animationDelay: `${index * 50}ms` }}
      >
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
            <span className="text-sm text-gray-500">Lokalizacja WMS</span>
            <span className="text-sm font-medium text-gray-900 truncate ml-2 flex items-center">
              <MapPin className="w-3 h-3 mr-1 text-gray-400" />
              {drum.lokalizacja_wms || 'Brak'}
            </span>
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
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-blue-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-800 bg-clip-text text-transparent mb-2">
                Magazyn Bębnów
              </h1>
              <p className="text-gray-600">
                Zarządzaj bębnami na stanie ({drumsData.pagination.total} szt.)
              </p>
            </div>

            <button
              onClick={() => fetchDrums()}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all duration-200"
              title="Odśwież"
            >
              <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Search and Filters */}
          <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-emerald-100 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
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

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-3 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={withLocationOnly}
                    onChange={(e) => setWithLocationOnly(e.target.checked)}
                    className="w-5 h-5 text-emerald-500 rounded border-gray-300 focus:ring-emerald-500"
                  />
                  <span className="font-medium text-gray-700 flex items-center">
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
                  <span className="font-medium text-gray-700 flex items-center">
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
              Nie znaleziono bębnów spełniających podane kryteria. Spróbuj zmienić parametry wyszukiwania.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminWarehouseDrums;
