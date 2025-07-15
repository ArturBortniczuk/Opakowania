// src/components/Navbar.js - Zaktualizowany o zwijanie i przewijanie
import React from 'react';
import { 
  Menu, 
  X, 
  Home, 
  Package, 
  Truck, 
  LogOut, 
  Building2,
  User,
  Pin,
  PinOff
} from 'lucide-react';

const Navbar = ({ 
  user, 
  currentView, 
  sidebarOpen, 
  setSidebarOpen, 
  isCollapsed,
  setIsCollapsed,
  onNavigate, 
  onLogout 
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'drums', label: 'Moje bębny', icon: Package },
    { id: 'return', label: 'Zgłoś zwrot', icon: Truck }
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
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                    Grupa Eltron
                  </h1>
                  <p className="text-xs text-gray-500">System Zarządzania Bębnami</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-right">
                <div className="text-sm font-medium text-gray-900">{user.companyName}</div>
                <div className="text-xs text-gray-500">NIP: {user.nip}</div>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
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
          <div className="p-4 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-blue-100">
            <div className={`flex items-center space-x-4 ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <User className="w-6 h-6 text-white" />
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{user.companyName}</h3>
                  <p className="text-sm text-gray-600">NIP: {user.nip}</p>
                </div>
              )}
            </div>
          </div>

          {/* ZMIANA: Dodano overflow-y-auto dla przewijania */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <h4 className={`text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ${isCollapsed ? 'text-center' : 'pl-4'}`}>
              {isCollapsed ? 'MENU' : 'Nawigacja'}
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

export default Navbar;
