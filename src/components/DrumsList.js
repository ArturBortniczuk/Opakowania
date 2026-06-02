// src/components/DrumsList.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { drumsAPI, returnsAPI } from '../utils/supabaseApi';
import {
  Package, Calendar, Search, Filter, AlertCircle, CheckCircle, Clock,
  ArrowUpDown, Truck, RefreshCw, ChevronLeft, ChevronRight, ChevronDown
} from 'lucide-react';

const DrumsList = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('data_zwrotu_do_dostawcy');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterStatus, setFilterStatus] = useState(() => {
    const initial = (location.state && location.state.filterStatus) || [];
    return Array.isArray(initial) ? initial : (initial === 'all' ? [] : [initial]);
  });
  const [filterSize, setFilterSize] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // Dropdown States
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef(null);

  const [isSizeDropdownOpen, setIsSizeDropdownOpen] = useState(false);
  const sizeDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setIsStatusDropdownOpen(false);
      }
      if (sizeDropdownRef.current && !sizeDropdownRef.current.contains(event.target)) {
        setIsSizeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStatusToggle = (value) => {
    setFilterStatus(prev => {
      const newStatus = prev.includes(value) 
        ? prev.filter(s => s !== value)
        : [...prev, value];
      setPage(1);
      return newStatus;
    });
  };

  const handleSizeToggle = (value) => {
    setFilterSize(prev => {
      const newSize = prev.includes(value) 
        ? prev.filter(s => s !== value)
        : [...prev, value];
      setPage(1);
      return newSize;
    });
  };

  const statusOptions = [
    { value: 'active', label: 'Aktywne' },
    { value: 'due-soon', label: 'Zbliża się termin' },
    { value: 'overdue', label: 'Przeterminowane' },
    { value: 'reported', label: 'Zgłoszone do zwrotu' },
    { value: 'Zagubiony', label: 'Zagubione' },
    { value: 'Zatrzymany', label: 'Zatrzymane' }
  ];

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

  useEffect(() => {
    if (location.state && location.state.filterStatus) {
      // Wyczyść stan historii, aby odświeżenie strony nie blokowało filtra
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  const fetchDrums = async () => {
    if (!user?.nip) return;

    if (isFirstLoad) {
      setLoading(true);
    }
    setError(null);

    try {
      // W wersji dla klienta pobieramy wszystko i filtrujemy w pamięci,
      // aby poprawnie uwzględnić niestandardowe terminy i statusy klienta.
      const [allDrums, returns] = await Promise.all([
        drumsAPI.getAllDrums(user.nip),
        returnsAPI.getReturns(user.nip)
      ]);

      // Zbieramy cechy bębnów, które są już w aktywnych zgłoszeniach zwrotu
      const reportedDrums = new Set();
      if (Array.isArray(returns)) {
        returns.forEach(req => {
          if (req.status !== 'Rejected' && req.status !== 'Cancelled') {
            if (Array.isArray(req.selected_drums)) {
              req.selected_drums.forEach(d => reportedDrums.add(d.cecha));
            }
          }
        });
      }

      // Aktualizujemy statusy bębnów zgłoszonych
      let mappedDrums = allDrums.map(d => {
        if (reportedDrums.has(d.cecha)) {
          return {
            ...d,
            isReported: true,
            status: 'reported',
            text: 'Zgłoszony do zwrotu',
            color: 'bg-orange-100 text-orange-700',
            borderColor: 'border-orange-200'
          };
        }
        return d;
      });

      // Wyciągamy unikalne rozmiary
      const sizes = [...new Set(allDrums.map(d => d.rozmiar_bebna).filter(Boolean))].sort();
      setAvailableSizes(sizes);

      // 1. Filtrowanie (Search) - WYRZUCONO kod_bebna i cecha
      let filtered = mappedDrums;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(d => 
          (d.nazwa || '').toLowerCase().includes(term) ||
          (d.adres_dostawy || '').toLowerCase().includes(term) ||
          (d.numer_faktury || '').toLowerCase().includes(term) ||
          (d.rozmiar_bebna || '').toLowerCase().includes(term)
        );
      }

      // 2. Filtrowanie (Status)
      if (filterStatus.length > 0) {
        filtered = filtered.filter(d => filterStatus.includes(d.status));
      }

      // 2b. Filtrowanie po Rozmiarze
      if (filterSize.length > 0) {
        filtered = filtered.filter(d => filterSize.includes(d.rozmiar_bebna));
      }

      // 3. Sortowanie
      filtered.sort((a, b) => {
        let valA, valB;
        if (sortBy === 'kod_bebna') {
          valA = a.kod_bebna || a.cecha || '';
          valB = b.kod_bebna || b.cecha || '';
        } else if (
          sortBy === 'DATA_ZWROTU_DO_DOSTAWCY' ||
          sortBy === 'termin' ||
          sortBy === 'data_zwrotu_do_dostawcy'
        ) {
          // Sortujemy po wyznaczonej dacie zwrotu (Termin zwrotu)
          valA = a.clientReturnDeadline || a.data_zwrotu_do_dostawcy || '';
          valB = b.clientReturnDeadline || b.data_zwrotu_do_dostawcy || '';
        } else {
          valA = a[sortBy] || '';
          valB = b[sortBy] || '';
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      // Zapisujemy statystyki
      setStats({
        total: mappedDrums.length,
        active: mappedDrums.filter(d => d.status === 'active').length,
        dueSoon: mappedDrums.filter(d => d.status === 'due-soon').length,
        overdue: mappedDrums.filter(d => d.status === 'overdue').length,
        reported: mappedDrums.filter(d => d.status === 'reported').length
      });

      setTotalItems(filtered.length);
      setTotalPages(Math.ceil(filtered.length / LIMIT) || 1);

      // 4. Paginacja w pamięci
      const startIndex = (page - 1) * LIMIT;
      const paginatedDrums = filtered.slice(startIndex, startIndex + LIMIT);

      setDrums(paginatedDrums);

    } catch (err) {
      console.error('Błąd pobierania bębnów:', err);
      setError('Nie udało się pobrać listy bębnów.');
    } finally {
      setLoading(false);
      setIsFirstLoad(false);
    }
  };

  useEffect(() => {
    fetchDrums();
  }, [user?.nip, page, sortBy, sortOrder, filterStatus, filterSize]); // Debounce search term ideally

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
    const returnDate = drum.clientReturnDeadline || drum.data_zwrotu_do_dostawcy;
    const company = drum.company || drum.pelna_nazwa_kontrahenta;
    const nip = drum.nip || drum.NIP;

    // Przeliczenie ceny netto + 20% marży dla klienta
    const priceRaw = parseFloat(drum.cena_netto_bebna || drum.CENA_NETTO_BEBNA);
    const clientPrice = !isNaN(priceRaw) ? priceRaw * 1.2 : null;

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
              {drum.rozmiar_bebna && (
                <p className="text-gray-600 text-sm">Rozmiar bębna: {drum.rozmiar_bebna}</p>
              )}
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${drum.color || 'bg-gray-100 text-gray-600'}`}>
            {drum.text || drum.status || 'Aktywny'}
          </div>
        </div>

        <div className="space-y-3">
          {clientPrice !== null && (
            <div className="space-y-2 mb-2">
              <div className="flex justify-between items-center bg-blue-50/50 p-2.5 rounded-xl border border-blue-100/50">
                <span className="text-sm font-semibold text-blue-800">Wartość bębna</span>
                <span className="text-sm font-extrabold text-blue-950">
                  {clientPrice.toFixed(2)} PLN
                </span>
              </div>
              {(() => {
                const days = drum.daysInPossession;
                let returnPercentage = 100;
                if (days === undefined || isNaN(days) || days <= 120) returnPercentage = 100;
                else if (days <= 150) returnPercentage = 90;
                else if (days <= 180) returnPercentage = 75;
                else if (days <= 240) returnPercentage = 50;
                else if (days <= 340) returnPercentage = 25;
                else returnPercentage = 0;

                const returnValue = clientPrice * (returnPercentage / 100);

                return (
                  <div className="flex justify-between items-center bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100/50 animate-fade-in">
                    <span className="text-sm font-semibold text-emerald-850">Wartość przy zwrocie</span>
                    <span className="text-sm font-extrabold text-emerald-950">
                      {returnPercentage === 0 ? (
                        <span className="text-red-600 font-bold">0.00 PLN (Brak zwrotu)</span>
                      ) : (
                        <span>{returnValue.toFixed(2)} PLN ({returnPercentage}%)</span>
                      )}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Termin zwrotu</span>
            <span className="text-sm font-medium text-gray-900 flex items-center space-x-1">
              {returnDate ? (
                <>
                  <span className={drum.isExtended ? "text-indigo-600 font-semibold" : ""}>
                    {new Date(returnDate).toLocaleDateString('pl-PL')}
                  </span>
                  {drum.isExtended && (
                    <span 
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 cursor-help"
                      title={drum.extensionNotes || "Indywidualny termin zwrotu uzgodniony z działem logistyki"}
                    >
                      Uzgodniony termin
                    </span>
                  )}
                </>
              ) : (
                'Brak danych'
              )}
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


      </div>
    );
  };

  if (loading && isFirstLoad) {
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
        <div className="mb-8 relative z-50">
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

            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/return')}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center space-x-2 shadow-md hover:shadow-lg font-semibold"
              >
                <Truck className="w-4 h-4" />
                <span>Zgłoś zwrot</span>
              </button>

              <button
                onClick={fetchDrums}
                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 flex items-center space-x-2 shadow-sm font-semibold"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Odśwież</span>
              </button>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-gray-200 relative z-20">
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

              <div className="relative min-w-[200px]" ref={statusDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                  className="w-full p-3 border border-gray-300 rounded-xl bg-white flex justify-between items-center focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm h-[46px]"
                >
                  <span className="truncate mr-2">
                    {filterStatus.length === 0 
                      ? 'Wszystkie statusy' 
                      : `Wybrano: ${filterStatus.length} status(y)`}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>

                {isStatusDropdownOpen && (
                  <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-72 overflow-auto">
                    {statusOptions.map(option => (
                      <label 
                        key={option.value} 
                        className="flex items-center px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={filterStatus.includes(option.value)}
                          onChange={() => handleStatusToggle(option.value)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="ml-3 text-sm text-gray-700">{option.label}</span>
                      </label>
                    ))}
                    {filterStatus.length > 0 && (
                      <div className="border-t border-gray-100 p-2">
                        <button
                          type="button"
                          onClick={() => { setFilterStatus([]); setPage(1); setIsStatusDropdownOpen(false); }}
                          className="w-full text-center text-sm font-medium text-gray-500 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          Wyczyść filtry
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="relative min-w-[200px]" ref={sizeDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsSizeDropdownOpen(!isSizeDropdownOpen)}
                  className="w-full p-3 border border-gray-300 rounded-xl bg-white flex justify-between items-center focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm h-[46px]"
                >
                  <span className="truncate mr-2">
                    {filterSize.length === 0 
                      ? 'Wszystkie rozmiary' 
                      : `Wybrano: ${filterSize.length} rozmiar(y)`}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>

                {isSizeDropdownOpen && (
                  <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-72 overflow-auto">
                    {availableSizes.map(sz => (
                      <label 
                        key={sz} 
                        className="flex items-center px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={filterSize.includes(sz)}
                          onChange={() => handleSizeToggle(sz)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="ml-3 text-sm text-gray-700">{sz}</span>
                      </label>
                    ))}
                    {filterSize.length > 0 && (
                      <div className="border-t border-gray-100 p-2">
                        <button
                          type="button"
                          onClick={() => { setFilterSize([]); setPage(1); setIsSizeDropdownOpen(false); }}
                          className="w-full text-center text-sm font-medium text-gray-500 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          Wyczyść filtry
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
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
                <DrumCard key={drum.id || drum.cecha || index} drum={drum} index={index} />
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