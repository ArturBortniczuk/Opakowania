import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { returnsAPI } from '../utils/supabaseApi';
import { Truck, Clock, CheckCircle, XCircle, Calendar, Package, MapPin, Plus, RefreshCw, AlertCircle } from 'lucide-react';

const ClientReturnRequests = ({ user }) => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequests = async () => {
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
  };

  useEffect(() => {
    if (user?.nip) {
      fetchRequests();
    }
  }, [user?.nip]);

  const getStatusBadge = (status) => {
    const badges = {
      Pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', text: 'Oczekuje', icon: Clock },
      Approved: { color: 'bg-blue-100 text-blue-800 border-blue-200', text: 'Zatwierdzone', icon: CheckCircle },
      Completed: { color: 'bg-green-100 text-green-800 border-green-200', text: 'Zakończone', icon: CheckCircle },
      Rejected: { color: 'bg-red-100 text-red-800 border-red-200', text: 'Odrzucone', icon: XCircle }
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
                <div key={req.id} className="bg-white/90 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-blue-50 hover:shadow-xl transition-shadow duration-300">
                  <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-100">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">Zgłoszenie #{req.id}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Wysłano: {new Date(req.created_at).toLocaleDateString('pl-PL')} o {new Date(req.created_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div>
                      {getStatusBadge(req.status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <div>
                        <span className="text-gray-500 text-xs block">Od Data (sugerowana)</span>
                        <span className="font-medium text-gray-900">
                          {req.collection_date ? new Date(req.collection_date).toLocaleDateString('pl-PL') : 'Brak danych'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Package className="w-4 h-4 text-green-500" />
                      <div>
                        <span className="text-gray-500 text-xs block">Bębny do zwrotu</span>
                        <span className="font-medium text-gray-900">
                          {drumsCount} szt. {damagedCount > 0 && <span className="text-red-500 text-xs ml-1">({damagedCount} uszkodzone)</span>}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 text-sm bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{req.street}, {req.postal_code} {req.city}</span>
                    </div>
                    {req.notes && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <span className="text-xs text-gray-500 block mb-1">Uwagi i szczegóły:</span>
                        <p className="text-gray-700 text-xs whitespace-pre-line line-clamp-3">{req.notes}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-xs text-gray-500 mb-1">Wybrane bębny:</div>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(req.selected_drums) && req.selected_drums.map((drum, idx) => {
                        const label = getDrumLabel(drum);
                        const damaged = isDrumDamaged(drum);
                        return (
                          <span key={idx} className={`px-2 py-1 rounded text-xs font-medium flex items-center space-x-1 ${damaged ? 'bg-red-100 text-red-800' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                            <span>{label}</span>
                            {damaged && <AlertCircle className="w-3 h-3" />}
                          </span>
                        );
                      })}
                    </div>
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
