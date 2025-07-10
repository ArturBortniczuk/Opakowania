import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- Konfiguracja Supabase ---
// Upewnij się, że w głównym folderze projektu masz plik .env.local
// z tymi zmiennymi:
// REACT_APP_SUPABASE_URL=https://twoj-url.supabase.co
// REACT_APP_SUPABASE_ANON_KEY=twoj-klucz-anon

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = "Błąd krytyczny: Brak zmiennych środowiskowych Supabase. Sprawdź plik .env.local i zrestartuj aplikację.";
  console.error(errorMessage);
  alert(errorMessage);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Komponenty UI (Uproszczone) ---

const Icon = ({ name, className = "w-5 h-5" }) => {
  const icons = {
    building: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h6M9 12h6m-6 5.25h6M5.25 6h.008v.008H5.25V6zm0 5.25h.008v.008H5.25v-.008zm0 5.25h.008v.008H5.25v-.008zm13.5-5.25h.008v.008h-.008v-.008zm0 5.25h.008v.008h-.008v-.008z" />,
    'user-check': <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
    eye: <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />,
    'eye-off': <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />,
  };
  return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>{icons[name] || ''}</svg>;
};

const ErrorMessage = ({ message }) => {
  if (!message) return null;
  return (
    <div className="p-3 mb-4 rounded-xl bg-red-100 border border-red-300 text-center">
      <p className="text-sm font-semibold text-red-700">{message}</p>
    </div>
  );
};

// --- Główny Komponent Aplikacji ---
function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          const userRole = currentUser.user_metadata.role || 'client';
          setView(userRole === 'admin' ? 'admin-dashboard' : 'dashboard');
        } else {
          setView('login');
        }
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLoginSuccess = (session) => {
    const userRole = session.user.user_metadata.role || 'client';
    setUser(session.user);
    setView(userRole === 'admin' ? 'admin-dashboard' : 'dashboard');
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
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      ) : (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}

// --- Komponent Logowania ---
function LoginForm({ onLoginSuccess }) {
  const [loginMode, setLoginMode] = useState('client');
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [step, setStep] = useState('enter_nip');
  const [companyName, setCompanyName] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleNipSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-user-status', { body: { nip, loginMode } });
      if (error) throw error;
      if (!data.exists) {
        setError('Nie znaleziono konta dla podanego NIP.');
      } else {
        setCompanyName(data.userData.name);
        setStep(data.hasPassword ? 'enter_password' : 'set_password');
      }
    } catch (err) {
      setError(err.context?.data?.error || err.message || 'Wystąpił błąd sprawdzania NIP.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (step === 'set_password' && password !== confirmPassword) {
      setError('Hasła nie są identyczne.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // Logika logowania i ustawiania hasła jest teraz wbudowana w Supabase Auth
      // To jest znacznie bezpieczniejsze i prostsze.
      // Najpierw tworzymy "użytkownika" w systemie auth Supabase
      
      let sessionData, authError;

      if (step === 'set_password') {
        const { data, error } = await supabase.auth.signUp({
          email: `${nip}@bębny.local`, // Używamy NIP do stworzenia unikalnego emaila
          password: password,
          options: {
            data: {
              nip: nip,
              role: loginMode,
              companyName: companyName,
            }
          }
        });
        sessionData = data;
        authError = error;
      } else {
         const { data, error } = await supabase.auth.signInWithPassword({
          email: `${nip}@bębny.local`,
          password: password,
        });
        sessionData = data;
        authError = error;
      }

      if (authError) {
        if (authError.message.includes('User already registered')) {
          // Jeśli użytkownik już istnieje, próbujemy go zalogować
          return handleSignIn();
        }
        throw authError;
      }
      
      if (sessionData.session) {
        onLoginSuccess(sessionData.session);
      } else {
         setError('Coś poszło nie tak. Spróbuj ponownie.');
      }

    } catch (err) {
      setError(err.message || 'Logowanie nie powiodło się.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSignIn = async () => {
     const { data, error } = await supabase.auth.signInWithPassword({
        email: `${nip}@bębny.local`,
        password: password,
      });
      if (error) throw error;
      if (data.session) onLoginSuccess(data.session);
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (step === 'enter_nip') handleNipSubmit();
    else handlePasswordSubmit();
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
  const { companyName, role } = user.user_metadata || user;
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Witaj, {companyName || user.email}!</h1>
      <p>Jesteś zalogowany jako: {role}</p>
      <button onClick={onLogout} className="mt-4 px-4 py-2 bg-red-500 text-white rounded">Wyloguj</button>
    </div>
  );
}

export default App;

