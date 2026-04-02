import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import AdminNavbar from './components/AdminNavbar';
import LoginForm from './components/LoginForm';
import SetPassword from './components/SetPassword';
import Dashboard from './components/Dashboard';
import DrumsList from './components/DrumsList';
import ReturnForm from './components/ReturnForm';
import ClientReturnRequests from './components/ClientReturnRequests';
import AdminDashboard from './components/AdminDashboard';
import AdminClientsList from './components/AdminClientsList';
import AdminReturnPeriodsManager from './components/AdminReturnPeriodsManager';
import AdminDrumsList from './components/AdminDrumsList';
import AdminReturnRequests from './components/AdminReturnRequests';
import AdminReports from './components/AdminReports';
import './App.css';



const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false); // DODANE: Stan inicjalizacji

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        // Opcjonalne: Przekierowanie jeśli jesteśmy na / i mamy usera
        if (location.pathname === '/') {
          navigate(user.role === 'admin' || user.role === 'supervisor' ? '/admin' : '/dashboard');
        }
      } catch (e) {
        console.error("Błąd parsowania danych użytkownika z localStorage", e);
        localStorage.removeItem('currentUser');
      }
    }
    setIsInitialized(true); // DODANE: Oznaczamy, że sprawdziliśmy localStorage
  }, []);

  const handleLogin = (user) => {
    setCurrentUser(user);
    const defaultPath = user.role === 'admin' || user.role === 'supervisor' ? '/admin' : '/dashboard';
    navigate(defaultPath);
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setSidebarOpen(false);
    navigate('/');
  };

  const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'supervisor');

  // Helper dla chronionych tras
  const ProtectedRoute = ({ children, adminOnly = false }) => {
    if (!currentUser) {
      return <Navigate to="/" replace />;
    }
    if (adminOnly && !isAdmin) {
      return <Navigate to="/dashboard" replace />;
    }
    return children;
  };

  const shouldShowNavbar = currentUser && location.pathname !== '/' && location.pathname !== '/set-password';

  // DODANE: Loading screen podczas inicjalizacji
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {shouldShowNavbar && (
        <>
          {isAdmin ? (
            <AdminNavbar
              user={currentUser}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              isCollapsed={isSidebarCollapsed}
              setIsCollapsed={setIsSidebarCollapsed}
              onLogout={handleLogout}
            />
          ) : (
            <Navbar
              user={currentUser}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              isCollapsed={isSidebarCollapsed}
              setIsCollapsed={setIsSidebarCollapsed}
              onLogout={handleLogout}
            />
          )}
        </>
      )}

      <main className={`transition-all duration-300 pt-24 ${shouldShowNavbar ? (isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-80') : ''}`}>
        <Routes>
          <Route path="/" element={<LoginForm onLogin={handleLogin} />} />
          <Route path="/set-password" element={<SetPassword onPasswordSet={handleLogin} />} />
          <Route path="/set-password/:token" element={<SetPassword onPasswordSet={handleLogin} />} />

          {/* Trasy Klienta */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard user={currentUser} />
            </ProtectedRoute>
          } />
          <Route path="/drums" element={
            <ProtectedRoute>
              <DrumsList user={currentUser} />
            </ProtectedRoute>
          } />
          <Route path="/return" element={
            <ProtectedRoute>
              <ReturnForm user={currentUser} />
            </ProtectedRoute>
          } />
          <Route path="/my-returns" element={
            <ProtectedRoute>
              <ClientReturnRequests user={currentUser} />
            </ProtectedRoute>
          } />

          {/* Trasy Admina */}
          <Route path="/admin" element={
            <ProtectedRoute adminOnly>
              <AdminDashboard
                user={currentUser}
                onNavigate={(page) => {
                  const routes = {
                    'admin-clients': '/admin/clients',
                    'admin-drums': '/admin/drums',
                    'admin-returns': '/admin/returns',
                    'admin-return-periods': '/admin/return-periods',
                    'admin-reports': '/admin/reports'
                  };
                  if (routes[page]) navigate(routes[page]);
                }}
              />
            </ProtectedRoute>
          } />
          <Route path="/admin/clients" element={
            <ProtectedRoute adminOnly>
              <AdminClientsList
                user={currentUser}
                onNavigate={(page, state) => {
                  const routes = {
                    'admin-clients': '/admin/clients',
                    'admin-drums': '/admin/drums',
                    'admin-returns': '/admin/returns',
                    'admin-return-periods': '/admin/return-periods',
                    'admin-reports': '/admin/reports'
                  };
                  if (routes[page]) navigate(routes[page], { state });
                }}
              />
            </ProtectedRoute>
          } />
          <Route path="/admin/drums" element={
            <ProtectedRoute adminOnly>
              <AdminDrumsList user={currentUser} />
            </ProtectedRoute>
          } />
          <Route path="/admin/returns" element={
            <ProtectedRoute adminOnly>
              <AdminReturnRequests user={currentUser} />
            </ProtectedRoute>
          } />
          <Route path="/admin/reports" element={
            <ProtectedRoute adminOnly>
              <AdminReports user={currentUser} />
            </ProtectedRoute>
          } />
          <Route path="/admin/return-periods" element={
            <ProtectedRoute adminOnly>
              <AdminReturnPeriodsManager user={currentUser} />
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
