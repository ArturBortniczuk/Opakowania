// src/components/AdminReports.js
import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Activity,
  Users,
  Package,
  Clock,
  AlertTriangle,
  CheckCircle,
  Building2,
  DollarSign,
  Target,
  PieChart,
  Truck
} from 'lucide-react';
import { reportsAPI } from '../utils/supabaseApi';

const AdminReports = ({ onNavigate }) => {
  const [selectedReport, setSelectedReport] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [analytics, setAnalytics] = useState({
    drums: {},
    returns: {},
    clients: {}
  });

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [drumsData, returnsData, clientsData] = await Promise.all([
        reportsAPI.getDrumsAnalytics(),
        reportsAPI.getReturnsAnalytics(),
        reportsAPI.getClientsAnalytics()
      ]);

      setAnalytics({
        drums: drumsData || {},
        returns: returnsData || {},
        clients: clientsData || {}
      });
    } catch (err) {
      console.error('Błąd podczas pobierania danych analitycznych:', err);
      setError('Nie udało się pobrać danych. Upewnij się, że zaktualizowałeś bazę danych (migracja SQL).');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const handleExportReport = () => {
    alert('Funkcja eksportu do PDF w przygotowaniu.');
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color, trend, percentage }) => (
    <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-blue-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10 group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        {trend && (
          <div className={`flex items-center space-x-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'} bg-white/50 px-2 py-1 rounded-full shadow-sm`}>
            {trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="text-sm font-bold">{Math.abs(percentage)}%</span>
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</h3>
        <div className="text-3xl font-extrabold text-gray-900 tracking-tight">{value}</div>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
    </div>
  );

  const ChartCard = ({ title, children, className = "" }) => (
    <div className={`bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-blue-100 transition-all duration-300 hover:shadow-xl ${className}`}>
      <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
        <div className="w-2 h-6 bg-teal-500 rounded-full mr-3"></div>
        {title}
      </h3>
      {children}
    </div>
  );

  const ProgressBar = ({ label, value, max, color = "bg-teal-500" }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (
      <div className="space-y-2 mb-4 group">
        <div className="flex justify-between text-sm">
          <span className="text-gray-700 font-medium">{label}</span>
          <span className="font-bold text-gray-900">{value} <span className="text-gray-400 font-normal">/ {max}</span></span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
          <div 
            className={`${color} h-3 rounded-full transition-all duration-1000 ease-out group-hover:brightness-110`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>
      </div>
    );
  };

  const SimpleBarChart = ({ data, color = "bg-blue-500", labelKey = "name", valueKey = "value" }) => {
    const maxVal = Math.max(...data.map(d => d[valueKey] || 0), 1);
    return (
      <div className="space-y-4">
        {data.map((item, i) => (
          <div key={i} className="flex items-center space-x-3 group">
            <div className="w-24 text-sm font-medium text-gray-600 truncate text-right" title={item[labelKey]}>
              {item[labelKey]}
            </div>
            <div className="flex-1">
              <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                <div 
                  className={`${color} h-4 rounded-full transition-all duration-1000 ease-out group-hover:brightness-110 relative`}
                  style={{ width: `${Math.max(((item[valueKey] || 0) / maxVal) * 100, 2)}%` }}
                >
                </div>
              </div>
            </div>
            <div className="w-12 text-sm font-bold text-gray-700 text-left">
              {item[valueKey]}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg shadow-md flex flex-col items-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-xl font-bold text-red-800 mb-2">Błąd ładowania danych</h3>
          <p className="text-red-600 text-center mb-6">{error}</p>
          <button 
            onClick={fetchAnalyticsData}
            className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors duration-200 flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Spróbuj ponownie</span>
          </button>
        </div>
      </div>
    );
  }

  // Bezpieczne mapowanie danych
  const dStats = analytics.drums || {};
  const rStats = analytics.returns || {};
  const cStats = analytics.clients || {};

  // Formatyzowanie danych do wykresów
  const drumSizesData = Object.entries(dStats.by_size || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const supplierData = Object.entries(dStats.by_supplier || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
    
  const topClients = cStats.top_clients_by_drums || [];
  
  const monthlyTrends = rStats.monthly_trends || [];

  return (
    <div className="min-h-screen pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/30">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold bg-gradient-to-r from-teal-600 to-blue-800 bg-clip-text text-transparent">
                  Centrum Analityczne
                </h1>
                <p className="text-gray-500 font-medium">Zaawansowane statystyki i raporty logistyczne</p>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button 
                onClick={fetchAnalyticsData}
                className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 flex items-center space-x-2 shadow-sm font-medium"
              >
                <RefreshCw className="w-4 h-4 text-teal-600" />
                <span>Odśwież dane</span>
              </button>
              
              <button 
                onClick={handleExportReport}
                className="px-4 py-2.5 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-xl hover:from-teal-700 hover:to-blue-700 transition-all duration-200 flex items-center space-x-2 shadow-md font-medium"
              >
                <Download className="w-4 h-4" />
                <span>Pobierz Raport</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-2 shadow-lg border border-blue-50/50 flex flex-wrap gap-2">
            {[
              { id: 'overview', label: 'Przegląd', icon: Activity },
              { id: 'clients', label: 'Analiza Klientów', icon: Building2 },
              { id: 'drums', label: 'Baza Bębnów', icon: Package },
              { id: 'returns', label: 'Logistyka Zwrotów', icon: Truck }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = selectedReport === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedReport(tab.id)}
                  className={`flex-1 min-w-[150px] flex items-center justify-center space-x-2 px-6 py-3 rounded-xl transition-all duration-300 font-semibold ${
                    isActive
                      ? 'bg-gradient-to-r from-teal-50 to-blue-50 text-teal-700 shadow-sm border border-teal-100/50 scale-100'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 scale-95 hover:scale-100'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-teal-600' : 'text-gray-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* =========================================
            OVERVIEW DASHBOARD 
            ========================================= */}
        {selectedReport === 'overview' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPI Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                icon={Package}
                title="Wszystkie bębny"
                value={dStats.total_count || 0}
                subtitle="Zarejestrowane w systemie"
                color="text-blue-600 text-blue-600 bg-blue-600"
              />
              <StatCard
                icon={Building2}
                title="Firmy w systemie"
                value={cStats.total_companies || 0}
                subtitle="Klienci z aktywnymi bębnami"
                color="text-teal-600 text-teal-600 bg-teal-600"
              />
              <StatCard
                icon={AlertTriangle}
                title="Bębny przeterminowane"
                value={dStats.overdue_count || 0}
                subtitle="Wymagają interwencji"
                color="text-red-600 text-red-600 bg-red-600"
              />
              <StatCard
                icon={RefreshCw}
                title="Zgłoszone zwroty"
                value={rStats.total_count || 0}
                subtitle="Zgłoszenia w historii"
                color="text-purple-600 text-purple-600 bg-purple-600"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Monthly Returns Trend */}
              <ChartCard title="Aktywność Zgłoszeń (Ostatnie miesiące)">
                <div className="h-64 flex items-end space-x-2 pt-8 relative">
                  {monthlyTrends.length > 0 ? monthlyTrends.slice(-6).map((month, idx) => {
                    const maxRequests = Math.max(...monthlyTrends.map(m => m.requests), 1);
                    const height = Math.max((month.requests / maxRequests) * 100, 5);
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer relative">
                        {/* Tooltip */}
                        <div className="absolute -top-10 bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                          {month.requests} zgłoszeń
                        </div>
                        {/* Bar */}
                        <div 
                          className="w-full bg-gradient-to-t from-teal-500 to-blue-400 rounded-t-md transition-all duration-700 ease-out group-hover:brightness-110 shadow-sm"
                          style={{ height: `${height}%` }}
                        ></div>
                        <div className="mt-3 text-xs font-medium text-gray-500">{month.month}</div>
                      </div>
                    );
                  }) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">Brak danych za ostatnie miesiące</div>
                  )}
                </div>
              </ChartCard>

              {/* Status rozliczeń i klientów */}
              <div className="space-y-6">
                <ChartCard title="Bębny u Klientów (Zadłużenie)">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-gray-600">Firmy posiadające przeterminowane bębny</div>
                    <div className="text-2xl font-black text-red-500">{cStats.clients_with_overdue || 0}</div>
                  </div>
                  <ProgressBar 
                    label="Odsetek firm z przeterminowaniami" 
                    value={cStats.clients_with_overdue || 0} 
                    max={cStats.total_companies || 1} 
                    color="bg-red-500" 
                  />
                  <div className="mt-6 flex justify-end">
                    <button 
                      onClick={() => setSelectedReport('clients')}
                      className="text-sm font-semibold text-teal-600 hover:text-teal-800 flex items-center"
                    >
                      Szczegóły klientów <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                </ChartCard>

                <ChartCard title="Status Płatności Bębnów">
                  <div className="space-y-2">
                    {Object.entries(dStats.by_payment || {}).map(([status, count], idx) => {
                      let color = "bg-gray-400";
                      if (status === 'Tak') color = "bg-green-500";
                      if (status === 'Nie') color = "bg-red-500";
                      if (status === 'Brak faktury') color = "bg-yellow-400";
                      return (
                        <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full mr-3 ${color}`}></div>
                            <span className="text-gray-700 font-medium">
                              {status === 'Tak' ? 'Zapłacone' : status === 'Nie' ? 'Niezapłacone' : status}
                            </span>
                          </div>
                          <span className="font-bold text-gray-900">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </ChartCard>
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            CLIENTS DASHBOARD 
            ========================================= */}
        {selectedReport === 'clients' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard
                icon={Building2}
                title="Firmy z Bębnami"
                value={cStats.total_companies || 0}
                subtitle="Baza klientów"
                color="text-blue-600 bg-blue-600"
              />
              <StatCard
                icon={AlertTriangle}
                title="Firmy Zadłużone"
                value={cStats.clients_with_overdue || 0}
                subtitle="Minimum 1 bęben przeterminowany"
                color="text-red-600 bg-red-600"
              />
              <StatCard
                icon={Package}
                title="Średnio Bębnów"
                value={cStats.total_companies > 0 ? Math.round((dStats.total_count || 0) / cStats.total_companies) : 0}
                subtitle="Na jednego klienta"
                color="text-purple-600 bg-purple-600"
              />
            </div>

            <ChartCard title="TOP 10 Klientów (Najwięcej bębnów)">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider rounded-tl-lg">Firma</th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">NIP</th>
                      <th className="px-6 py-3 bg-gray-50 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Wszystkie Bębny</th>
                      <th className="px-6 py-3 bg-gray-50 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider rounded-tr-lg">Przeterminowane</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {topClients.map((client, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-bold text-gray-900">{client.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {client.nip}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                            {client.drums_count}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {client.overdue_count > 0 ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-800">
                              {client.overdue_count}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-800">
                              0
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {topClients.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-6 py-12 text-center text-gray-500">Brak danych do wyświetlenia</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          </div>
        )}

        {/* =========================================
            DRUMS DASHBOARD 
            ========================================= */}
        {selectedReport === 'drums' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <ChartCard title="Dystrybucja według Rozmiaru (TOP 8)">
                <SimpleBarChart data={drumSizesData} color="bg-teal-500" />
              </ChartCard>

              <ChartCard title="Bębny według Dostawcy (TOP 8)">
                <SimpleBarChart data={supplierData} color="bg-blue-500" />
              </ChartCard>

              <ChartCard title="Status Magazynowy" className="lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  {Object.entries(dStats.by_status || {})
                    .sort((a,b) => b[1] - a[1])
                    .map(([status, count], idx) => {
                      let color = "bg-gray-400";
                      if (status.includes('pusty')) color = "bg-green-500";
                      else if (status.includes('towarem')) color = "bg-blue-500";
                      else if (status === 'Wydany') color = "bg-purple-500";
                      else if (status === 'Lost') color = "bg-red-500";
                      
                      return (
                        <ProgressBar 
                          key={idx}
                          label={status} 
                          value={count} 
                          max={dStats.total_count} 
                          color={color} 
                        />
                      )
                    })
                  }
                </div>
              </ChartCard>
            </div>
          </div>
        )}

        {/* =========================================
            RETURNS DASHBOARD 
            ========================================= */}
        {selectedReport === 'returns' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard
                icon={RefreshCw}
                title="Wszystkie zgłoszenia"
                value={rStats.total_count || 0}
                subtitle="Od początku systemu"
                color="text-blue-600 bg-blue-600"
              />
              <StatCard
                icon={Clock}
                title="Średni Czas Obsługi"
                value={`${rStats.avg_processing_time_days || 0} dni`}
                subtitle="Dla zakończonych zgłoszeń"
                color="text-teal-600 bg-teal-600"
              />
              <StatCard
                icon={Target}
                title="Aktywne zlecenia"
                value={(rStats.by_status?.Pending || 0) + (rStats.by_status?.Approved || 0) + (rStats.by_status?.InTransit || 0)}
                subtitle="W trakcie procesowania"
                color="text-orange-600 bg-orange-600"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <ChartCard title="Status Zgłoszeń">
                <div className="space-y-6 pt-4">
                  {[
                    { status: 'Pending', label: 'Oczekujące na akceptację', color: 'bg-yellow-400' },
                    { status: 'Approved', label: 'Zaakceptowane', color: 'bg-blue-500' },
                    { status: 'InTransit', label: 'W transporcie', color: 'bg-purple-500' },
                    { status: 'Completed', label: 'Zakończone', color: 'bg-green-500' },
                    { status: 'Rejected', label: 'Odrzucone', color: 'bg-red-500' }
                  ].map((s, idx) => (
                    <ProgressBar 
                      key={idx}
                      label={s.label} 
                      value={rStats.by_status?.[s.status] || 0} 
                      max={rStats.total_count || 1} 
                      color={s.color} 
                    />
                  ))}
                </div>
              </ChartCard>

              <ChartCard title="Wydajność Logistyki">
                <div className="flex flex-col items-center justify-center h-full space-y-6">
                  <div className="w-48 h-48 rounded-full border-8 border-teal-100 flex items-center justify-center relative">
                    <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                      <circle 
                        cx="90" cy="90" r="86" 
                        stroke="currentColor" 
                        strokeWidth="8" 
                        fill="transparent" 
                        className="text-teal-500"
                        strokeDasharray={`${((rStats.by_status?.Completed || 0) / Math.max(rStats.total_count, 1)) * 540} 540`}
                      />
                    </svg>
                    <div className="text-center">
                      <div className="text-4xl font-black text-gray-800">
                        {Math.round(((rStats.by_status?.Completed || 0) / Math.max(rStats.total_count, 1)) * 100)}%
                      </div>
                      <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">Zakończonych</div>
                    </div>
                  </div>
                  <p className="text-center text-gray-600 max-w-sm">
                    Odsetek zgłoszeń, które zostały pomyślnie zrealizowane i odebrane od klienta.
                  </p>
                </div>
              </ChartCard>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminReports;
