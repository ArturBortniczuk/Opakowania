// src/components/AdminReports.js
import React, { useState, useMemo } from 'react';
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
import { mockDrumsData } from '../data/mockData';
import { mockCompanies, mockReturnRequests, enrichDrumsWithCalculatedDates } from '../data/additionalData';

const AdminReports = ({ onNavigate }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('last-30-days');
  const [selectedReport, setSelectedReport] = useState('overview');
  const [loading, setLoading] = useState(false);

  // Oblicz statystyki
  const analytics = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Podstawowe statystyki
    const totalClients = mockCompanies.length;
    const totalDrums = mockDrumsData.length;
    const totalRequests = mockReturnRequests.length;

    // Bębny według statusu
    const overdueDrums = mockDrumsData.filter(drum => {
      const returnDate = new Date(drum.DATA_ZWROTU_DO_DOSTAWCY);
      return returnDate < now;
    }).length;

    const dueSoonDrums = mockDrumsData.filter(drum => {
      const returnDate = new Date(drum.DATA_ZWROTU_DO_DOSTAWCY);
      return returnDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) && returnDate >= now;
    }).length;

    // Zgłoszenia według statusu
    const pendingRequests = mockReturnRequests.filter(req => req.status === 'Pending').length;
    const approvedRequests = mockReturnRequests.filter(req => req.status === 'Approved').length;
    const completedRequests = mockReturnRequests.filter(req => req.status === 'Completed').length;

    // Aktywność ostatnie 30 dni
    const recentRequests = mockReturnRequests.filter(req => {
      const requestDate = new Date(req.created_at);
      return requestDate >= thirtyDaysAgo;
    }).length;

    // Klienci według aktywności
    const activeClients = mockCompanies.filter(company => {
      const lastActivity = new Date(company.lastActivity);
      return lastActivity >= sevenDaysAgo;
    }).length;

    // Rozład według dostawców
    const supplierStats = mockDrumsData.reduce((acc, drum) => {
      acc[drum.KON_DOSTAWCA] = (acc[drum.KON_DOSTAWCA] || 0) + 1;
      return acc;
    }, {});

    // Trendy miesięczne (symulowane)
    const monthlyTrends = [
      { month: 'Sty', drums: 8, requests: 2, clients: 3 },
      { month: 'Lut', drums: 10, requests: 3, clients: 4 },
      { month: 'Mar', drums: 12, requests: 4, clients: 5 },
      { month: 'Kwi', drums: 11, requests: 3, clients: 5 },
      { month: 'Maj', drums: 12, requests: 1, clients: 5 }
    ];

    return {
      totalClients,
      totalDrums,
      totalRequests,
      overdueDrums,
      dueSoonDrums,
      pendingRequests,
      approvedRequests,
      completedRequests,
      recentRequests,
      activeClients,
      supplierStats,
      monthlyTrends
    };
  }, []);

  const handleExportReport = () => {
    setLoading(true);
    // Symulacja exportu
    setTimeout(() => {
      alert('📊 Raport został wyeksportowany do PDF!');
      setLoading(false);
    }, 2000);
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
    const percentage = (value / max) * 100;
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

  return (
    <div className="min-h-screen pt-6 lg:ml-80 transition-all duration-300">
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
                            style={{ width: `${(month.drums / 15) * 100}%`, minWidth: '20px' }}
                          >
                            {month.drums}
                          </div>
                          <div 
                            className="bg-green-600 h-6 rounded flex items-center justify-center text-white text-xs"
                            style={{ width: `${(month.requests / 5) * 100}%`, minWidth: '20px' }}
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
                        {Math.round((count / analytics.totalDrums) * 100)}%
                      </div>
                    </div>
                  </div>
                ))}
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