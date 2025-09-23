// src/components/AdminClientsList.js - Zaktualizowany o prawdziwe dane
import React, { useState, useMemo, useEffect } from 'react';
import { companiesAPI, drumsAPI, returnsAPI } from '../utils/supabaseApi';
import { 
  Users, 
  Search, 
  Filter, 
  Eye,
  Package,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Building2,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpDown,
  MoreVertical,
  Edit,
  Trash2,
  RefreshCw
} from 'lucide-react';

const AdminClientsList = ({ onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientDetails, setShowClientDetails] = useState(false);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pobierz klientów z danymi
  useEffect(() => {
    const fetchClientsData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const [companiesData, allDrums, allReturns] = await Promise.all([
          companiesAPI.getCompanies(),
          drumsAPI.getAllDrums(),
          returnsAPI.getReturns()
        ]);
        
        // Wzbogać dane klientów o statystyki
        const enrichedClients = companiesData.map(company => {
          const clientDrums = allDrums.filter(drum => drum.NIP === company.nip);
          const clientReturns = allReturns.filter(ret => ret.user_nip === company.nip);
          
          const now = new Date();
          const overdueDrums = clientDrums.filter(drum => {
            const returnDate = new Date(drum.DATA_ZWROTU_DO_DOSTAWCY);
            return returnDate < now;
          });
          
          const pendingRequests = clientReturns.filter(req => req.status === 'Pending');
          
          return {
            ...company,
            drums: clientDrums,
            drumsCount: clientDrums.length,
            overdueDrums: overdueDrums.length,
            pendingRequests: pendingRequests.length,
            totalRequests: clientReturns.length,
            riskLevel: overdueDrums.length > 0 ? 'high' : 
                      pendingRequests.length > 0 ? 'medium' : 'low',
            lastActivity: company.created_at || new Date().toISOString().split('T')[0]
          };
        });
        
        setClients(enrichedClients);
        
      } catch (err) {
        console.error('Błąd podczas pobierania danych klientów:', err);
        setError('Nie udało się pobrać listy klientów. Spróbuj ponownie.');
      } finally {
        setLoading(false);
      }
    };

    fetchClientsData();
  }, []);

  const filteredAndSortedClients = useMemo(() => {
    let filtered = clients.filter(client => {
      const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           client.nip.includes(searchTerm) ||
                           (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()));
      
      if (filterStatus === 'all') return matchesSearch;
      if (filterStatus === 'high-risk' && client.riskLevel === 'high') return matchesSearch;
      if (filterStatus === 'pending' && client.pendingRequests > 0) return matchesSearch;
      if (filterStatus === 'active' && client.drumsCount > 0) return matchesSearch;
      
      return false;
    });

    return filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'lastActivity') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [clients, searchTerm, sortBy, sortOrder, filterStatus]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleViewClient = (client) => {
    setSelectedClient(client);
    setShowClientDetails(true);
  };

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [companiesData, allDrums, allReturns] = await Promise.all([
        companiesAPI.getCompanies(),
        drumsAPI.getAllDrums(),
        returnsAPI.getReturns()
      ]);
      
      const enrichedClients = companiesData.map(company => {
        const clientDrums = allDrums.filter(drum => drum.NIP === company.nip);
        const clientReturns = allReturns.filter(ret => ret.user_nip === company.nip);
        
        const now = new Date();
        const overdueDrums = clientDrums.filter(drum => {
          const returnDate = new Date(drum.DATA_ZWROTU_DO_DOSTAWCY);
          return returnDate < now;
        });
        
        const pendingRequests = clientReturns.filter(req => req.status === 'Pending');
        
        return {
          ...company,
          drums: clientDrums,
          drumsCount: clientDrums.length,
          overdueDrums: overdueDrums.length,
          pendingRequests: pendingRequests.length,
          totalRequests: clientReturns.length,
          riskLevel: overdueDrums.length > 0 ? 'high' : 
                    pendingRequests.length > 0 ? 'medium' : 'low',
          lastActivity: company.created_at || new Date().toISOString().split('T')[0]
        };
      });
      
      setClients(enrichedClients);
      
    } catch (err) {
      console.error('Błąd podczas odświeżania:', err);
      setError('Nie udało się odświeżyć danych.');
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (riskLevel) => {
    const badges = {
      high: { color: 'bg-red-100 text-red-800 border-red-200', text: 'Wysokie ryzyko' },
      medium: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', text: 'Średnie ryzyko' },
      low: { color: 'bg-green-100 text-green-800 border-green-200', text: 'Niskie ryzyko' }
    };
    
    const badge = badges[riskLevel];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const getStatistics = () => {
    const total = clients.length;
    const highRisk = clients.filter(c => c.riskLevel === 'high').length;
    const withPending = clients.filter(c => c.pendingRequests > 0).length;
    const lowRisk = clients.filter(c => c.riskLevel === 'low').length;
    
    return { total, highRisk, withPending, lowRisk };
  };

  const stats = getStatistics();

  const ClientCard = ({ client, index }) => (
    <div 
      className="bg-white/90 rounded-2xl p-6 shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{client.name}</h3>
            <p className="text-sm text-gray-600">NIP: {client.nip}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {getRiskBadge(client.riskLevel)}
          <div className="relative">
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors duration-200">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-2 text-sm">
          <Package className="w-4 h-4 text-blue-600" />
          <span className="text-gray-600">Bębny:</span>
          <span className="font-medium text-gray-900">{client.drumsCount}</span>
        </div>
        
        <div className="flex items-center space-x-2 text-sm">
          <Clock className="w-4 h-4 text-yellow-600" />
          <span className="text-gray-600">Oczekujące:</span>
          <span className="font-medium text-gray-900">{client.pendingRequests}</span>
        </div>
        
        {client.overdueDrums > 0 && (
          <div className="flex items-center space-x-2 text-sm">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-gray-600">Przeterminowane:</span>
            <span className="font-medium text-red-600">{client.overdueDrums}</span>
          </div>
        )}
      </div>

      <div className="space-y-2 mb-4 text-sm">
        {client.email && (
          <div className="flex items-center space-x-2 text-gray-600">
            <Mail className="w-4 h-4" />
            <span>{client.email}</span>
          </div>
        )}
        {client.phone && (
          <div className="flex items-center space-x-2 text-gray-600">
            <Phone className="w-4 h-4" />
            <span>{client.phone}</span>
          </div>
        )}
        {client.address && (
          <div className="flex items-center space-x-2 text-gray-600">
            <MapPin className="w-4 h-4" />
            <span className="truncate">{client.address}</span>
          </div>
        )}
        <div className="flex items-center space-x-2 text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>Ostatnia aktywność: {new Date(client.lastActivity).toLocaleDateString('pl-PL')}</span>
        </div>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={() => handleViewClient(client)}
          className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2 px-4 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center space-x-2"
        >
          <Eye className="w-4 h-4" />
          <span>Szczegóły</span>
        </button>
        
        <button
          onClick={() => onNavigate('admin-drums', { clientNip: client.nip })}
          className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200 flex items-center justify-center space-x-2"
        >
          <Package className="w-4 h-4" />
          <span>Bębny</span>
        </button>
      </div>
    </div>
  );

  const ClientDetailsModal = () => {
    if (!showClientDetails || !selectedClient) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Szczegóły klienta</h2>
              <button
                onClick={() => setShowClientDetails(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Informacje podstawowe</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nazwa firmy</label>
                    <p className="text-gray-900">{selectedClient.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">NIP</label>
                    <p className="text-gray-900">{selectedClient.nip}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-gray-900">{selectedClient.email || 'Brak danych'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Telefon</label>
                    <p className="text-gray-900">{selectedClient.phone || 'Brak danych'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Adres</label>
                    <p className="text-gray-900">{selectedClient.address || 'Brak danych'}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Statystyki</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Wszystkie bębny</span>
                    <span className="font-medium">{selectedClient.drumsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Przeterminowane</span>
                    <span className="font-medium text-red-600">{selectedClient.overdueDrums}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Oczekujące zgłoszenia</span>
                    <span className="font-medium text-yellow-600">{selectedClient.pendingRequests}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Wszystkie zgłoszenia</span>
                    <span className="font-medium">{selectedClient.totalRequests}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ostatnia aktywność</span>
                    <span className="font-medium">{new Date(selectedClient.lastActivity).toLocaleDateString('pl-PL')}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowClientDetails(false);
                  onNavigate('admin-drums', { clientNip: selectedClient.nip });
                }}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-xl font-medium hover:bg-blue-700 transition-colors duration-200"
              >
                Zobacz bębny
              </button>
              <button
                onClick={() => {
                  setShowClientDetails(false);
                  onNavigate('admin-returns', { clientNip: selectedClient.nip });
                }}
                className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-xl font-medium hover:bg-gray-700 transition-colors duration-200"
              >
                Zobacz zgłoszenia
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  Zarządzanie klientami
                </h1>
                <p className="text-gray-600">Przeglądaj i zarządzaj wszystkimi klientami w systemie</p>
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
                  placeholder="Szukaj po nazwie, NIP lub email..."
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
                  <option value="all">Wszyscy klienci</option>
                  <option value="active">Aktywni</option>
                  <option value="high-risk">Wysokie ryzyko</option>
                  <option value="pending">Z oczekującymi</option>
                </select>
                <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Sort */}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleSort('name')}
                  className={`px-4 py-3 rounded-xl border transition-all duration-200 flex items-center space-x-2 ${
                    sortBy === 'name' 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-blue-50'
                  }`}
                >
                  <span>Nazwa</span>
                  <ArrowUpDown className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => handleSort('lastActivity')}
                  className={`px-4 py-3 rounded-xl border transition-all duration-200 flex items-center space-x-2 ${
                    sortBy === 'lastActivity' 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-blue-50'
                  }`}
                >
                  <span>Aktywność</span>
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/80 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-blue-100 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Wszyscy klienci</div>
            </div>
            <div className="bg-white/80 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-green-100 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.lowRisk}</div>
              <div className="text-sm text-gray-600">Niskie ryzyko</div>
            </div>
            <div className="bg-white/80 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-yellow-100 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.withPending}</div>
              <div className="text-sm text-gray-600">Z oczekującymi</div>
            </div>
            <div className="bg-white/80 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-red-100 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.highRisk}</div>
              <div className="text-sm text-gray-600">Wysokie ryzyko</div>
            </div>
          </div>
        </div>

        {/* Clients Grid */}
        {filteredAndSortedClients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
            {filteredAndSortedClients.map((client, index) => (
              <ClientCard key={client.nip} client={client} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nie znaleziono klientów</h3>
            <p className="text-gray-600 mb-6">Spróbuj zmienić kryteria wyszukiwania lub filtry</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200"
            >
              Wyczyść filtry
            </button>
          </div>
        )}

        <ClientDetailsModal />
      </div>
    </div>
  );
};

export default AdminClientsList;
