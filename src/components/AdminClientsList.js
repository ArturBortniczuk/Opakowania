// src/components/AdminClientsList.js - Zaktualizowany o prawdziwe dane
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { companiesAPI } from '../utils/supabaseApi';
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
  RefreshCw,
  UserCheck,
  User,
  Save,
  X,
  Truck
} from 'lucide-react';

const AdminClientsList = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlClientNip = searchParams.get('clientNip');
  const urlOpenModal = searchParams.get('openModal') === 'true';

  const [searchTerm, setSearchTerm] = useState(urlClientNip || '');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(urlClientNip || '');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientDetails, setShowClientDetails] = useState(false);
  const [clients, setClients] = useState([]);
  const [totalClients, setTotalClients] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [globalStats, setGlobalStats] = useState({ total: 0, withDrums: 0, withPending: 0, noDrums: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Stany edycji klienta
  const [isEditing, setIsEditing] = useState(false);
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSalespersonName, setEditSalespersonName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editMarket, setEditMarket] = useState('');
  const [savingClient, setSavingClient] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [modalSuccess, setModalSuccess] = useState(null);

  // Stan paginacji - LIMIT 1000 NA STRONĘ ZGODNIE Z ZAMÓWIENIEM UŻYTKOWNIKA
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 1000;

  // Debouncing dla wyszukiwarki (300ms) w celu uniknięcia obciążania serwera przy każdym znaku
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Automatyczny reset strony przy zmianie filtrów lub sortowania
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filterStatus, sortBy, sortOrder]);

  const handleStartEdit = () => {
    setEditEmail(selectedClient?.email || '');
    setEditPhone(selectedClient?.phone || '');
    setEditSalespersonName(selectedClient?.salesperson_name || '');
    setEditAddress(selectedClient?.address || '');
    setEditMarket(selectedClient?.market || '');
    setModalError(null);
    setModalSuccess(null);
    setIsEditing(true);
  };

  // Pobierz globalne statystyki dla górnego paska (wywoływane raz lub przy odświeżaniu)
  const fetchGlobalStats = async () => {
    try {
      const stats = await companiesAPI.getGlobalStats();
      setGlobalStats(stats);
    } catch (err) {
      console.error('Błąd pobierania statystyk globalnych:', err);
    }
  };

  // Pierwsze pobranie statystyk
  useEffect(() => {
    fetchGlobalStats();
  }, []);

  // Pobierz klientów z serwerową paginacją i wyszukiwaniem
  useEffect(() => {
    const fetchClientsData = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await companiesAPI.getCompanies({
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          search: debouncedSearchTerm,
          sortBy,
          sortOrder,
          filterStatus
        });

        setClients(result.data);
        setTotalClients(result.pagination.total);
        setTotalPages(result.pagination.totalPages);

      } catch (err) {
        console.error('Błąd podczas pobierania danych klientów:', err);
        setError(err.message || 'Nie udało się pobrać listy klientów. Spróbuj ponownie.');
      } finally {
        setLoading(false);
      }
    };

    fetchClientsData();
  }, [currentPage, debouncedSearchTerm, filterStatus, sortBy, sortOrder]);

  // DODANE: Auto-otwieranie modala klienta
  useEffect(() => {
    if (urlOpenModal && urlClientNip && !loading && !showClientDetails && clients.length > 0) {
      const targetClient = clients.find(c => c.nip === urlClientNip);
      if (targetClient) {
        setSelectedClient(targetClient);
        setShowClientDetails(true);
      }
    }
  }, [clients, urlOpenModal, urlClientNip, loading, showClientDetails]);

  const handleCloseModal = () => {
    setShowClientDetails(false);
    setIsEditing(false);
    setModalError(null);
    setModalSuccess(null);
    if (urlOpenModal) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('openModal');
      setSearchParams(newParams);
    }
  };

  // Zgodność z istniejącą strukturą JSX
  const paginatedClients = clients;
  const filteredAndSortedClients = { length: totalClients };
  const stats = globalStats;

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
    setCurrentPage(1);

    try {
      await Promise.all([
        fetchGlobalStats(),
        (async () => {
          const result = await companiesAPI.getCompanies({
            page: 1,
            limit: ITEMS_PER_PAGE,
            search: debouncedSearchTerm,
            sortBy,
            sortOrder,
            filterStatus
          });
          setClients(result.data);
          setTotalClients(result.pagination.total);
          setTotalPages(result.pagination.totalPages);
        })()
      ]);
    } catch (err) {
      console.error('Błąd podczas odświeżania:', err);
      setError(err.message || 'Nie udało się odświeżyć danych.');
    } finally {
      setLoading(false);
    }
  };

  const renderClientCard = (client, index) => (
    <div
      className="bg-white/90 rounded-2xl p-6 shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] flex flex-col h-full"
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
          <div className="relative">
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors duration-200">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex items-center space-x-1 text-sm mb-1">
            <Package className="w-4 h-4 text-blue-600" />
            <span className="text-gray-500 font-medium text-xs">Bębny</span>
          </div>
          <span className="font-bold text-gray-900">{client.drumsCount}</span>
        </div>

        <div className="flex flex-col items-center justify-center text-center border-l border-r border-gray-200">
          <div className="flex items-center space-x-1 text-sm mb-1">
            <Clock className="w-4 h-4 text-yellow-600" />
            <span className="text-gray-500 font-medium text-xs">Oczekujące</span>
          </div>
          <span className="font-bold text-gray-900">{client.pendingRequests}</span>
        </div>

        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex items-center space-x-1 text-sm mb-1">
            <AlertCircle className={`w-4 h-4 ${client.overdueDrums > 0 ? 'text-red-600' : 'text-gray-400'}`} />
            <span className="text-gray-500 font-medium text-xs">Po terminie</span>
          </div>
          <span className={`font-bold ${client.overdueDrums > 0 ? 'text-red-600' : 'text-gray-400'}`}>
            {client.overdueDrums}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-4 text-sm">
        {client.salesperson_name && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-blue-50/75 py-2 px-3 rounded-lg border border-blue-100">
            <div className="flex items-center space-x-2 text-blue-800 font-bold text-sm">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span className="truncate">{client.salesperson_name}</span>
            </div>
            {client.market && (
              <div className="flex items-center space-x-1 text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-100 shadow-sm text-xs font-semibold w-fit">
                <MapPin className="w-3 h-3 text-indigo-500" />
                <span>Rynek: {client.market}</span>
              </div>
            )}
          </div>
        )}
        {!client.salesperson_name && client.market && (
          <div className="flex items-center space-x-2 text-indigo-700 bg-indigo-50/75 py-1 px-2.5 rounded-lg border border-indigo-100 font-semibold w-fit">
            <MapPin className="w-4 h-4 text-indigo-500" />
            <span>Rynek: {client.market}</span>
          </div>
        )}
        {!client.salesperson_name && !client.market && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gray-50/75 py-2 px-3 rounded-lg border border-gray-100">
            <div className="flex items-center space-x-2 text-gray-500 text-sm">
              <UserCheck className="w-4 h-4 text-gray-400" />
              <span className="truncate italic">Brak opiekuna</span>
            </div>
          </div>
        )}
        
        <div className={`flex items-center space-x-2 ${client.email ? 'text-gray-600' : 'text-gray-400 italic'}`}>
          <Mail className="w-4 h-4" />
          <span className="truncate">{client.email || 'Brak adresu e-mail'}</span>
        </div>
        
        <div className={`flex items-center space-x-2 ${client.phone ? 'text-gray-600' : 'text-gray-400 italic'}`}>
          <Phone className="w-4 h-4" />
          <span className="truncate">{client.phone || 'Brak numeru telefonu'}</span>
        </div>
        
        <div className={`flex items-center space-x-2 ${client.address ? 'text-gray-600' : 'text-gray-400 italic'}`}>
          <MapPin className="w-4 h-4" />
          <span className="truncate">{client.address || 'Brak adresu firmy'}</span>
        </div>
        
        <div className="flex items-center space-x-2 text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>Ostatnia aktywność: {new Date(client.lastActivity).toLocaleDateString('pl-PL')}</span>
        </div>
      </div>

      <div className="flex space-x-2 mt-auto pt-2">
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

  const renderClientDetailsModal = () => {
    if (!showClientDetails || !selectedClient) return null;

    const handleSave = async () => {
      setSavingClient(true);
      setModalError(null);
      setModalSuccess(null);
      try {
        const updates = {
          email: editEmail.trim() || null,
          phone: editPhone.trim() || null,
          salesperson_name: editSalespersonName.trim() || null,
          address: editAddress.trim() || null,
          market: editMarket || null
        };

        await companiesAPI.updateCompany(selectedClient.nip, updates);

        // Aktualizuj listę klientów
        setClients(prev => prev.map(c => c.nip === selectedClient.nip ? { ...c, ...updates } : c));
        setSelectedClient(prev => ({ ...prev, ...updates }));

        setModalSuccess('Dane zostały zaktualizowane pomyślnie!');
        setTimeout(() => {
          setIsEditing(false);
          setModalSuccess(null);
        }, 1200);
      } catch (err) {
        console.error('Błąd zapisu danych klienta:', err);
        setModalError(err.message || 'Wystąpił błąd podczas aktualizacji danych.');
      } finally {
        setSavingClient(false);
      }
    };

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300 animate-fadeIn"
        onClick={handleCloseModal}
      >
        <div
          className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-blue-50 transform transition-all scale-100 duration-300 animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-150 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 rounded-t-3xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                  {isEditing ? 'Edycja danych klienta' : 'Szczegóły klienta'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">Firma: <span className="font-semibold text-blue-800">{selectedClient.name}</span></p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Alerts */}
            {modalError && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-start space-x-3 text-sm animate-shake">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}
            {modalSuccess && (
              <div className="p-4 rounded-2xl bg-green-50 border border-green-200 text-green-700 flex items-start space-x-3 text-sm animate-pulse">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>{modalSuccess}</span>
              </div>
            )}

            {isEditing ? (
              /* TRYB EDYCJI */
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <Mail className="w-4 h-4 mr-1.5 text-blue-600" /> Adres e-mail
                    </label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="klient@firma.pl"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50/50 focus:bg-white text-gray-900"
                    />
                    <p className="text-xs text-gray-400 mt-1">Służy do rejestracji i odzyskiwania hasła</p>
                  </div>

                  {/* Telefon */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <Phone className="w-4 h-4 mr-1.5 text-blue-600" /> Telefon kontaktowy
                    </label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+48 123 456 789"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50/50 focus:bg-white text-gray-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Handlowiec */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <User className="w-4 h-4 mr-1.5 text-blue-600" /> Opiekun handlowy (Handlowiec)
                    </label>
                    <input
                      type="text"
                      value={editSalespersonName}
                      onChange={(e) => setEditSalespersonName(e.target.value)}
                      placeholder="Imię i Nazwisko Handlowca"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50/50 focus:bg-white text-gray-900 font-medium"
                    />
                  </div>

                  {/* Rynek */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <MapPin className="w-4 h-4 mr-1.5 text-blue-600" /> Obszar / Rynek (Województwo)
                    </label>
                    <select
                      value={editMarket}
                      onChange={(e) => setEditMarket(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50/50 focus:bg-white text-gray-950 font-bold"
                    >
                      <option value="">Wybierz rynek...</option>
                      <option value="Podlaski">Podlaski</option>
                      <option value="Mazowiecki">Mazowiecki</option>
                      <option value="Lubelski">Lubelski</option>
                      <option value="Wielkopolski">Wielkopolski</option>
                      <option value="Dolnośląski">Dolnośląski</option>
                      <option value="Małopolski">Małopolski</option>
                      <option value="Pomorski">Pomorski</option>
                      <option value="Zachodniopomorski">Zachodniopomorski</option>
                      <option value="Śląski">Śląski</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* Adres */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <MapPin className="w-4 h-4 mr-1.5 text-blue-600" /> Adres firmy
                    </label>
                    <textarea
                      rows="2"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="ul. Sezamkowa 4, 00-001 Warszawa"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50/50 focus:bg-white text-gray-900 resize-none"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={handleSave}
                    disabled={savingClient}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50"
                  >
                    {savingClient ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Zapisz zmiany</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    disabled={savingClient}
                    className="flex-1 bg-gray-100 border border-gray-300 text-gray-700 py-3 px-4 rounded-xl font-bold hover:bg-gray-200 transition-all duration-200"
                  >
                    Anuluj
                  </button>
                </div>
              </div>
            ) : (
              /* TRYB PODGLĄDU */
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Info */}
                  <div className="bg-blue-50/30 border border-blue-100/50 p-5 rounded-2xl space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-blue-900 border-b border-blue-100/50 pb-2">Informacje podstawowe</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Nazwa firmy</label>
                        <p className="text-gray-900 font-extrabold text-base leading-snug">{selectedClient.name}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">NIP</label>
                        <p className="text-gray-900 font-mono font-semibold text-sm">{selectedClient.nip}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Obszar / Rynek</label>
                        {selectedClient.market ? (
                          <p className="text-indigo-950 font-bold flex items-center text-sm bg-indigo-50/80 px-2.5 py-1 rounded-lg border border-indigo-100 w-fit">
                            <MapPin className="w-4 h-4 mr-1 text-indigo-600" />
                            Rynek: {selectedClient.market}
                          </p>
                        ) : (
                          <p className="text-gray-500 italic text-xs">Nie przypisano rynku</p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Adres e-mail</label>
                        {selectedClient.email ? (
                          <p className="text-gray-900 font-semibold flex items-center text-sm">
                            <Mail className="w-3.5 h-3.5 mr-1 text-blue-600" />
                            {selectedClient.email}
                          </p>
                        ) : (
                          <p className="text-red-500 text-xs font-bold bg-red-50 px-2.5 py-1 rounded-lg border border-red-100 w-fit flex items-center">
                            <AlertCircle className="w-3.5 h-3.5 mr-1" /> Brak adresu e-mail (Brak możliwości rejestracji!)
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Telefon kontaktowy</label>
                        <p className="text-gray-900 font-medium text-sm flex items-center">
                          <Phone className="w-3.5 h-3.5 mr-1 text-blue-600" />
                          {selectedClient.phone || 'Brak danych'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Opiekun handlowy (Handlowiec)</label>
                        {selectedClient.salesperson_name ? (
                          <p className="text-indigo-900 font-bold flex items-center text-sm">
                            <UserCheck className="w-4 h-4 mr-1 text-indigo-600" />
                            {selectedClient.salesperson_name}
                          </p>
                        ) : (
                          <p className="text-gray-500 italic text-xs">Nie przypisano opiekuna</p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Adres firmy</label>
                        <p className="text-gray-900 text-sm leading-snug">{selectedClient.address || 'Brak danych'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="bg-gray-50/50 border border-gray-150 p-5 rounded-2xl space-y-4 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 border-b border-gray-200 pb-2">Statystyki bębnów i zwrotów</h3>
                      <div className="space-y-3 mt-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 font-medium">Wszystkie bębny</span>
                          <span className="font-bold text-gray-900 bg-gray-200/50 px-2.5 py-0.5 rounded-lg">{selectedClient.drumsCount}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 font-medium">Przeterminowane</span>
                          <span className={`font-bold px-2.5 py-0.5 rounded-lg ${selectedClient.overdueDrums > 0 ? 'text-red-700 bg-red-100' : 'text-gray-600 bg-gray-200/50'}`}>
                            {selectedClient.overdueDrums}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 font-medium">Oczekujące zgłoszenia</span>
                          <span className={`font-bold px-2.5 py-0.5 rounded-lg ${selectedClient.pendingRequests > 0 ? 'text-yellow-800 bg-yellow-100' : 'text-gray-600 bg-gray-200/50'}`}>
                            {selectedClient.pendingRequests}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 font-medium">Wszystkie zgłoszenia</span>
                          <span className="font-bold text-gray-900 bg-gray-200/50 px-2.5 py-0.5 rounded-lg">{selectedClient.totalRequests}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 font-medium">Ostatnia aktywność</span>
                          <span className="font-semibold text-gray-700">{new Date(selectedClient.lastActivity).toLocaleDateString('pl-PL')}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleStartEdit}
                      className="w-full mt-4 bg-white border border-blue-200 hover:border-blue-300 text-blue-700 hover:bg-blue-50/50 py-2.5 px-4 rounded-xl font-bold transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edytuj dane klienta</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-4 border-t border-gray-150">
                  <button
                    onClick={() => {
                      handleCloseModal();
                      onNavigate('admin-drums', { clientNip: selectedClient.nip });
                    }}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg hover:scale-[1.01]"
                  >
                    <Package className="w-4 h-4" />
                    <span>Zobacz bębny</span>
                  </button>
                  <button
                    onClick={() => {
                      handleCloseModal();
                      navigate(`/return?clientNip=${selectedClient.nip}`);
                    }}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3 px-4 rounded-xl font-bold hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg hover:scale-[1.01]"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Zrób zgłoszenie</span>
                  </button>
                  <button
                    onClick={() => {
                      handleCloseModal();
                      onNavigate('admin-returns', { clientNip: selectedClient.nip });
                    }}
                    className="flex-1 bg-gray-100 border border-gray-300 text-gray-700 py-3 px-4 rounded-xl font-bold hover:bg-gray-200 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Zobacz zgłoszenia</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading && clients.length === 0) {
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
                  className="appearance-none bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-medium text-gray-800"
                >
                  <option value="all">Wszyscy klienci</option>
                  <option value="active">Z bębnami (>0)</option>
                  <option value="no-drums">Bez bębnów (=0)</option>
                  <option value="pending">Z oczekującymi zwrotami</option>
                </select>
                <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Sort */}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleSort('name')}
                  className={`px-4 py-3 rounded-xl border transition-all duration-200 flex items-center space-x-2 ${sortBy === 'name'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-blue-50'
                    }`}
                >
                  <span>Nazwa</span>
                  <ArrowUpDown className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleSort('drumsCount')}
                  className={`px-4 py-3 rounded-xl border transition-all duration-200 flex items-center space-x-2 ${sortBy === 'drumsCount'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-blue-50'
                    }`}
                >
                  <span>Ilość bębnów</span>
                  <ArrowUpDown className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleSort('lastActivity')}
                  className={`px-4 py-3 rounded-xl border transition-all duration-200 flex items-center space-x-2 ${sortBy === 'lastActivity'
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
              <div className="text-2xl font-bold text-green-600">{stats.withDrums}</div>
              <div className="text-sm text-gray-600">Z bębnami</div>
            </div>
            <div className="bg-white/80 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-yellow-100 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.withPending}</div>
              <div className="text-sm text-gray-600">Z oczekującymi zwrotami</div>
            </div>
            <div className="bg-white/80 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-red-100 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.noDrums}</div>
              <div className="text-sm text-gray-600">Bez bębnów</div>
            </div>
          </div>
        </div>

        {/* Clients Grid */}
        <div className={loading ? 'opacity-50 pointer-events-none transition-opacity duration-200' : 'transition-opacity duration-200'}>
          {paginatedClients.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
                {paginatedClients.map((client, index) => (
                  <React.Fragment key={client.nip}>
                    {renderClientCard(client, index)}
                  </React.Fragment>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-blue-150 mb-8 gap-4">
                  <div className="text-sm font-semibold text-slate-700">
                    Pokazywane <span className="text-blue-600 font-extrabold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="text-blue-600 font-extrabold">{Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedClients.length)}</span> z <span className="text-slate-900 font-black">{filteredAndSortedClients.length}</span> klientów
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setCurrentPage(prev => Math.max(prev - 1, 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={currentPage === 1}
                      className="px-4 py-2 border border-gray-300 rounded-xl font-bold text-sm text-gray-700 bg-white hover:bg-blue-50 disabled:opacity-50 disabled:hover:bg-white transition-all shadow-sm cursor-pointer"
                    >
                      ← Poprzednia
                    </button>

                    <div className="flex items-center px-4 font-bold text-sm text-blue-700 bg-blue-50 rounded-xl border border-blue-100">
                      Strona {currentPage} z {totalPages}
                    </div>

                    <button
                      onClick={() => {
                        setCurrentPage(prev => Math.min(prev + 1, totalPages));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-xl font-bold text-sm text-gray-700 bg-white hover:bg-blue-50 disabled:opacity-50 disabled:hover:bg-white transition-all shadow-sm cursor-pointer"
                    >
                      Następna →
                    </button>
                  </div>
                </div>
              )}
            </>
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
        </div>

        {renderClientDetailsModal()}
      </div>
    </div>
  );
};

export default AdminClientsList;
