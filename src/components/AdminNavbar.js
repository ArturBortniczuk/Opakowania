import React from 'react';
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
  Shield,
  Settings,
  Crown,
  Pin,
  PinOff
} from 'lucide-react';

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
  const menuItems = [
    { id: 'admin-dashboard', label: 'Dashboard', icon: Home },
    { id: 'admin-clients', label: 'Zarządzaj klientami', icon: Users },
    { id: 'admin-drums', label: 'Wszystkie bębny', icon: Package },
    { id: 'admin-returns', label: 'Zgłoszenia zwrotów', icon: Truck },
    { id: 'admin-return-periods', label: 'Terminy zwrotu', icon: Settings },
    { id: 'admin-reports', label: 'Raporty i analizy', icon: BarChart3 }
  ];

  const getRoleBadge = (role) => {
    const roleConfig = {
      admin: { label: 'Administrator', icon: Crown, gradient: 'from-purple-600 to-purple-800' },
      supervisor: { label: 'Kierownik', icon: Shield, gradient: 'from-blue-600 to-blue-800' }
    };
    const config = roleConfig[role] || roleConfig.admin;
    const Icon = config.icon;
    return (
      <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-gradient-to-r ${config.gradient} text-white text-xs font-semibold shadow`}>
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
        className={`w-full p-4 rounded-xl transition-all duration-300 group flex items-center ${isCollapsed ? 'justify-center' : ''} ${isActive ? 'bg-gradient-to-r from-purple-600 to-blue-700 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'}`}
      >
        <div className={`p-2 rounded-lg transition-all duration-300 ${isActive ? 'bg-white/20' : `bg-purple-100 text-purple-600 group-hover:bg-opacity-80`}`}>
          <Icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
        </div>
        {!isCollapsed && <div className="flex-1 text-left ml-4"><div className="font-semibold">{item.label}</div></div>}
      </button>
    );
  };

  return (
    <>
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-[60] p-2 rounded-lg text-purple-600 bg-white/80 backdrop-blur-sm hover:bg-purple-100 transition-colors duration-200 lg:hidden"
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />}
      
      <aside className={`fixed top-0 left-0 z-50 h-screen bg-white/95 backdrop-blur-md border-r border-purple-100 shadow-xl transform transition-all duration-300 ease-in-out ${isCollapsed ? 'w-24' : 'w-80'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="h-full flex flex-col">
          <div className="flex items-center p-4 h-20 border-b border-purple-100">
            <div className={`flex items-center space-x-3 overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-full opacity-100'}`}>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-800">Grupa Eltron</h1>
                <p className="text-xs text-gray-500">Panel Administratora</p>
              </div>
            </div>
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-2 text-gray-500 rounded-lg hover:bg-gray-100 ml-auto"
                title={isCollapsed ? "Rozwiń menu" : "Zwiń menu"}
            >
              {isCollapsed ? <PinOff className="w-5 h-5" /> : <Pin className="w-5 h-5" />}
            </button>
          </div>
          
          <div className="p-4 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-blue-100">
            <div className={`flex items-center space-x-4 ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <UserCheck className="w-6 h-6 text-white" />
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{user.name}</h3>
                  <p className="text-sm text-gray-600 truncate">{user.email}</p>
                  <div className="mt-2">{getRoleBadge(user.role)}</div>
                </div>
              )}
            </div>
          </div>
          
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {!isCollapsed && (
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 pl-4">Zarządzanie</h4>
            )}
            {menuItems.map((item) => <NavItem key={item.id} item={item} isActive={currentView === item.id} onClick={() => onNavigate(item.id)} />)}
          </nav>

          <div className="p-4 border-t border-purple-100">
            <button
              onClick={onLogout}
              className={`w-full mt-2 p-4 rounded-xl text-red-600 hover:bg-red-50 transition-all duration-200 flex items-center group ${isCollapsed ? 'justify-center' : ''}`}
              title="Wyloguj się"
            >
              <div className="p-2 rounded-lg bg-red-100 group-hover:bg-red-200 transition-colors duration-200"><LogOut className="w-5 h-5" /></div>
              {!isCollapsed && <span className="font-medium ml-4">Wyloguj się</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AdminNavbar;
