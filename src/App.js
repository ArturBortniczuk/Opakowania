import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import AdminNavbar from './components/AdminNavbar';
import LoginForm from './components/LoginForm';
import SetPassword from './components/SetPassword';
import Dashboard from './components/Dashboard';
import DrumsList from './components/DrumsList';
import ReturnFormWrapper from './components/ReturnFormWrapper';
import ClientReturnRequests from './components/ClientReturnRequests';
import ProfileSelection from './components/ProfileSelection';
import AdminDashboard from './components/AdminDashboard';
import AdminClientsList from './components/AdminClientsList';
import AdminReturnPeriodsManager from './components/AdminReturnPeriodsManager';
import AdminDrumsList from './components/AdminDrumsList';
import AdminReturnRequests from './components/AdminReturnRequests';
import AdminReports from './components/AdminReports';
import AdminSupplierRules from './components/AdminSupplierRules';
import AdminRegistrationManager from './components/AdminRegistrationManager';
import HelpGuide from './components/HelpGuide';
import LogisticsMap from './components/LogisticsMap';
import './App.css';

import { supabase } from './lib/supabase';
import { authAPI, setCurrentUserCache } from './utils/supabaseApi';
import { Clock, LogOut } from 'lucide-react';

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const isStaff = (role) => ['admin', 'supervisor', 'Dyrektor', 'Kierownik', 'Wsparcie', 'Specjalista'].includes(role);

  useEffect(() => {
    let isMounted = true;
    let subscription = null;

    const initializeAuth = async () => {
      try {
        console.log("🔄 Inicjalizacja autoryzacji...");
        
        // 1. Pobieramy sesję bez sztucznego timeoutu. Wymuszanie przerwania
        // poprzez Promise.race powodowało deadlocki w wbudowanym mechaniźmie
        // blokad (navigator.locks) paczki supabase-js, co zawieszało np. zmianę hasła.
        let session = null;
        try {
          const { data } = await supabase.auth.getSession();
          session = data?.session;
        } catch (err) {
          console.error("⚠️ Błąd pobierania sesji:", err);
        }

        if (session && session.user) {
          console.log("👤 Znaleziono aktywną sesję Supabase:", session.user.email);
          const profile = await authAPI.getUserProfile(session.user.id);
          
          if (!isMounted) return;

          const finalUser = {
            id: session.user.id,
            nip: profile.nip,
            username: profile.email,
            name: profile.name,
            email: profile.email,
            role: profile.role,
            status: profile.status,
            companyName: profile.company_name || profile.name,
          };

          setCurrentUser(finalUser);
          setCurrentUserCache(finalUser); // Bezpieczny cache — nie z localStorage
          localStorage.setItem('currentUser', JSON.stringify(finalUser));
          
          const savedProfile = localStorage.getItem('currentProfile');
          if (savedProfile) {
            setCurrentProfile(JSON.parse(savedProfile));
          }

          if (location.pathname === '/') {
            navigate(isStaff(profile.role) ? '/admin' : '/dashboard', { replace: true });
          }
        } else {
          // Fallback: jeśli Supabase nie odpowiada, ale mamy lokalnego użytkownika z poprzedniej sesji
          const localUserStr = localStorage.getItem('currentUser');
          if (localUserStr) {
            try {
              const localUser = JSON.parse(localUserStr);
              console.log("💾 Przywrócono sesję lokalną z localStorage (Fallback):", localUser.email);
              if (isMounted) {
                setCurrentUser(localUser);
                const savedProfile = localStorage.getItem('currentProfile');
                if (savedProfile) {
                  setCurrentProfile(JSON.parse(savedProfile));
                }
                
                if (location.pathname === '/') {
                  navigate(isStaff(localUser.role) ? '/admin' : '/dashboard', { replace: true });
                }
              }
            } catch (parseErr) {
              console.error("Błąd parsowania lokalnego użytkownika:", parseErr);
            }
          } else {
            console.log("ℹ️ Brak aktywnej sesji (brak fallbacku w localStorage).");
            if (isMounted) {
              setCurrentUser(null);
              setCurrentProfile(null);
              localStorage.removeItem('currentUser');
              localStorage.removeItem('currentProfile');
            }
          }
        }
      } catch (e) {
        console.error("❌ Błąd podczas inicjalizacji sesji:", e);
        // Próba ratunkowego przywrócenia z localStorage
        const localUserStr = localStorage.getItem('currentUser');
        if (localUserStr && isMounted) {
          try {
            const localUser = JSON.parse(localUserStr);
            setCurrentUser(localUser);
            const savedProfile = localStorage.getItem('currentProfile');
            if (savedProfile) {
              setCurrentProfile(JSON.parse(savedProfile));
            }
          } catch (_) {}
        } else if (isMounted) {
          setCurrentUser(null);
          setCurrentProfile(null);
          localStorage.removeItem('currentUser');
          localStorage.removeItem('currentProfile');
        }
      } finally {
        if (isMounted) {
          setIsInitialized(true);

          // ⚠️ REJESTRUJEMY NASŁUCHIWACZ REAL-TIME DOPIERO PO ZAKOŃCZENIU INICJALIZACJI!
          // Całkowicie zapobiega to jakimkolwiek wyścigom lub deadlockom na poziomie Supabase Client!
          try {
            const { data } = supabase.auth.onAuthStateChange((event, session) => {
              console.log(`🔑 Zmiana stanu autoryzacji w tle: ${event}`);
              
              if (event === 'SIGNED_OUT') {
                if (isMounted) {
                  setCurrentUser(null);
                  setCurrentProfile(null);
                  localStorage.removeItem('currentUser');
                  localStorage.removeItem('currentProfile');
                  
                  const isResetPath = location.pathname.startsWith('/set-password');
                  if (location.pathname !== '/' && !isResetPath) {
                    navigate('/', { replace: true });
                  }
                }
              } else if (event === 'PASSWORD_RECOVERY') {
                if (isMounted) {
                  navigate('/set-password', { replace: true });
                }
              } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                if (session && session.user) {
                  authAPI.getUserProfile(session.user.id)
                    .then(profile => {
                      if (!isMounted) return;

                      const finalUser = {
                        id: session.user.id,
                        nip: profile.nip,
                        username: profile.email,
                        name: profile.name,
                        email: profile.email,
                        role: profile.role,
                        status: profile.status,
                        companyName: profile.company_name || profile.name,
                      };

                      setCurrentUser(finalUser);
                      setCurrentUserCache(finalUser); // Bezpieczny cache
                      localStorage.setItem('currentUser', JSON.stringify(finalUser));
                      
                      // Jeśli to logowanie z linku resetującego hasło, nie przekierowuj na dashboard!
                      if (location.pathname === '/' && !window.location.href.includes('type=recovery') && !window.location.search.includes('code=')) {
                        navigate(isStaff(profile.role) ? '/admin' : '/dashboard', { replace: true });
                      } else if (location.pathname === '/' && (window.location.href.includes('type=recovery') || window.location.search.includes('code='))) {
                        // Awaryjne przechwycenie: jeśli Supabase zrzuciło nas na '/', a w URL jest code= lub type=recovery
                        navigate('/set-password', { replace: true });
                      }
                    })
                    .catch(e => {
                      console.error("Błąd ładowania profilu po zmianie autoryzacji:", e);
                    });
                }
              }
            });
            subscription = data.subscription;
          } catch (listenerError) {
            console.error("Błąd podczas rejestracji nasłuchiwacza auth:", listenerError);
          }
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (_) {}
      }
    };
  }, [location.pathname, navigate]);

  const handleLogin = (user) => {
    // Sesja obsługiwana jest przez onAuthStateChange
  };

  const handleLogout = async () => {
    console.log("🚪 Błyskawiczne wylogowywanie...");
    
    // 1. Natychmiastowe i synchroniczne czyszczenie lokalnego stanu, aby uniknąć zamrożenia UI
    setCurrentUser(null);
    setCurrentProfile(null);
    setCurrentUserCache(null); // Wyczyść bezpieczny cache
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentProfile');
    
    // Natychmiastowe przekierowanie na stronę logowania
    navigate('/', { replace: true });
    
    // 2. Asynchroniczne wywołanie signOut w tle (nie blokuje interfejsu w razie braku sieci / zawieszenia Supabase)
    try {
      supabase.auth.signOut().catch(err => console.warn("Ignorowany błąd signOut:", err));
    } catch (e) {
      console.warn("Wyjątek podczas signOut:", e);
    }
  };

  const handleSelectProfile = (profile) => {
    localStorage.setItem('currentProfile', JSON.stringify(profile));
    setCurrentProfile(profile);
    navigate('/dashboard');
  };

  const handleClearProfile = () => {
    localStorage.removeItem('currentProfile');
    setCurrentProfile(null);
    navigate('/dashboard');
  };

  const isUserStaff = currentUser && isStaff(currentUser.role);

  // Bloker dla kont oczekujących na weryfikację RODO/NIP
  if (currentUser && currentUser.status === 'pending' && !isStaff(currentUser.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 px-4">
        <div className="max-w-md w-full bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-blue-100 p-8 text-center space-y-6">
          <div className="mb-4 flex justify-center">
            <img src="/logo40.png" alt="Grupa Eltron" className="h-16 w-auto object-contain" />
          </div>
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Clock className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">Konto w weryfikacji</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Witaj, <strong>{currentUser.name}</strong>!<br />
            Twoje zgłoszenie rejestracji dla firmy <strong>{currentUser.companyName}</strong> (NIP: {currentUser.nip}) oczekuje na weryfikację przez specjalistę ds. opakowań Grupy Eltron.
          </p>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-800 text-left">
            O aktywacji konta i przydzieleniu dostępu do statystyk bębnów zostaniesz powiadomiony wiadomością e-mail na adres: <strong>{currentUser.email}</strong>. Zazwyczaj weryfikacja trwa do 24 godzin w dni robocze.
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all duration-200 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900"
          >
            <LogOut className="w-4 h-4" />
            <span>Wyloguj się</span>
          </button>
        </div>
      </div>
    );
  }

  // Helper dla chronionych tras
  const ProtectedRoute = ({ children, adminOnly = false, allowedRoles = null }) => {
    if (!currentUser) {
      return <Navigate to="/" replace />;
    }
    if (adminOnly && !isUserStaff) {
      return <Navigate to="/dashboard" replace />;
    }
    if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
      return <Navigate to={isUserStaff ? "/admin" : "/dashboard"} replace />;
    }
    return children;
  };

  const isResetPath = location.pathname.startsWith('/set-password');
  const shouldShowNavbar = currentUser && location.pathname !== '/' && !isResetPath && (isUserStaff || currentProfile);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {currentUser && !isUserStaff && !currentProfile && !isResetPath ? (
        <ProfileSelection
          user={currentUser}
          onSelectProfile={handleSelectProfile}
          onLogout={handleLogout}
        />
      ) : (
        <>
          {shouldShowNavbar && (
            <>
              {isUserStaff ? (
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
                  profile={currentProfile}
                  sidebarOpen={sidebarOpen}
                  setSidebarOpen={setSidebarOpen}
                  isCollapsed={isSidebarCollapsed}
                  setIsCollapsed={setIsSidebarCollapsed}
                  onLogout={handleLogout}
                  onChangeProfile={handleClearProfile}
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
                  <Dashboard user={currentUser} profile={currentProfile} />
                </ProtectedRoute>
              } />
              <Route path="/drums" element={
                <ProtectedRoute>
                  <DrumsList user={currentUser} />
                </ProtectedRoute>
              } />
              <Route path="/return" element={
                <ProtectedRoute>
                  <ReturnFormWrapper currentUser={currentUser} profile={currentProfile} />
                </ProtectedRoute>
              } />
              <Route path="/my-returns" element={
                <ProtectedRoute>
                  <ClientReturnRequests user={currentUser} />
                </ProtectedRoute>
              } />
              <Route path="/help" element={
                <ProtectedRoute>
                  <HelpGuide />
                </ProtectedRoute>
              } />

              {/* Trasy Admina */}
              <Route path="/admin" element={
                <ProtectedRoute adminOnly>
                  <AdminDashboard
                    user={currentUser}
                    onNavigate={(page, state) => {
                      const routes = {
                        'admin-clients': '/admin/clients',
                        'admin-drums': '/admin/drums',
                        'admin-returns': '/admin/returns',
                        'admin-return-periods': '/admin/return-periods',
                        'admin-supplier-rules': '/admin/supplier-rules',
                        'admin-reports': '/admin/reports'
                      };
                      if (routes[page]) {
                        if (state && Object.keys(state).length > 0) {
                          const params = new URLSearchParams();
                          Object.entries(state).forEach(([k, v]) => {
                            if(v !== undefined && v !== null) params.append(k, v);
                          });
                          navigate(`${routes[page]}?${params.toString()}`);
                        } else {
                          navigate(routes[page]);
                        }
                      }
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
                        'admin-supplier-rules': '/admin/supplier-rules',
                        'admin-reports': '/admin/reports'
                      };
                      if (routes[page]) {
                        if (state && Object.keys(state).length > 0) {
                          const params = new URLSearchParams();
                          Object.entries(state).forEach(([k, v]) => {
                            if(v !== undefined && v !== null) params.append(k, v);
                          });
                          navigate(`${routes[page]}?${params.toString()}`);
                        } else {
                          navigate(routes[page]);
                        }
                      }
                    }}
                  />
                </ProtectedRoute>
              } />
              <Route path="/admin/registrations" element={
                <ProtectedRoute adminOnly allowedRoles={['admin', 'supervisor']}>
                  <AdminRegistrationManager />
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
              <Route path="/admin/map" element={
                <ProtectedRoute adminOnly>
                  <LogisticsMap user={currentUser} />
                </ProtectedRoute>
              } />
              <Route path="/admin/reports" element={
                <ProtectedRoute adminOnly>
                  <AdminReports user={currentUser} />
                </ProtectedRoute>
              } />
              <Route path="/admin/return-periods" element={
                <ProtectedRoute adminOnly allowedRoles={['admin', 'supervisor']}>
                  <AdminReturnPeriodsManager user={currentUser} />
                </ProtectedRoute>
              } />
              <Route path="/admin/supplier-rules" element={
                <ProtectedRoute adminOnly allowedRoles={['admin', 'supervisor']}>
                  <AdminSupplierRules user={currentUser} />
                </ProtectedRoute>
              } />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </>
      )}
    </div>
  );
};

export default App;
