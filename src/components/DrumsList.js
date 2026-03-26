// src/components/DrumsList.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { drumsAPI } from '../utils/supabaseApi';
import {
  Package, Calendar, Search, Filter, AlertCircle, CheckCircle, Clock,
  ArrowUpDown, Truck, RefreshCw, ChevronLeft, ChevronRight
} from 'lucide-react';

const DrumsList = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('kod_bebna');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterStatus, setFilterStatus] = useState('all');

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const LIMIT = 300;

  const [drums, setDrums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    dueSoon: 0,
    overdue: 0
  });

  const fetchDrums = async () => {
    if (!user?.nip) return;

    setLoading(true);
    setError(null);

    try {
      const options = {
        page,
        limit: LIMIT,
        sortBy,
        sortOrder,
        search: searchTerm,
        status: filterStatus === 'all' ? undefined : filterStatus
      };

      const result = await drumsAPI.getDrums(user.nip, options);

      if (result.data) {
        setDrums(result.data);
        setTotalPages(result.pagination?.totalPages || 1);
        setTotalItems(result.pagination?.total || 0);

        // Update stats roughly based on what we know or separate API call
        // For accurate full stats we might need a separate endpoint or stick to pagination info
        // Here we can just use the returned counts if available or keep it simple
        setStats({
          total: result.pagination?.total || 0,
          active: result.data.filter(d => d.status === 'active').length, // This is only for current page, but acceptable for now
          dueSoon: result.data.filter(d => d.status === 'due-soon').length,
          overdue: result.data.filter(d => d.status === 'overdue').length
        });
      } else {
        // Fallback if API returns array directly (legacy)
        setDrums(Array.isArray(result) ? result : []);
      }

    } catch (err) {
      console.error('Błąd pobierania bębnów:', err);
      setError('Nie udało się pobrać listy bębnów.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrums();
  }, [user?.nip, page, sortBy, sortOrder, filterStatus]); // Debounce search term ideally

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) setPage(1);
      else fetchDrums();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const DrumCard = ({ drum, index }) => {
    const kodBebna = drum.kod_bebna || drum.KOD_BEBNA;
    const nazwa = drum.nazwa || drum.NAZWA;
    const returnDate = drum.data_zwrotu_do_dostawcy || drum.DATA_ZWROTU_DO_DOSTAWCY;
    const company = drum.company || drum.pelna_nazwa_kontrahenta;
    const nip = drum.nip || drum.NIP;

    return (
      <div
        className={`bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border transition-all duration-300 hover:shadow-xl transform hover:scale-[1.02] ${drum.borderColor || 'border-gray-200'}`}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">{drum.cecha || kodBebna}</h3>
              <p className="text-gray-600 text-sm">{drum.cecha ? `${kodBebna} • ${nazwa}` : nazwa}</p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${drum.color || 'bg-gray-100 text-gray-600'}`}>
            {drum.text || drum.status || 'Aktywny'}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Firma</span>
            <span className="text-sm font-medium text-gray-900 truncate">{company}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">NIP</span>
            <span className="text-sm font-medium text-gray-900">{nip}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Termin zwrotu</span>
            <span className="text-sm font-medium text-gray-900">
              {returnDate ? new Date(returnDate).toLocaleDateString('pl-PL') : 'Brak danych'}
            </span>
          </div>

          {drum.daysInPossession !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Dni w posiadaniu</span>
              <span className="text-sm font-medium text-gray-900">{drum.daysInPossession}</span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Lokalizacja</span>
            <div className="text-sm font-medium text-gray-900 text-right max-w-xs truncate">
              {drum.adres_dostawy ? (
                <div className="truncate" title={drum.adres_dostawy}>{drum.adres_dostawy}</div>
              ) : 'Brak informacji o adresie'}
            </div>
          </div>

          <div className="flex justify-between items-center mt-1">
            <span className="text-sm text-gray-500">Numer faktury</span>
            <span className="text-sm font-medium text-gray-900" title={drum.numer_faktury}>{drum.numer_faktury || 'Brak danych'}</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => navigate('/return', { state: { drum } })}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2 px-4 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <Truck className="w-4 h-4" />
            <span>Zgłoś zwrot</span>
          </button>
        </div>
      </div>
    );
  };

  if (loading && page === 1 && !drums.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Ładowanie bębnów...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Wystąpił błąd</h3>
          <p className="text-red-600 mb-6">{error}</p>
          <button
            onClick={fetchDrums}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  Moje bębny
                </h1>
                <p className="text-gray-600">Zarządzaj swoimi bębnami ({totalItems})</p>
              </div>
            </div>

            <button
              onClick={fetchDrums}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Odśwież</span>
            </button>
          </div>

          <div className="bg-white/80 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Szukaj po kodzie, nazwie, adresie lub nr faktury..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Wszystkie statusy</option>
                <option value="active">Aktywne</option>
                <option value="due-soon">Zbliża się termin</option>
                <option value="overdue">Przeterminowane</option>
              </select>

              <div className="flex gap-2">
                <button
                  onClick={() => handleSort('kod_bebna')}
                  className={`px-4 py-3 rounded-xl border transition-all duration-200 flex items-center space-x-2 ${sortBy === 'kod_bebna'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-blue-50'
                    }`}
                >
                  <span>Kod</span>
                  <ArrowUpDown className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleSort('data_zwrotu_do_dostawcy')}
                  className={`px-4 py-3 rounded-xl border transition-all duration-200 flex items-center space-x-2 ${sortBy === 'data_zwrotu_do_dostawcy'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-blue-50'
                    }`}
                >
                  <span>Termin</span>
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {drums.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
              {drums.map((drum, index) => (
                <DrumCard key={drum.kod_bebna || drum.KOD_BEBNA || index} drum={drum} index={index} />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-4 pb-8">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-300 bg-white disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-gray-600">
                  Strona {page} z {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-gray-300 bg-white disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Brak bębnów</h3>
            <p className="text-gray-600">Nie znaleziono bębnów spełniających kryteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DrumsList;