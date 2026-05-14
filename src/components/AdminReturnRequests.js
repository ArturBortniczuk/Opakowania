import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { returnsAPI, companiesAPI } from '../utils/supabaseApi';
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
  Download,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

const AdminReturnRequests = ({ onNavigate, initialFilter = {} }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearchTerm = searchParams.get('searchTerm');
  const urlClientNip = searchParams.get('clientNip');
  const urlOpenModal = searchParams.get('openModal') === 'true';
  const urlFilterStatus = searchParams.get('filterStatus');

  const initialSearch = urlSearchTerm || urlClientNip || '';
  
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterStatus, setFilterStatus] = useState(urlFilterStatus || (initialFilter && initialFilter.status) || 'all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showRequestDetails, setShowRequestDetails] = useState(false);
  const [requests, setRequests] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper do bezpiecznego wyciągania identyfikatora bębna (cecha lub stary kod)
  const getDrumLabel = (drum) => {
    if (typeof drum === 'object' && drum !== null) {
      return drum.cecha || drum.kod_bebna || 'Nieznany';
    }
    return drum; // Stary format (string)
  };

  const isDrumDamaged = (drum) => {
    return typeof drum === 'object' && drum !== null && drum.isDamaged;
  };

  // Pobierz zgłoszenia zwrotów i firmy
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [requestsData, companiesData] = await Promise.all([
          returnsAPI.getReturns(),
          companiesAPI.getCompanies()
        ]);

        setRequests(requestsData);
        setCompanies(companiesData);

      } catch (err) {
        console.error('Błąd podczas pobierania danych:', err);
        setError('Nie udało się pobrać danych. Spróbuj ponownie.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // DODANE: Auto-otwieranie modala zgłoszenia
  useEffect(() => {
    if (urlOpenModal && urlSearchTerm && !loading && !showRequestDetails && requests.length > 0) {
      const targetId = parseInt(urlSearchTerm, 10);
      const targetRequest = requests.find(r => r.id === targetId || r.company_name === urlSearchTerm);
      if (targetRequest) {
        setSelectedRequest(targetRequest);
        setShowRequestDetails(true);
      }
    }
  }, [requests, urlOpenModal, urlSearchTerm, loading, showRequestDetails]);

  const handleCloseModal = () => {
    setShowRequestDetails(false);
    if (urlOpenModal) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('openModal');
      setSearchParams(newParams);
    }
  };

  const enrichedRequests = useMemo(() => {
    return requests.map(request => {
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
        drumsCount: Array.isArray(request.selected_drums) ? request.selected_drums.length : 0
      };
    });
  }, [requests]);

  const filteredAndSortedRequests = useMemo(() => {
    let filtered = enrichedRequests.filter(request => {
      // Rozszerzone wyszukiwanie o strukturę obiektową bębnów
      const drumsMatch = Array.isArray(request.selected_drums) && request.selected_drums.some(drum => {
        const label = getDrumLabel(drum);
        return label.toLowerCase().includes(searchTerm.toLowerCase());
      });

      const matchesSearch = request.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.user_nip.includes(searchTerm) ||
        request.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        drumsMatch;

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

  const handleStatusChange = async (requestId, updates) => {
    try {
      const isStringStatus = typeof updates === 'string';
      const statusValue = isStringStatus ? updates : updates.status;

      await returnsAPI.updateReturnStatus(requestId, updates);

      // Zaktualizuj lokalny stan
      setRequests(prev => prev.map(req =>
        req.id === requestId ? { 
          ...req, 
          ...(isStringStatus ? { status: updates } : updates),
          updated_at: new Date().toISOString() 
        } : req
      ));

      // Jeśli edytujemy wybrane zgłoszenie, zaktualizuj je również
      if (selectedRequest && selectedRequest.id === requestId) {
        setSelectedRequest(prev => ({
          ...prev,
          ...(isStringStatus ? { status: updates } : updates),
          updated_at: new Date().toISOString()
        }));
      }

      const statusLabel = statusValue === 'Approved' ? 'Przekazane do transportu' :
                         statusValue === 'InTransit' ? 'W trakcie transportu' : 
                         statusValue === 'Completed' ? 'Zakończone' : statusValue;

      alert(`✅ Zgłoszenie #${requestId} zostało zaktualizowane: ${statusLabel}`);
    } catch (error) {
      console.error('Błąd podczas zmiany statusu:', error);
      alert('❌ Wystąpił błąd podczas zmiany statusu. Spróbuj ponownie.');
    }
  };

  const handleSetInTransit = async (requestId) => {
    const transportDate = prompt('Podaj datę transportu (RRRR-MM-DD):', new Date().toISOString().split('T')[0]);
    if (transportDate) {
      await handleStatusChange(requestId, { status: 'InTransit', transport_date: transportDate });
    }
  };

  const handleAddCorrectionNumber = async (requestId) => {
    const correctionNumber = prompt('Podaj numer korekty:');
    if (correctionNumber !== null) {
      await handleStatusChange(requestId, { correction_number: correctionNumber });
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);

    try {
      const [requestsData, companiesData] = await Promise.all([
        returnsAPI.getReturns(),
        companiesAPI.getCompanies()
      ]);

      setRequests(requestsData);
      setCompanies(companiesData);

    } catch (err) {
      console.error('Błąd podczas odświeżania:', err);
      setError('Nie udało się odświeżyć danych.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      Pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', text: 'Oczekuje', icon: Clock },
      Approved: { color: 'bg-blue-100 text-blue-800 border-blue-200', text: 'Przekazane do transportu', icon: Truck },
      InTransit: { color: 'bg-indigo-100 text-indigo-800 border-indigo-200', text: 'W trakcie transportu', icon: Truck },
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
    const inTransit = enrichedRequests.filter(r => r.status === 'InTransit').length;
    const completed = enrichedRequests.filter(r => r.status === 'Completed').length;
    const urgent = enrichedRequests.filter(r => r.urgencyLevel === 'high').length;

    return { total, pending, approved, inTransit, completed, urgent };
  };

  const stats = getStatistics();

  const RequestCard = ({ request, index }) => {
    const damagedCount = Array.isArray(request.selected_drums)
      ? request.selected_drums.filter(d => isDrumDamaged(d)).length
      : 0;

    return (
      <div
        className={`bg-white rounded-3xl p-6 shadow-xl border-2 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 relative overflow-hidden flex flex-col h-full ${getUrgencyColor(request.urgencyLevel)}`}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        {/* Urgency indicator strip */}
        {request.urgencyLevel === 'high' && (
          <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500 animate-pulse" />
        )}

        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center space-x-4 min-w-0">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-800 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <Truck className="w-8 h-8 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-black text-gray-900 leading-tight">Zgłoszenie #{request.id}</h3>
              <p className="text-sm font-semibold text-blue-600 truncate">{request.company_name}</p>
              <p className="text-[11px] text-gray-400 font-medium tracking-widest uppercase mt-0.5">NIP: {request.user_nip}</p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            {getStatusBadge(request.status)}
            <div className="flex items-center gap-2">
              {getPriorityBadge(request.priority)}
              {request.urgencyLevel === 'high' && (
                <AlertCircle className="w-5 h-5 text-red-500 animate-bounce" />
              )}
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100/50">
            <div className="flex items-center space-x-2 mb-1">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">Planowany odbiór</span>
            </div>
            <div className="font-bold text-gray-900 text-sm pl-6">
              {new Date(request.collection_date).toLocaleDateString('pl-PL')}
              {request.daysUntilCollection < 0 ? (
                <div className="text-[10px] text-red-600 font-black italic">PRZETERMINOWANE</div>
              ) : request.daysUntilCollection <= 3 ? (
                <div className="text-[10px] text-orange-600 font-black italic">ZA {request.daysUntilCollection} DNI</div>
              ) : null}
            </div>
          </div>

          <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100/50">
            <div className="flex items-center space-x-2 mb-1">
              <Package className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">Bębny</span>
            </div>
            <div className="font-bold text-gray-900 text-sm pl-6">
              {request.drumsCount} szt.
              {damagedCount > 0 && (
                <span className="text-red-500 ml-1 text-[11px] font-black underline decoration-2">({damagedCount} USZK.)</span>
              )}
            </div>
          </div>
        </div>

        {/* Transport & Correction Details - EXPOSED ON CARD */}
        {(request.transport_date || request.correction_number) && (
          <div className="mb-6 p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 shadow-inner space-y-3">
            {request.transport_date && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-indigo-600" />
                  <span className="text-[11px] font-bold text-indigo-400 uppercase">Data transportu</span>
                </div>
                <span className="text-sm font-black text-indigo-900">{new Date(request.transport_date).toLocaleDateString('pl-PL')}</span>
              </div>
            )}
            {request.correction_number && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit className="w-4 h-4 text-emerald-600" />
                  <span className="text-[11px] font-bold text-emerald-400 uppercase">Numer korekty</span>
                </div>
                <span className="text-sm font-black text-emerald-900">{request.correction_number}</span>
              </div>
            )}
          </div>
        )}

        {/* Address & Contact */}
        <div className="space-y-3 mb-6 flex-grow">
          <div className="flex items-start space-x-3 text-sm group">
            <div className="bg-gray-100 p-1.5 rounded-lg group-hover:bg-blue-100 transition-colors">
              <MapPin className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
            </div>
            <span className="text-gray-600 leading-snug font-medium pt-0.5">{request.street}, {request.postal_code} {request.city}</span>
          </div>
          <div className="flex items-center space-x-3 text-sm group">
            <div className="bg-gray-100 p-1.5 rounded-lg group-hover:bg-blue-100 transition-colors">
              <Clock className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
            </div>
            <span className="text-gray-600 font-medium">Godziny: {request.loading_hours}</span>
          </div>
        </div>

        {/* Drums chips */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {Array.isArray(request.selected_drums) && request.selected_drums.slice(0, 4).map((drum, idx) => {
            const label = getDrumLabel(drum);
            const damaged = isDrumDamaged(drum);
            return (
              <span key={idx} className={`px-2.5 py-1 rounded-lg text-[10px] font-black border shadow-sm transition-transform hover:scale-105 ${damaged ? 'bg-red-50 text-red-700 border-red-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                }`}>
                {label}
              </span>
            );
          })}
          {request.drumsCount > 4 && (
            <span className="px-2.5 py-1 bg-gray-50 text-gray-400 border border-gray-100 rounded-lg text-[10px] font-black">
              +{request.drumsCount - 4}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-auto pt-4 border-t border-gray-100">
          <button
            onClick={() => handleViewRequest(request)}
            className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 px-4 rounded-2xl font-bold hover:bg-gray-200 transition-all duration-300 text-sm active:scale-95"
          >
            <Eye className="w-4 h-4" />
            <span>Szczegóły</span>
          </button>

          {request.status === 'Pending' && (
            <button
              onClick={() => handleStatusChange(request.id, 'Approved')}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 px-4 rounded-2xl font-bold hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-green-200 transition-all duration-300 text-sm active:scale-95"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Zatwierdź</span>
            </button>
          )}

          {request.status === 'Approved' && (
            <button
              onClick={() => handleSetInTransit(request.id)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-blue-600 text-white py-3 px-4 rounded-2xl font-bold hover:from-indigo-600 hover:to-blue-700 shadow-lg shadow-indigo-200 transition-all duration-300 text-sm active:scale-95"
            >
              <Truck className="w-4 h-4" />
              <span>Transport</span>
            </button>
          )}

          {request.status === 'InTransit' && (
            <button
              onClick={() => handleStatusChange(request.id, 'Completed')}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 px-4 rounded-2xl font-bold hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-green-200 transition-all duration-300 text-sm active:scale-95"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Zakończ</span>
            </button>
          )}

          {request.status === 'Completed' && (
            <button
              onClick={() => handleAddCorrectionNumber(request.id)}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold transition-all duration-300 text-sm active:scale-95 ${
                request.correction_number 
                ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-200 hover:bg-emerald-100' 
                : 'bg-indigo-50 text-indigo-700 border-2 border-indigo-200 hover:bg-indigo-100'
              }`}
            >
              <Edit className="w-4 h-4" />
              <span>{request.correction_number ? 'Korekta' : '+ Korekta'}</span>
            </button>
          )}

          {request.status === 'Rejected' && (
             <div className="flex items-center justify-center gap-2 bg-gray-50 text-gray-400 py-3 px-4 rounded-2xl font-bold border border-gray-100 text-sm opacity-50 cursor-not-allowed">
              <XCircle className="w-4 h-4" />
              <span>Odrzucone</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const RequestDetailsModal = () => {
    if (!showRequestDetails || !selectedRequest) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={handleCloseModal}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
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
                onClick={handleCloseModal}
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
                  {selectedRequest.transport_date && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Data transportu</label>
                      <p className="text-indigo-700 font-semibold">{new Date(selectedRequest.transport_date).toLocaleDateString('pl-PL')}</p>
                    </div>
                  )}
                  {selectedRequest.correction_number && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Numer korekty</label>
                      <p className="text-green-700 font-bold">{selectedRequest.correction_number}</p>
                    </div>
                  )}
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.isArray(selectedRequest.selected_drums) && selectedRequest.selected_drums.map((drum, idx) => {
                  const label = getDrumLabel(drum);
                  const damaged = isDrumDamaged(drum);
                  const description = damaged ? drum.description : '';

                  return (
                    <div key={idx} className={`p-3 rounded-lg border ${damaged ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
                      }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-semibold ${damaged ? 'text-red-700' : 'text-blue-700'}`}>
                          {label}
                        </span>
                        {damaged && <AlertTriangle className="w-4 h-4 text-red-500" title="Uszkodzony" />}
                      </div>
                      {damaged && description && (
                        <div className="text-xs text-red-600 mt-2 p-1 bg-white rounded border border-red-100">
                          <span className="font-medium">Opis: </span>{description}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedRequest.notes && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Uwagi do odbioru</h3>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-700">{selectedRequest.notes}</p>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              {selectedRequest.status === 'Pending' && (
                <>
                  <button
                    onClick={() => {
                      handleStatusChange(selectedRequest.id, 'Approved');
                      handleCloseModal();
                    }}
                    className="flex-1 bg-green-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-green-700 transition-colors duration-200 flex items-center justify-center space-x-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>Zatwierdź zgłoszenie</span>
                  </button>

                  <button
                    onClick={() => {
                      handleStatusChange(selectedRequest.id, 'Rejected');
                      handleCloseModal();
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
                  onClick={() => handleSetInTransit(selectedRequest.id)}
                  className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-indigo-700 transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <Truck className="w-5 h-5" />
                  <span>Rozpocznij transport</span>
                </button>
              )}

              {selectedRequest.status === 'InTransit' && (
                <button
                  onClick={() => {
                    handleStatusChange(selectedRequest.id, 'Completed');
                    handleCloseModal();
                  }}
                  className="flex-1 bg-green-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-green-700 transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>Oznacz jako zakończone</span>
                </button>
              )}

              {selectedRequest.status === 'Completed' && (
                <button
                  onClick={() => handleAddCorrectionNumber(selectedRequest.id)}
                  className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-gray-700 transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <Edit className="w-5 h-5" />
                  <span>{selectedRequest.correction_number ? 'Zmień numer korekty' : 'Dodaj numer korekty'}</span>
                </button>
              )}

              <button
                onClick={() => {
                  handleCloseModal();
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

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
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
              className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors duration-200 flex items-center space-x-2 mx-auto"
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
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors duration-200 flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Odśwież</span>
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
                <option value="Approved">Przekazane do transportu</option>
                <option value="InTransit">W trakcie transportu</option>
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
                  className={`flex-1 px-3 py-3 rounded-xl border transition-all duration-200 flex items-center justify-center space-x-1 text-sm ${sortBy === 'created_at'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-blue-50'
                    }`}
                >
                  <span>Data</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>

                <button
                  onClick={() => handleSort('collection_date')}
                  className={`flex-1 px-3 py-3 rounded-xl border transition-all duration-200 flex items-center justify-center space-x-1 text-sm ${sortBy === 'collection_date'
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-white rounded-3xl p-5 shadow-lg border border-blue-50 text-center group hover:scale-105 transition-transform duration-300">
              <div className="text-3xl font-black text-blue-600 mb-1 group-hover:animate-pulse">{stats.total}</div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Wszystkie</div>
            </div>
            <div className="bg-white rounded-3xl p-5 shadow-lg border border-amber-50 text-center group hover:scale-105 transition-transform duration-300">
              <div className="text-3xl font-black text-amber-600 mb-1 group-hover:animate-pulse">{stats.pending}</div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Oczekujące</div>
            </div>
            <div className="bg-white rounded-3xl p-5 shadow-lg border border-sky-50 text-center group hover:scale-105 transition-transform duration-300">
              <div className="text-3xl font-black text-sky-600 mb-1 group-hover:animate-pulse">{stats.approved}</div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Transport</div>
            </div>
            <div className="bg-white rounded-3xl p-5 shadow-lg border border-indigo-50 text-center group hover:scale-105 transition-transform duration-300">
              <div className="text-3xl font-black text-indigo-600 mb-1 group-hover:animate-pulse">{stats.inTransit}</div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">W trasie</div>
            </div>
            <div className="bg-white rounded-3xl p-5 shadow-lg border border-emerald-50 text-center group hover:scale-105 transition-transform duration-300">
              <div className="text-3xl font-black text-emerald-600 mb-1 group-hover:animate-pulse">{stats.completed}</div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Zakończone</div>
            </div>
            <div className="bg-white rounded-3xl p-5 shadow-lg border border-rose-50 text-center group hover:scale-105 transition-transform duration-300">
              <div className="text-3xl font-black text-rose-600 mb-1 group-hover:animate-pulse">{stats.urgent}</div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Pilne</div>
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
