import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { returnsAPI } from '../utils/supabaseApi';
import { Truck, Clock, CheckCircle, XCircle, Calendar, Package, MapPin, Plus, RefreshCw, ChevronDown, ChevronUp, User } from 'lucide-react';

const ClientReturnRequests = ({ user }) => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRequests, setExpandedRequests] = useState({});

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

  const toggleExpand = (reqId) => {
    setExpandedRequests(prev => ({
      ...prev,
      [reqId]: !prev[reqId]
    }));
  };

  const getStatusBadge = (status) => {
    const badges = {
      Pending: { color: 'text-amber-600 border-amber-200 bg-amber-50', text: 'Oczekuje', icon: Clock },
      Approved: { color: 'text-sky-600 border-sky-200 bg-sky-50', text: 'Zatwierdzone', icon: Truck },
      InTransit: { color: 'text-indigo-600 border-indigo-200 bg-indigo-50', text: 'W transporcie', icon: Truck },
      Completed: { color: 'text-emerald-600 border-emerald-200 bg-emerald-50', text: 'Zakończone', icon: CheckCircle },
      Rejected: { color: 'text-rose-600 border-rose-200 bg-rose-50', text: 'Odrzucone', icon: XCircle }
    };

    const badge = badges[status] || badges.Pending;
    const Icon = badge.icon;

    return (
      <div className={`px-2.5 py-1 rounded-xl border flex items-center space-x-1.5 text-xs font-semibold shadow-sm transition-all duration-200 hover:scale-105 ${badge.color}`}>
        <Icon className="w-3.5 h-3.5" />
        <span>{badge.text}</span>
      </div>
    );
  };

  const getDrumLabel = (drum) => {
    if (typeof drum === 'object' && drum !== null) {
      const parts = [drum.cecha || drum.kod_bebna || 'Nieznany'];
      if (drum.rozmiar || drum.rozmiar_bebna) {
        parts.push(`(Rozmiar: ${drum.rozmiar || drum.rozmiar_bebna})`);
      }
      return parts.join(' ');
    }
    return drum;
  };

  const isDrumDamaged = (drum) => {
    return typeof drum === 'object' && drum !== null && drum.isDamaged;
  };

  const getRequestStats = () => {
    const stats = {
      total: requests.length,
      pending: requests.filter(r => r.status === 'Pending').length,
      approved: requests.filter(r => r.status === 'Approved' || r.status === 'InTransit').length,
      completed: requests.filter(r => r.status === 'Completed').length,
    };
    return stats;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-550 text-sm font-medium">Ładowanie zgłoszeń...</p>
        </div>
      </div>
    );
  }

  const stats = getRequestStats();

  return (
    <div className="min-h-screen pb-12 bg-gradient-to-br from-blue-50/20 via-white to-blue-100/20">
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
              <p className="text-gray-650">Historia wysłanych zgłoszeń zwrotu bębnów</p>
            </div>
          </div>
          
          <div className="flex space-x-3 w-full sm:w-auto">
            <button
              onClick={fetchRequests}
              className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-gray-750 hover:bg-gray-50 flex items-center justify-center space-x-2 transition-colors shadow-sm"
            >
              <RefreshCw className="w-4 h-4 text-gray-500" />
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
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 shadow-sm">
            {error}
          </div>
        )}

        {/* Stats Row */}
        {requests.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center space-x-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Suma zgłoszeń</p>
                <p className="text-xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center space-x-3">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Oczekujące</p>
                <p className="text-xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center space-x-3">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">W transporcie</p>
                <p className="text-xl font-bold text-gray-900">{stats.approved}</p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center space-x-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Zakończone</p>
                <p className="text-xl font-bold text-gray-900">{stats.completed}</p>
              </div>
            </div>
          </div>
        )}

        {requests.length === 0 && !error ? (
          <div className="text-center py-16 bg-white/80 backdrop-blur-lg rounded-2xl shadow-sm border border-gray-100">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Brak zgłoszeń</h3>
            <p className="text-gray-550 mb-6">Nie wysłałeś jeszcze żadnego zgłoszenia zwrotu.</p>
            <button
              onClick={() => navigate('/return')}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-md"
            >
              Zgłoś pierwszy zwrot
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {requests.map((req) => {
              const drumsCount = Array.isArray(req.selected_drums) ? req.selected_drums.length : 0;
              const collectionDate = new Date(req.collection_date);
              const isExpanded = !!expandedRequests[req.id];
              
              return (
                <div key={req.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-md hover:border-gray-200/80 relative flex flex-col h-full">
                  
                  {/* Card Header (Zawsze widoczny) */}
                  <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-100">
                    <div>
                      <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg uppercase tracking-wider">ZGŁOSZENIE #{req.id}</span>
                      <div className="flex flex-col mt-2">
                        <p className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase leading-none">NIP: {user.nip}</p>
                        <p className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase mt-1 leading-none">Zgłoszono: {new Date(req.created_at).toLocaleDateString('pl-PL')}</p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {getStatusBadge(req.status)}
                    </div>
                  </div>

                  {/* Główne informacje (Zawsze widoczne) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 flex-grow">
                    {/* Zaplanowany transport */}
                    <div className="flex flex-col justify-center p-3 rounded-xl border border-gray-100 bg-gray-50/30">
                      <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">ZAPLANOWANY TRANSPORT</span>
                      <span className="text-xs font-bold text-indigo-700 flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        {req.transport_date ? new Date(req.transport_date).toLocaleDateString('pl-PL') : 'Oczekuje na zaplanowanie'}
                      </span>
                    </div>

                    {/* Ilość zgłoszonych bębnów */}
                    <div className="flex flex-col justify-center p-3 rounded-xl border border-gray-100 bg-gray-50/30">
                      <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">ILOŚĆ BĘBNÓW</span>
                      <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        {drumsCount} {drumsCount === 1 ? 'bęben' : drumsCount < 5 ? 'bębny' : 'bębnów'}
                      </span>
                    </div>

                    {/* Status wystawienia korekt (Bez numerów!) */}
                    <div className="flex flex-col justify-center p-3 rounded-xl border border-gray-100 bg-gray-50/30">
                      <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">STATUS KOREKTY</span>
                      {req.correction_number ? (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          Wystawiono korektę
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          W toku
                        </span>
                      )}
                    </div>

                    {/* Osoba zgłaszająca */}
                    <div className="flex flex-col justify-center p-3 rounded-xl border border-gray-100 bg-gray-50/30">
                      <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">OSOBA ZGŁASZAJĄCA</span>
                      <span className="text-xs font-bold text-gray-700 flex items-center gap-1 truncate">
                        <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        {req.profile_name || 'Główny profil firmy'}
                      </span>
                    </div>
                  </div>

                  {/* Przycisk Pokaż / Ukryj szczegóły */}
                  <div className="mb-2 mt-auto">
                    <button
                      onClick={() => toggleExpand(req.id)}
                      className="w-full py-2.5 px-4 bg-gray-50 border border-gray-200/60 hover:bg-gray-100/80 rounded-xl text-xs font-bold text-blue-600 flex items-center justify-center space-x-2 transition-all shadow-sm"
                    >
                      <span>{isExpanded ? 'Ukryj szczegóły' : 'Pokaż szczegóły'}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Collapsible Section (Widoczne tylko po kliknięciu) */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-dashed border-gray-200 space-y-4 animate-fadeIn">
                      
                      {/* Adres i kontakt */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Adres Odbioru</span>
                          <div className="text-xs text-gray-700 leading-normal flex items-start space-x-1.5">
                            <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                            <span>
                              {req.street}<br />
                              {req.postal_code} {req.city}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Kontakt do załadunku</span>
                          <div className="text-xs text-gray-700 space-y-1">
                            {req.email && <p className="truncate"><strong>Email:</strong> {req.email}</p>}
                            {(req.profile_phone || req.phoneNumber) && <p><strong>Tel:</strong> {req.profile_phone || req.phoneNumber}</p>}
                          </div>
                        </div>
                      </div>

                      {/* Sugerowany termin i godziny */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                        <div>
                          <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Preferowany zakres dat</span>
                          <div className="text-xs font-semibold text-gray-800 flex items-center space-x-1">
                            <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span>
                              {collectionDate.toLocaleDateString('pl-PL')} – {new Date(collectionDate.getTime() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('pl-PL')}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Godziny załadunku</span>
                          <div className="text-xs font-semibold text-gray-800 flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>{req.loading_hours || 'Brak informacji'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Dostępny sprzęt i uwagi */}
                      {req.available_equipment && (
                        <div>
                          <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Sprzęt załadunkowy</span>
                          <p className="text-xs text-gray-750 font-medium">{req.available_equipment}</p>
                        </div>
                      )}

                      {req.notes && (
                        <div className="bg-amber-50/40 p-3 rounded-xl border border-amber-100/50">
                          <span className="text-[9px] font-extrabold text-amber-800 uppercase block mb-1">Uwagi do odbioru:</span>
                          <p className="text-gray-750 text-xs italic leading-relaxed">"{req.notes}"</p>
                        </div>
                      )}

                      {/* Numery faktur korygujących (tutaj w szczegółach są w pełni widoczne) */}
                      {req.correction_number && (
                        <div>
                          <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider block mb-2">Numery korekt</span>
                          <div className="flex flex-wrap gap-1.5">
                            {req.correction_number.split(',').map((num, i) => (
                              <span key={i} className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold rounded shadow-sm">
                                {num.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Pełna lista bębnów z uszkodzeniami */}
                      <div>
                        <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider block mb-2">Zgłoszone bębny w tym zleceniu</span>
                        <div className="flex flex-wrap gap-2">
                          {Array.isArray(req.selected_drums) && req.selected_drums.map((drum, idx) => {
                            const label = getDrumLabel(drum);
                            const damaged = isDrumDamaged(drum);
                            return (
                              <div 
                                key={idx} 
                                className={`
                                  px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border flex items-center space-x-1.5 shadow-sm transition-all duration-200 hover:shadow-md
                                  ${damaged 
                                    ? 'bg-rose-50/80 text-rose-700 border-rose-200 hover:bg-rose-100' 
                                    : 'bg-white text-gray-750 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                  }
                                `}
                              >
                                <Package className={`w-3.5 h-3.5 shrink-0 ${damaged ? 'text-rose-500' : 'text-gray-400'}`} />
                                <span>{label}</span>
                                {damaged && (
                                  <span className="text-[8px] uppercase font-extrabold bg-rose-200 text-rose-800 px-1 py-0.2 rounded shrink-0">
                                    Uszkodzony
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  )}
                  
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
