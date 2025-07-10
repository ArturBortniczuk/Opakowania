import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- Konfiguracja Supabase ---
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Błąd krytyczny: Brak zmiennych środowiskowych Supabase w pliku .env.local");
  // W normalnej aplikacji można by tu wyświetlić stronę błędu
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Komponenty UI (Uproszczone dla przykładu) ---

const Icon = ({ name, className }) => {
  const icons = {
    'building': <path d="M12.5 21a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 .5.5zM2.5 11a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5zM21.5 9a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5V3.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5zM2.5 7a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5zM2.5 3a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5zm4 4a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5zm4 0a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5zm4 0a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5zm-8 4a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5zm4 0a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5zm4 0a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5zm-8 4a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5zm4 0a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5z"/>,
    'user-check': <path d="M16 8A8 8 0 1 0 0 8a8 8 0 0 0 16 0m-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>,
    'eye': <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/>,
    'eye-off': <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/><path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.288.708.709a2.5 2.5 0 0 1-2.829-2.829l-.709-.709a3.5 3.5 0 0 0 4.474 4.474z"/><path d="m3.984 8.92-1.591-1.59a.75.75 0 0 1 0-1.06l.53-.53a.75.75 0 0 1 1.06 0l1.249 1.25 1.249-1.25a.75.75 0 0 1 1.06 0l.53.53a.75.75 0 0 1 0 1.06l-1.59 1.59-1.591 1.59a.75.75 0 0 1-1.06 0l-.53-.53a.75.75 0 0 1 0-1.06l1.59-1.59zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c.653 0 1.27.085 1.85.242l.398-.398A.75.75 0 0 1 11 3.5l.53.53a.75.75 0 0 1 0 1.06l-2.094 2.093-1.59 1.591a.75.75 0 0 1-1.06 0l-.53-.53a.75.75 0 0 1 0-1.06l.398-.398a2.5 2.5 0 0 1-1.465-1.755C2.003 7.083 1.5 7.54 1.172 8z"/>,
  };
  return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className={className} viewBox="0 0 16 16">{icons[name] || ''}</svg>;
};

const ErrorMessage = ({ message }) => {
  if (!message) return null;
  return (
    <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 animate-shake">
      <p className="text-sm text-red-600">{message}</p>
    </div>
  );
};

