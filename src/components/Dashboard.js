// src/components/Dashboard.js - Zaktualizowany o prawdziwe dane
import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Truck, 
  Calendar, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  BarChart3,
  Activity
} from 'lucide-react';
import { drumsAPI, statsAPI } from '../utils/supabaseApi';

const Dashboard = ({ user, onNavigate }) => {
  const [stats, setStats] = useState({
    totalDrums: 0,
    activeDrums: 0,
    pendingReturns: 0,
    recentReturns: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Pobierz statystyki dla konkretnego klienta
        const dashboardStats = await statsAPI.getDashboardStats(user.nip);
        setStats(dashboardStats);
        
        // Pobierz ostatnie bębny dla aktywności
        const userDrums = await drumsAPI.getAllDrums(user.nip);
        generateRecentActivity(userDrums);
        
      } catch (err) {
        console.error('Błąd podczas pobierania danych dashboardu:', err);
        setError('Nie udało się pobrać danych. Spróbuj ponownie.');
      } finally {
        setLoading(false);
      }
    };

    if (user?.nip) {
      fetchDashboardData();
    }
  }, [user?.nip]);

  const generateRecentActivity = (drums) => {
    const now = new Date();
    const activities = [];
    
    // Przygotuj aktywność na podstawie rzeczywistych danych
    drums.forEach((drum, index) => {
      if (index < 3) { // Pokaż tylko pierwsze 3 dla przykładu
        const returnDate = new Date(drum.DATA_ZWROTU_DO_DOSTAWCY);
        const daysDiff = Math.ceil((returnDate - now) / (1000 * 60 * 60 * 24));
        
        if (daysDiff < 0) {
          activities.push({
            id: `overdue-${drum.KOD_BEBNA}`,
            type: 'overdue',
            message: `Przekroczono termin zwrotu ${drum.KOD_BEBNA}`,
            time: `${Math.abs(daysDiff)} dni temu`,
            icon: AlertCircle,
            color: 'text-red-600'
          });
        } else if (daysDiff <= 7) {
          activities.push({
            id: `due-soon-${drum.KOD_BEBNA}`,
            type: 'due-soon',
            message: `Zbliża się termin zwrotu ${drum.KOD_BEBNA}`,
            time: `za ${daysDiff} dni`,
            icon: Clock,
            color: 'text-yellow-600'
          });
        } else {
          activities.push({
            id: `active-${drum.KOD_BEBNA}`,
            type: 'active',
            message: `Bęben ${drum.KOD_BEBNA} aktywny`,
            time: 'dziś',
            icon: CheckCircle,
            color: 'text-green-600'
          });
        }
      }
    });
    
    // Jeśli brak danych, dodaj przykładową aktywność
    if (activities.length === 0) {
      activities.push({
        id: 'welcome',
        type: 'info',
        message: 'Witaj w systemie zarządzania bębnami',
        time: 'teraz',
        icon: Activity,
        color: 'text-blue-600'
      });
    }
    
    setRecentActivity(activities);
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color, trend, onClick }) => (
    <div 
      onClick={onClick}
      className={`
        bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-blue-100 
        hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer 
        hover:border-blue-200 group
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-4">
            <div className={`p-3 rounded-xl ${color} bg-opacity-10 group-hover:bg-opacity-20 transition-all duration-300`}>
              <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600">{title}</h3>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-gray-900">{value}</span>
                {trend && (
                  <span className={`text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {trend > 0 ? '+' : ''}{trend}%
                  </span>
                )}
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-300" />
      </div>
    </div>
  );

  const ActionCard = ({ icon: Icon, title, description, buttonText, color, onClick }) => (
    <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-300">
      <div className="flex flex-col h-full">
        <div className="flex items-start space-x-4 mb-4">
          <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
            <Icon className={`w-8 h-8 ${color}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
          </div>
        </div>
        
        <div className="mt-auto">
          <button
            onClick={onClick}
            className={`
              w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 
              transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2
              ${color === 'text-blue-600' 
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-blue-500' 
                : 'bg-gradient-to-r from-green-600 to-blue-600 text-white hover:from-green-700 hover:to-blue-700 focus:ring-green-500'
              }
            `}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );

  const ActivityItem = ({ item }) => {
    const Icon = item.icon;
    return (
      <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-blue-50 transition-colors duration-200">
        <div className={`p-2 rounded-lg bg-gray-100`}>
          <Icon className={`w-4 h-4 ${item.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{item.message}</p>
          <p className="text-xs text-gray-500">{item.time}</p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">{error}</div>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200"
            >
              Odśwież stronę
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-gray-600">Witaj ponownie, {user.companyName}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>Ostatnia aktualizacja: {new Date().toLocaleDateString('pl-PL', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Package}
            title="Wszystkie bębny"
            value={stats.totalDrums}
            subtitle="Łączna liczba bębnów"
            color="text-blue-600"
            trend={5}
            onClick={() => onNavigate('drums')}
          />
          
          <StatCard
            icon={CheckCircle}
            title="Aktywne bębny"
            value={stats.activeDrums}
            subtitle="Bębny w użyciu"
            color="text-green-600"
            trend={2}
            onClick={() => onNavigate('drums')}
          />
          
          <StatCard
            icon={AlertCircle}
            title="Oczekujące zwroty"
            value={stats.pendingReturns}
            subtitle="Wymagają zwrotu"
            color="text-red-600"
            trend={-10}
            onClick={() => onNavigate('return')}
          />
          
          <StatCard
            icon={TrendingUp}
            title="Ostatnie 30 dni"
            value={stats.recentReturns}
            subtitle="Nowe przyjęcia"
            color="text-purple-600"
            trend={15}
            onClick={() => onNavigate('drums')}
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
                <ActionCard
                  icon={Package}
                  title="Sprawdź bębny"
                  description="Zobacz wszystkie swoje bębny, sprawdź daty zwrotu i status każdego z nich"
                  buttonText="Zobacz bębny"
                  color="text-blue-600"
                  onClick={() => onNavigate('drums')}
                />
                
                <ActionCard
                  icon={Truck}
                  title="Zgłoś zwrot"
                  description="Wypełnij formularz zwrotu bębnów do dostawcy i zaplanuj odbiór"
                  buttonText="Zgłoś zwrot"
                  color="text-green-600"
                  onClick={() => onNavigate('return')}
                />
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-blue-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-600" />
                Ostatnia aktywność
              </h3>
              
              <div className="space-y-2">
                {recentActivity.map((item) => (
                  <ActivityItem key={item.id} item={item} />
                ))}
              </div>
              
              <button 
                onClick={() => onNavigate('drums')}
                className="w-full mt-4 py-2 px-4 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200 border border-blue-200 rounded-lg hover:bg-blue-50"
              >
                Zobacz wszystkie bębny
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="mt-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-center md:text-left mb-4 md:mb-0">
              <h3 className="text-lg font-semibold mb-2">Potrzebujesz pomocy?</h3>
              <p className="text-blue-100">Skontaktuj się z naszym zespołem wsparcia</p>
            </div>
            <div className="flex space-x-4">
              <button className="px-6 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all duration-200 font-medium">
                📞 Zadzwoń
              </button>
              <button className="px-6 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-all duration-200 font-medium">
                ✉️ Email
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
