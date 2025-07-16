import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AdminNavbar from './components/AdminNavbar';
import LoginForm from './components/LoginForm';
import SetPassword from './components/SetPassword';
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

// Importy do nowego nagłówka
import { Bell, UserCheck, User } from 'lucide-react';
import { statsAPI } from './utils/supabaseApi';

// Komponent nowego nagłówka w obszarze treści
const ContentHeader = ({ user, quickStats }) => (
  <header className="flex items-center justify-end mb-8">
    <div className="flex items-center space-x-4">
      {user.role === 'admin' && (
        <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors duration-200 relative">
          <Bell className="w-5 h-5" />
          {quickStats.overdueReturns > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold border-2 border-white">
              {quickStats.overdueReturns}
            </span>
          )}
        </button>
      )}
      <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
        <div className="hidden sm:block text-right">
          <div className="text-sm font-medium text-gray-900">{user.name || user.companyName}</div>
          <div className="text-xs text-gray-500">{user.email}</div>
        </div>
        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
          {user.role === 'admin' || user.role === 'supervisor' 
            ? <UserCheck className="w-5 h-5 text-purple-600" />
            : <User className="w-5 h-5 text-blue-600" />
          }
        </div>
      </div>
    </div>
  </header>
);

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('login');
  const [passwordResetToken, setPasswordResetToken] = useState(null);
  const [selectedDrum, setSelectedDrum] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [navigationData, setNavigationData] = useState(null);
  const [quickStats, setQuickStats] = useState({ overdueReturns: 0 });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
      setPasswordResetToken(token);
      setCurrentView('set-password');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          setCurrentUser(user);
          setCurrentView(user.role === 'admin' || user.role === 'supervisor' ? 'admin-dashboard' : 'dashboard');
        } catch (e) {
          console.error("Błąd parsowania danych użytkownika z localStorage", e);
          localStorage.removeItem('currentUser');
        }
      }
    }
  }, []);
  
  const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'supervisor');

  useEffect(() => {
    if (isAdmin) {
      const fetchQuickStats = async () => {
        try {
          const stats = await statsAPI.getDashboardStats();
          setQuickStats({ overdueReturns: stats.overdueReturns || 0 });
        } catch (error) {
          console.error('Błąd pobierania statystyk dla nagłówka:', error);
        }
      };
      fetchQuickStats();
      const interval = setInterval(fetchQuickStats, 60000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const handleLogin = (user) => {
    setCurrentUser(user);
    const defaultView = user.role === 'admin' || user.role === 'supervisor' ? 'admin-dashboard' : 'dashboard';
    setCurrentView(defaultView);
    setPasswordResetToken(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setCurrentView('login');
    setSidebarOpen(false);
    setSelectedDrum(null);
    setNavigationData(null);
  };
  
  const handleInvalidToken = () => {
    alert("Link do ustawienia hasła jest nieprawidłowy lub wygasł. Przekierowuję do strony logowania.");
    setCurrentView('login');
    setPasswordResetToken(null);
  };

  const navigateTo = (view, data = null) => {
    setCurrentView(view);
    if (data) {
      if (data.drum) setSelectedDrum(data.drum);
      if (data.navigationData) setNavigationData(data.navigationData);
    }
    setSidebarOpen(false);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'login': return <LoginForm onLogin={handleLogin} onNavigate={navigateTo} />;
      case 'set-password': return <SetPassword token={passwordResetToken} onPasswordSet={handleLogin} onInvalidToken={handleInvalidToken} />;
      case 'dashboard': return <Dashboard user={currentUser} onNavigate={navigateTo} />;
      case 'drums': return <DrumsList user={currentUser} onNavigate={navigateTo} />;
      case 'return': return <ReturnForm user={currentUser} selectedDrum={selectedDrum} onNavigate={navigateTo} onSubmit={() => { alert('✅ Zgłoszenie zwrotu zostało wysłane!'); navigateTo('dashboard'); }} />;
      case 'admin-dashboard': return <AdminDashboard user={currentUser} onNavigate={navigateTo} />;
      case 'admin-clients': return <AdminClientsList user={currentUser} onNavigate={navigateTo} initialFilter={navigationData} />;
      case 'admin-drums': return <AdminDrumsList user={currentUser} onNavigate={navigateTo} initialFilter={navigationData} />;
      case 'admin-returns': return <AdminReturnRequests user={currentUser} onNavigate={navigateTo} initialFilter={navigationData} />;
      case 'admin-reports': return <AdminReports user={currentUser} onNavigate={navigateTo} />;
      case 'admin-return-periods': return <AdminReturnPeriodsManager user={currentUser} onNavigate={navigateTo} />;
      default: return <LoginForm onLogin={handleLogin} onNavigate={navigateTo} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {currentUser && (
        <>
          {isAdmin ? (
            <AdminNavbar 
              user={currentUser} 
              currentView={currentView} 
              sidebarOpen={sidebarOpen} 
              setSidebarOpen={setSidebarOpen} 
              isCollapsed={isSidebarCollapsed}
              setIsCollapsed={setIsSidebarCollapsed}
              onNavigate={navigateTo} 
              onLogout={handleLogout} 
            />
          ) : (
            <Navbar 
              user={currentUser} 
              currentView={currentView} 
              sidebarOpen={sidebarOpen} 
              setSidebarOpen={setSidebarOpen} 
              isCollapsed={isSidebarCollapsed}
              setIsCollapsed={setIsSidebarCollapsed}
              onNavigate={navigateTo} 
              onLogout={handleLogout} 
            />
          )}
        </>
      )}
      
      <main className={`transition-all duration-300 ${currentUser ? (isSidebarCollapsed ? 'lg:ml-24' : 'lg:ml-80') : ''}`}>
        {currentUser ? (
          <div className="p-4 sm:p-6 lg:p-8">
            <ContentHeader user={currentUser} quickStats={quickStats} />
            {renderContent()}
          </div>
        ) : (
          renderContent()
        )}
      </main>
    </div>
  );
