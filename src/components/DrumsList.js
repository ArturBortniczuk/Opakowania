// src/components/DrumsList.js - NAPRAWIONA WERSJA Z GRUPOWANIEM PO CESZE
import React, { useState, useMemo, useEffect } from 'react';
import { drumsAPI } from '../utils/supabaseApi';
import { 
  Package, 
  Search, 
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpDown,
  Truck,
  RefreshCw,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

const DrumsList = ({ user, onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('cecha'); // ZMIANA: sortuj po cesze domyślnie
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [userDrums, setUserDrums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(new Set()); // DODANE: stan rozwiniętych grup

  // Pobierz bębny użytkownika
  useEffect(() => {
    const fetchUserDrums = async () => {
      setLoading(true);
      setError(null);
      console.log(`🔄 Pobieranie bębnów dla klienta NIP: ${user.nip}`);
      
      try {
        const options = {
          page: 1,
          limit: 1000,
          sortBy: 'cecha', // ZMIANA: sortuj po cesze
          sortOrder: 'asc'
        };

        const result = await drumsAPI.getDrums(user.nip, options);
        console.log("✅ Odebrane dane z API:", result);
        
        const drums = result.data || result;
        
        if (!Array.isArray(drums)) {
          console.error("❌ API nie zwróciło tablicy!", drums);
          throw new Error("Otrzymano nieprawidłowe dane z serwera.");
        }
        
        console.log(`✅ Załadowano ${drums.length} bębnów dla klienta`);
        setUserDrums(drums);
        
        // DODANE: Rozwiń wszystkie grupy domyślnie
        const allGroups = new Set(drums.map(d => d.cecha || d.CECHA).filter(Boolean));
        setExpandedGroups(allGroups);
        
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
        sortBy: 'cecha',
        sortOrder: 'asc'
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

  // NOWE: Grupowanie bębnów po cesze
  const groupedDrums = useMemo(() => {
    // Najpierw filtruj
    let filtered = userDrums.filter(drum => {
      const matchesSearch = 
        (drum.kod_bebna?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (drum.nazwa?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (drum.cecha?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (drum.KOD_BEBNA?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (drum.NAZWA?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (drum.CECHA?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;
      
      if (filterStatus === 'all') return true;
      
      return drum.status === filterStatus;
    });

    // Grupuj po cesze
    const groups = {};
    filtered.forEach(drum => {
      const cecha = drum.cecha || drum.CECHA || 'Bez cechy';
      if (!groups[cecha]) {
        groups[cecha] = [];
      }
      groups[cecha].push(drum);
    });

    // Sortuj grupy alfabetycznie
    const sortedGroupNames = Object.keys(groups).sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.localeCompare(b);
      } else {
        return b.localeCompare(a);
      }
    });

    // Zwróć grupowane bębny
    return sortedGroupNames.map(cecha => ({
      cecha,
      drums: groups[cecha].sort((a, b) => {
        const aCode = a.kod_bebna || a.KOD_BEBNA;
        const bCode = b.kod_bebna || b.KOD_BEBNA;
        return sortOrder === 'asc' 
          ? aCode.localeCompare(bCode) 
          : bCode.localeCompare(aCode);
      })
    }));
  }, [userDrums, searchTerm, filterStatus, sortOrder]);

  // DODANE: Funkcje do rozwijania/zwijania grup
  const toggleGroup = (cecha) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cecha)) {
        newSet.delete(cecha);
      } else {
        newSet.add(cecha);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    const allGroups = new Set(groupedDrums.map(g => g.cecha));
    setExpandedGroups(allGroups);
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  // ZMIENIONE: Statystyki teraz uwzględniają też grupy
  const getStatistics = () => {
    const total = userDrums.length;
    const overdue = userDrums.filter(d => d.status === 'overdue').length;
    const dueSoon = userDrums.filter(d => d.status === 'due-soon').length;
    const active = userDrums.filter(d => d.status === 'active').length;
    const totalGroups = groupedDrums.length; // DODANE
    
    return { total, overdue, dueSoon, active, totalGroups };
  };

  const stats = getStatistics();

  // DODANE: Status grupy (czerwony jeśli są przeterminowane, żółty jeśli zbliża się termin)
  const getGroupStatus = (drums) => {
    const overdue = drums.filter(d => d.status === 'overdue').length;
    const dueSoon = drums.filter(d => d.status === 'due-soon').length;
    
    if (overdue > 0) return { text: 'Przeterminowane', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
    if (dueSoon > 0) return { text: 'Zbliża się termin', color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' };
    return { text: 'Aktywne', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
  };

  // ZACHOWANE: Twoja oryginalna karta bębna
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

  // NOWY: Komponent grupy
  const DrumGroup = ({ group }) => {
    const isExpanded = expandedGroups.has(group.cecha);
    const groupStatus = getGroupStatus(group.drums);
    
    return (
      <div className="mb-6">
        {/* Header grupy */}
        <div 
          className={`${groupStatus.bgColor} border ${groupStatus.borderColor} rounded-xl p-4 cursor-pointer hover:opacity-90 transition-opacity mb-4`}
          onClick={() => toggleGroup(group.cecha)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{group.cecha}</h3>
                <p className="text-sm text-gray-600">{group.drums.length} bębn{group.drums.length === 1 ? '' : 'ów'}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${groupStatus.color} bg-white`}>
                {groupStatus.text}
              </div>
              {isExpanded ? (
                <ChevronDown className="w-6 h-6 text-gray-600" />
              ) : (
                <ChevronRight className="w-6 h-6 text-gray-600" />
              )}
            </div>
          </div>
        </div>

        {/* Lista kart bębnów */}
        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {group.drums.map((drum, index) => (
              <DrumCard key={drum.kod_bebna || drum.KOD_BEBNA || index} drum={drum} index={index} />
            ))}
          </div>
        )}
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
                <p className="text-gray-600">Pogrupowane według cechy bębna</p>
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

          {/* Stats - DODANE: Rodzaje */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white/80 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.totalGroups}</div>
                  <div className="text-sm text-gray-600">Rodzaje</div>
                </div>
                <Package className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                  <div className="text-sm text-gray-600">Wszystkie</div>
                </div>
                <Package className="w-8 h-8 text-gray-600" />
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
                  <div className="text-sm text-gray-600">Zbliża się</div>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-red-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
                  <div className="text-sm text-gray-600">Przetermn.</div>
                </div>
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>

          {/* Filters - DODANE: Przyciski rozwiń/zwiń */}
          <div className="bg-white/80 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Szukaj po kodzie, nazwie lub cesze..."
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
                  onClick={expandAll}
                  className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200"
                >
                  Rozwiń wszystkie
                </button>
                
                <button
                  onClick={collapseAll}
                  className="px-4 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all duration-200"
                >
                  Zwiń wszystkie
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results - ZMIENIONE: Używamy grup zamiast płaskiej listy */}
        {groupedDrums.length > 0 ? (
          <div className="pb-8">
            {groupedDrums.map((group) => (
              <DrumGroup key={group.cecha} group={group} />
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