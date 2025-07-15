// src/components/AdminReturnPeriodsManager.js - Zaktualizowany o rzeczywiste dane z Supabase
import React, { useState, useMemo, useEffect } from 'react';
import { companiesAPI, returnPeriodsAPI } from '../utils/supabaseApi';
import { 
  Calendar, 
  Search, 
  Filter, 
  Building2,
  Edit,
  Save,
  X,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle,
  Settings,
  RotateCcw,
  Info,
  RefreshCw,
  Loader
} from 'lucide-react';

const AdminReturnPeriodsManager = ({ onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingClient, setEditingClient] = useState(null);
  const [editingPeriod, setEditingPeriod] = useState('');
  const [showAddNew, setShowAddNew] = useState(false);
  const [newClientNip, setNewClientNip] = useState('');
  const [newPeriod, setNewPeriod] = useState('85');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Stan danych
  const [companies, setCompanies] = useState([]);
  const [returnPeriods, setReturnPeriods] = useState([]);

  // Pobierz dane z Supabase
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const [companiesData, periodsData] = await Promise.all([
          companiesAPI.getCompanies(),
          returnPeriodsAPI.getReturnPeriods()
        ]);
        
        setCompanies(companiesData);
        setReturnPeriods(periodsData);
        
      } catch (err) {
        console.error('Błąd podczas pobierania danych:', err);
        setError('Nie udało się pobrać danych. Spróbuj ponownie.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Funkcja pomocnicza do pobierania terminu zwrotu dla klienta
  const getReturnPeriodForClient = (nip) => {
    const customPeriod = returnPeriods.find(period => period.nip === nip);
    return customPeriod ? customPeriod.return_period_days : 85;
  };

  const enrichedClients = useMemo(() => {
    return companies.map(client => {
      const currentPeriod = getReturnPeriodForClient(client.nip);
      const hasCustomPeriod = returnPeriods.some(period => period.nip === client.nip);
      
      return {
        ...client,
        currentReturnPeriod: currentPeriod,
        hasCustomPeriod,
        isDefault: currentPeriod === 85
      };
    });
  }, [companies, returnPeriods]);

  const filteredClients = useMemo(() => {
    return enrichedClients.filter(client => 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.nip.includes(searchTerm) ||
      (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [enrichedClients, searchTerm]);

  const handleEditStart = (client) => {
    setEditingClient(client.nip);
    setEditingPeriod(client.currentReturnPeriod.toString());
  };

  const handleEditSave = async (clientNip) => {
    setSaving(true);
    setError(null);
    
    try {
      const periodDays = parseInt(editingPeriod);
      
      if (periodDays < 1 || periodDays > 365) {
        throw new Error('Termin zwrotu musi być między 1 a 365 dni');
      }
      
      // Zapisz w bazie danych
      await returnPeriodsAPI.updateReturnPeriod(clientNip, periodDays);
      
      // Odśwież dane
      const updatedPeriods = await returnPeriodsAPI.getReturnPeriods();
      setReturnPeriods(updatedPeriods);
      
      setEditingClient(null);
      setEditingPeriod('');
      
    } catch (error) {
      console.error('Błąd podczas zapisywania:', error);
      setError(error.message || 'Wystąpił błąd podczas zapisywania. Spróbuj ponownie.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditCancel = () => {
    setEditingClient(null);
    setEditingPeriod('');
    setError(null);
  };

  const handleAddNew = async () => {
    if (!newClientNip || !newPeriod) {
      setError('Wypełnij wszystkie pola');
      return;
    }

    const periodDays = parseInt(newPeriod);
    if (periodDays < 1 || periodDays > 365) {
      setError('Termin zwrotu musi być między 1 a 365 dni');
      return;
    }

    // Sprawdź czy klient istnieje
    const clientExists = companies.some(company => company.nip === newClientNip);
    if (!clientExists) {
      setError('Klient o podanym NIPie nie istnieje w systemie');
      return;
    }

    setSaving(true);
    setError(null);
    
    try {
      await returnPeriodsAPI.updateReturnPeriod(newClientNip, periodDays);
      
      // Odśwież dane
      const updatedPeriods = await returnPeriodsAPI.getReturnPeriods();
      setReturnPeriods(updatedPeriods);
      
      setShowAddNew(false);
      setNewClientNip('');
      setNewPeriod('85');
      
    } catch (error) {
      console.error('Błąd podczas dodawania:', error);
      setError('Wystąpił błąd podczas dodawania. Spróbuj ponownie.');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = async (clientNip) => {
    if (!window.confirm('Czy na pewno chcesz przywrócić domyślny termin 85 dni?')) return;
    
    setSaving(true);
    setError(null);
    
    try {
      // Usuń niestandardowy termin (przywróć domyślny)
      await returnPeriodsAPI.updateReturnPeriod(clientNip, 85);
      
      // Odśwież dane
      const updatedPeriods = await returnPeriodsAPI.getReturnPeriods();
      setReturnPeriods(updatedPeriods);
      
    } catch (error) {
      console.error('Błąd podczas resetowania:', error);
      setError('Wystąpił błąd. Spróbuj ponownie.');
    } finally {
      setSaving(false);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [companiesData, periodsData] = await Promise.all([
        companiesAPI.getCompanies(),
        returnPeriodsAPI.getReturnPeriods()
      ]);
      
      setCompanies(companiesData);
      setReturnPeriods(periodsData);
      
    } catch (err) {
      console.error('Błąd podczas odświeżania danych:', err);
      setError('Nie udało się odświeżyć danych.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (client) => {
    if (client.isDefault) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
          <Clock className="w-3 h-3" />
          <span className="hidden sm:inline">Domyślny (85 dni)</span>
          <span className="sm:hidden">85 dni</span>
        </span>
      );
    }
    
    const isExtended = client.currentReturnPeriod > 85;
    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${
        isExtended 
          ? 'bg-blue-100 text-blue-800 border-blue-200' 
          : 'bg-yellow-100 text-yellow-800 border-yellow-200'
      }`}>
        {isExtended ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
        <span className="hidden lg:inline">
          Niestandardowy ({client.currentReturnPeriod} dni)
        </span>
        <span className="lg:hidden">
          {client.currentReturnPeriod} dni
        </span>
      </span>
    );
  };

  const ClientCard = ({ client, index }) => (
    <div 
      className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-300 h-full flex flex-col"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-gray-900 line-clamp-2 leading-tight">
              {client.name}
            </h3>
            <p className="text-sm text-gray-600 truncate">NIP: {client.nip}</p>
          </div>
        </div>
        
        <div className="flex-shrink-0 ml-2">
          {getStatusBadge(client)}
        </div>
      </div>

      <div className="flex-1 space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Email:</span>
          <span className="font-medium text-gray-900 truncate ml-2">{client.email || 'Brak'}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Telefon:</span>
          <span className="font-medium text-gray-900">{client.phone || 'Brak'}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Termin zwrotu:</span>
          <div className="flex items-center space-x-2">
            {editingClient === client.nip ? (
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={editingPeriod}
                  onChange={(e) => setEditingPeriod(e.target.value)}
                  className="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
                  min="1"
                  max="365"
                  disabled={saving}
                />
                <button
                  onClick={() => handleEditSave(client.nip)}
                  disabled={saving}
                  className="p-1 text-green-600 hover:bg-green-100 rounded disabled:opacity-50"
                >
                  {saving ? <Loader className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                </button>
                <button
                  onClick={handleEditCancel}
                  disabled={saving}
                  className="p-1 text-red-600 hover:bg-red-100 rounded disabled:opacity-50"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="font-bold text-blue-600">{client.currentReturnPeriod} dni</span>
                <button
                  onClick={() => handleEditStart(client)}
                  className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                  disabled={saving}
                >
                  <Edit className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {!client.isDefault && (
        <div className="mt-auto pt-4 border-t border-gray-100">
          <button
            onClick={() => resetToDefault(client.nip)}
            disabled={saving}
            className="w-full px-3 py-2 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Przywróć domyślny (85 dni)</span>
          </button>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Ładowanie danych...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                Zarządzanie terminami zwrotu
              </h1>
              <p className="text-lg text-gray-600 mt-2">
                Ustaw niestandardowe terminy zwrotu dla klientów
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={refreshData}
                disabled={loading}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Odśwież</span>
              </button>
              
              <button
                onClick={() => setShowAddNew(!showAddNew)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center space-x-2 shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Dodaj termin</span>
              </button>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Informacje o terminach zwrotu:</p>
                <ul className="space-y-1">
                  <li>• Domyślny termin zwrotu to <strong>85 dni</strong> od daty wydania bębna</li>
                  <li>• Możesz ustawić niestandardowe terminy dla konkretnych klientów</li>
                  <li>• Terminy można ustawiać w zakresie od 1 do 365 dni</li>
                  <li>• Zmiany wchodzą w życie natychmiast dla nowych bębnów</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <p className="text-red-800 font-medium">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-blue-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Szukaj klientów (nazwa, NIP, email)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              Wyświetlane: <span className="font-medium">{filteredClients.length}</span> z <span className="font-medium">{companies.length}</span> klientów
            </div>
          </div>
        </div>

        {/* Add New Period Form */}
        {showAddNew && (
          <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg border border-blue-100 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dodaj niestandardowy termin zwrotu</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">NIP klienta</label>
                <input
                  type="text"
                  placeholder="1234567890"
                  value={newClientNip}
                  onChange={(e) => setNewClientNip(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Termin zwrotu (dni)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={newPeriod}
                  onChange={(e) => setNewPeriod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={saving}
                />
              </div>
              <div className="flex items-end space-x-2">
                <button
                  onClick={handleAddNew}
                  disabled={saving || !newClientNip || !newPeriod}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>{saving ? 'Dodawanie...' : 'Dodaj'}</span>
                </button>
                <button
                  onClick={() => {
                    setShowAddNew(false);
                    setNewClientNip('');
                    setNewPeriod('85');
                    setError(null);
                  }}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors duration-200 disabled:opacity-50"
                >
                  Anuluj
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clients Grid */}
        {filteredClients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8 items-stretch">
            {filteredClients.map((client, index) => (
              <ClientCard key={client.nip} client={client} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Settings className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nie znaleziono klientów</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm ? 'Spróbuj zmienić kryteria wyszukiwania' : 'Brak klientów w systemie'}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200"
              >
                Wyczyść filtry
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReturnPeriodsManager;
