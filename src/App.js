// src/App.js
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AdminNavbar from './components/AdminNavbar';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';
import DrumsList from './components/DrumsList';
import ReturnForm from './components/ReturnForm';
import AdminDashboard from './components/AdminDashboard';
import AdminClientsList from './components/AdminClientsList';
import AdminReturnPeriodsManager from './components/AdminReturnPeriodsManager';
import AdminDrumsList from './components/AdminDrumsList';
import AdminReturnRequests from './components/AdminReturnRequests';
import AdminReports from './components/AdminReports';
import { mockDrumsData } from './data/mockData';
import './App.css';

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('login');
  const [selectedDrum, setSelectedDrum] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navigationData, setNavigationData] = useState(null);

  useEffect(() => {
    // Sprawdź czy użytkownik jest już zalogowany
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      // Ustaw odpowiedni widok dla roli użytkownika
      setCurrentView(user.role === 'admin' || user.role === 'supervisor' ? 'admin-dashboard' : 'dashboard');
    }
  }, []);

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
              onNavigate={navigateTo}
              onLogout={logout}
            />
          ) : (
            <Navbar 
              user={currentUser}
              currentView={currentView}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              onNavigate={navigateTo}
              onLogout={logout}
            />
          )}
        </>
      )}
      
      <div className={`transition-all duration-300 ${currentUser ? 'lg:ml-0' : ''}`}>
        {/* Login */}
        {currentView === 'login' && (
          <LoginForm 
            onLogin={(user) => {
              setCurrentUser(user);
              const defaultView = user.role === 'admin' || user.role === 'supervisor' ? 'admin-dashboard' : 'dashboard';
              setCurrentView(defaultView);
            }} 
          />
        )}
        
        {/* Client Views */}
        {currentView === 'dashboard' && currentUser && !isAdmin && (
          <Dashboard 
            user={currentUser}
            onNavigate={navigateTo}
          />
        )}
        
        {currentView === 'drums' && currentUser && !isAdmin && (
          <DrumsList 
            user={currentUser}
            onNavigate={navigateTo}
          />
        )}
        
        {currentView === 'return' && currentUser && !isAdmin && (
          <ReturnForm 
            user={currentUser}
            selectedDrum={selectedDrum}
            onNavigate={navigateTo}
            onSubmit={() => {
              alert('✅ Zgłoszenie zwrotu zostało wysłane!');
              navigateTo('dashboard');
            }}
          />
        )}

        {/* Admin Views */}
        {currentView === 'admin-dashboard' && currentUser && isAdmin && (
          <AdminDashboard 
            user={currentUser}
            onNavigate={navigateTo}
          />
        )}
        
        {currentView === 'admin-clients' && currentUser && isAdmin && (
          <AdminClientsList 
            user={currentUser}
            onNavigate={navigateTo}
            initialFilter={navigationData}
          />
        )}
        
        {currentView === 'admin-drums' && currentUser && isAdmin && (
          <AdminDrumsList 
            user={currentUser}
            onNavigate={navigateTo}
            initialFilter={navigationData}
          />
        )}
        
        {currentView === 'admin-returns' && currentUser && isAdmin && (
          <AdminReturnRequests 
            user={currentUser}
            onNavigate={navigateTo}
            initialFilter={navigationData}
          />
        )}
        

        {currentView === 'admin-reports' && currentUser && isAdmin && (
          <AdminReports 
            user={currentUser}
            onNavigate={navigateTo}
          />
        )}
        
        {currentView === 'admin-return-periods' && currentUser && isAdmin && (
          <AdminReturnPeriodsManager 
            user={currentUser}
            onNavigate={navigateTo}
          />
        )}
      </div>
    </div>
  );
};

export default App;