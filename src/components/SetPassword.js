// Plik: src/components/SetPassword.js
// Opis: Komponent do ustawiania nowego hasła po kliknięciu linku resetującego z e-maila.
// Supabase przekazuje token w URL hash (#access_token=...&type=recovery)
// i klient JS przetwarza go automatycznie przez onAuthStateChange.

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const SetPassword = ({ onPasswordSet }) => {
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Supabase automatycznie wykrywa token z URL hash i emituje PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        console.log('🔑 Sesja odzyskiwania hasła aktywna');
        setSessionReady(true);
      }
    });

    // Sprawdź czy sesja już istnieje (np. po odświeżeniu strony)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || !password) return;
    if (password !== confirmPassword) {
      setError('Hasła nie są identyczne.');
      return;
    }
    if (password.length < 6) {
      setError('Hasło musi mieć co najmniej 6 znaków.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      setSuccess(true);
      // Po 3 sekundach wyloguj i przekieruj na logowanie
      setTimeout(() => {
        supabase.auth.signOut();
        navigate('/', { replace: true });
      }, 3000);
    } catch (err) {
      setError(err.message || 'Wystąpił błąd. Link mógł wygasnąć lub jest nieprawidłowy.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center p-8 bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-blue-100">
          <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-6" />
          <h2 className="text-2xl font-bold text-gray-900">Hasło zmienione!</h2>
          <p className="mt-2 text-gray-600">
            Twoje hasło zostało ustawione. Za chwilę zostaniesz przekierowany do logowania...
          </p>
        </div>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center p-8 bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-blue-100">
          <AlertCircle className="w-16 h-16 mx-auto text-yellow-500 mb-6" />
          <h2 className="text-2xl font-bold text-gray-900">Weryfikacja linku...</h2>
          <p className="mt-2 text-gray-600">
            Sprawdzamy ważność linku resetującego. Jeśli ta strona się nie załaduje,
            wróć do maila i kliknij link ponownie lub poproś o nowy.
          </p>
          <div className="mt-4 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="mt-6 text-sm text-blue-600 hover:underline"
          >
            Wróć do logowania
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-xl mb-6">
            <KeyRound className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            Ustaw nowe hasło
          </h2>
          <p className="mt-2 text-lg text-gray-600">Wprowadź swoje nowe, bezpieczne hasło.</p>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-blue-100 p-8">
          {error && (
            <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600 text-center">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nowe hasło</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  placeholder="Minimum 6 znaków"
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Potwierdź hasło</label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                placeholder="Powtórz nowe hasło"
                disabled={loading}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !password || password !== confirmPassword}
              className="w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all duration-200 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>Ustaw hasło</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SetPassword;
