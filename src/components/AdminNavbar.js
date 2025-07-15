// src/components/AdminNavbar.js - Zaktualizowany o rzeczywiste dane z Supabase
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
  Search,
  Crown
} from 'lucide-react';
import { statsAPI } from '../utils/supabaseApi';

const AdminNavbar = ({ 
  user, 
  currentView, 
  sidebarOpen, 
  setSidebarOpen, 
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
        // W przypadku błędu zostaw domyślne wartości
      } finally {
        setStatsLoading(false);
      }
    };

    fetchQuickStats();
    
    // Odświeżaj statystyki co 30 sekund
    const interval = setInterval(fetchQuickStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    {
      id: 'admin-dashboard',
      label: 'Dashboard',
      icon: Home,
      description: 'Panel główny administratora',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      id: 'admin-clients',
      label: 'Zarządzaj klientami',
      icon: Users,
      description: 'Wszyscy klienci w systemie',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      id: 'admin-drums',
      label: 'Wszystkie bębny',
      icon: Package,
      description: 'Monitoruj wszystkie bębny',
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      id: 'admin-returns',
      label: 'Zgłoszenia zwrotów',
      icon: Truck,
      description: 'Zarządzaj zwrotami',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      id: 'admin-return-periods',
      label: 'Terminy zwrotu',
      icon: Settings,
      description: 'Ustaw terminy dla klientów',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    },
    {
      id: 'admin-reports',
      label: 'Raporty i analizy',
      icon: BarChart3,
      description: 'Statystyki i raporty',
      color: 'text-teal-600',
      bgColor: 'bg-teal-100'
    }
  ];

  const getRoleBadge = (role) => {
    const roleConfig = {
      admin: {
        label: 'Administrator',
        icon: Crown,
        gradient: 'from-purple-600 to-purple-800'
      },
      supervisor: {
        label: 'Kierownik',
        icon: Shield,
        gradient: 'from-blue-600 to-blue-800'
      }
    };

    const config = roleConfig[role] || roleConfig.admin;
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-gradient-to-r ${config.gradient} text-white text-xs font-semibold shadow-lg`}>
        <Icon className="w-3 h-3" />
        <span>{config.label}</span>
      </div>
    );
  };

  const NavItem = ({ item, isActive, onClick }) => {
    const Icon = item.icon;
    
    return (
      <button
        onClick={onClick}
        className={`
          relative w-full p-4 rounded-xl transition-all duration-300 group
          ${isActive 
            ? 'bg-gradient-to-r from-purple-600 to-blue-700 text-white shadow-lg transform scale-105' 
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
          }
        `}
      >
        <div className="flex items-center space-x-4">
          <div className={`
            p-2 rounded-lg transition-all duration-300
            ${isActive 
              ? 'bg-white/20' 
              : `${item.bgColor} group-hover:bg-opacity-80`
            }
          `}>
            <Icon className={`w-5 h-5 ${isActive ? 'text-white' : item.color}`} />
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold">{item.label}</div>
            <div className={`text-sm ${isActive ? 'text-purple-100' : 'text-gray-500'}`}>
              {item.description}
            </div>
          </div>
          <ChevronRight className={`
            w-4 h-4 transition-transform duration-300
            ${isActive ? 'text-white rotate-90' : 'text-gray-400 group-hover:translate-x-1'}
          `} />
        </div>
      </button>
    );
  };

  return (
    <>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-purple-100 shadow-sm">
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

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-16 left-0 z-40 w-80 h-[calc(100vh-4rem)] bg-white/95 backdrop-blur-md 
        border-r border-purple-100 shadow-xl transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="h-full flex flex-col">
          {/* User Info */}
          <div className="p-6 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-blue-100">
            <div className="flex items-center space-x-4 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <UserCheck className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{user.name}</h3>
                <p className="text-sm text-gray-600 truncate">{user.email}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              {getRoleBadge(user.role)}
              <div className="text-xs text-gray-500">
                ID: {user.id}
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 p-6 space-y-3">
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Zarządzanie systemem
              </h4>
              <div className="space-y-2">
                {menuItems.map((item) => (
                  <NavItem
                    key={item.id}
                    item={item}
                    isActive={currentView === item.id}
                    onClick={() => onNavigate(item.id)}
                  />
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 border border-gray-200">
              <h5 className="text-sm font-semibold text-gray-700 mb-3">Szybkie statystyki</h5>
              {statsLoading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Aktywne klientów:</span>
                    <span className="font-medium text-blue-600">{quickStats.totalClients}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Wszystkie bębny:</span>
                    <span className="font-medium text-green-600">{quickStats.totalDrums}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Oczekujące zwroty:</span>
                    <span className="font-medium text-yellow-600">{quickStats.pendingReturns}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pilne sprawy:</span>
                    <span className={`font-medium ${quickStats.overdueReturns > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {quickStats.overdueReturns}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* System Info */}
          <div className="p-4 border-t border-purple-100 bg-gray-50">
            <div className="text-xs text-gray-500 space-y-1">
              <div>System v1.0.0</div>
              <div>Ostatnia aktualizacja: {new Date().toLocaleDateString('pl-PL')}</div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Wszystkie systemy działają</span>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <div className="p-6 border-t border-purple-100">
            <button
              onClick={onLogout}
              className="w-full p-4 rounded-xl text-red-600 hover:bg-red-50 transition-all duration-200 flex items-center space-x-3 group"
            >
              <div className="p-2 rounded-lg bg-red-100 group-hover:bg-red-200 transition-colors duration-200">
                <LogOut className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-medium">Wyloguj się</div>
                <div className="text-xs text-red-500">Zakończ sesję administratora</div>
              </div>
            </button>
          </div>
        </div>
      </aside>

      {/* Spacer for fixed header */}
      <div className="h-16"></div>
    </>
  );
};

export default AdminNavbar;
