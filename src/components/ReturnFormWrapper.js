// src/components/ReturnFormWrapper.js
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { companiesAPI } from '../utils/supabaseApi';
import ReturnForm from './ReturnForm';
import { Search, Building2, UserCheck, MapPin, Phone, Mail, ArrowLeft, Package } from 'lucide-react';

const ReturnFormWrapper = ({ currentUser, profile }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const clientNip = searchParams.get('clientNip');

  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  const isStaff = ['admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Magazyn', 'Specjalista'].includes(currentUser?.role);

  // Pobierz dane wybranego klienta (jeśli NIP jest w URL)
  useEffect(() => {
    const fetchSelectedClient = async () => {
      if (!clientNip) {
        setSelectedClient(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const clientData = await companiesAPI.getCompany(clientNip);
        if (clientData) {
          setSelectedClient({
            nip: clientData.nip,
            companyName: clientData.name,
            name: clientData.name,
            email: clientData.email || '',
            phone: clientData.phone || '',
            street: clientData.address ? clientData.address.split(',')[0] : '',
            city: clientData.address && clientData.address.split(',')[1] ? clientData.address.split(',')[1].trim() : ''
          });
        } else {
          throw new Error('Nie znaleziono klienta o podanym numerze NIP.');
        }
      } catch (err) {
        console.error('Błąd pobierania danych klienta:', err);
        setError(err.message || 'Nie udało się pobrać danych klienta.');
        // Wyczyść niepoprawny NIP z URL
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('clientNip');
        setSearchParams(newParams);
      } finally {
        setLoading(false);
      }
    };

    if (isStaff) {
      fetchSelectedClient();
    }
  }, [clientNip, isStaff]);

  // Pobierz listę wszystkich dostępnych klientów dla pracownika
  useEffect(() => {
    const fetchClients = async () => {
      if (!isStaff || clientNip) return;
      setLoading(true);
      setError(null);
      try {
        const result = await companiesAPI.getCompanies({ limit: 1000 });
        setClients(result.data || []);
      } catch (err) {
        console.error('Błąd pobierania listy klientów:', err);
        setError('Nie udało się pobrać listy klientów.');
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [isStaff, clientNip]);

  // Filtrowanie klientów po wyszukiwaniu
  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.nip.includes(searchTerm) ||
    (c.salesperson_name && c.salesperson_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelectClient = (nip) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('clientNip', nip);
    setSearchParams(newParams);
  };

  const handleClearClient = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('clientNip');
    setSearchParams(newParams);
    setSelectedClient(null);
  };

  // 1. Zwykły klient -> Renderuje formularz bezpośrednio dla niego
  if (!isStaff) {
    return <ReturnForm user={currentUser} profile={profile} />;
  }

  // 2. Pracownik i wybrano klienta -> Renderuje formularz z podłożonymi danymi wybranego klienta
  if (selectedClient) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={handleClearClient}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 hover:bg-gray-150 text-gray-700 bg-white font-semibold rounded-xl transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Zmień klienta</span>
          </button>
          
          <div className="text-right">
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">Wypełniasz w imieniu</span>
            <span className="text-sm font-extrabold text-blue-700">{selectedClient.companyName} (NIP: {selectedClient.nip})</span>
          </div>
        </div>
        <ReturnForm 
          user={selectedClient} 
          onSubmit={() => {
            // Po wysłaniu, wróć do listy zgłoszeń zwrotów pracownika
            navigate('/admin/returns');
          }}
        />
      </div>
    );
  }

  // 3. Pracownik i NIE wybrano klienta -> Renderuje interfejs wyszukiwania i wyboru klienta
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      <div className="mb-8 flex items-center space-x-4">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
          <UserCheck className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-blue-700 bg-clip-text text-transparent tracking-tight">
            Nowe zgłoszenie zwrotu
          </h1>
          <p className="text-gray-600">Wybierz klienta, dla którego chcesz zgłosić zwrot bębnów</p>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Wyszukiwarka */}
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-blue-100 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Szukaj klienta po nazwie firmy, NIP lub handlowcu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50/50 focus:bg-white text-gray-900 font-medium"
          />
        </div>
      </div>

      {/* Lista klientów */}
      {loading && clients.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-white/50 border border-gray-200 rounded-2xl p-12 text-center">
          <Building2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 font-semibold">Nie znaleziono żadnych klientów pasujących do kryteriów wyszukiwania</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredClients.map((client) => (
            <div
              key={client.nip}
              onClick={() => handleSelectClient(client.nip)}
              className="bg-white/80 border border-blue-100 hover:border-indigo-400 rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 hover:scale-[1.01] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-indigo-50 border border-indigo-150 rounded-xl flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-gray-900 leading-tight pr-4">{client.name}</h3>
                      <p className="text-xs text-gray-500 font-semibold mt-0.5">NIP: {client.nip}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-gray-600 mb-4 pl-1">
                  {client.salesperson_name && (
                    <div className="flex items-center space-x-1.5 text-indigo-700 font-bold bg-indigo-50/75 py-0.5 px-2 rounded w-fit">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{client.salesperson_name}</span>
                    </div>
                  )}
                  {client.market && (
                    <div className="flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span>Rynek: {client.market}</span>
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center space-x-1.5">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <span>{client.email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs font-bold text-indigo-600">
                <span className="flex items-center">
                  <Package className="w-4 h-4 mr-1 text-gray-400" />
                  Bębnów na stanie: {client.drumsCount}
                </span>
                <span>Wybierz &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReturnFormWrapper;
