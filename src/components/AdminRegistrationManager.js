import React, { useState, useEffect } from 'react';
import { UserCheck, CheckCircle, AlertCircle, X, Check, Mail, Phone, Building2, ShieldAlert, RefreshCw, Search, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { authAPI } from '../utils/supabaseApi';

const AdminRegistrationManager = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  
  // Stany przypisania NIP
  const [selectedNips, setSelectedNips] = useState({}); // { [profileId]: nip }
  const [companySearch, setCompanySearch] = useState('');
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);

  // Załaduj oczekujące rejestracje oraz listę firm
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [users, { data: companiesData }] = await Promise.all([
        authAPI.getPendingRegistrations(),
        supabase.from('companies').select('nip, name').order('name')
      ]);
      
      setPendingUsers(users);
      setCompanies(companiesData || []);
      
      // Domyślnie dopasuj NIP-y, jeśli podany przez klienta NIP istnieje już w bazie companies
      const initialNips = {};
      users.forEach(user => {
        if (user.nip) {
          const match = (companiesData || []).find(c => c.nip === user.nip);
          if (match) {
            initialNips[user.id] = user.nip;
          }
        }
      });
      setSelectedNips(initialNips);
    } catch (err) {
      console.error(err);
      setError('Błąd ładowania wniosków rejestracyjnych.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Obsługa zatwierdzenia konta
  const handleApprove = async (userId) => {
    const assignedNip = selectedNips[userId];
    if (!assignedNip) {
      alert('Musisz wybrać lub przypisać NIP firmy do tego konta przed zatwierdzeniem.');
      return;
    }

    const company = companies.find(c => c.nip === assignedNip);
    const companyName = company ? company.name : 'Brak nazwy';

    setApprovingId(userId);
    setError(null);
    setSuccessMsg('');

    try {
      await authAPI.approveRegistration(userId, assignedNip, companyName);
      setSuccessMsg(`Konto użytkownika zostało aktywowane i przypisane do firmy: ${companyName} (NIP: ${assignedNip})!`);
      // Usuń z lokalnego widoku
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      console.error(err);
      setError(err.message || 'Wystąpił błąd podczas zatwierdzania konta.');
    } finally {
      setApprovingId(null);
    }
  };

  // Obsługa odrzucenia wniosku
  const handleReject = async (userId) => {
    if (window.confirm('Czy na pewno chcesz odrzucić ten wniosek rejestracyjny? Użytkownik nie otrzyma dostępu do systemu.')) {
      setRejectingId(userId);
      setError(null);
      setSuccessMsg('');
      try {
        await authAPI.rejectRegistration(userId);
        setSuccessMsg('Wniosek rejestracyjny został odrzucony.');
        setPendingUsers(prev => prev.filter(u => u.id !== userId));
      } catch (err) {
        console.error(err);
        setError('Wystąpił błąd podczas odrzucania wniosku.');
      } finally {
        setRejectingId(null);
      }
    }
  };

  const handleNipChange = (userId, nip) => {
    setSelectedNips(prev => ({ ...prev, [userId]: nip }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      {/* Nagłówek */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
            <UserCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-purple-600 to-blue-800 bg-clip-text text-transparent tracking-tight">
              Weryfikacja i aktywacja kont
            </h1>
            <p className="text-gray-600">Zatwierdzaj nowych klientów i przypisuj ich konta do oficjalnych NIP-ów firm</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors duration-200 flex items-center space-x-2 shadow-md"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Odśwież wnioski</span>
        </button>
      </div>

      {error && (
        <div className="p-4 mb-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-start space-x-3 text-sm animate-shake">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 mb-6 rounded-2xl bg-green-50 border border-green-200 text-green-700 flex items-start space-x-3 text-sm animate-pulse">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {pendingUsers.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-12 text-center shadow-xl border border-purple-100/50 max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Check className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">Brak oczekujących wniosków</h3>
          <p className="text-gray-600 text-sm">
            Wszystkie zarejestrowane konta klientów zostały zweryfikowane i aktywowane.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {pendingUsers.map((user) => {
            const currentSelectedNip = selectedNips[user.id] || '';
            const matchingCompany = companies.find(c => c.nip === user.nip);
            const nipExistsInBase = !!matchingCompany;

            return (
              <div
                key={user.id}
                className="bg-white/90 backdrop-blur-lg rounded-3xl p-6 shadow-xl border border-purple-100/50 hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.01] flex flex-col justify-between"
              >
                <div>
                  {/* Profil nagłówek */}
                  <div className="flex items-start justify-between border-b border-gray-100 pb-4 mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-blue-200 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-gray-900 text-lg leading-tight">{user.name}</h3>
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mt-0.5">Wniosek klienta B2B</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full text-xs font-bold shadow-sm">
                      Oczekuje
                    </span>
                  </div>

                  {/* Dane kontaktowe i wnioskowana firma */}
                  <div className="space-y-2 text-sm text-left mb-6">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Mail className="w-4 h-4 text-purple-500" />
                      <span className="font-semibold text-gray-900">{user.email}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Phone className="w-4 h-4 text-purple-500" />
                      <span>{user.phone || 'Nie podano'}</span>
                    </div>
                    <div className="bg-purple-50/50 border border-purple-100 p-3 rounded-xl space-y-1.5 mt-3">
                      <span className="text-[10px] font-bold text-purple-800 uppercase tracking-widest block">Dane podane przy rejestracji:</span>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 font-medium">Nazwa firmy:</span>
                        <span className="font-bold text-gray-900">{user.company_name}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 font-medium">Podany NIP:</span>
                        <span className="font-mono font-bold text-gray-900">{user.nip}</span>
                      </div>
                    </div>
                  </div>

                  {/* Narzędzie przypisania NIP */}
                  <div className="space-y-3 bg-gray-50 border border-gray-150 p-4 rounded-2xl text-left mb-6">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center">
                        <Building2 className="w-4 h-4 mr-1 text-blue-600" /> Przypisz oficjalny NIP z bazy *
                      </label>
                      {nipExistsInBase ? (
                        <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded flex items-center">
                          <Check className="w-3 h-3 mr-0.5" /> NIP pasuje do bazy
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded flex items-center">
                          <ShieldAlert className="w-3 h-3 mr-0.5" /> Brak NIP w bazie firm!
                        </span>
                      )}
                    </div>

                    <select
                      value={currentSelectedNip}
                      onChange={(e) => handleNipChange(user.id, e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-sm font-semibold text-gray-800"
                    >
                      <option value="">-- Wybierz firmę z bazy --</option>
                      {companies.map(c => (
                        <option key={c.nip} value={c.nip}>
                          {c.name} (NIP: {c.nip})
                        </option>
                      ))}
                    </select>

                    {!nipExistsInBase && (
                      <p className="text-[10px] text-red-500 leading-normal font-medium mt-1">
                        Podany NIP ({user.nip}) nie istnieje w nowej zoptymalizowanej kartotece 1000 klientów. 
                        Wybierz pasujący NIP z listy powyżej lub dodaj go najpierw w zakładce "Zarządzaj klientami".
                      </p>
                    )}
                  </div>
                </div>

                {/* Przycisk aktywacji */}
                <div className="flex space-x-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleApprove(user.id)}
                    disabled={approvingId === user.id || rejectingId === user.id || !currentSelectedNip}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-700 hover:from-purple-700 hover:to-blue-800 text-white py-3 px-4 rounded-xl font-bold transition-all duration-200 flex items-center justify-center space-x-2 shadow-md disabled:opacity-50"
                  >
                    {approvingId === user.id ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Zatwierdź i aktywuj</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleReject(user.id)}
                    disabled={approvingId === user.id || rejectingId === user.id}
                    className="bg-white border border-gray-300 text-red-600 hover:bg-red-50 py-3 px-4 rounded-xl font-bold transition-all duration-200 flex items-center justify-center"
                    title="Odrzuć wniosek"
                  >
                    {rejectingId === user.id ? (
                      <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <X className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminRegistrationManager;
