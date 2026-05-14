import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { returnsAPI } from '../utils/supabaseApi';
import {
  Truck,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  MapPin,
  Calendar,
  Package,
  ArrowUpDown,
  Edit,
  RefreshCw,
  Circle,
  ArrowDown
} from 'lucide-react';

const AdminReturnRequests = ({ initialFilter = {} }) => {
  const [searchParams] = useSearchParams();
  const urlClientNip = searchParams.get('clientNip');

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('searchTerm') || '');
  const [filterStatus, setFilterStatus] = useState(initialFilter.status || 'all');
  const [filterPriority, setFilterPriority] = useState(initialFilter.priority || 'all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showRequestDetails, setShowRequestDetails] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await returnsAPI.getReturns(urlClientNip);
      setRequests(data);
    } catch (err) {
      console.error('Błąd pobierania zgłoszeń:', err);
      setError('Nie udało się pobrać zgłoszeń.');
    } finally {
      setLoading(false);
    }
  }, [urlClientNip]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleRefresh = () => {
    fetchRequests();
  };

  const handleStatusChange = async (requestId, newStatus) => {
    try {
      await returnsAPI.updateReturnStatus(requestId, newStatus);
      handleRefresh();
    } catch (err) {
      console.error('Błąd zmiany statusu:', err);
      alert('Nie udało się zmienić statusu.');
    }
  };

  const handleSetInTransit = async (requestId) => {
    const date = prompt("Podaj datę transportu (RRRR-MM-DD):", new Date().toISOString().split('T')[0]);
    if (!date) return;

    try {
      await returnsAPI.updateReturnStatus(requestId, {
        status: 'InTransit',
        transport_date: date
      });
      handleRefresh();
    } catch (err) {
      console.error('Błąd ustawiania transportu:', err);
      alert('Nie udało się ustawić transportu.');
    }
  };

  const handleAddCorrectionNumber = async (requestId) => {
    const currentReq = requests.find(r => r.id === requestId);
    const number = prompt("Podaj numer(y) korekt (oddziel przecinkami):", currentReq?.correction_number || "");
    if (number === null) return;

    try {
      await returnsAPI.updateReturnStatus(requestId, {
        correction_number: number
      });
      handleRefresh();
    } catch (err) {
      console.error('Błąd dodawania numeru korekty:', err);
      alert('Nie udało się zapisać numeru korekty.');
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setShowRequestDetails(true);
  };

  const handleCloseModal = () => {
    setShowRequestDetails(false);
    setSelectedRequest(null);
  };

  const getStatusBadge = (status) => {
    const badges = {
      Pending: { color: 'text-amber-500', bg: 'bg-amber-50', text: 'Oczekuje', icon: Clock },
      Approved: { color: 'text-sky-500', bg: 'bg-sky-50', text: 'Przekazane do transportu', icon: Truck },
      InTransit: { color: 'text-indigo-500', bg: 'bg-indigo-50', text: 'W trakcie transportu', icon: Truck },
      Completed: { color: 'text-emerald-500', bg: 'bg-emerald-50', text: 'Zakończony', icon: CheckCircle },
      Rejected: { color: 'text-rose-500', bg: 'bg-rose-50', text: 'Odrzucony', icon: XCircle }
    };

    const badge = badges[status] || badges.Pending;
    const Icon = badge.icon;

    return (
      <div className={`p-2 rounded-xl border border-transparent hover:border-current transition-colors cursor-help ${badge.bg} ${badge.color}`} title={badge.text}>
        <Icon className="w-5 h-5" />
      </div>
    );
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      High: { color: 'text-red-500', bg: 'bg-red-50', text: 'Priorytet: Wysoki', icon: AlertTriangle },
      Normal: { color: 'text-gray-400', bg: 'bg-gray-50', text: 'Priorytet: Normalny', icon: Circle },
      Low: { color: 'text-blue-400', bg: 'bg-blue-50', text: 'Priorytet: Niski', icon: ArrowDown }
    };

    const badge = badges[priority] || badges.Normal;
    const Icon = badge.icon || Circle;

    return (
      <div className={`p-2 rounded-xl border border-transparent hover:border-current transition-colors cursor-help ${badge.bg} ${badge.color}`} title={badge.text}>
        <Icon className="w-5 h-5" />
      </div>
    );
  };

  const getStatistics = () => {
    return {
      total: requests.length,
      pending: requests.filter(r => r.status === 'Pending').length,
      approved: requests.filter(r => r.status === 'Approved').length,
      inTransit: requests.filter(r => r.status === 'InTransit').length,
      completed: requests.filter(r => r.status === 'Completed').length,
      urgent: requests.filter(r => r.priority === 'High' && r.status !== 'Completed').length
    };
  };

  const filteredAndSortedRequests = useMemo(() => {
    return requests
      .filter(req => {
        const matchesSearch = 
          req.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          req.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          req.user_nip?.includes(searchTerm) ||
          req.id?.toString().includes(searchTerm);
        
        const matchesStatus = filterStatus === 'all' || req.status === filterStatus;
        const matchesPriority = filterPriority === 'all' || req.priority === filterPriority;

        return matchesSearch && matchesStatus && matchesPriority;
      })
      .sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];

        if (sortBy === 'created_at' || sortBy === 'collection_date') {
          valA = new Date(valA || 0).getTime();
          valB = new Date(valB || 0).getTime();
        }

        if (sortOrder === 'asc') return valA > valB ? 1 : -1;
        return valA < valB ? 1 : -1;
      });
  }, [requests, searchTerm, filterStatus, filterPriority, sortBy, sortOrder]);

  const getDrumLabel = (drum) => {
    if (typeof drum === 'object' && drum !== null) {
      return drum.cecha || drum.kod_bebna || 'Nieznany';
    }
    return drum;
  };

  const isDrumDamaged = (drum) => {
    return typeof drum === 'object' && drum !== null && drum.isDamaged;
  };

  const RequestCard = ({ request }) => {
    const damagedCount = Array.isArray(request.selected_drums)
      ? request.selected_drums.filter(d => isDrumDamaged(d)).length
      : 0;

    const collectionDate = new Date(request.collection_date);
    const daysUntilCollection = Math.ceil((collectionDate - new Date()) / (1000 * 60 * 60 * 24));

    return (
      <div
        className={`bg-white rounded-2xl p-6 shadow-sm border transition-all duration-300 hover:shadow-md relative flex flex-col h-full ${request.priority === 'High' ? 'border-red-200 bg-red-50/10' : 'border-gray-100'}`}
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-900 leading-tight">Zgłoszenie #{request.id}</h3>
            <p className="text-sm font-medium text-blue-600 truncate mt-0.5">{request.company_name}</p>
            <div className="flex flex-col mt-1">
              <p className="text-[10px] text-gray-400 font-bold tracking-wider uppercase leading-none">NIP: {request.user_nip}</p>
              <p className="text-[10px] text-gray-400 font-bold tracking-wider uppercase mt-1 leading-none">Zgłoszono: {new Date(request.created_at).toLocaleDateString('pl-PL')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {getStatusBadge(request.status)}
            {getPriorityBadge(request.priority)}
          </div>
        </div>

        <div className="mb-6">
          <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100/50 pb-2">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Okres odbioru (14 dni)</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-gray-900 text-sm">
                  {collectionDate.toLocaleDateString('pl-PL')} - {new Date(collectionDate.getTime() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('pl-PL')}
                </div>
                {daysUntilCollection < 0 ? (
                  <div className="text-[10px] text-red-500 font-bold uppercase">Przeterminowane</div>
                ) : daysUntilCollection <= 3 ? (
                  <div className="text-[10px] text-orange-500 font-bold uppercase">Za {daysUntilCollection} dni</div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-[10px] font-bold text-gray-400 uppercase">Godziny załadunku</span>
              </div>
              <span className="font-semibold text-gray-700">{request.loading_hours}</span>
            </div>

            {request.transport_date && (
              <div className="flex items-center justify-between text-sm pt-1 border-t border-gray-100/50">
                <div className="flex items-center space-x-2">
                  <Truck className="w-4 h-4 text-indigo-500" />
                  <span className="text-[10px] font-bold text-indigo-400 uppercase">Zaplanowany transport</span>
                </div>
                <span className="font-bold text-indigo-700">{new Date(request.transport_date).toLocaleDateString('pl-PL')}</span>
              </div>
            )}
          </div>
        </div>

        {request.correction_number && (
          <div className="mb-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Edit className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Numery korekt</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {request.correction_number.split(',').map((num, i) => (
                <span key={i} className="px-2 py-1 bg-white border border-emerald-200 text-emerald-700 text-[11px] font-bold rounded-lg shadow-sm">
                  {num.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3 mb-6 flex-grow">
          <div className="flex items-start space-x-3 text-sm">
            <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <span className="text-gray-600 leading-snug font-medium truncate">{request.street}, {request.postal_code} {request.city}</span>
          </div>
        </div>

        <div className="flex gap-2 mt-auto pt-4 border-t border-gray-100">
          <button
            onClick={() => handleViewRequest(request)}
            className="flex-1 bg-gray-100 text-gray-700 py-2.5 px-4 rounded-xl font-bold hover:bg-gray-200 transition-colors text-sm"
          >
            Szczegóły
          </button>

          {request.status === 'Pending' && (
            <button
              onClick={() => handleStatusChange(request.id, 'Approved')}
              className="flex-1 bg-emerald-600 text-white py-2.5 px-4 rounded-xl font-bold hover:bg-emerald-700 transition-colors text-sm"
            >
              Zatwierdź
            </button>
          )}

          {request.status === 'Approved' && (
            <button
              onClick={() => handleSetInTransit(request.id)}
              className="flex-1 bg-indigo-600 text-white py-2.5 px-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors text-sm"
            >
              Transport
            </button>
          )}

          {request.status === 'InTransit' && (
            <button
              onClick={() => handleStatusChange(request.id, 'Completed')}
              className="flex-1 bg-emerald-600 text-white py-2.5 px-4 rounded-xl font-bold hover:bg-emerald-700 transition-colors text-sm"
            >
              Zakończ
            </button>
          )}

          {request.status === 'Completed' && (
            <button
              onClick={() => handleAddCorrectionNumber(request.id)}
              className={`flex-1 py-2.5 px-4 rounded-xl font-bold transition-colors text-sm border ${
                request.correction_number 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' 
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {request.correction_number ? 'Korekta' : '+ Korekta'}
            </button>
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
                      <span className="text-gray-500 ml-2">({Math.floor((new Date() - new Date(selectedRequest.created_at)) / (1000 * 60 * 60 * 24))} dni temu)</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Wybrane bębny ({selectedRequest.selected_drums?.length || 0} szt.)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.isArray(selectedRequest.selected_drums) && selectedRequest.selected_drums.map((drum, idx) => {
                  const label = getDrumLabel(drum);
                  const damaged = isDrumDamaged(drum);
                  const description = damaged ? drum.description : '';
                  
                  // Obliczenia dla bębna
                  const issueDate = new Date(drum.data_wydania || selectedRequest.created_at);
                  const pzDate = new Date(drum.data_przyjecia_na_stan || drum.data_wydania || selectedRequest.created_at);
                  const daysInPossession = Math.ceil((new Date() - issueDate) / (1000 * 60 * 60 * 24));
                  const daysSincePurchase = Math.ceil((new Date() - pzDate) / (1000 * 60 * 60 * 24));
                  const isOurDrum = daysSincePurchase > 360;
                  
                  const returnPeriod = drum.returnPeriodDays || 120;
                  const returnPercentage = daysInPossession <= returnPeriod ? 100 : 0;
                  
                  let daysToSupplier = 'Brak danych';
                  if (drum.data_zwrotu_do_dostawcy) {
                    const supplierDeadline = new Date(drum.data_zwrotu_do_dostawcy);
                    daysToSupplier = Math.ceil((supplierDeadline - new Date()) / (1000 * 60 * 60 * 24));
                  }

                  return (
                    <div key={idx} className={`p-4 rounded-xl border flex flex-col ${damaged ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-bold text-lg ${damaged ? 'text-red-700' : 'text-blue-700'}`}>
                          {label}
                        </span>
                        {damaged && <AlertTriangle className="w-5 h-5 text-red-500" title="Uszkodzony" />}
                      </div>
                      
                      <div className="space-y-2 text-[11px]">
                        <div>
                          <span className="text-gray-400 font-bold uppercase block">Nazwa:</span>
                          <span className="text-gray-700 font-medium">{drum.nazwa || 'Nieznana'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 font-bold uppercase block">Faktura:</span>
                          <span className="text-gray-700 font-medium">{drum.numer_faktury || 'Brak danych'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                          <div>
                            <span className="text-gray-400 font-bold uppercase block">W posiadaniu:</span>
                            <span className="text-gray-900 font-bold">{daysInPossession} dni</span>
                          </div>
                          <div>
                            <span className="text-gray-400 font-bold uppercase block">Zwrot:</span>
                            <span className={`font-bold ${returnPercentage === 100 ? 'text-emerald-600' : 'text-red-600'}`}>{returnPercentage}%</span>
                          </div>
                        </div>
                        <div className="pt-1 border-t border-gray-100">
                          <span className="text-gray-400 font-bold uppercase block">Własność:</span>
                          {isOurDrum ? (
                            <span className="text-blue-700 font-bold">NASZ (Własny bęben)</span>
                          ) : (
                            <div className="flex flex-col">
                              <span className="text-amber-700 font-bold uppercase">KABLOWNI</span>
                              <span className="text-gray-500">Zwrócić do kablowni za: <span className={`font-bold ${Number(daysToSupplier) < 7 ? 'text-red-600' : 'text-gray-900'}`}>{daysToSupplier} dni</span></span>
                            </div>
                          )}
                        </div>
                      </div>

                      {damaged && description && (
                        <div className="mt-3 p-2 bg-white rounded border border-red-100 text-[10px]">
                          <span className="font-bold text-red-600 uppercase block mb-1 text-[9px]">Opis uszkodzeń:</span>
                          <p className="text-gray-700 italic">"{description}"</p>
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
                    className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>Zatwierdź zgłoszenie</span>
                  </button>
                  <button
                    onClick={() => {
                      handleStatusChange(selectedRequest.id, 'Rejected');
                      handleCloseModal();
                    }}
                    className="bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-bold hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-5 h-5" />
                    <span>Odrzuć</span>
                  </button>
                </>
              )}

              {selectedRequest.status === 'Approved' && (
                <button
                  onClick={() => {
                    handleSetInTransit(selectedRequest.id);
                    handleCloseModal();
                  }}
                  className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
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
                  className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>Zakończ transport</span>
                </button>
              )}

              {selectedRequest.status === 'Completed' && (
                <button
                  onClick={() => {
                    handleAddCorrectionNumber(selectedRequest.id);
                    handleCloseModal();
                  }}
                  className="flex-1 bg-indigo-50 text-indigo-700 py-3 px-4 rounded-xl font-bold hover:bg-indigo-100 border border-indigo-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit className="w-5 h-5" />
                  <span>{selectedRequest.correction_number ? 'Edytuj numer korekty' : 'Dodaj numer korekty'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const stats = getStatistics();

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

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  Zgłoszenia zwrotów
                </h1>
                <p className="text-gray-600">Zarządzaj wszystkimi zgłoszeniami zwrotu bębnów</p>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Odśwież</span>
              </button>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-blue-100 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-white rounded-3xl p-5 shadow-lg border border-blue-50 text-center">
              <div className="text-3xl font-black text-blue-600 mb-1">{stats.total}</div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Wszystkie</div>
            </div>
            <div className="bg-white rounded-3xl p-5 shadow-lg border border-amber-50 text-center">
              <div className="text-3xl font-black text-amber-600 mb-1">{stats.pending}</div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Oczekujące</div>
            </div>
            <div className="bg-white rounded-3xl p-5 shadow-lg border border-sky-50 text-center">
              <div className="text-3xl font-black text-sky-600 mb-1">{stats.approved}</div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Transport</div>
            </div>
            <div className="bg-white rounded-3xl p-5 shadow-lg border border-indigo-50 text-center">
              <div className="text-3xl font-black text-indigo-600 mb-1">{stats.inTransit}</div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">W trasie</div>
            </div>
            <div className="bg-white rounded-3xl p-5 shadow-lg border border-emerald-50 text-center">
              <div className="text-3xl font-black text-emerald-600 mb-1">{stats.completed}</div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Zakończone</div>
            </div>
            <div className="bg-white rounded-3xl p-5 shadow-lg border border-rose-50 text-center">
              <div className="text-3xl font-black text-rose-600 mb-1">{stats.urgent}</div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Pilne</div>
            </div>
          </div>
        </div>

        {filteredAndSortedRequests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
            {filteredAndSortedRequests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Truck className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nie znaleziono zgłoszeń</h3>
            <p className="text-gray-600">Spróbuj zmienić kryteria wyszukiwania lub filtry</p>
          </div>
        )}

        <RequestDetailsModal />
      </div>
    </div>
  );
};

export default AdminReturnRequests;
