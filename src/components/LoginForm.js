// src/components/LoginForm.js
import React, { useState } from 'react';
import { Eye, EyeOff, Building2, Shield, CheckCircle, ArrowRight, UserCheck } from 'lucide-react';
import { mockDrumsData } from '../data/mockData';
import { mockAdmins } from '../data/additionalData';

const LoginForm = ({ onLogin }) => {
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState('client'); // 'client' or 'admin'

  const handleNipSubmit = async () => {
    setLoading(true);
    setError('');
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (loginMode === 'admin') {
      // Admin login logic
      const adminUser = mockAdmins.find(admin => admin.nip === nip);
      if (!adminUser) {
        setError('Nie znaleziono konta administratora dla podanego NIP');
        setLoading(false);
        return;
      }
      
      const savedPassword = localStorage.getItem(`admin_password_${nip}`);
      if (!savedPassword) {
        setIsFirstLogin(true);
      } else {
        setIsFirstLogin(false);
      }
    } else {
      // Client login logic
      if (nip.length !== 10) {
        setError('NIP musi mieć 10 cyfr');
        setLoading(false);
        return;
      }

      const userData = mockDrumsData.find(item => item.NIP === nip);
      if (!userData) {
        setError('Nie znaleziono konta dla podanego NIP');
        setLoading(false);
        return;
      }

      const savedPassword = localStorage.getItem(`password_${nip}`);
      if (!savedPassword) {
        setIsFirstLogin(true);
      } else {
        setIsFirstLogin(false);
      }
    }
    
    setLoading(false);
  };

  const handlePasswordSubmit = async () => {
    setLoading(true);
    setError('');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (isFirstLogin) {
      if (newPassword !== confirmPassword) {
        setError('Hasła nie są identyczne');
        setLoading(false);
        return;
      }
      if (newPassword.length < 6) {
        setError('Hasło musi mieć minimum 6 znaków');
        setLoading(false);
        return;
      }
      
      // Zapisz nowe hasło
      const passwordKey = loginMode === 'admin' ? `admin_password_${nip}` : `password_${nip}`;
      localStorage.setItem(passwordKey, newPassword);
    } else {
      // Sprawdź hasło
      const passwordKey = loginMode === 'admin' ? `admin_password_${nip}` : `password_${nip}`;
      const savedPassword = localStorage.getItem(passwordKey);
      if (password !== savedPassword) {
        setError('Nieprawidłowe hasło');
        setLoading(false);
        return;
      }
    }

    // Zaloguj użytkownika
    let user;
    
    if (loginMode === 'admin') {
      const adminData = mockAdmins.find(admin => admin.nip === nip);
      user = {
        id: adminData.id,
        nip: nip,
        username: adminData.username,
        name: adminData.name,
        email: adminData.email,
        role: adminData.role,
        permissions: adminData.permissions,
        companyName: 'Grupa Eltron - Administrator'
      };
    } else {
      const userData = mockDrumsData.find(item => item.NIP === nip);
      user = {
        nip: nip,
        companyName: userData.PELNA_NAZWA_KONTRAHENTA,
        role: 'client'
      };
    }
    
    localStorage.setItem('currentUser', JSON.stringify(user));
    setLoading(false);
    onLogin(user);
  };

  const resetForm = () => {
    setNip('');
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsFirstLogin(false);
    setError('');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-xl mb-6 animate-pulse">
            <Building2 className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            Grupa Eltron
          </h2>
          <p className="mt-2 text-lg text-gray-600">
            System Zarządzania Bębnami
          </p>
          <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-gray-500">
            <Shield className="h-4 w-4" />
            <span>Bezpieczne logowanie</span>
          </div>
        </div>

        {/* Login Mode Selector */}
        <div className="bg-white/60 backdrop-blur-lg rounded-2xl p-2 shadow-lg border border-blue-100">
          <div className="flex">
            <button
              onClick={() => {
                setLoginMode('client');
                resetForm();
              }}
              className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${
                loginMode === 'client'
                  ? 'bg-white text-blue-600 shadow-md'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Klient</span>
            </button>
            <button
              onClick={() => {
                setLoginMode('admin');
                resetForm();
              }}
              className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${
                loginMode === 'admin'
                  ? 'bg-white text-purple-600 shadow-md'
                  : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Administrator</span>
            </button>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-blue-100 p-8 space-y-6">
          {!isFirstLogin && !localStorage.getItem(`${loginMode === 'admin' ? 'admin_' : ''}password_${nip}`) ? (
            // NIP Input Phase
            <div className="space-y-6">
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
                  {loginMode === 'admin' 
                    ? 'Wpisz swój NIP administratora aby kontynuować'
                    : 'Wpisz swój numer NIP aby kontynuować'
                  }
                </p>
              </div>

              <div className="space-y-4">
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
                      onKeyPress={(e) => e.key === 'Enter' && !loading && handleNipSubmit()}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                      placeholder={loginMode === 'admin' ? 'NIP administratora' : 'Wpisz 10-cyfrowy NIP'}
                      disabled={loading}
                    />
                    {((loginMode === 'client' && nip.length === 10) || (loginMode === 'admin' && nip.length >= 8)) && (
                      <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                    )}
                  </div>
                </div>

                {/* Quick Login Hints */}
                {loginMode === 'admin' && (
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-xs text-purple-700 mb-1">💡 Dane testowe administratora:</p>
                    <p className="text-xs text-purple-600">NIP: <strong>0000000000</strong> (admin) lub <strong>1111111111</strong> (supervisor)</p>
                  </div>
                )}

                {loginMode === 'client' && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-700 mb-1">💡 Przykładowe NIP-y klientów:</p>
                    <p className="text-xs text-blue-600"><strong>1234567890</strong>, <strong>9876543210</strong>, <strong>5555666677</strong></p>
                  </div>
                )}

                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 animate-shake">
                    <p className="text-sm text-red-600 flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      {error}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleNipSubmit}
                  disabled={loading || ((loginMode === 'client' && nip.length !== 10) || (loginMode === 'admin' && nip.length < 8))}
                  className={`w-full py-3 px-4 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2 ${
                    loginMode === 'admin'
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 focus:ring-purple-500'
                      : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-blue-500'
                  }`}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Sprawdź NIP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            // Password Phase
            <div className="space-y-6">
              <div className="text-center">
                {isFirstLogin ? (
                  <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      🎉 Pierwsze logowanie!
                    </h3>
                    <p className="text-sm text-gray-600">
                      Ustaw bezpieczne hasło dla swojego konta
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {loginMode === 'admin' ? '👋 Witaj, Administratorze!' : 'Witaj ponownie!'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Wpisz hasło aby kontynuować
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {isFirstLogin ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nowe hasło
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && !loading && handlePasswordSubmit()}
                          className="block w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                          placeholder="Minimum 6 znaków"
                          disabled={loading}
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Potwierdź hasło
                      </label>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !loading && handlePasswordSubmit()}
                        className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                        placeholder="Powtórz hasło"
                        disabled={loading}
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hasło
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !loading && handlePasswordSubmit()}
                        className="block w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                        placeholder="Wpisz hasło"
                        disabled={loading}
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
                )}

                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 animate-shake">
                    <p className="text-sm text-red-600 flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      {error}
                    </p>
                  </div>
                )}

                <button
                  onClick={handlePasswordSubmit}
                  disabled={loading}
                  className={`w-full py-3 px-4 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2 ${
                    isFirstLogin 
                      ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white hover:from-green-700 hover:to-blue-700 focus:ring-green-500'
                      : loginMode === 'admin'
                        ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 focus:ring-purple-500'
                        : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-blue-500'
                  }`}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>{isFirstLogin ? 'Ustaw hasło' : 'Zaloguj się'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  onClick={resetForm}
                  className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                >
                  ← Wróć do wpisywania NIP
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>© 2025 Grupa Eltron. Wszystkie prawa zastrzeżone.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;