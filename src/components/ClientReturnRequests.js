import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { returnsAPI } from '../utils/supabaseApi';
import { Truck, Clock, CheckCircle, XCircle, Calendar, Package, MapPin, Plus, RefreshCw } from 'lucide-react';

const ClientReturnRequests = ({ user }) => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequests = useCallback(async () => {
    if (!user?.nip) return;
    setLoading(true);
    setError(null);
    try {
      const data = await returnsAPI.getReturns(user.nip);
      setRequests(data);
    } catch (err) {
      console.error('Błąd pobierania zgłoszeń:', err);
      setError('Nie udało się pobrać historii zgłoszeń.');
    } finally {
      setLoading(false);
    }
  }, [user?.nip]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const getStatusBadge = (status) => {
    const badges = {
      Pending: { color: 'text-amber-500', bg: 'bg-amber-50', text: 'Oczekuje', icon: Clock },
      Approved: { color: 'text-sky-500', bg: 'bg-sky-50', text: 'Przekazane do transportu', icon: Truck },
      InTransit: { color: 'text-indigo-500', bg: 'bg-indigo-50', text: 'W trakcie transportu', icon: Truck },
      Completed: { color: 'text-emerald-500', bg: 'bg-emerald-50', text: 'Zakończone', icon: CheckCircle },
      Rejected: { color: 'text-rose-500', bg: 'bg-rose-50', text: 'Odrzucone', icon: XCircle }
    };

    const badge = badges[status] || badges.Pending;
    const Icon = badge.icon;

    return (
      <div className={`p-2 rounded-xl border border-transparent hover:border-current transition-colors cursor-help ${badge.bg} ${badge.color}`} title={badge.text}>
        <Icon className="w-5 h-5" />
      </div>
    );
  };

  const getDrumLabel = (drum) => {
    if (typeof drum === 'object' && drum !== null) {
      return drum.cecha || drum.kod_bebna || 'Nieznany';
    }
    return drum;
  };

  const isDrumDamaged = (drum) => {
    return typeof drum === 'object' && drum !== null && drum.isDamaged;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                Moje Zgłoszenia
              </h1>
              <p className="text-gray-600">Historia wysłanych zgłoszeń zwrotu bębnów</p>
            </div>
          </div>
          
          <div className="flex space-x-3 w-full sm:w-auto">
            <button
              onClick={fetchRequests}
              className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 flex items-center justify-center space-x-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Odśwież</span>
            </button>
            <button
              onClick={() => navigate('/return')}
              className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-md flex items-center justify-center space-x-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Zgłoś zwrot</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {requests.length === 0 && !error ? (
          <div className="text-center py-16 bg-white/80 backdrop-blur-lg rounded-2xl shadow-sm border border-gray-100">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Brak zgłoszeń</h3>
            <p className="text-gray-500 mb-6">Nie wysłałeś jeszcze żadnego zgłoszenia zwrotu.</p>
            <button
              onClick={() => navigate('/return')}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              Zgłoś pierwszy zwrot
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {requests.map((req) => {
              const drumsCount = Array.isArray(req.selected_drums) ? req.selected_drums.length : 0;
              const damagedCount = Array.isArray(req.selected_drums) ? req.selected_drums.filter(d => isDrumDamaged(d)).length : 0;
              
              return (
                <div key={req.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-md relative flex flex-col h-full">
                  <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-100">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 leading-tight">Zgłoszenie #{req.id}</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                        Wysłano: {new Date(req.created_at).toLocaleDateString('pl-PL')}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {getStatusBadge(req.status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                      <div className="flex items-center space-x-2 mb-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Odbiór</span>
                      </div>
                      <span className="font-semibold text-gray-900 text-sm pl-6 block">
                        {req.collection_date ? new Date(req.collection_date).toLocaleDateString('pl-PL') : 'Brak danych'}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                      <div className="flex items-center space-x-2 mb-1">
                        <Package className="w-4 h-4 text-gray-400" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bębny</span>
                      </div>
                      <span className="font-semibold text-gray-900 text-sm pl-6 block">
                        {drumsCount} szt. {damagedCount > 0 && <span className="text-red-500 text-[10px] font-bold ml-1">({damagedCount} uszk.)</span>}
                      </span>
                    </div>
                  </div>

                  {(req.transport_date || req.correction_number) && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3 shadow-inner">
                      {req.transport_date && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-gray-400" />
                            <span className="text-[11px] font-bold text-gray-400 uppercase">Transport</span>
                          </div>
                          <span className="text-sm font-bold text-gray-900">
                            {new Date(req.transport_date).toLocaleDateString('pl-PL')}
                          </span>
                        </div>
                      )}
                      {req.correction_number && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-gray-400" />
                            <span className="text-[11px] font-bold text-gray-400 uppercase">Korekta</span>
                          </div>
                          <span className="text-sm font-bold text-gray-900">
                            {req.correction_number}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-3 mb-6 flex-grow">
                    <div className="flex items-start space-x-3 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <span className="text-gray-600 leading-snug font-medium truncate">{req.street}, {req.postal_code} {req.city}</span>
                    </div>
                    {req.notes && (
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Uwagi:</span>
                        <p className="text-gray-700 text-xs italic line-clamp-2 leading-relaxed">"{req.notes}"</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5">
                    {Array.isArray(req.selected_drums) && req.selected_drums.slice(0, 5).map((drum, idx) => {
                      const label = getDrumLabel(drum);
                      const damaged = isDrumDamaged(drum);
                      return (
                        <span key={idx} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${damaged ? 'bg-red-50 text-red-700 border-red-100' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                          {label}
                        </span>
                      );
                    })}
                    {drumsCount > 5 && (
                      <span className="px-2.5 py-1 bg-gray-50 text-gray-400 border border-gray-100 rounded-lg text-[10px] font-bold">
                        +{drumsCount - 5}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientReturnRequests;
