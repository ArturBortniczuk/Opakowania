// src/components/Navbar.js - Zaktualizowany o zwijanie i przewijanie
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu, X, Home, Package, Truck, LogOut, Building2, User, Pin, PinOff, FileText
} from 'lucide-react';

const Navbar = ({
  user,
  profile,
  sidebarOpen,
  setSidebarOpen,
  isCollapsed,
  setIsCollapsed,
  onLogout,
  onChangeProfile
}) => {
  const getInitials = (fullName) => {
    if (!fullName) return 'U';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/drums', label: 'Moje bębny', icon: Package },
    { path: '/my-returns', label: 'Moje zgłoszenia', icon: FileText },
    { path: '/return', label: 'Zgłoś zwrot', icon: Truck }
  ];

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
            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
            : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
          }
        `}
      >
        <div className={`
          p-2 rounded-lg transition-all duration-300
          ${isActive ? 'bg-white/20' : 'bg-blue-100 text-blue-600 group-hover:bg-blue-200'}
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
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-blue-100 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200 lg:hidden"
              >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <div className="flex items-center space-x-3">
                <img src="/logo40.png" alt="Grupa Eltron" className="h-10 w-auto object-contain" />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-right">
                {profile && <div className="text-sm font-bold text-blue-700 leading-tight">{profile.name}</div>}
                <div className="text-xs font-semibold text-gray-900 leading-tight">{user.companyName}</div>
                <div className="text-[10px] text-gray-500">NIP: {user.nip}</div>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md">
                {profile ? getInitials(profile.name) : <User className="w-5 h-5" />}
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
        border-r border-blue-100 shadow-xl transform transition-transform duration-300 ease-in-out
        ${isCollapsed ? 'w-20' : 'w-80'}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="h-full flex flex-col pt-16">
          {/* ZMIANA: Dodano overflow-y-auto dla przewijania */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => (
              <NavItem
                key={item.path}
                item={item}
                isActive={location.pathname === item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
              />
            ))}
          </nav>

          <div className="p-4 border-t border-blue-100">
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
            {profile && (
              <button
                onClick={onChangeProfile}
                className="w-full mt-2 p-4 rounded-xl text-blue-600 hover:bg-blue-50 transition-all duration-200 flex items-center space-x-3 group"
                title="Zmień profil"
              >
                <div className="p-2 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors duration-200 shrink-0">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                {!isCollapsed && <span className="font-semibold">Zmień profil</span>}
              </button>
            )}
            <button
              onClick={onLogout}
              className="w-full mt-2 p-4 rounded-xl text-red-600 hover:bg-red-50 transition-all duration-200 flex items-center space-x-3 group"
              title="Wyloguj się"
            >
              <div className="p-2 rounded-lg bg-red-100 group-hover:bg-red-200 transition-colors duration-200 shrink-0">
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

export default Navbar;
