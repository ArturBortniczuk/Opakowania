// src/components/AdminReturnPeriodsManager.js
import React, { useState, useMemo } from 'react';
import { mockCompanies, mockCustomReturnPeriods, getReturnPeriodForClient } from '../data/additionalData';

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
  Info
} from 'lucide-react';

const AdminReturnPeriodsManager = ({ onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingClient, setEditingClient] = useState(null);
  const [editingPeriod, setEditingPeriod] = useState('');
  const [showAddNew, setShowAddNew] = useState(false);
  const [newClientNip, setNewClientNip] = useState('');
  const [newPeriod, setNewPeriod] = useState('85');
  const [loading, setLoading] = useState(false);

  // Stan przechowujący lokalne zmiany
  const [localCustomPeriods, setLocalCustomPeriods] = useState([...mockCustomReturnPeriods]);

  const enrichedClients = useMemo(() => {
    return mockCompanies.map(client => {
      const currentPeriod = getReturnPeriodForClient(client.nip);
      const hasCustomPeriod = localCustomPeriods.some(period => period.nip === client.nip);
      
      return {
        ...client,
        currentReturnPeriod: currentPeriod,
        hasCustomPeriod,
        isDefault: currentPeriod === 85
      };
    });
  }, [localCustomPeriods]);

  const filteredClients = useMemo(() => {
    return enrichedClients.filter(client => 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.nip.includes(searchTerm) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [enrichedClients, searchTerm]);

  const handleEditStart = (client) => {
    setEditingClient(client.nip);
    setEditingPeriod(client.currentReturnPeriod.toString());
  };

  const handleEditSave = async (clientNip) => {
    setLoading(true);
    
    try {
      // Symulacja zapisu do API
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const periodDays = parseInt(editingPeriod);
      
      // Zaktualizuj lokalne dane
      setLocalCustomPeriods(prev => {
        const filtered = prev.filter(period => period.nip !== clientNip);
        if (periodDays !== 85) {
          return [...filtered, { nip: clientNip, returnPeriodDays: periodDays }];
        }
        return filtered;
      });
      
      setEditingClient(null);
      setEditingPeriod('');
      
      // W rzeczywistej aplikacji tutaj byłby call do API
      console.log(`Zapisano nowy termin ${periodDays} dni dla klienta ${clientNip}`);
      
    } catch (error) {
      console.error('Błąd podczas zapisywania:', error);
      alert('Wystąpił błąd podczas zapisywania. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCancel = () => {
    setEditingClient(null);
    setEditingPeriod('');
  };

  const handleAddNew = async () => {
    if (!newClientNip || !newPeriod) {
      alert('Wypełnij wszystkie pola');
      return;
    }

    const periodDays = parseInt(newPeriod);
    if (periodDays < 1 || periodDays > 365) {
      alert('Termin zwrotu musi być między 1 a 365 dni');
      return;
    }

    setLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setLocalCustomPeriods(prev => {
        const filtered = prev.filter(period => period.nip !== newClientNip);
        return [...filtered, { nip: newClientNip, returnPeriodDays: periodDays }];
      });
      
      setShowAddNew(false);
      setNewClientNip('');
      setNewPeriod('85');
      
      alert('✅ Dodano nowy termin zwrotu!');
      
    } catch (error) {
      console.error('Błąd podczas dodawania:', error);
      alert('Wystąpił błąd podczas dodawania. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  };

  const resetToDefault = async (clientNip) => {
    if (!window.confirm('Czy na pewno chcesz przywrócić domyślny termin 85 dni?')) return;
    
    setLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setLocalCustomPeriods(prev => prev.filter(period => period.nip !== clientNip));
      
      alert('✅ Przywrócono domyślny termin 85 dni');
      
    } catch (error) {
      console.error('Błąd podczas resetowania:', error);
      alert('Wystąpił błąd. Spróbuj ponownie.');
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
          <span className="font-medium text-gray-900 truncate ml-2">{client.email}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Telefon:</span>
          <span className="font-medium text-gray-900">{client.phone}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Termin zwrotu:</span>
          <div className="flex items-center space-x-2">
            {editingClient === client.nip ? (
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={editingPeriod}
                  onChange={(e) => setEditingPeriod(e.target.value)}
                  className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
                <span className="text-sm text-gray-600">dni</span>
                <button
                  onClick={() => handleEditSave(client.nip)}
                  disabled={loading}
                  className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors duration-200"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={handleEditCancel}
                  disabled={loading}
                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors duration-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className={`font-medium ${client.isDefault ? 'text-gray-900' : 'text-blue-600'}`}>
                  {client.currentReturnPeriod} dni
                </span>
                <button
                  onClick={() => handleEditStart(client)}
                  disabled={loading}
                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors duration-200"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex space-x-2 mt-auto">
        <button
          onClick={() => onNavigate('admin-clients')}
          className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2 px-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
        >
          <Building2 className="w-4 h-4" />
          <span>Zobacz klienta</span>
        </button>
        
        {!client.isDefault && (
          <button
            onClick={() => resetToDefault(client.nip)}
            disabled={loading}
            className="bg-gray-600 text-white py-2 px-3 rounded-xl font-medium hover:bg-gray-700 transition-all duration-200 flex items-center justify-center text-sm"
            title="Przywróć domyślny termin"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  const stats = {
    total: enrichedClients.length,
    customPeriods: enrichedClients.filter(c => !c.isDefault).length,
    extended: enrichedClients.filter(c => c.currentReturnPeriod > 85).length,
    shortened: enrichedClients.filter(c => c.currentReturnPeriod < 85).length
  };

  return (
    <div className="min-h-screen pt-6 lg:ml-80 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-800 bg-clip-text text-transparent">
                  Zarządzanie terminami zwrotu
                </h1>
                <p className="text-gray-600">Ustaw indywidualne terminy zwrotu dla klientów</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowAddNew(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Dodaj termin</span>
            </button>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Jak działają terminy zwrotu:</p>
                <ul className="space-y-1 text-blue-700">
                  <li>• Domyślny termin to <strong>85 dni</strong> od daty wydania bębna</li>
                  <li>• Możesz ustawić indywidualny termin dla każdego klienta</li>
                  <li>• Termin jest liczony automatycznie: DATA_WYDANIA + ilość dni</li>
                  <li>• Zmiany dotyczą wszystkich nowych bębnów wydanych klientowi</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-blue-100 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Szukaj klientów po nazwie, NIP lub email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/80 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-blue-100 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Wszyscy klienci</div>
            </div>
            <div className="bg-white/80 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-purple-100 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.customPeriods}</div>
              <div className="text-sm text-gray-600">Niestandardowe terminy</div>
            </div>
            <div className="bg-white/80 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-green-100 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.extended}</div>
              <div className="text-sm text-gray-600">Przedłużone terminy</div>
            </div>
            <div className="bg-white/80 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-yellow-100 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.shortened}</div>
              <div className="text-sm text-gray-600">Skrócone terminy</div>
            </div>
          </div>
        </div>

        {/* Add New Modal */}
        {showAddNew && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">Dodaj nowy termin zwrotu</h3>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    NIP klienta
                  </label>
                  <select
                    value={newClientNip}
                    onChange={(e) => setNewClientNip(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Wybierz klienta</option>
                    {mockCompanies.map(company => (
                      <option key={company.nip} value={company.nip}>
                        {company.name} (NIP: {company.nip})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Termin zwrotu (dni)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={newPeriod}
                    onChange={(e) => setNewPeriod(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="np. 120"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Domyślny termin to 85 dni. Możesz ustawić od 1 do 365 dni.
                  </p>
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-200 flex space-x-4">
                <button
                  onClick={() => setShowAddNew(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleAddNew}
                  disabled={loading || !newClientNip || !newPeriod}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {loading ? 'Dodawanie...' : 'Dodaj'}
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
            <p className="text-gray-600 mb-6">Spróbuj zmienić kryteria wyszukiwania</p>
            <button
              onClick={() => setSearchTerm('')}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200"
            >
              Wyczyść filtry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReturnPeriodsManager;