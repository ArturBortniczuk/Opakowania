// src/components/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { mockDrumsData } from '../data/mockData';
import { mockCompanies, mockReturnRequests } from '../data/additionalData';
import { 
  Users, 
  Package, 
  Truck, 
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  Calendar,
  MapPin,
  Building2,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Settings
} from 'lucide-react';

const AdminDashboard = ({ onNavigate }) => {
  const [stats, setStats] = useState({
    totalClients: 0,
    totalDrums: 0,
    pendingReturns: 0,
    overdueReturns: 0,
    activeRequests: 0,
    completedRequests: 0
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [urgentItems, setUrgentItems] = useState([]);

  useEffect(() => {
    calculateStats();
    generateRecentActivity();
    findUrgentItems();
  }, []);

  const calculateStats = () => {
    const now = new Date();
    const totalClients = mockCompanies.length;
    const totalDrums = mockDrumsData.length;
    
    const pendingReturns = mockReturnRequests.filter(req => req.status === 'Pending').length;
    const overdueReturns = mockDrumsData.filter(drum => {
      const returnDate = new Date(drum.DATA_ZWROTU_DO_DOSTAWCY);
      return returnDate < now;
    }).length;

    const activeRequests = mockReturnRequests.filter(req => 
      req.status === 'Pending' || req.status === 'Approved'
    ).length;
    
    const completedRequests = mockReturnRequests.filter(req => req.status === 'Completed').length;

    setStats({
      totalClients,
      totalDrums,
      pendingReturns,
      overdueReturns,
      activeRequests,
      completedRequests
    });
  };

  const generateRecentActivity = () => {
    const activities = [
      {
        id: 1,
        type: 'new_request',
        message: 'Nowe zgłoszenie zwrotu od Firma ABC',
        time: '30 minut temu',
        icon: Truck,
        color: 'text-blue-600',
        priority: 'normal'
      },
      {
        id: 2,
        type: 'overdue',
        message: 'BEB009 - przekroczony termin zwrotu',
        time: '2 godziny temu',
        icon: AlertTriangle,
        color: 'text-red-600',
        priority: 'high'
      },
      {
        id: 3,
        type: 'completed',
        message: 'Zakończono zwrot dla XYZ S.A.',
        time: '4 godziny temu',
        icon: CheckCircle,
        color: 'text-green-600',
        priority: 'normal'
      },
      {
        id: 4,
        type: 'new_client',
        message: 'Nowy klient: Fabryka Farb Gamma',
        time: '1 dzień temu',
        icon: Users,
        color: 'text-purple-600',
        priority: 'normal'
      }
    ];
    setRecentActivity(activities);
  };

  const findUrgentItems = () => {
    const now = new Date();
    const urgent = [];

    // Sprawdź przekroczone terminy
    mockDrumsData.forEach(drum => {
      const returnDate = new Date(drum.DATA_ZWROTU_DO_DOSTAWCY);
      if (returnDate < now) {
        urgent.push({
          type: 'overdue_drum',
          title: `Przekroczony termin: ${drum.KOD_BEBNA}`,
          subtitle: drum.PELNA_NAZWA_KONTRAHENTA,
          priority: 'high',
          action: () => onNavigate('admin-drums')
        });
      }
    });

    // Sprawdź pilne zgłoszenia
    mockReturnRequests.forEach(request => {
      if (request.priority === 'High' && request.status === 'Pending') {
        urgent.push({
          type: 'urgent_request',
          title: `Pilne zgłoszenie #${request.id}`,
          subtitle: request.company_name,
          priority: 'high',
          action: () => onNavigate('admin-returns')
        });
      }
    });

    setUrgentItems(urgent.slice(0, 5));
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color, trend, percentage, onClick }) => (
    <div 
      onClick={onClick}
      className={`
        bg-white/90 rounded-2xl p-6 shadow-lg border border-blue-100 
        hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer 
        hover:border-blue-200 group
      `}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10 group-hover:bg-opacity-20 transition-all duration-300`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        {trend && (
          <div className={`flex items-center space-x-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            <span className="text-sm font-medium">{Math.abs(percentage)}%</span>
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <div className="text-3xl font-bold text-gray-900">{value}</div>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
    </div>
  );

  const ActivityItem = ({ activity }) => {
    const Icon = activity.icon;
    return (
      <div className={`flex items-start space-x-3 p-3 rounded-lg transition-colors duration-200 ${
        activity.priority === 'high' ? 'hover:bg-red-50' : 'hover:bg-blue-50'
      }`}>
        <div className={`p-2 rounded-lg ${
          activity.priority === 'high' ? 'bg-red-100' : 'bg-gray-100'
        }`}>
          <Icon className={`w-4 h-4 ${activity.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{activity.message}</p>
          <p className="text-xs text-gray-500">{activity.time}</p>
        </div>
        {activity.priority === 'high' && (
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen pt-6 lg:ml-80 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-800 bg-clip-text text-transparent">
                Panel Administratora
              </h1>
              <p className="text-gray-600">Zarządzaj systemem i monitoruj aktywność</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>Ostatnia aktualizacja: {new Date().toLocaleDateString('pl-PL', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          <StatCard
            icon={Users}
            title="Wszyscy klienci"
            value={stats.totalClients}
            subtitle="Aktywne firmy"
            color="text-blue-600"
            trend={1}
            percentage={8}
            onClick={() => onNavigate('admin-clients')}
          />
          
          <StatCard
            icon={Package}
            title="Wszystkie bębny"
            value={stats.totalDrums}
            subtitle="W systemie"
            color="text-green-600"
            trend={1}
            percentage={12}
            onClick={() => onNavigate('admin-drums')}
          />
          
          <StatCard
            icon={Clock}
            title="Oczekujące zwroty"
            value={stats.pendingReturns}
            subtitle="Do zatwierdzenia"
            color="text-yellow-600"
            trend={-1}
            percentage={5}
            onClick={() => onNavigate('admin-returns')}
          />
          
          <StatCard
            icon={AlertTriangle}
            title="Przekroczenia"
            value={stats.overdueReturns}
            subtitle="Przeterminowane"
            color="text-red-600"
            trend={-1}
            percentage={15}
            onClick={() => onNavigate('admin-drums')}
          />
          
          <StatCard
            icon={Truck}
            title="Aktywne zgłoszenia"
            value={stats.activeRequests}
            subtitle="W trakcie"
            color="text-purple-600"
            trend={1}
            percentage={20}
            onClick={() => onNavigate('admin-returns')}
          />
          
          <StatCard
            icon={CheckCircle}
            title="Zakończone"
            value={stats.completedRequests}
            subtitle="Ten miesiąc"
            color="text-teal-600"
            trend={1}
            percentage={25}
            onClick={() => onNavigate('admin-returns')}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-blue-600" />
                Szybkie akcje
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-300 cursor-pointer group"
                     onClick={() => onNavigate('admin-clients')}>
                  <div className="flex items-start space-x-4">
                    <div className="p-3 rounded-xl bg-blue-100 group-hover:bg-blue-200 transition-colors duration-300">
                      <Users className="w-8 h-8 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Zarządzaj klientami</h3>
                      <p className="text-gray-600 text-sm mb-4">Przeglądaj wszystkich klientów, ich dane i aktywność</p>
                      <button className="text-blue-600 font-medium text-sm hover:text-blue-800 transition-colors duration-200">
                        Zobacz klientów →
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-300 cursor-pointer group"
                     onClick={() => onNavigate('admin-drums')}>
                  <div className="flex items-start space-x-4">
                    <div className="p-3 rounded-xl bg-green-100 group-hover:bg-green-200 transition-colors duration-300">
                      <Package className="w-8 h-8 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Wszystkie bębny</h3>
                      <p className="text-gray-600 text-sm mb-4">Monitoruj wszystkie bębny w systemie</p>
                      <button className="text-green-600 font-medium text-sm hover:text-green-800 transition-colors duration-200">
                        Zobacz bębny →
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-300 cursor-pointer group"
                     onClick={() => onNavigate('admin-returns')}>
                  <div className="flex items-start space-x-4">
                    <div className="p-3 rounded-xl bg-purple-100 group-hover:bg-purple-200 transition-colors duration-300">
                      <Truck className="w-8 h-8 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Zgłoszenia zwrotów</h3>
                      <p className="text-gray-600 text-sm mb-4">Zarządzaj wszystkimi zgłoszeniami zwrotów</p>
                      <button className="text-purple-600 font-medium text-sm hover:text-purple-800 transition-colors duration-200">
                        Zobacz zgłoszenia →
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-300 cursor-pointer group"
                     onClick={() => onNavigate('admin-return-periods')}>
                  <div className="flex items-start space-x-4">
                    <div className="p-3 rounded-xl bg-indigo-100 group-hover:bg-indigo-200 transition-colors duration-300">
                      <Settings className="w-8 h-8 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Terminy zwrotu</h3>
                      <p className="text-gray-600 text-sm mb-4">Ustaw indywidualne terminy zwrotu dla klientów</p>
                      <button className="text-indigo-600 font-medium text-sm hover:text-indigo-800 transition-colors duration-200">
                        Zarządzaj terminami →
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-300 cursor-pointer group"
                     onClick={() => onNavigate('admin-reports')}>
                  <div className="flex items-start space-x-4">
                    <div className="p-3 rounded-xl bg-teal-100 group-hover:bg-teal-200 transition-colors duration-300">
                      <BarChart3 className="w-8 h-8 text-teal-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Raporty i analizy</h3>
                      <p className="text-gray-600 text-sm mb-4">Generuj raporty i analizuj dane</p>
                      <button className="text-teal-600 font-medium text-sm hover:text-teal-800 transition-colors duration-200">
                        Zobacz raporty →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Recent Activity */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-blue-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-600" />
                Ostatnia aktywność
              </h3>
              
              <div className="space-y-2">
                {recentActivity.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
              
              <button className="w-full mt-4 py-2 px-4 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200 border border-blue-200 rounded-lg hover:bg-blue-50">
                Zobacz wszystkie aktywności
              </button>
            </div>

            {/* Urgent Items */}
            {urgentItems.length > 0 && (
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-red-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
                  Pilne sprawy
                </h3>
                
                <div className="space-y-3">
                  {urgentItems.map((item, index) => (
                    <div key={index} className="p-3 bg-red-50 rounded-lg border border-red-200 cursor-pointer hover:bg-red-100 transition-colors duration-200"
                         onClick={item.action}>
                      <h4 className="text-sm font-medium text-red-900">{item.title}</h4>
                      <p className="text-xs text-red-600">{item.subtitle}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;