// src/components/DrumsList.js - NAPRAWIONA WERSJA
import React, { useState, useMemo, useEffect } from 'react';
import { drumsAPI } from '../utils/supabaseApi';
import { 
  Package, 
  Calendar, 
  Search, 
  Filter, 
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpDown,
  Truck,
  RefreshCw
} from 'lucide-react';

const DrumsList = ({ user, onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('kod_bebna');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [userDrums, setUserDrums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pobierz bębny użytkownika
  useEffect(() => {
    const fetchUserDrums = async () => {
      setLoading(true);
      setError(null);
      console.log(`🔄 Pobieranie bębnów dla klienta NIP: ${user.nip}`);
      
      try {
        // NAPRAWIONE: Przekazujemy poprawne opcje jako drugi parametr
        const options = {
          page: 1,
          limit: 1000, // Klient dostaje wszystkie swoje bębny
          sortBy: 'kod_bebna',
          sortOrder: 'asc'
        };

        const result = await drumsAPI.getDrums(user.nip, options);
        console.log("✅ Odebrane dane z API:", result);
        
        // Sprawdź czy otrzymaliśmy obiekt z paginacją czy tablicę
        const drums = result.data || result;
        
        if (!Array.isArray(drums)) {
          console.error("❌ API nie zwróciło tablicy!", drums);
          throw new Error("Otrzymano nieprawidłowe dane z serwera.");
        }
        
        console.log(`✅ Załadowano ${drums.length} bębnów dla klienta`);
        setUserDrums(drums);
        
        if (drums.length === 0) {
          console.warn("⚠️ Brak bębnów dla tego klienta");
        }
      } catch (err) {
        console.error('❌ Błąd podczas pobierania bębnów:', err);
        setError('Nie udało się pobrać listy bębnów. ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user?.nip) {
      fetchUserDrums();
    } else {
      setLoading(false);
      setError('Brak danych użytkownika');
    }
  }, [user?.nip]);

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const options = {
        page: 1,
        limit: 1000,
        sortBy,
        sortOrder
      };

      const result = await drumsAPI.getDrums(user.nip, options);
      const drums = result.data || result;
      
      if (!Array.isArray(drums)) {
        throw new Error("Otrzymano nieprawidłowe dane z serwera.");
      }
      
      setUserDrums(drums);
    } catch (err) {
      console.error('❌ Błąd odświeżania:', err);
      setError('Nie udało się odświeżyć listy. ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedDrums = useMemo(() => {
    let filtered = userDrums.filter(drum => {
      const matchesSearch = (drum.kod_bebna?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                           (drum.nazwa?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                           (drum.KOD_BEBNA?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                           (drum.NAZWA?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;
      
      if (filterStatus === 'all') return true;
      
      return drum.status === filterStatus;
    });

    return filtered.sort((a, b) => {
      let aValue = a[sortBy] || a[sortBy.toUpperCase()];
      let bValue = b[sortBy] || b[sortBy.toUpperCase()];
      
      if (sortBy === 'data_zwrotu_do_dostawcy' || sortBy === 'DATA_ZWROTU_DO_DOSTAWCY') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [userDrums, searchTerm, filterStatus, sortBy, sortOrder]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getStatistics = () => {
    const total = filteredAndSortedDrums.length;
    const overdue = filteredAndSortedDrums.filter(d => d.status === 'overdue').length;
    const dueSoon = filteredAndSortedDrums.filter(d => d.status === 'due-soon').length;
    const active = filteredAndSortedDrums.filter(d => d.status === 'active').length;
    
    return { total, overdue, dueSoon, active };
  };

  const stats = getStatistics();

  const DrumCard = ({ drum, index }) => {
    const kodBebna = drum.kod_bebna || drum.KOD_BEBNA;
    const nazwa = drum.nazwa || drum.NAZWA;
    const returnDate = drum.data_zwrotu_do_dostawcy || drum.DATA_ZWROTU_DO_DOSTAWCY;
    const company = drum.company || drum.pelna_nazwa_kontrahenta || drum.PELNA_NAZWA_KONTRAHENTA;
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
              <h3 className="font-bold text-gray-900 text-lg">{kodBebna}</h3>
              <p className="text-gray-600 text-sm">{nazwa}</p>
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
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => onNavigate('return', { drum })}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2 px-4 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <Truck className="w-4 h-4" />
            <span>Zgłoś zwrot</span>
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Ładowanie bębnów...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-12 h-12 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Wystąpił błąd</h3>
            <p className="text-red-600 mb-6">{error}</p>
            <button 
              onClick={handleRefresh}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Spróbuj ponownie</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
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
                <p className="text-gray-600">Zarządzaj swoimi bębnami i terminami zwrotów</p>
              </div>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Odśwież</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/80 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                  <div className="text-sm text-gray-600">Wszystkie bębny</div>
                </div>
                <Package className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                  <div className="text-sm text-gray-600">Aktywne</div>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-yellow-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{stats.dueSoon}</div>
                  <div className="text-sm text-gray-600">Zbliża się termin</div>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-red-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
                  <div className="text-sm text-gray-600">Przeterminowane</div>
                </div>
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white/80 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Szukaj po kodzie lub nazwie bębna..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleSort('kod_bebna')}
                  className={`px-4 py-3 rounded-xl border transition-all duration-200 flex items-center space-x-2 ${
                    sortBy === 'kod_bebna' 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-blue-50'
                  }`}
                >
                  <span>Kod</span>
                  <ArrowUpDown className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => handleSort('data_zwrotu_do_dostawcy')}
                  className={`px-4 py-3 rounded-xl border transition-all duration-200 flex items-center space-x-2 ${
                    sortBy === 'data_zwrotu_do_dostawcy' 
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

        {/* Results */}
        {filteredAndSortedDrums.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
            {filteredAndSortedDrums.map((drum, index) => (
              <DrumCard key={drum.kod_bebna || drum.KOD_BEBNA || index} drum={drum} index={index} />
            ))}
          </div>
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
      </div>
    </div>
  );
};

export default DrumsList;