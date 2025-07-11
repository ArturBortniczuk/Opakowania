// Plik: src/App.js
// Opis: Dodano logikę do obsługi routingu dla ustawiania nowego hasła.

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AdminNavbar from './components/AdminNavbar';
import LoginForm from './components/LoginForm';
import SetPassword from './components/SetPassword'; // NOWY IMPORT
import Dashboard from './components/Dashboard';
import DrumsList from './components/DrumsList';
import ReturnForm from './components/ReturnForm';
import AdminDashboard from './components/AdminDashboard';
import AdminClientsList from './components/AdminClientsList';
import AdminReturnPeriodsManager from './components/AdminReturnPeriodsManager';
import AdminDrumsList from './components/AdminDrumsList';
import AdminReturnRequests from './components/AdminReturnRequests';
import AdminReports from './components/AdminReports';
import './App.css';

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('login');
  const [passwordResetToken, setPasswordResetToken] = useState(null); // NOWY STAN
  const [selectedDrum, setSelectedDrum] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navigationData, setNavigationData] = useState(null);

  useEffect(() => {
    // Sprawdź, czy w URL jest token do resetowania hasła
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
      setPasswordResetToken(token);
      setCurrentView('set-password');
    } else {
      // Jeśli nie ma tokenu, sprawdź, czy użytkownik jest już zalogowany
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setCurrentView(user.role === 'admin' || user.role === 'supervisor' ? 'admin-dashboard' : 'dashboard');
      }
    }
  }, []); // Ten efekt uruchamia się tylko raz, przy starcie aplikacji

  const handleLogin = (user) => {
    setCurrentUser(user);
    const defaultView = user.role === 'admin' || user.role === 'supervisor' ? 'admin-dashboard' : 'dashboard';
    setCurrentView(defaultView);
    // Wyczyść URL z tokenu po udanym logowaniu
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const logout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setCurrentView('login');
    setSidebarOpen(false);
    setSelectedDrum(null);
    setNavigationData(null);
  };

  const navigateTo = (view, data = null) => {
    setCurrentView(view);
    if (data) {
      if (data.drum) setSelectedDrum(data.drum);
      if (data.navigationData) setNavigationData(data.navigationData);
    }
    setSidebarOpen(false);
  };

  const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'supervisor');

  const renderContent = () => {
    switch (currentView) {
      case 'login':
        return <LoginForm onLogin={handleLogin} onNavigate={navigateTo} />;
      case 'set-password':
        return <SetPassword token={passwordResetToken} onPasswordSet={handleLogin} onInvalidToken={logout} />;
      
      // Widoki klienta
      case 'dashboard':
        return <Dashboard user={currentUser} onNavigate={navigateTo} />;
      case 'drums':
        return <DrumsList user={currentUser} onNavigate={navigateTo} />;
      case 'return':
        return <ReturnForm user={currentUser} selectedDrum={selectedDrum} onNavigate={navigateTo} onSubmit={() => { alert('✅ Zgłoszenie zwrotu zostało wysłane!'); navigateTo('dashboard'); }} />;

      // Widoki admina
      case 'admin-dashboard':
        return <AdminDashboard user={currentUser} onNavigate={navigateTo} />;
      case 'admin-clients':
        return <AdminClientsList user={currentUser} onNavigate={navigateTo} initialFilter={navigationData} />;
      case 'admin-drums':
        return <AdminDrumsList user={currentUser} onNavigate={navigateTo} initialFilter={navigationData} />;
      case 'admin-returns':
        return <AdminReturnRequests user={currentUser} onNavigate={navigateTo} initialFilter={navigationData} />;
      case 'admin-reports':
        return <AdminReports user={currentUser} onNavigate={navigateTo} />;
      case 'admin-return-periods':
        return <AdminReturnPeriodsManager user={currentUser} onNavigate={navigateTo} />;
      
      default:
        return <LoginForm onLogin={handleLogin} onNavigate={navigateTo} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {currentUser && (
        <>
          {isAdmin ? (
            <AdminNavbar user={currentUser} currentView={currentView} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onNavigate={navigateTo} onLogout={logout} />
          ) : (
            <Navbar user={currentUser} currentView={currentView} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onNavigate={navigateTo} onLogout={logout} />
          )}
        </>
      )}
      
      <div className={`transition-all duration-300 ${currentUser ? 'lg:ml-0' : ''}`}>
        {renderContent()}
      </div>
    </div>
  );
};

export default App;
