// src/components/AdminDrumsList.js
import React, { useState, useMemo } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { mockDrumsData, mockCompanies } from '../data/mockData';
import { enrichDrumsWithCalculatedDates } from '../data/additionalData';

const AdminDrumsList = ({ onNavigate, initialFilter = {} }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('KOD_BEBNA');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterStatus, setFilterStatus] = useState((initialFilter && initialFilter.clientNip) ? 'client' : 'all');
  const [filterClient, setFilterClient] = useState((initialFilter && initialFilter.clientNip) || '');
  const [filterDateRange, setFilterDateRange] = useState('all');
  const [selectedDrum, setSelectedDrum] = useState(null);
  const [showDrumDetails, setShowDrumDetails] = useState(false);

  const enrichedDrums = useMemo(() => {
    return mockDrumsData.map(drum => {
      const company = mockCompanies.find(c => c.nip === drum.NIP);
      const now = new Date();
      const returnDate = new Date(drum.DATA_ZWROTU_DO_DOSTAWCY);
      
      // Poprawka: używamy DATA_WYDANIA zamiast Data przyjęcia na stan
      const issueDate = drum.DATA_WYDANIA && drum.DATA_WYDANIA !== ' ' 
        ? new Date(drum.DATA_WYDANIA) 
        : new Date(drum['Data przyjęcia na stan']);
      
      const daysDiff = Math.ceil((returnDate - now) / (1000 * 60 * 60 * 24));
      
      let status = 'active';
      let statusColor = 'text-green-600';
      let statusBg = 'bg-green-100';
      let statusBorder = 'border-green-200';
      let statusText = 'Aktywny';
      
      if (daysDiff < 0) {
        status = 'overdue';
        statusColor = 'text-red-600';
        statusBg = 'bg-red-100';
        statusBorder = 'border-red-200';
        statusText = `Przeterminowany`;
        // Dodatkowe info w osobnej linii dla długich tekstów
      } else if (daysDiff <= 7) {
        status = 'due-soon';
        statusColor = 'text-yellow-600';
        statusBg = 'bg-yellow-100';
        statusBorder = 'border-yellow-200';
        statusText = `Za ${daysDiff} dni`;
      }
      
      return {
        ...drum,
        company: company?.name || 'Nieznana firma',
        companyPhone: company?.phone || '',
        companyEmail: company?.email || '',
        companyAddress: company?.address || '',
        status,
        statusColor,
        statusBg,
        statusBorder,
        statusText,
        daysDiff,
        daysInPossession: Math.ceil((now - issueDate) / (1000 * 60 * 60 * 24)),
        overdueDays: daysDiff < 0 ? Math.abs(daysDiff) : 0
      };
    });
  }, []);

  const filteredAndSortedDrums = useMemo(() => {
    let filtered = enrichedDrums.filter(drum => {
      const matchesSearch = drum.KOD_BEBNA.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           drum.NAZWA.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           drum.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           drum.NIP.includes(searchTerm);
      
      if (!matchesSearch) return false;
      
      // Filter by client
      if (filterClient && drum.NIP !== filterClient) return false;
      
      // Filter by status
      if (filterStatus === 'overdue' && drum.status !== 'overdue') return false;
      if (filterStatus === 'due-soon' && drum.status !== 'due-soon') return false;
      if (filterStatus === 'active' && drum.status !== 'active') return false;
      
      // Filter by date range
      if (filterDateRange === 'this-week') {
        const weekFromNow = new Date();
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        const returnDate = new Date(drum.DATA_ZWROTU_DO_DOSTAWCY);
        if (returnDate > weekFromNow) return false;
      } else if (filterDateRange === 'this-month') {
        const monthFromNow = new Date();
        monthFromNow.setMonth(monthFromNow.getMonth() + 1);
        const returnDate = new Date(drum.DATA_ZWROTU_DO_DOSTAWCY);
        if (returnDate > monthFromNow) return false;
      } else if (filterDateRange === 'overdue') {
        if (drum.status !== 'overdue') return false;
      }
      
      return true;
    });

    return filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'DATA_ZWROTU_DO_DOSTAWCY' || sortBy === 'Data przyjęcia na stan') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (sortBy === 'daysDiff' || sortBy === 'daysInPossession') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [enrichedDrums, searchTerm, sortBy, sortOrder, filterStatus, filterClient, filterDateRange]);

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

  const getStatistics = () => {
    const total = enrichedDrums.length;
    const overdue = enrichedDrums.filter(d => d.status === 'overdue').length;
    const dueSoon = enrichedDrums.filter(d => d.status === 'due-soon').length;
    const active = enrichedDrums.filter(d => d.status === 'active').length;
    
    return { total, overdue, dueSoon, active };
  };

  const stats = getStatistics();

  const DrumCard = ({ drum, index }) => (
    <div 
      className={`bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border transition-all duration-300 hover:shadow-xl transform hover:scale-[1.02] h-full flex flex-col ${drum.statusBorder}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-gray-900 truncate">{drum.KOD_BEBNA}</h3>
            <p className="text-sm text-gray-600 line-clamp-2 leading-tight">{drum.NAZWA}</p>
            <p className="text-xs text-gray-500 truncate">{drum.CECHA}</p>
          </div>
        </div>
        
        {/* Kompaktowy status - tylko ikona + liczba */}
        <div className="flex-shrink-0 ml-2 flex flex-col items-center">
          {drum.status === 'overdue' && (
            <>
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-xs font-bold text-red-600 mt-1">-{drum.overdueDays}d</span>
            </>
          )}
          {drum.status === 'due-soon' && (
            <>
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="text-xs font-bold text-yellow-600 mt-1">{drum.daysDiff}d</span>
            </>
          )}
          {drum.status === 'active' && (
            <>
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-xs font-medium text-green-600 mt-1">OK</span>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Firma:</span>
          <span className="font-medium text-gray-900 truncate ml-2">{drum.company}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">NIP:</span>
          <span className="font-medium text-gray-900">{drum.NIP}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Data wydania:</span>
          <span className="font-medium text-gray-900">
            {drum.DATA_WYDANIA && drum.DATA_WYDANIA !== ' ' 
              ? new Date(drum.DATA_WYDANIA).toLocaleDateString('pl-PL')
              : new Date(drum['Data przyjęcia na stan']).toLocaleDateString('pl-PL')
            }
          </span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Termin zwrotu:</span>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className={`font-medium ${drum.statusColor}`}>
              {new Date(drum.DATA_ZWROTU_DO_DOSTAWCY).toLocaleDateString('pl-PL')}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Dokument:</span>
          <span className="font-medium text-gray-900 truncate ml-2">{drum.NR_DOKUMENTUPZ}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Dostawca:</span>
          <span className="font-medium text-gray-900 truncate ml-2">{drum.KON_DOSTAWCA}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">W posiadaniu:</span>
          <span className="font-medium text-gray-900">{drum.daysInPossession} dni</span>
        </div>
      </div>

      <div className="flex space-x-2 mt-auto">
        <button
          onClick={() => handleViewDrum(drum)}
          className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2 px-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
        >
          <Eye className="w-4 h-4" />
          <span>Szczegóły</span>
        </button>
        
        <button
          onClick={() => onNavigate('admin-clients')}
          className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 px-3 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
        >
          <Building2 className="w-4 h-4" />
          <span>Klient</span>
        </button>
        
        {drum.status === 'overdue' && (
          <button
            onClick={() => onNavigate('admin-returns')}
            className="bg-red-600 text-white py-2 px-3 rounded-xl font-medium hover:bg-red-700 transition-all duration-200 flex items-center justify-center text-sm"
          >
            <Truck className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  const DrumDetailsModal = () => {
    if (!showDrumDetails || !selectedDrum) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Szczegóły bębna {selectedDrum.KOD_BEBNA}</h2>
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
                    <p className="text-gray-900 font-medium">{selectedDrum.KOD_BEBNA}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nazwa</label>
                    <p className="text-gray-900">{selectedDrum.NAZWA}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Cecha</label>
                    <p className="text-gray-900">{selectedDrum.CECHA}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded ${selectedDrum.statusBg} ${selectedDrum.statusBorder} border`}>
                      {selectedDrum.status === 'overdue' && <AlertCircle className={`w-4 h-4 ${selectedDrum.statusColor}`} />}
                      {selectedDrum.status === 'due-soon' && <Clock className={`w-4 h-4 ${selectedDrum.statusColor}`} />}
                      {selectedDrum.status === 'active' && <CheckCircle className={`w-4 h-4 ${selectedDrum.statusColor}`} />}
                      <span className={`text-sm font-medium ${selectedDrum.statusColor}`}>
                        {selectedDrum.statusText}
                        {selectedDrum.status === 'overdue' && ` (${selectedDrum.overdueDays} dni)`}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Dostawca</label>
                    <p className="text-gray-900">{selectedDrum.KON_DOSTAWCA}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Typ dokumentu</label>
                    <p className="text-gray-900">{selectedDrum.TYP_DOK}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Numer dokumentu</label>
                    <p className="text-gray-900">{selectedDrum.NR_DOKUMENTUPZ}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Informacje o kliencie</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nazwa firmy</label>
                    <p className="text-gray-900">{selectedDrum.company}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">NIP</label>
                    <p className="text-gray-900">{selectedDrum.NIP}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Kontrahent</label>
                    <p className="text-gray-900">{selectedDrum.KONTRAHENT}</p>
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
                  {selectedDrum.companyAddress && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Adres</label>
                      <p className="text-gray-900">{selectedDrum.companyAddress}</p>
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
                    {selectedDrum.DATA_WYDANIA && selectedDrum.DATA_WYDANIA !== ' ' 
                      ? new Date(selectedDrum.DATA_WYDANIA).toLocaleDateString('pl-PL')
                      : new Date(selectedDrum['Data przyjęcia na stan']).toLocaleDateString('pl-PL')
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Termin zwrotu do dostawcy</span>
                  <span className={`font-medium ${selectedDrum.statusColor}`}>
                    {new Date(selectedDrum.DATA_ZWROTU_DO_DOSTAWCY).toLocaleDateString('pl-PL')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Dni w posiadaniu</span>
                  <span className="font-medium">{selectedDrum.daysInPossession} dni</span>
                </div>
                {selectedDrum.daysDiff < 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dni przeterminowania</span>
                    <span className="font-medium text-red-600">{Math.abs(selectedDrum.daysDiff)} dni</span>
                  </div>
                )}
                {selectedDrum.daysDiff > 0 && selectedDrum.daysDiff <= 7 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dni do zwrotu</span>
                    <span className="font-medium text-yellow-600">{selectedDrum.daysDiff} dni</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowDrumDetails(false);
                  onNavigate('admin-clients');
                }}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-xl font-medium hover:bg-blue-700 transition-colors duration-200"
              >
                Zobacz klienta
              </button>
              <button
                onClick={() => {
                  setShowDrumDetails(false);
                  onNavigate('admin-returns');
                }}
                className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-xl font-medium hover:bg-gray-700 transition-colors duration-200"
              >
                Zgłoś zwrot
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pt-6 lg:ml-80 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-800 bg-clip-text text-transparent">
                  Wszystkie bębny
                </h1>
                <p className="text-gray-600">Monitoruj i zarządzaj wszystkimi bębnami w systemie</p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2">
                <RefreshCw className="w-4 h-4" />
                <span>Odśwież</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-blue-100 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Szukaj bębnów..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                />
              </div>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
              >
                <option value="all">Wszystkie statusy</option>
                <option value="active">Aktywne</option>
                <option value="due-soon">Zbliża się termin</option>
                <option value="overdue">Przeterminowane</option>
              </select>

              {/* Client Filter */}
              <select
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
              >
                <option value="">Wszyscy klienci</option>
                {mockCompanies.map(company => (
                  <option key={company.nip} value={company.nip}>{company.name}</option>
                ))}
              </select>

              {/* Date Range Filter */}
              <select
                value={filterDateRange}
                onChange={(e) => setFilterDateRange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
              >
                <option value="all">Wszystkie terminy</option>
                <option value="this-week">Ten tydzień</option>
                <option value="this-month">Ten miesiąc</option>
                <option value="overdue">Przeterminowane</option>
              </select>
            </div>

            {/* Sort buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => handleSort('KOD_BEBNA')}
                className={`px-3 py-2 rounded-lg border transition-all duration-200 flex items-center space-x-2 text-sm ${
                  sortBy === 'KOD_BEBNA' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-blue-50'
                }`}
              >
                <span>Kod</span>
                <ArrowUpDown className="w-3 h-3" />
              </button>
              
              <button
                onClick={() => handleSort('DATA_ZWROTU_DO_DOSTAWCY')}
                className={`px-3 py-2 rounded-lg border transition-all duration-200 flex items-center space-x-2 text-sm ${
                  sortBy === 'DATA_ZWROTU_DO_DOSTAWCY' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-blue-50'
                }`}
              >
                <span>Termin zwrotu</span>
                <ArrowUpDown className="w-3 h-3" />
              </button>
              
              <button
                onClick={() => handleSort('company')}
                className={`px-3 py-2 rounded-lg border transition-all duration-200 flex items-center space-x-2 text-sm ${
                  sortBy === 'company' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-blue-50'
                }`}
              >
                <span>Klient</span>
                <ArrowUpDown className="w-3 h-3" />
              </button>
              
              <button
                onClick={() => handleSort('daysInPossession')}
                className={`px-3 py-2 rounded-lg border transition-all duration-200 flex items-center space-x-2 text-sm ${
                  sortBy === 'daysInPossession' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-blue-50'
                }`}
              >
                <span>Dni w posiadaniu</span>
                <ArrowUpDown className="w-3 h-3" />
              </button>
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
              <div className="text-sm text-gray-600">Przeterminowane</div>
            </div>
          </div>
        </div>

        {/* Drums Grid */}
        {filteredAndSortedDrums.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8 items-stretch">
            {filteredAndSortedDrums.map((drum, index) => (
              <DrumCard key={drum.KOD_BEBNA} drum={drum} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nie znaleziono bębnów</h3>
            <p className="text-gray-600 mb-6">Spróbuj zmienić kryteria wyszukiwania lub filtry</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
                setFilterClient('');
                setFilterDateRange('all');
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200"
            >
              Wyczyść filtry
            </button>
          </div>
        )}

        <DrumDetailsModal />
      </div>
    </div>
  );
};

export default AdminDrumsList;