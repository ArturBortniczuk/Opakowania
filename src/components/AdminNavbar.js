// src/components/AdminNavbar.js - Zaktualizowany o zwijanie i przewijanie
import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  X, 
  Home, 
  Users, 
  Package, 
  Truck, 
  BarChart3,
  LogOut, 
  Building2,
  UserCheck,
  ChevronRight,
  Shield,
  Settings,
  Bell,
  Crown,
  Pin,
  PinOff
} from 'lucide-react';
import { statsAPI } from '../utils/supabaseApi';

const AdminNavbar = ({ 
  user, 
  currentView, 
  sidebarOpen, 
  setSidebarOpen,
  isCollapsed,
  setIsCollapsed,
  onNavigate, 
  onLogout 
}) => {
  const [quickStats, setQuickStats] = useState({
    totalClients: 0,
    totalDrums: 0,
    pendingReturns: 0,
    overdueReturns: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Pobierz szybkie statystyki
  useEffect(() => {
    const fetchQuickStats = async () => {
      try {
        setStatsLoading(true);
        const stats = await statsAPI.getDashboardStats();
        setQuickStats({
          totalClients: stats.totalClients || 0,
          totalDrums: stats.totalDrums || 0,
          pendingReturns: stats.pendingReturns || 0,
          overdueReturns: stats.overdueReturns || 0
        });
      } catch (error) {
        console.error('Błąd pobierania statystyk:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchQuickStats();
    
    const interval = setInterval(fetchQuickStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { id: 'admin-dashboard', label: 'Dashboard', icon: Home, description: 'Panel główny administratora' },
    { id: 'admin-clients', label: 'Zarządzaj klientami', icon: Users, description: 'Wszyscy klienci w systemie' },
    { id: 'admin-drums', label: 'Wszystkie bębny', icon: Package, description: 'Monitoruj wszystkie bębny' },
    { id: 'admin-returns', label: 'Zgłoszenia zwrotów', icon: Truck, description: 'Zarządzaj zwrotami' },
    { id: 'admin-return-periods', label: 'Terminy zwrotu', icon: Settings, description: 'Ustaw terminy dla klientów' },
    { id: 'admin-reports', label: 'Raporty i analizy', icon: BarChart3, description: 'Statystyki i raporty' }
  ];

  const getRoleBadge = (role) => {
    const roleConfig = {
      admin: { label: 'Administrator', icon: Crown, gradient: 'from-purple-600 to-purple-800' },
      supervisor: { label: 'Kierownik', icon: Shield, gradient: 'from-blue-600 to-blue-800' }
    };
    const config = roleConfig[role] || roleConfig.admin;
    const Icon = config.icon;
    return (
      <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-gradient-to-r ${config.gradient} text-white text-xs font-semibold shadow-lg`}>
        <Icon className="w-3 h-3" />
        {!isCollapsed && <span>{config.label}</span>}
      </div>
    );
  };

  const NavItem = ({ item, isActive, onClick }) => {
    const Icon = item.icon;
    return (
      <button
        onClick={onClick}
        title={isCollapsed ? item.label : ''}
        className={`
          relative w-full p-4 rounded-xl transition-all duration-300 group flex items-center
          ${isCollapsed ? 'justify-center' : ''}
          ${isActive 
            ? 'bg-gradient-to-r from-purple-600 to-blue-700 text-white shadow-lg' 
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
          }
        `}
      >
        <div className={`
          p-2 rounded-lg transition-all duration-300
          ${isActive ? 'bg-white/20' : `bg-purple-100 text-purple-600 group-hover:bg-opacity-80`}
        `}>
          <Icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
        </div>
        {!isCollapsed && (
          <div className="flex-1 text-left ml-4">
            <div className="font-semibold">{item.label}</div>
          </div>
        )}
      </button>
    );
  };

  return (
    <>
      <header className={`fixed top-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-purple-100 shadow-sm transition-all duration-300 ease-in-out${isCollapsed ? 'lg:left-20' : 'lg:left-80'}`}>
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg text-purple-600 hover:bg-purple-100 transition-colors duration-200 lg:hidden"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-700 bg-clip-text text-transparent">
                  Grupa Eltron
                </h1>
                <p className="text-xs text-gray-500">Panel Administratora</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors duration-200 relative">
              <Bell className="w-5 h-5" />
              {quickStats.overdueReturns > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {quickStats.overdueReturns}
                </span>
              )}
            </button>
            <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
              <div className="hidden sm:block text-right">
                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                <div className="text-xs text-gray-500">{user.email}</div>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-blue-200 rounded-full flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* ZMIANA: Dynamiczna szerokość i obsługa zwijania */}
      <aside className={`
        fixed top-0 left-0 z-40 h-screen bg-white/95 backdrop-blur-md 
        border-r border-purple-100 shadow-xl transform transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-20' : 'w-80'}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="h-full flex flex-col pt-16">
          <div className="p-4 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-blue-100">
            <div className={`flex items-center space-x-4 mb-3 ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <UserCheck className="w-6 h-6 text-white" />
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{user.name}</h3>
                  <p className="text-sm text-gray-600 truncate">{user.email}</p>
                </div>
              )}
            </div>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
              {getRoleBadge(user.role)}
            </div>
          </div>
          
          {/* ZMIANA: Dodano overflow-y-auto dla przewijania */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <h4 className={`text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ${isCollapsed ? 'text-center' : 'pl-4'}`}>
              {isCollapsed ? 'MENU' : 'Zarządzanie'}
            </h4>
            {menuItems.map((item) => (
              <NavItem
                key={item.id}
                item={item}
                isActive={currentView === item.id}
                onClick={() => onNavigate(item.id)}
              />
            ))}
          </nav>

          <div className="p-4 border-t border-purple-100">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-full p-4 rounded-xl text-gray-600 hover:bg-gray-100 transition-all duration-200 flex items-center space-x-3 group"
              title={isCollapsed ? "Rozwiń menu" : "Zwiń menu"}
            >
              <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-gray-200 transition-colors duration-200">
                {isCollapsed ? <PinOff className="w-5 h-5" /> : <Pin className="w-5 h-5" />}
              </div>
              {!isCollapsed && <span className="font-medium">Zwiń menu</span>}
            </button>
            <button
              onClick={onLogout}
              className="w-full mt-2 p-4 rounded-xl text-red-600 hover:bg-red-50 transition-all duration-200 flex items-center space-x-3 group"
              title="Wyloguj się"
            >
              <div className="p-2 rounded-lg bg-red-100 group-hover:bg-red-200 transition-colors duration-200">
                <LogOut className="w-5 h-5" />
              </div>
              {!isCollapsed && <span className="font-medium">Wyloguj się</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AdminNavbar;
