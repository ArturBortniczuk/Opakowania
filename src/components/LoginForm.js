// Plik: src/components/LoginForm.js
// Opis: Przebudowany komponent logowania do współpracy z nowym, wieloetapowym API.

import React, { useState } from 'react';
import { Eye, EyeOff, Building2, Shield, CheckCircle, ArrowRight, UserCheck } from 'lucide-react';
import { authAPI, handleAPIError } from '../utils/supabaseApi';

const LoginForm = ({ onLogin }) => {
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState('client');
  
  // Nowy stan do zarządzania przepływem logowania
  const [loginStep, setLoginStep] = useState('enter_nip'); // 'enter_nip', 'enter_password', 'set_password'
  const [pendingUserData, setPendingUserData] = useState(null);

  const resetForm = () => {
    setNip('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setLoading(false);
    setLoginStep('enter_nip');
    setPendingUserData(null);
  };

  const handleModeChange = (mode) => {
    setLoginMode(mode);
    resetForm();
  };

  const handleNipSubmit = async (e) => {
    e.preventDefault();
    if (loading || nip.length !== 10) return;
    setLoading(true);
    setError('');

    try {
      const { exists, hasPassword, userData } = await authAPI.checkUserStatus(nip, loginMode);
      
      if (!exists) {
        throw new Error(`Nie znaleziono konta dla podanego NIP.`);
      }

      setPendingUserData(userData);
      if (hasPassword) {
        setLoginStep('enter_password');
      } else {
        setLoginStep('set_password');
      }
    } catch (err) {
      setError(handleAPIError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      let result;
      if (loginStep === 'set_password') {
        if (password !== confirmPassword) {
          throw new Error('Hasła nie są identyczne.');
        }
        result = await authAPI.setPassword(nip, password, loginMode);
      } else {
        result = await authAPI.signIn(nip, password, pendingUserData);
      }

      if (result && result.user) {
        onLogin(result.user);
      } else {
        throw new Error('Nie udało się zalogować. Spróbuj ponownie.');
      }
    } catch (err) {
      setError(handleAPIError(err));
    } finally {
      setLoading(false);
    }
  };

  const renderNipStep = () => (
    <form onSubmit={handleNipSubmit} className="space-y-6">
      <div className="text-center">
        {loginMode === 'admin' ? (
          <UserCheck className="w-16 h-16 mx-auto text-purple-600 mb-4" />
        ) : (
          <Building2 className="w-16 h-16 mx-auto text-blue-600 mb-4" />
        )}
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {loginMode === 'admin' ? 'Panel Administratora' : 'Logowanie Klienta'}
        </h3>
        <p className="text-sm text-gray-600">
          Wpisz swój numer NIP aby kontynuować
        </p>
      </div>
      <div>
        <label htmlFor="nip" className="block text-sm font-medium text-gray-700 mb-2">
          {loginMode === 'admin' ? 'NIP Administratora' : 'Numer NIP'}
        </label>
        <div className="relative">
          <input
            id="nip"
            type="text"
            value={nip}
            onChange={(e) => setNip(e.target.value.replace(/\D/g, '').slice(0, 10))}
            className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            placeholder="Wpisz 10-cyfrowy NIP"
            disabled={loading}
          />
          {nip.length === 10 && (
            <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
          )}
        </div>
      </div>
      <button
        type="submit"
        disabled={loading || nip.length !== 10}
        className={`w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all duration-200 ${
          loginMode === 'admin'
            ? 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500'
            : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
        } disabled:opacity-50`}
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <><span>Dalej</span><ArrowRight className="w-4 h-4" /></>
        )}
      </button>
    </form>
  );

  const renderPasswordStep = (isFirstLogin) => (
    <form onSubmit={handleAuthSubmit} className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {isFirstLogin ? 'Ustaw swoje hasło' : `Witaj, ${pendingUserData?.name || ''}!`}
        </h3>
        <p className="text-sm text-gray-600">
          {isFirstLogin ? 'To Twoje pierwsze logowanie, ustaw hasło dostępu.' : 'Wpisz hasło, aby kontynuować.'}
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {isFirstLogin ? 'Nowe hasło' : 'Hasło'}
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            placeholder={isFirstLogin ? 'Minimum 6 znaków' : 'Wpisz hasło'}
            disabled={loading}
            autoFocus
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {isFirstLogin && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Potwierdź hasło</label>
          <input
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            placeholder="Powtórz hasło"
            disabled={loading}
          />
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className={`w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all duration-200 ${
          loginMode === 'admin'
            ? 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500'
            : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
        } disabled:opacity-50`}
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <span>{isFirstLogin ? 'Ustaw hasło i zaloguj' : 'Zaloguj się'}</span>
        )}
      </button>
      <button type="button" onClick={resetForm} className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium">
        ← Wróć
      </button>
    </form>
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
            <button onClick={() => handleModeChange('client')} className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${loginMode === 'client' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-600'}`}>
              <Building2 className="w-4 h-4" /><span>Klient</span>
            </button>
            <button onClick={() => handleModeChange('admin')} className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${loginMode === 'admin' ? 'bg-white text-purple-600 shadow-md' : 'text-gray-600'}`}>
              <UserCheck className="w-4 h-4" /><span>Administrator</span>
            </button>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-blue-100 p-8">
          {error && (
            <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 animate-shake">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          {loginStep === 'enter_nip' && renderNipStep()}
          {loginStep === 'enter_password' && renderPasswordStep(false)}
          {loginStep === 'set_password' && renderPasswordStep(true)}
        </div>
        <div className="text-center text-sm text-gray-500">
          <p>© 2025 Grupa Eltron. Wszystkie prawa zastrzeżone.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
