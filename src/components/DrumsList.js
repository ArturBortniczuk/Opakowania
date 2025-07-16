// src/components/DrumsList.js - Wersja do debugowania
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
  ExternalLink,
  Truck,
  RefreshCw
} from 'lucide-react';

const DrumsList = ({ user, onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('KOD_BEBNA');
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
      console.log(`Pobieranie bębnów dla NIP: ${user.nip}`);
      
      try {
        // --- ZMIANA DO DEBUGOWANIA ---
        // Pobieramy WSZYSTKIE bębny, ignorując NIP, aby sprawdzić połączenie i renderowanie
        const drums = await drumsAPI.getDrums(user.nip); 
        console.log("Odebrane bębny z API:", drums); // Sprawdź w konsoli przeglądarki, co tu przychodzi
        if (!Array.isArray(drums)) {
          console.error("API nie zwróciło tablicy!", drums);
          throw new Error("Otrzymano nieprawidłowe dane z serwera.");
        }
        setUserDrums(drums);
      } catch (err) {
        console.error('Błąd podczas pobierania bębnów:', err);
        setError('Nie udało się pobrać listy bębnów. Spróbuj ponownie.');
      } finally {
        setLoading(false);
      }
    };

    if (user?.nip) {
      fetchUserDrums();
    }
  }, [user?.nip]);

  const filteredAndSortedDrums = useMemo(() => {
    let filtered = userDrums.filter(drum => {
      const matchesSearch = (drum.KOD_BEBNA?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                           (drum.NAZWA?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;
      
      if (filterStatus === 'all') return true;
      
      if (drum.status === filterStatus) return true;
      
      return false;
    });

    return filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'DATA_ZWROTU_DO_DOSTAWCY') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [userDrums, searchTerm, sortBy, sortOrder, filterStatus]);

  const getStatusInfo = (drum) => {
    const now = new Date();
    const returnDate = new Date(drum.DATA_ZWROTU_DO_DOSTAWCY);
    const isOverdue = returnDate < now;
    const isDueSoon = returnDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) && returnDate >= now;
    
    if (isOverdue) {
      return {
        icon: AlertCircle,
        text: 'Przekroczony termin',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-200'
      };
    } else if (isDueSoon) {
      return {
        icon: Clock,
        text: 'Zbliża się termin',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        borderColor: 'border-yellow-200'
      };
    } else {
      return {
        icon: CheckCircle,
        text: 'Aktywny',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        borderColor: 'border-green-200'
      };
    }
  };

  const getStatistics = () => {
    const total = userDrums.length;
    const overdue = userDrums.filter(drum => getStatusInfo(drum).status === 'overdue').length;
    const dueSoon = userDrums.filter(drum => getStatusInfo(drum).status === 'due-soon').length;
    const active = total - overdue - dueSoon;
    
    return { total, overdue, dueSoon, active };
  };

  const stats = getStatistics();

  const DrumCard = ({ drum, index }) => {
    const status = getStatusInfo(drum);
    const StatusIcon = status.icon;
    
    return (
      <div 
        className={`
          bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border transition-all duration-300 
          hover:shadow-xl transform hover:scale-[1.02] ${status.borderColor}
        `}
        style={{ animationDelay: `${index * 100}ms` }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{drum.KOD_BEBNA}</h3>
              <p className="text-sm text-gray-600">{drum.NAZWA}</p>
            </div>
          </div>
          
          <div className={`px-3 py-1 rounded-full ${status.bgColor} flex items-center space-x-1`}>
            <StatusIcon className={`w-4 h-4 ${status.color}`} />
            <span className={`text-xs font-medium ${status.color}`}>{status.text}</span>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Cecha:</span>
            <span className="font-medium text-gray-900">{drum.CECHA}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Data przyjęcia:</span>
            <span className="font-medium text-gray-900">
              {drum.DATA_WYDANIA ? new Date(drum.DATA_WYDANIA).toLocaleDateString('pl-PL') : 'Brak daty'}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Termin zwrotu:</span>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className={`font-medium ${status.color}`}>
                {new Date(drum.DATA_ZWROTU_DO_DOSTAWCY).toLocaleDateString('pl-PL')}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Dokument:</span>
            <span className="font-medium text-gray-900">{drum.NR_DOKUMENTUPZ}</span>
          </div>
        </div>

        <button
          onClick={() => onNavigate('return', { drum })}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
        >
          <Truck className="w-4 h-4" />
          <span>Zgłoś zwrot</span>
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    );
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleRefresh = () => {
    // Odśwież dane
    setLoading(true);
    setError(null);
    
    drumsAPI.getDrums(user.nip)
      .then(drums => {
        setUserDrums(drums);
        setLoading(false);
      })
      .catch(err => {
        console.error('Błąd podczas odświeżania:', err);
        setError('Nie udało się odświeżyć danych.');
        setLoading(false);
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
            <div className="text-red-600 mb-4">{error}</div>
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
                  Twoje bębny
                </h1>
                <p className="text-gray-600">Zarządzaj swoimi bębnami i planuj zwroty</p>
              </div>
            </div>
            
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Odśwież</span>
            </button>
          </div>

          {/* Filters and Search */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-blue-100 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Szukaj po kodzie lub nazwie bębna..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                />
              </div>

              {/* Filter */}
              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="appearance-none bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="all">Wszystkie</option>
                  <option value="active">Aktywne</option>
                  <option value="due-soon">Zbliża się termin</option>
                  <option value="overdue">Przekroczony termin</option>
                </select>
                <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Sort */}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleSort('KOD_BEBNA')}
                  className={`px-4 py-3 rounded-xl border transition-all duration-200 flex items-center space-x-2 ${
                    sortBy === 'KOD_BEBNA' 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-blue-50'
                  }`}
                >
                  <span>Kod</span>
                  <ArrowUpDown className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => handleSort('DATA_ZWROTU_DO_DOSTAWCY')}
                  className={`px-4 py-3 rounded-xl border transition-all duration-200 flex items-center space-x-2 ${
                    sortBy === 'DATA_ZWROTU_DO_DOSTAWCY' 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-blue-50'
                  }`}
                >
                  <span>Data</span>
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/80 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-blue-100 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Wszystkie bębny</div>
            </div>
            <div className="bg-white/80 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-green-100 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <div className="text-sm text-gray-600">Aktywne</div>
            </div>
            <div className="bg-white/80 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-yellow-100 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.dueSoon}</div>
              <div className="text-sm text-gray-600">Zbliża się termin</div>
            </div>
            <div className="bg-white/80 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-red-100 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
              <div className="text-sm text-gray-600">Przekroczony termin</div>
            </div>
          </div>
        </div>

        {/* Drums Grid */}
        {filteredAndSortedDrums.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
            {filteredAndSortedDrums.map((drum, index) => (
              <DrumCard key={drum.KOD_BEBNA} drum={drum} index={index} />
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
