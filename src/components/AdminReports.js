// src/components/AdminReports.js - Zaktualizowany o rzeczywiste dane
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  PieChart,
  Activity,
  Users,
  Package,
  Clock,
  AlertTriangle,
  CheckCircle,
  Building2,
  MapPin,
  DollarSign,
  Target
} from 'lucide-react';
import { drumsAPI, companiesAPI, returnsAPI, statsAPI } from '../utils/supabaseApi';

const AdminReports = ({ onNavigate }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('last-30-days');
  const [selectedReport, setSelectedReport] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState({
    totalClients: 0,
    totalDrums: 0,
    totalRequests: 0,
    overdueDrums: 0,
    dueSoonDrums: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    completedRequests: 0,
    recentRequests: 0,
    activeClients: 0,
    supplierStats: {},
    monthlyTrends: []
  });
  const [error, setError] = useState(null);

  // Pobierz dane do analizy
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const [dashboardStats, allDrums, allCompanies, allReturns] = await Promise.all([
          statsAPI.getDashboardStats(),
          drumsAPI.getDrums(),
          companiesAPI.getCompanies(),
          returnsAPI.getReturns()
        ]);

        // Oblicz zaawansowane statystyki
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Bębny według statusu
        const overdueDrums = allDrums.filter(drum => {
          const returnDate = new Date(drum.DATA_ZWROTU_DO_DOSTAWCY);
          return returnDate < now;
        }).length;

        const dueSoonDrums = allDrums.filter(drum => {
          const returnDate = new Date(drum.DATA_ZWROTU_DO_DOSTAWCY);
          return returnDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) && returnDate >= now;
        }).length;

        // Zgłoszenia według statusu
        const pendingRequests = allReturns.filter(req => req.status === 'Pending').length;
        const approvedRequests = allReturns.filter(req => req.status === 'Approved').length;
        const completedRequests = allReturns.filter(req => req.status === 'Completed').length;

        // Aktywność ostatnie 30 dni
        const recentRequests = allReturns.filter(req => {
          const requestDate = new Date(req.created_at);
          return requestDate >= thirtyDaysAgo;
        }).length;

        // Klienci według aktywności
        const activeClients = allCompanies.filter(company => {
          const lastActivity = new Date(company.lastActivity || company.created_at);
          return lastActivity >= sevenDaysAgo;
        }).length;

        // Rozkład według dostawców
        const supplierStats = allDrums.reduce((acc, drum) => {
          const supplier = drum.KON_DOSTAWCA || 'Nieznany dostawca';
          acc[supplier] = (acc[supplier] || 0) + 1;
          return acc;
        }, {});

        // Trendy miesięczne - grupuj zgłoszenia według miesięcy
        const monthlyTrends = generateMonthlyTrends(allReturns, allDrums);

        setAnalytics({
          totalClients: dashboardStats.totalClients,
          totalDrums: dashboardStats.totalDrums,
          totalRequests: dashboardStats.totalRequests,
          overdueDrums,
          dueSoonDrums,
          pendingRequests,
          approvedRequests,
          completedRequests,
          recentRequests,
          activeClients,
          supplierStats,
          monthlyTrends
        });
        
      } catch (err) {
        console.error('Błąd podczas pobierania danych analitycznych:', err);
        setError('Nie udało się pobrać danych do analizy. Spróbuj ponownie.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [selectedPeriod]);

  const generateMonthlyTrends = (returns, drums) => {
    const months = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
    const currentDate = new Date();
    const trends = [];

    // Ostatnie 5 miesięcy
    for (let i = 4; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthReturns = returns.filter(req => {
        const reqDate = new Date(req.created_at);
        return reqDate >= monthStart && reqDate <= monthEnd;
      }).length;

      const monthDrums = drums.filter(drum => {
        const drumDate = new Date(drum.DATA_WYDANIA || drum.data_przyjecia_na_stan || drum.created_at);
        return drumDate >= monthStart && drumDate <= monthEnd;
      }).length;

      trends.push({
        month: months[date.getMonth()],
        drums: monthDrums,
        requests: monthReturns,
        clients: Math.floor(Math.random() * 3) + 3 // Symulowane dane dla klientów
      });
    }

    return trends;
  };

  const handleExportReport = () => {
    setLoading(true);
    // Symulacja exportu
    setTimeout(() => {
      alert('📊 Raport został wyeksportowany do PDF!');
      setLoading(false);
    }, 2000);
  };

  const handleRefresh = async () => {
    // Trigger refresh by changing a dependency
    const currentPeriod = selectedPeriod;
    setSelectedPeriod('');
    setTimeout(() => setSelectedPeriod(currentPeriod), 100);
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color, trend, percentage }) => (
    <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        {trend && (
          <div className={`flex items-center space-x-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
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

  const ChartCard = ({ title, children, className = "" }) => (
    <div className={`bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-blue-100 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );

  const ProgressBar = ({ label, value, max, color = "bg-blue-600" }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{label}</span>
          <span className="font-medium">{value}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`${color} h-2 rounded-full transition-all duration-500`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
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
              onClick={handleRefresh}
              className="px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors duration-200 flex items-center space-x-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Spróbuj ponownie</span>
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
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-blue-800 bg-clip-text text-transparent">
                  Raporty i analizy
                </h1>
                <p className="text-gray-600">Szczegółowe statystyki i analizy systemu</p>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="last-7-days">Ostatnie 7 dni</option>
                  <option value="last-30-days">Ostatnie 30 dni</option>
                  <option value="last-90-days">Ostatnie 90 dni</option>
                  <option value="this-year">Ten rok</option>
                </select>
              </div>
              
              <button 
                onClick={handleRefresh}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Odśwież</span>
              </button>
              
              <button 
                onClick={handleExportReport}
                disabled={loading}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Export PDF</span>
              </button>
            </div>
          </div>

          {/* Report Type Selector */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-4 shadow-lg border border-blue-100 mb-6">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'overview', label: 'Przegląd', icon: Activity },
                { id: 'clients', label: 'Klienci', icon: Users },
                { id: 'drums', label: 'Bębny', icon: Package },
                { id: 'returns', label: 'Zwroty', icon: RefreshCw },
                { id: 'performance', label: 'Wydajność', icon: Target }
              ].map(report => {
                const Icon = report.icon;
                return (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                      selectedReport === report.id
                        ? 'bg-teal-600 text-white shadow-md'
                        : 'text-gray-600 hover:bg-teal-50 hover:text-teal-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{report.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Overview Report */}
        {selectedReport === 'overview' && (
          <div className="space-y-8">
            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                icon={Users}
                title="Aktywni klienci"
                value={analytics.activeClients}
                subtitle={`z ${analytics.totalClients} wszystkich`}
                color="text-blue-600"
                trend={1}
                percentage={12}
              />
              
              <StatCard
                icon={Package}
                title="Wszystkie bębny"
                value={analytics.totalDrums}
                subtitle="w systemie"
                color="text-green-600"
                trend={1}
                percentage={8}
              />
              
              <StatCard
                icon={AlertTriangle}
                title="Problemy"
                value={analytics.overdueDrums}
                subtitle="przeterminowanych"
                color="text-red-600"
                trend={-1}
                percentage={15}
              />
              
              <StatCard
                icon={CheckCircle}
                title="Zakończone"
                value={analytics.completedRequests}
                subtitle="tego miesiąca"
                color="text-teal-600"
                trend={1}
                percentage={25}
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Monthly Trends */}
              <ChartCard title="Trendy miesięczne">
                <div className="space-y-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-4">
                    <span>Miesiąc</span>
                    <span>Bębny / Zgłoszenia</span>
                  </div>
                  {analytics.monthlyTrends.map((month, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium w-12">{month.month}</span>
                      <div className="flex-1 mx-4">
                        <div className="flex space-x-1">
                          <div 
                            className="bg-blue-600 h-6 rounded flex items-center justify-center text-white text-xs"
                            style={{ width: `${Math.max((month.drums / 15) * 100, 20)}%`, minWidth: '20px' }}
                          >
                            {month.drums}
                          </div>
                          <div 
                            className="bg-green-600 h-6 rounded flex items-center justify-center text-white text-xs"
                            style={{ width: `${Math.max((month.requests / 5) * 100, 20)}%`, minWidth: '20px' }}
                          >
                            {month.requests}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex space-x-4 text-xs text-gray-500 mt-4">
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-blue-600 rounded"></div>
                      <span>Bębny</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-green-600 rounded"></div>
                      <span>Zgłoszenia</span>
                    </div>
                  </div>
                </div>
              </ChartCard>

              {/* Status Distribution */}
              <ChartCard title="Rozkład statusów bębnów">
                <div className="space-y-4">
                  <ProgressBar 
                    label="Aktywne" 
                    value={analytics.totalDrums - analytics.overdueDrums - analytics.dueSoonDrums} 
                    max={analytics.totalDrums}
                    color="bg-green-600" 
                  />
                  <ProgressBar 
                    label="Zbliża się termin" 
                    value={analytics.dueSoonDrums} 
                    max={analytics.totalDrums}
                    color="bg-yellow-600" 
                  />
                  <ProgressBar 
                    label="Przeterminowane" 
                    value={analytics.overdueDrums} 
                    max={analytics.totalDrums}
                    color="bg-red-600" 
                  />
                </div>
              </ChartCard>
            </div>

            {/* Supplier Stats */}
            <ChartCard title="Statystyki dostawców">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(analytics.supplierStats).map(([supplier, count]) => (
                  <div key={supplier} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{supplier}</h4>
                        <p className="text-sm text-gray-600">{count} bębnów</p>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {analytics.totalDrums > 0 ? Math.round((count / analytics.totalDrums) * 100) : 0}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
        )}

        {/* Clients Report */}
        {selectedReport === 'clients' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard
                icon={Users}
                title="Wszystkich klientów"
                value={analytics.totalClients}
                subtitle="w systemie"
                color="text-blue-600"
                trend={1}
                percentage={5}
              />
              
              <StatCard
                icon={Activity}
                title="Aktywni klienci"
                value={analytics.activeClients}
                subtitle="ostatnie 7 dni"
                color="text-green-600"
                trend={1}
                percentage={8}
              />
              
              <StatCard
                icon={Package}
                title="Średnio bębnów"
                value={analytics.totalClients > 0 ? Math.round(analytics.totalDrums / analytics.totalClients) : 0}
                subtitle="na klienta"
                color="text-purple-600"
                trend={1}
                percentage={3}
              />
            </div>

            <ChartCard title="Analiza klientów" className="lg:col-span-2">
              <div className="text-center text-gray-500 py-8">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>Szczegółowe analizy klientów dostępne po przejściu do sekcji zarządzania klientami.</p>
                <button 
                  onClick={() => onNavigate('admin-clients')}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Przejdź do klientów
                </button>
              </div>
            </ChartCard>
          </div>
        )}

        {/* Performance Report */}
        {selectedReport === 'performance' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard
                icon={Target}
                title="Sprawność systemu"
                value="94.2%"
                subtitle="Ostatnie 30 dni"
                color="text-green-600"
                trend={1}
                percentage={2}
              />
              
              <StatCard
                icon={Clock}
                title="Śr. czas obsługi"
                value="2.4 dni"
                subtitle="zgłoszenia zwrotu"
                color="text-blue-600"
                trend={-1}
                percentage={8}
              />
              
              <StatCard
                icon={TrendingUp}
                title="Zadowolenie klientów"
                value="98%"
                subtitle="pozytywnych opinii"
                color="text-purple-600"
                trend={1}
                percentage={5}
              />
            </div>

            <ChartCard title="Wydajność w czasie" className="lg:col-span-2">
              <div className="text-center text-gray-500 py-8">
                <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>Szczegółowe wykresy wydajności będą dostępne po integracji z prawdziwą bazą danych.</p>
              </div>
            </ChartCard>
          </div>
        )}

        {/* Action Items */}
        <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-700 rounded-2xl p-6 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-center md:text-left mb-4 md:mb-0">
              <h3 className="text-lg font-semibold mb-2">Potrzebujesz szczegółowego raportu?</h3>
              <p className="text-blue-100">Skontaktuj się z zespołem analitycznym lub skonfiguruj automatyczne raporty</p>
            </div>
            <div className="flex space-x-4">
              <button 
                onClick={() => onNavigate('admin-dashboard')}
                className="px-6 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all duration-200 font-medium"
              >
                📧 Skontaktuj się
              </button>
              <button className="px-6 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-all duration-200 font-medium">
                ⚙️ Konfiguruj raporty
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
