// src/components/AdminReturnRequests.js
import React, { useState, useMemo } from 'react';
import { 
  Truck, 
  Search, 
  Filter, 
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  MapPin,
  Calendar,
  Mail,
  Phone,
  Package,
  Building2,
  ArrowUpDown,
  MoreVertical,
  Edit,
  Download
} from 'lucide-react';
import { mockReturnRequests } from '../data/additionalData';

const AdminReturnRequests = ({ onNavigate, initialFilter = {} }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterStatus, setFilterStatus] = useState((initialFilter && initialFilter.status) || 'all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showRequestDetails, setShowRequestDetails] = useState(false);

  const enrichedRequests = useMemo(() => {
    return mockReturnRequests.map(request => {
      const now = new Date();
      const collectionDate = new Date(request.collection_date);
      const createdDate = new Date(request.created_at);
      
      const daysUntilCollection = Math.ceil((collectionDate - now) / (1000 * 60 * 60 * 24));
      const daysOld = Math.ceil((now - createdDate) / (1000 * 60 * 60 * 24));
      
      let urgencyLevel = 'normal';
      if (request.priority === 'High' || daysUntilCollection < 0) {
        urgencyLevel = 'high';
      } else if (daysUntilCollection <= 3) {
        urgencyLevel = 'medium';
      }
      
      return {
        ...request,
        daysUntilCollection,
        daysOld,
        urgencyLevel,
        drumsCount: request.selected_drums.length
      };
    });
  }, []);

  const filteredAndSortedRequests = useMemo(() => {
    let filtered = enrichedRequests.filter(request => {
      const matchesSearch = request.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           request.user_nip.includes(searchTerm) ||
                           request.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           request.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           request.selected_drums.some(drum => drum.toLowerCase().includes(searchTerm.toLowerCase()));
      
      if (!matchesSearch) return false;
      
      if (filterStatus !== 'all' && request.status !== filterStatus) return false;
      if (filterPriority !== 'all' && request.priority !== filterPriority) return false;
      
      return true;
    });

    return filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'created_at' || sortBy === 'collection_date') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (sortBy === 'daysUntilCollection' || sortBy === 'daysOld' || sortBy === 'drumsCount') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [enrichedRequests, searchTerm, sortBy, sortOrder, filterStatus, filterPriority]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setShowRequestDetails(true);
  };

  const handleStatusChange = (requestId, newStatus) => {
    // W rzeczywistej aplikacji tutaj byłby call do API
    console.log(`Zmienianie statusu zgłoszenia ${requestId} na ${newStatus}`);
    alert(`Status zgłoszenia #${requestId} został zmieniony na: ${newStatus}`);
  };

  const getStatusBadge = (status) => {
    const badges = {
      Pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', text: 'Oczekuje', icon: Clock },
      Approved: { color: 'bg-blue-100 text-blue-800 border-blue-200', text: 'Zatwierdzony', icon: CheckCircle },
      Completed: { color: 'bg-green-100 text-green-800 border-green-200', text: 'Zakończony', icon: CheckCircle },
      Rejected: { color: 'bg-red-100 text-red-800 border-red-200', text: 'Odrzucony', icon: XCircle }
    };
    
    const badge = badges[status] || badges.Pending;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
        <Icon className="w-3 h-3" />
        <span>{badge.text}</span>
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      High: { color: 'bg-red-100 text-red-800 border-red-200', text: 'Wysoki' },
      Normal: { color: 'bg-gray-100 text-gray-800 border-gray-200', text: 'Normalny' },
      Low: { color: 'bg-blue-100 text-blue-800 border-blue-200', text: 'Niski' }
    };
    
    const badge = badges[priority] || badges.Normal;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const getUrgencyColor = (urgencyLevel) => {
    switch (urgencyLevel) {
      case 'high': return 'border-red-200 hover:border-red-300';
      case 'medium': return 'border-yellow-200 hover:border-yellow-300';
      default: return 'border-blue-100 hover:border-blue-200';
    }
  };

  const getStatistics = () => {
    const total = enrichedRequests.length;
    const pending = enrichedRequests.filter(r => r.status === 'Pending').length;
    const approved = enrichedRequests.filter(r => r.status === 'Approved').length;
    const completed = enrichedRequests.filter(r => r.status === 'Completed').length;
    const urgent = enrichedRequests.filter(r => r.urgencyLevel === 'high').length;
    
    return { total, pending, approved, completed, urgent };
  };

  const stats = getStatistics();

  const RequestCard = ({ request, index }) => (
    <div 
      className={`bg-white/90 rounded-2xl p-6 shadow-lg border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${getUrgencyColor(request.urgencyLevel)}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Zgłoszenie #{request.id}</h3>
            <p className="text-sm text-gray-600">{request.company_name}</p>
            <p className="text-xs text-gray-500">NIP: {request.user_nip}</p>
          </div>
        </div>
        
        <div className="flex flex-col items-end space-y-2">
          {getStatusBadge(request.status)}
          {getPriorityBadge(request.priority)}
          {request.urgencyLevel === 'high' && (
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <div>
            <span className="text-gray-600">Odbiór:</span>
            <div className="font-medium text-gray-900">
              {new Date(request.collection_date).toLocaleDateString('pl-PL')}
            </div>
            {request.daysUntilCollection < 0 && (
              <div className="text-xs text-red-600">Przeterminowany</div>
            )}
            {request.daysUntilCollection >= 0 && request.daysUntilCollection <= 7 && (
              <div className="text-xs text-yellow-600">Za {request.daysUntilCollection} dni</div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Package className="w-4 h-4 text-green-600" />
          <div>
            <span className="text-gray-600">Bębny:</span>
            <div className="font-medium text-gray-900">{request.drumsCount} szt.</div>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4 text-sm">
        <div className="flex items-center space-x-2 text-gray-600">
          <MapPin className="w-4 h-4" />
          <span className="truncate">{request.street}, {request.postal_code} {request.city}</span>
        </div>
        <div className="flex items-center space-x-2 text-gray-600">
          <Mail className="w-4 h-4" />
          <span>{request.email}</span>
        </div>
        <div className="flex items-center space-x-2 text-gray-600">
          <Clock className="w-4 h-4" />
          <span>Godziny: {request.loading_hours}</span>
        </div>
        {request.available_equipment && (
          <div className="flex items-center space-x-2 text-gray-600">
            <Truck className="w-4 h-4" />
            <span>Sprzęt: {request.available_equipment}</span>
          </div>
        )}
        <div className="text-gray-600">
          <span>Zgłoszono: {new Date(request.created_at).toLocaleDateString('pl-PL')} ({request.daysOld} dni temu)</span>
        </div>
      </div>

      {request.notes && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">{request.notes}</p>
        </div>
      )}

      <div className="space-y-2">
        <div className="text-xs text-gray-500 mb-2">Wybrane bębny:</div>
        <div className="flex flex-wrap gap-1">
          {request.selected_drums.map((drum, idx) => (
            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
              {drum}
            </span>
          ))}
        </div>
      </div>

      <div className="flex space-x-2 mt-4">
        <button
          onClick={() => handleViewRequest(request)}
          className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2 px-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
        >
          <Eye className="w-4 h-4" />
          <span>Szczegóły</span>
        </button>
        
        {request.status === 'Pending' && (
          <>
            <button
              onClick={() => handleStatusChange(request.id, 'Approved')}
              className="flex-1 bg-green-600 text-white py-2 px-3 rounded-xl font-medium hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Zatwierdź</span>
            </button>
            
            <button
              onClick={() => handleStatusChange(request.id, 'Rejected')}
              className="bg-red-600 text-white py-2 px-3 rounded-xl font-medium hover:bg-red-700 transition-all duration-200 flex items-center justify-center text-sm"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </>
        )}
        
        {request.status === 'Approved' && (
          <button
            onClick={() => handleStatusChange(request.id, 'Completed')}
            className="flex-1 bg-green-600 text-white py-2 px-3 rounded-xl font-medium hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Zakończ</span>
          </button>
        )}
      </div>
    </div>
  );

  const RequestDetailsModal = () => {
    if (!showRequestDetails || !selectedRequest) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Zgłoszenie zwrotu #{selectedRequest.id}</h2>
                <div className="flex items-center space-x-3 mt-2">
                  {getStatusBadge(selectedRequest.status)}
                  {getPriorityBadge(selectedRequest.priority)}
                </div>
              </div>
              <button
                onClick={() => setShowRequestDetails(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Informacje o firmie</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nazwa firmy</label>
                    <p className="text-gray-900">{selectedRequest.company_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">NIP</label>
                    <p className="text-gray-900">{selectedRequest.user_nip}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email kontaktowy</label>
                    <p className="text-gray-900">{selectedRequest.email}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Adres odbioru</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Ulica</label>
                    <p className="text-gray-900">{selectedRequest.street}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Kod pocztowy</label>
                      <p className="text-gray-900">{selectedRequest.postal_code}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Miasto</label>
                      <p className="text-gray-900">{selectedRequest.city}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Szczegóły odbioru</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Data odbioru</label>
                    <p className="text-gray-900">{new Date(selectedRequest.collection_date).toLocaleDateString('pl-PL')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Godziny załadunku</label>
                    <p className="text-gray-900">{selectedRequest.loading_hours}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Dostępny sprzęt</label>
                    <p className="text-gray-900">{selectedRequest.available_equipment || 'Brak'}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Status zgłoszenia</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Aktualny status</label>
                    <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Priorytet</label>
                    <div className="mt-1">{getPriorityBadge(selectedRequest.priority)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Data zgłoszenia</label>
                    <p className="text-gray-900">
                      {new Date(selectedRequest.created_at).toLocaleDateString('pl-PL')} 
                      <span className="text-gray-500 ml-2">({selectedRequest.daysOld} dni temu)</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Wybrane bębny ({selectedRequest.drumsCount} szt.)</h3>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {selectedRequest.selected_drums.map((drum, idx) => (
                  <span key={idx} className="px-3 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium text-center">
                    {drum}
                  </span>
                ))}
              </div>
            </div>
            
            {selectedRequest.notes && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Uwagi</h3>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-700">{selectedRequest.notes}</p>
                </div>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-4">
              {selectedRequest.status === 'Pending' && (
                <>
                  <button
                    onClick={() => {
                      handleStatusChange(selectedRequest.id, 'Approved');
                      setShowRequestDetails(false);
                    }}
                    className="flex-1 bg-green-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-green-700 transition-colors duration-200 flex items-center justify-center space-x-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>Zatwierdź zgłoszenie</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      handleStatusChange(selectedRequest.id, 'Rejected');
                      setShowRequestDetails(false);
                    }}
                    className="flex-1 bg-red-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-red-700 transition-colors duration-200 flex items-center justify-center space-x-2"
                  >
                    <XCircle className="w-5 h-5" />
                    <span>Odrzuć zgłoszenie</span>
                  </button>
                </>
              )}
              
              {selectedRequest.status === 'Approved' && (
                <button
                  onClick={() => {
                    handleStatusChange(selectedRequest.id, 'Completed');
                    setShowRequestDetails(false);
                  }}
                  className="flex-1 bg-green-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-green-700 transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>Oznacz jako zakończone</span>
                </button>
              )}
              
              <button
                onClick={() => {
                  setShowRequestDetails(false);
                  onNavigate('admin-clients');
                }}
                className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-gray-700 transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <Building2 className="w-5 h-5" />
                <span>Zobacz klienta</span>
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
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-800 bg-clip-text text-transparent">
                  Zgłoszenia zwrotów
                </h1>
                <p className="text-gray-600">Zarządzaj wszystkimi zgłoszeniami zwrotu bębnów</p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-blue-100 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Szukaj zgłoszeń..."
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
                <option value="Pending">Oczekujące</option>
                <option value="Approved">Zatwierdzone</option>
                <option value="Completed">Zakończone</option>
                <option value="Rejected">Odrzucone</option>
              </select>

              {/* Priority Filter */}
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
              >
                <option value="all">Wszystkie priorytety</option>
                <option value="High">Wysoki</option>
                <option value="Normal">Normalny</option>
                <option value="Low">Niski</option>
              </select>

              {/* Sort buttons */}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleSort('created_at')}
                  className={`flex-1 px-3 py-3 rounded-xl border transition-all duration-200 flex items-center justify-center space-x-1 text-sm ${
                    sortBy === 'created_at' 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-blue-50'
                  }`}
                >
                  <span>Data</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
                
                <button
                  onClick={() => handleSort('collection_date')}
                  className={`flex-1 px-3 py-3 rounded-xl border transition-all duration-200 flex items-center justify-center space-x-1 text-sm ${
                    sortBy === 'collection_date' 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-blue-50'
                  }`}
                >
                  <span>Odbiór</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white/80 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-blue-100 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Wszystkie</div>
            </div>
            <div className="bg-white/80 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-yellow-100 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-gray-600">Oczekujące</div>
            </div>
            <div className="bg-white/80 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-blue-100 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.approved}</div>
              <div className="text-sm text-gray-600">Zatwierdzone</div>
            </div>
            <div className="bg-white/80 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-green-100 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-gray-600">Zakończone</div>
            </div>
            <div className="bg-white/80 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-red-100 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
              <div className="text-sm text-gray-600">Pilne</div>
            </div>
          </div>
        </div>

        {/* Requests Grid */}
        {filteredAndSortedRequests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
            {filteredAndSortedRequests.map((request, index) => (
              <RequestCard key={request.id} request={request} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Truck className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nie znaleziono zgłoszeń</h3>
            <p className="text-gray-600 mb-6">Spróbuj zmienić kryteria wyszukiwania lub filtry</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
                setFilterPriority('all');
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200"
            >
              Wyczyść filtry
            </button>
          </div>
        )}

        <RequestDetailsModal />
      </div>
    </div>
  );
};

export default AdminReturnRequests;