// --- Główny Komponent Aplikacji ---
function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login'); // 'login', 'dashboard', 'admin-dashboard', etc.
  const [loading, setLoading] = useState(true);

  // Sprawdzenie sesji przy starcie
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // W prawdziwej aplikacji, pobralibyśmy pełne dane użytkownika z naszej tabeli
        const userData = { ...session.user, companyName: session.user.user_metadata.companyName || 'Klient', role: session.user.user_metadata.role || 'client' };
        setUser(userData);
        setView(userData.role === 'admin' ? 'admin-dashboard' : 'dashboard');
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    setView(loggedInUser.role === 'admin' ? 'admin-dashboard' : 'dashboard');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setView('login');
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Ładowanie...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {view === 'login' ? (
        <LoginForm onLogin={handleLogin} />
      ) : (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}

// --- Komponent Logowania ---
function LoginForm({ onLogin }) {
  const [loginMode, setLoginMode] = useState('client');
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [step, setStep] = useState('enter_nip'); // 'enter_nip', 'enter_password', 'set_password'
  const [companyName, setCompanyName] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Funkcja do sprawdzania statusu użytkownika
  const checkUserStatus = async () => {
    setError('');
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-user-status', {
        body: { nip, loginMode },
      });

      if (error) throw error;

      if (!data.exists) {
        setError('Nie znaleziono konta dla podanego NIP.');
      } else {
        setCompanyName(data.userData.name);
        if (data.hasPassword) {
          setStep('enter_password');
        } else {
          setStep('set_password');
        }
      }
    } catch (err) {
      setError(err.context?.data?.error || err.message || 'Wystąpił błąd.');
    } finally {
      setLoading(false);
    }
  };

  // Funkcja do ustawiania hasła
  const handleSetPassword = async () => {
    if (password !== confirmPassword) {
      setError('Hasła nie są identyczne.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // Wywołujemy funkcję serwerową do ustawienia hasła
      const { error: setError } = await supabase.functions.invoke('set-password', {
        body: { nip, password, loginMode },
      });
      if (setError) throw setError;

      // Po udanym ustawieniu hasła, od razu logujemy
      await handleSignIn();

    } catch (err) {
      setError(err.context?.data?.error || err.message || 'Nie udało się ustawić hasła.');
    } finally {
      setLoading(false);
    }
  };

  // Funkcja do logowania
  const handleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      // W Supabase Auth logujemy użytkownika za pomocą "magicznego linku" wysyłanego na email,
      // ale w tym przypadku użyjemy niestandardowej logiki z hasłem.
      // Funkcja serwerowa 'sign-in' zweryfikuje hasło i zwróci dane.
      const { data, error } = await supabase.functions.invoke('sign-in', {
        body: { nip, password, loginMode },
      });

      if (error) throw error;
      
      onLogin(data.user);

    } catch (err) {
      setError(err.context?.data?.error || err.message || 'Logowanie nie powiodło się.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (step === 'enter_nip') checkUserStatus();
    if (step === 'set_password') handleSetPassword();
    if (step === 'enter_password') handleSignIn();
  };

  const resetForm = () => {
    setNip('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setStep('enter_nip');
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-xl mb-6">
            <Icon name="building" className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">Grupa Eltron</h2>
          <p className="mt-2 text-lg text-gray-600">System Zarządzania Bębnami</p>
        </div>
        
        <div className="bg-white/60 backdrop-blur-lg rounded-2xl p-2 shadow-lg border border-blue-100">
          <div className="flex">
            <button onClick={() => { setLoginMode('client'); resetForm(); }} className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${loginMode === 'client' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-600'}`}>
              <Icon name="building" className="w-4 h-4" /><span>Klient</span>
            </button>
            <button onClick={() => { setLoginMode('admin'); resetForm(); }} className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${loginMode === 'admin' ? 'bg-white text-purple-600 shadow-md' : 'text-gray-600'}`}>
              <Icon name="user-check" className="w-4 h-4" /><span>Administrator</span>
            </button>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-blue-100 p-8">
          <ErrorMessage message={error} />
          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 'enter_nip' && (
              <>
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Logowanie</h3>
                  <p className="text-sm text-gray-600">Wpisz swój numer NIP, aby kontynuować</p>
                </div>
                <div>
                  <label htmlFor="nip" className="block text-sm font-medium text-gray-700 mb-2">Numer NIP</label>
                  <input id="nip" type="text" value={nip} onChange={(e) => setNip(e.target.value.replace(/\D/g, '').slice(0, 10))} className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="Wpisz 10-cyfrowy NIP" disabled={loading} />
                </div>
                <button type="submit" disabled={loading || nip.length !== 10} className="w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all duration-200 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Dalej'}
                </button>
              </>
            )}

            {step === 'set_password' && (
              <>
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Ustaw swoje hasło</h3>
                  <p className="text-sm text-gray-600">To Twoje pierwsze logowanie. Ustaw hasło dostępu.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nowe hasło</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="Minimum 6 znaków" disabled={loading} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"><Icon name={showPassword ? 'eye-off' : 'eye'} /></button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Potwierdź hasło</label>
                  <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="Powtórz hasło" disabled={loading} />
                </div>
                <button type="submit" disabled={loading} className="w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all duration-200 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                   {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Ustaw hasło i zaloguj'}
                </button>
                <button type="button" onClick={resetForm} className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium">← Wróć</button>
              </>
            )}

            {step === 'enter_password' && (
              <>
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Witaj, {companyName}!</h3>
                  <p className="text-sm text-gray-600">Wpisz hasło, aby kontynuować.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hasło</label>
                   <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="Wpisz hasło" disabled={loading} autoFocus />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"><Icon name={showPassword ? 'eye-off' : 'eye'} /></button>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all duration-200 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Zaloguj się'}
                </button>
                <button type="button" onClick={resetForm} className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium">← Wróć</button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

// --- Komponent Panelu Głównego ---
function Dashboard({ user, onLogout }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Witaj, {user.companyName || user.email}!</h1>
      <p>Jesteś zalogowany jako: {user.role}</p>
      <button onClick={onLogout} className="mt-4 px-4 py-2 bg-red-500 text-white rounded">Wyloguj</button>
    </div>
  );
}

export default App;
