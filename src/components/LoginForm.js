// Plik: src/components/LoginForm.js
// Opis: Finalna, bezpieczna wersja komponentu logowania z obsługą resetowania hasła.

import React, { useState } from 'react';
import { Eye, EyeOff, Building2, UserCheck, LogIn, Mail, ArrowLeft } from 'lucide-react';
// Upewnij się, że ścieżka do API jest poprawna
import { authAPI } from '../utils/supabaseApi'; 

const LoginForm = ({ onLogin, onNavigate }) => {
  const [view, setView] = useState('login'); // 'login' | 'requestReset'
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState('client');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading || !nip || !password) return;

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const result = await authAPI.signIn(nip, password, loginMode);
      if (result && result.user) {
        onLogin(result.user);
      } else {
        throw new Error('Logowanie nie powiodło się. Spróbuj ponownie.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (loading || !nip) return;

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // Ta funkcja backendowa ZAWSZE powinna zwracać sukces, aby nie zdradzać, czy NIP istnieje.
      // Rzeczywiste wysłanie maila odbywa się tylko, jeśli NIP jest poprawny.
      // const response = await authAPI.requestPasswordSetup(nip);
      // setSuccessMessage(response.message);
      
      // --- MOCKOWANA ODPOWIEDŹ NA CZAS TESTÓW ---
      // Zastąp to prawdziwym wywołaniem API kiedy funkcja backendowa będzie gotowa
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccessMessage('Jeśli podany NIP jest w naszej bazie, na przypisany do niego adres e-mail wysłaliśmy link do ustawienia hasła.');
      // --- KONIEC MOCKOWANEJ ODPOWIEDZI ---

    } catch (err) {
      setError('Wystąpił błąd. Spróbuj ponownie później.');
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (mode) => {
    setLoginMode(mode);
    setNip('');
    setPassword('');
    setError('');
    setSuccessMessage('');
    setView('login');
  };

  const renderLoginView = () => (
    <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-blue-100 p-8">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {loginMode === 'admin' ? 'Logowanie Administratora' : 'Logowanie Klienta'}
        </h3>
        <p className="text-sm text-gray-600">
          Wprowadź swoje dane, aby uzyskać dostęp.
        </p>
      </div>
      
      {error && (
        <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 animate-shake">
          <p className="text-sm text-red-600 text-center">{error}</p>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <label htmlFor="nip" className="block text-sm font-medium text-gray-700 mb-2">
            Numer NIP
          </label>
          <input
            id="nip"
            type="text"
            value={nip}
            onChange={(e) => setNip(e.target.value.replace(/\D/g, '').slice(0, 10))}
            className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            placeholder="Wpisz 10-cyfrowy NIP"
            disabled={loading}
            required
          />
        </div>

        <div>
          <label htmlFor="password"className="block text-sm font-medium text-gray-700 mb-2">
            Hasło
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              placeholder="Wpisz swoje hasło"
              disabled={loading}
              required
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !nip || !password}
          className={`w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all duration-200 ${
            loginMode === 'admin'
              ? 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500'
              : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
          } disabled:opacity-50`}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>Zaloguj się</span>
            </>
          )}
        </button>
      </form>
      <div className="text-center mt-6">
        <button 
          onClick={() => setView('requestReset')}
          className="text-sm text-blue-600 hover:underline"
        >
          Nie pamiętasz hasła lub ustawiasz je po raz pierwszy?
        </button>
      </div>
    </div>
  );

  const renderRequestResetView = () => (
     <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-blue-100 p-8">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Ustawianie / Resetowanie hasła
        </h3>
        <p className="text-sm text-gray-600">
          Wpisz NIP swojej firmy, aby otrzymać link do ustawienia hasła na adres e-mail.
        </p>
      </div>
      
      {error && (
        <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 animate-shake">
          <p className="text-sm text-red-600 text-center">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="p-3 mb-4 rounded-lg bg-green-50 border border-green-200">
          <p className="text-sm text-green-700 text-center">{successMessage}</p>
        </div>
      )}

      <form onSubmit={handleRequestReset} className="space-y-6">
        <div>
          <label htmlFor="nip-reset" className="block text-sm font-medium text-gray-700 mb-2">
            Numer NIP
          </label>
          <input
            id="nip-reset"
            type="text"
            value={nip}
            onChange={(e) => setNip(e.target.value.replace(/\D/g, '').slice(0, 10))}
            className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            placeholder="Wpisz 10-cyfrowy NIP"
            disabled={loading}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading || nip.length !== 10}
          className="w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all duration-200 bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Mail className="w-4 h-4" />
              <span>Wyślij link</span>
            </>
          )}
        </button>
      </form>
      <div className="text-center mt-6">
        <button 
          onClick={() => setView('login')}
          className="text-sm text-blue-600 hover:underline flex items-center justify-center mx-auto"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Wróć do logowania
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-xl mb-6">
            <Building2 className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">Grupa Eltron</h2>
          <p className="mt-2 text-lg text-gray-600">System Zarządzania Bębnami</p>
        </div>

        <div className="bg-white/60 backdrop-blur-lg rounded-2xl p-2 shadow-lg border border-blue-100">
          <div className="flex">
            <button 
              onClick={() => handleModeChange('client')} 
              className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${loginMode === 'client' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-600'}`}
            >
              <Building2 className="w-4 h-4" />
              <span>Klient</span>
            </button>
            <button 
              onClick={() => handleModeChange('admin')} 
              className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${loginMode === 'admin' ? 'bg-white text-purple-600 shadow-md' : 'text-gray-600'}`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Administrator</span>
            </button>
          </div>
        </div>

        {view === 'login' ? renderLoginView() : renderRequestResetView()}

        <div className="text-center text-sm text-gray-500">
          <p>© 2025 Grupa Eltron. Wszystkie prawa zastrzeżone.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
