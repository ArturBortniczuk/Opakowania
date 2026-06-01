import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Building2, User, Phone, LogIn, Mail, ArrowLeft, Check, ShieldAlert } from 'lucide-react';
import { authAPI } from '../utils/supabaseApi';

const LoginForm = ({ onLogin }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState('login'); // 'login', 'register', 'requestReset'

  // Pola formularzy
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [nip, setNip] = useState('');
  
  // Zgody RODO
  const [rodoAccepted, setRodoAccepted] = useState(false);
  const [notifyAccepted, setNotifyAccepted] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      navigate(`/set-password/${token}`);
    }
  }, [searchParams, navigate]);

  // Logowanie
  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading || !email || !password) return;

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const result = await authAPI.signIn(email, password);
      if (result && result.user) {
        onLogin(result.user);
      } else {
        throw new Error('Logowanie nie powiodło się. Spróbuj ponownie.');
      }
    } catch (err) {
      setError(err.message || 'Podany adres e-mail lub hasło są nieprawidłowe.');
    } finally {
      setLoading(false);
    }
  };

  // Rejestracja
  const handleRegister = async (e) => {
    e.preventDefault();
    if (loading || !email || !password || !name || !phone || !companyName || !nip) return;
    if (!rodoAccepted) {
      setError('Musisz zaakceptować zgodę RODO, aby założyć konto.');
      return;
    }
    if (password.length < 6) {
      setError('Hasło musi mieć co najmniej 6 znaków.');
      return;
    }
    if (nip.length !== 10) {
      setError('NIP musi mieć dokładnie 10 cyfr.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      await authAPI.signUp(email, password, {
        name,
        phone,
        companyName,
        nip,
        rodoAccepted
      });
      setSuccessMessage('Konto zostało zarejestrowane! Oczekuje na weryfikację przez specjalistę ds. opakowań Grupy Eltron. O aktywacji powiadomimy Cię mailowo.');
      setView('login');
      // Wyczyszczenie formularza rejestracji
      setEmail('');
      setPassword('');
      setName('');
      setPhone('');
      setCompanyName('');
      setNip('');
      setRodoAccepted(false);
    } catch (err) {
      setError(err.message || 'Wystąpił błąd podczas rejestracji. Upewnij się, czy e-mail nie jest już zajęty.');
    } finally {
      setLoading(false);
    }
  };

  // Reset hasła
  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (loading || !email) return;

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await authAPI.requestPasswordSetup(email);
      setSuccessMessage(response.message);
    } catch (err) {
      setError(err.message || 'Wystąpił błąd podczas wysyłania linku resetującego.');
    } finally {
      setLoading(false);
    }
  };

  const switchView = (newView) => {
    setError('');
    setSuccessMessage('');
    setView(newView);
  };

  const renderLoginView = () => (
    <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-blue-100 p-8">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Logowanie</h3>
        <p className="text-sm text-gray-600">
          Zaloguj się e-mailem, aby uzyskać dostęp do swoich bębnów.
        </p>
      </div>

      {error && (
        <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-600 text-center">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="p-3 mb-4 rounded-lg bg-green-50 border border-green-200">
          <p className="text-sm text-green-700 text-center font-medium">{successMessage}</p>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Adres e-mail
          </label>
          <div className="relative">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full px-4 py-3 pl-11 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
              placeholder="np. jan.kowalski@firma.pl"
              disabled={loading}
              required
            />
            <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Hasło
            </label>
            <button
              type="button"
              onClick={() => switchView('requestReset')}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              Zapomniałeś hasła?
            </button>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
              placeholder="Wpisz swoje hasło"
              disabled={loading}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all duration-200 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg disabled:opacity-50"
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

      <div className="mt-6 text-center border-t border-gray-100 pt-4">
        <p className="text-sm text-gray-600">
          Nie masz jeszcze konta firmowego?{' '}
          <button
            onClick={() => switchView('register')}
            className="text-blue-600 hover:underline font-bold"
          >
            Zarejestruj się
          </button>
        </p>
      </div>
    </div>
  );

  const renderRegisterView = () => (
    <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-blue-100 p-8 max-h-[85vh] overflow-y-auto">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Rejestracja klienta</h3>
        <p className="text-sm text-gray-600">
          Wypełnij wniosek, aby założyć konto firmowe w systemie.
        </p>
      </div>

      {error && (
        <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-600 text-center">{error}</p>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4 text-left">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Adres e-mail służbowy *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
            placeholder="np. jan.kowalski@firma.pl"
            required
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Imię i Nazwisko *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
              placeholder="Jan Kowalski"
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefon kontaktowy *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
              placeholder="+48 123 456 789"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pełna nazwa firmy *
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
              placeholder="np. Eltron Sp. z o.o."
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numer NIP firmy *
            </label>
            <input
              type="text"
              value={nip}
              onChange={(e) => setNip(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
              placeholder="10-cyfrowy NIP"
              maxLength={10}
              required
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hasło do logowania *
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
            placeholder="Minimum 6 znaków"
            required
            disabled={loading}
          />
        </div>

        {/* Zgody RODO */}
        <div className="space-y-3 pt-3 border-t border-gray-100">
          <div className="flex items-start">
            <input
              id="rodoAccepted"
              type="checkbox"
              checked={rodoAccepted}
              onChange={(e) => setRodoAccepted(e.target.checked)}
              className="mt-1 h-4.5 w-4.5 text-blue-600 border-gray-300 rounded"
              required
            />
            <label htmlFor="rodoAccepted" className="ml-2.5 text-xs text-gray-600 leading-normal">
              Wyrażam zgodę na przetwarzanie moich danych osobowych przez Grupę Eltron Sp. z o.o. w celu założenia i prowadzenia konta w systemie obsługi bębnów. Oświadczam, że zapoznałem się z <a href="/help" target="_blank" className="text-blue-600 hover:underline font-semibold">Regulaminem</a> oraz <a href="/help" target="_blank" className="text-blue-600 hover:underline font-semibold">Polityką Prywatności (RODO)</a> i akceptuję ich postanowienia. *
            </label>
          </div>

          <div className="flex items-start">
            <input
              id="notifyAccepted"
              type="checkbox"
              checked={notifyAccepted}
              onChange={(e) => setNotifyAccepted(e.target.checked)}
              className="mt-1 h-4.5 w-4.5 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="notifyAccepted" className="ml-2.5 text-xs text-gray-600 leading-normal">
              Wyrażam zgodę na otrzymywanie automatycznych powiadomień e-mail oraz SMS o zbliżających się terminach zwrotu bębnów kablowych w posiadaniu mojej firmy (Zgoda opcjonalna).
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !rodoAccepted}
          className="w-full py-3 px-4 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all duration-200 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg disabled:opacity-50 mt-4"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>Zarejestruj i wyślij wniosek</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-4 text-center border-t border-gray-100 pt-3">
        <button
          onClick={() => switchView('login')}
          className="text-sm text-blue-600 hover:underline flex items-center justify-center mx-auto"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Masz już konto? Zaloguj się
        </button>
      </div>
    </div>
  );

  const renderRequestResetView = () => (
    <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-blue-100 p-8">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Resetowanie hasła</h3>
        <p className="text-sm text-gray-600">
          Wpisz adres e-mail przypisany do Twojego konta, aby otrzymać link resetujący.
        </p>
      </div>

      {error && (
        <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200">
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
          <label htmlFor="email-reset" className="block text-sm font-medium text-gray-700 mb-2">
            Adres e-mail
          </label>
          <input
            id="email-reset"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
            placeholder="wpisz swój adres e-mail"
            disabled={loading}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email}
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
          onClick={() => switchView('login')}
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
        <div className="mb-6 flex justify-center">
          <img src="/logo40.png" alt="Grupa Eltron" className="h-20 w-auto object-contain" />
        </div>

        {view === 'login' && renderLoginView()}
        {view === 'register' && renderRegisterView()}
        {view === 'requestReset' && renderRequestResetView()}

        <div className="text-center text-sm text-gray-500">
          <p>© 2025 Grupa Eltron. Wszystkie prawa zastrzeżone.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
