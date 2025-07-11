// Plik: src/components/SetPassword.js
// Opis: Komponent-strona do ustawiania nowego hasła przez użytkownika po kliknięciu linku z e-maila.

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Building2, KeyRound, CheckCircle } from 'lucide-react';
import { authAPI } from '../utils/supabaseApi';

const SetPassword = ({ token, onPasswordSet, onInvalidToken }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Brak tokenu w linku. Upewnij się, że link został skopiowany poprawnie.');
      // Opcjonalnie, przekieruj na stronę logowania po chwili
      setTimeout(() => onInvalidToken(), 5000);
    }
  }, [token, onInvalidToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || !password || password !== confirmPassword) {
      if (password !== confirmPassword) {
        setError('Hasła nie są identyczne.');
      }
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await authAPI.setNewPassword(token, password);
      setSuccess(true);
      // Po 3 sekundach automatycznie zaloguj i przekieruj
      setTimeout(() => {
        onPasswordSet(result.user);
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
          <h2 className="text-2xl font-bold text-gray-900">Hasło ustawione!</h2>
          <p className="mt-2 text-gray-600">
            Zaraz zostaniesz automatycznie zalogowany i przekierowany do panelu...
          </p>
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
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">Ustaw nowe hasło</h2>
          <p className="mt-2 text-lg text-gray-600">Wprowadź swoje nowe, bezpieczne hasło.</p>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-blue-100 p-8">
          {error && (
            <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 animate-shake">
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
                  disabled={loading || !token}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
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
                disabled={loading || !token}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !token || !password || password !== confirmPassword}
              className="w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all duration-200 bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>Ustaw hasło i zaloguj</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SetPassword;
