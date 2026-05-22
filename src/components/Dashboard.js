import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Truck, Calendar, TrendingUp, AlertCircle, CheckCircle, Clock, ArrowRight, BarChart3, Activity, XCircle, ChevronRight
} from 'lucide-react';
import { drumsAPI, returnsAPI } from '../utils/supabaseApi';

const Dashboard = ({ user }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalDrums: 0,
    activeDrums: 0,
    pendingReturns: 0,
    recentReturns: 0
  });
  const [financialStats, setFinancialStats] = useState({
    totalValue: 0,
    activeValue: 0,
    overdueValue: 0,
    lostValue: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [urgentDrumsList, setUrgentDrumsList] = useState([]);
  const [statusBreakdown, setStatusBreakdown] = useState({
    active: 0,
    dueSoon: 0,
    overdue: 0,
    reported: 0,
    activePercent: 0,
    dueSoonPercent: 0,
    overduePercent: 0,
    reportedPercent: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [userDrums, userReturns] = await Promise.all([
          drumsAPI.getAllDrums(user.nip),
          returnsAPI.getReturns(user.nip)
        ]);

        // 1. Zidentyfikuj zgłoszone bębny (identycznie jak w widoku DrumsList)
        const reportedDrums = new Set();
        if (Array.isArray(userReturns)) {
          userReturns.forEach(req => {
            if (req.status !== 'Rejected' && req.status !== 'Cancelled') {
              if (Array.isArray(req.selected_drums)) {
                req.selected_drums.forEach(d => reportedDrums.add(d.cecha));
              }
            }
          });
        }

        // Zmapuj bębny z ich rzeczywistymi statusami z uwzględnieniem zgłoszonych
        const mappedDrums = userDrums.map(d => {
          if (reportedDrums.has(d.cecha)) {
            return {
              ...d,
              isReported: true,
              status: 'reported',
              text: 'Zgłoszony do zwrotu',
              color: 'bg-orange-100 text-orange-700',
              borderColor: 'border-orange-200'
            };
          }
          return d;
        });

        // 2. Oblicz statystyki dla kafelków
        const total = mappedDrums.length;
        const activeCount = mappedDrums.filter(d => d.status === 'active').length;
        const dueSoonCount = mappedDrums.filter(d => d.status === 'due-soon').length;
        const overdueCount = mappedDrums.filter(d => d.status === 'overdue').length;
        const reportedCount = mappedDrums.filter(d => d.status === 'reported').length;
        
        // Obliczenia Finansowe na podstawie ceny netto + 20% marży
        let totalVal = 0;
        let activeVal = 0;
        let overdueVal = 0;
        let lostValTotal = 0;

        mappedDrums.forEach(drum => {
          const priceRaw = parseFloat(drum.cena_netto_bebna || drum.CENA_NETTO_BEBNA);
          if (!isNaN(priceRaw)) {
            const clientPrice = priceRaw * 1.2;
            totalVal += clientPrice;

            if (drum.status === 'overdue') {
              overdueVal += clientPrice;
            } else {
              activeVal += clientPrice;
            }

            // Oblicz stratę amortyzacyjną ze względu na czas posiadania
            const issueDate = new Date(drum.data_wydania || drum.data_przyjecia_na_stan);
            const daysInPossession = Math.ceil((new Date() - issueDate) / (1000 * 60 * 60 * 24));
            
            let returnPercentage = 100;
            if (isNaN(daysInPossession) || daysInPossession <= 120) returnPercentage = 100;
            else if (daysInPossession <= 150) returnPercentage = 90;
            else if (daysInPossession <= 180) returnPercentage = 75;
            else if (daysInPossession <= 240) returnPercentage = 50;
            else if (daysInPossession <= 340) returnPercentage = 25;
            else returnPercentage = 1;

            const lostPercent = 100 - returnPercentage;
            lostValTotal += clientPrice * (lostPercent / 100);
          }
        });

        // Bębny przyjęte w ciągu ostatnich 30 dni (nowe wydania dla klienta)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
        
        const recentCount = mappedDrums.filter(d => {
          const date = d.data_wydania || d.data_przyjecia_na_stan;
          return date && date >= thirtyDaysAgoStr;
        }).length;

        const pendingReturnsCount = userReturns.filter(r => r.status === 'Pending').length;

        setStats({
          totalDrums: total,
          activeDrums: activeCount,
          pendingReturns: pendingReturnsCount,
          recentReturns: recentCount
        });

        setFinancialStats({
          totalValue: totalVal,
          activeValue: activeVal,
          overdueValue: overdueVal,
          lostValue: lostValTotal
        });

        // 3. Oblicz procentowy podział dla wykresu
        const activePercent = total > 0 ? (activeCount / total) * 100 : 0;
        const dueSoonPercent = total > 0 ? (dueSoonCount / total) * 100 : 0;
        const overduePercent = total > 0 ? (overdueCount / total) * 100 : 0;
        const reportedPercent = total > 0 ? (reportedCount / total) * 100 : 0;

        setStatusBreakdown({
          active: activeCount,
          dueSoon: dueSoonCount,
          overdue: overdueCount,
          reported: reportedCount,
          activePercent,
          dueSoonPercent,
          overduePercent,
          reportedPercent
        });

        // 4. Wybierz najbardziej pilne bębny (overdue oraz due-soon), które nie zostały jeszcze zgłoszone
        const urgent = mappedDrums
          .filter(d => (d.status === 'overdue' || d.status === 'due-soon') && !d.isReported)
          .sort((a, b) => {
            if (a.status === 'overdue' && b.status !== 'overdue') return -1;
            if (a.status !== 'overdue' && b.status === 'overdue') return 1;
            const dateA = new Date(a.clientReturnDeadline || a.data_zwrotu_do_dostawcy || '9999-12-31');
            const dateB = new Date(b.clientReturnDeadline || b.data_zwrotu_do_dostawcy || '9999-12-31');
            return dateA - dateB;
          })
          .slice(0, 4);

        setUrgentDrumsList(urgent);

        // 5. Wygeneruj rzeczywistą aktywność
        generateRealActivity(mappedDrums, userReturns);

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

  const generateRealActivity = (drums, returns) => {
    const activities = [];

    const formatRelativeDate = (date) => {
      const now = new Date();
      const eventDate = new Date(date);
      
      now.setHours(0, 0, 0, 0);
      eventDate.setHours(0, 0, 0, 0);
      
      const diffTime = now - eventDate;
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'dziś';
      if (diffDays === 1) return 'wczoraj';
      if (diffDays > 1 && diffDays < 7) return `${diffDays} dni temu`;
      return eventDate.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
    };

    // 1. Wydania bębnów w ciągu ostatnich 30 dni
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    drums.forEach(drum => {
      const issueDateStr = drum.data_wydania || drum.data_przyjecia_na_stan;
      if (issueDateStr) {
        const issueDate = new Date(issueDateStr);
        if (issueDate >= thirtyDaysAgo) {
          activities.push({
            id: `issue-${drum.kod_bebna || drum.cecha}`,
            type: 'drum_issued',
            message: `Wydano nowy bęben ${drum.cecha || drum.kod_bebna}`,
            time: formatRelativeDate(issueDateStr),
            rawDate: issueDate,
            icon: Package,
            color: 'text-blue-600'
          });
        }
      }
    });

    // 2. Zdarzenia powiązane ze zgłoszeniami zwrotu
    returns.forEach(req => {
      const createdDate = new Date(req.created_at);
      const updatedDate = new Date(req.updated_at || req.created_at);
      const drumsCount = Array.isArray(req.selected_drums) ? req.selected_drums.length : 0;

      // Zgłoszenie zwrotu
      activities.push({
        id: `created-${req.id}`,
        type: 'return_created',
        message: `Zgłoszono zwrot ${drumsCount} bębna/ów (zgłoszenie #${req.id})`,
        time: formatRelativeDate(req.created_at),
        rawDate: createdDate,
        icon: Truck,
        color: 'text-amber-500'
      });

      // Zmiany statusów
      if (req.status === 'Approved') {
        activities.push({
          id: `approved-${req.id}`,
          type: 'return_approved',
          message: `Zatwierdzono transport dla zgłoszenia #${req.id}`,
          time: formatRelativeDate(updatedDate),
          rawDate: updatedDate,
          icon: Clock,
          color: 'text-indigo-600'
        });
      } else if (req.status === 'InTransit') {
        activities.push({
          id: `intransit-${req.id}`,
          type: 'return_intransit',
          message: `Zgłoszenie #${req.id} jest w transporcie`,
          time: formatRelativeDate(updatedDate),
          rawDate: updatedDate,
          icon: Truck,
          color: 'text-sky-600'
        });
      } else if (req.status === 'Completed') {
        activities.push({
          id: `completed-${req.id}`,
          type: 'return_completed',
          message: `Odebrano bębny dla zgłoszenia #${req.id}`,
          time: formatRelativeDate(updatedDate),
          rawDate: updatedDate,
          icon: CheckCircle,
          color: 'text-emerald-600'
        });

        if (req.correction_number) {
          activities.push({
            id: `correction-${req.id}`,
            type: 'return_correction',
            message: `Wystawiono fakturę korygującą: ${req.correction_number}`,
            time: formatRelativeDate(updatedDate),
            rawDate: updatedDate,
            icon: CheckCircle,
            color: 'text-green-600'
          });
        }
      } else if (req.status === 'Rejected') {
        activities.push({
          id: `rejected-${req.id}`,
          type: 'return_rejected',
          message: `Odrzucono zgłoszenie zwrotu #${req.id}`,
          time: formatRelativeDate(updatedDate),
          rawDate: updatedDate,
          icon: XCircle,
          color: 'text-rose-600'
        });
      }
    });

    // Posortuj chronologicznie od najnowszych
    const sorted = activities
      .sort((a, b) => b.rawDate - a.rawDate)
      .slice(0, 5);

    if (sorted.length === 0) {
      sorted.push({
        id: 'welcome',
        type: 'info',
        message: 'Witaj w systemie zarządzania bębnami',
        time: 'teraz',
        icon: Activity,
        color: 'text-blue-600'
      });
    }

    setRecentActivity(sorted);
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color, path }) => (
    <div
      onClick={() => navigate(path)}
      className={`
        bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-blue-100 
        hover:shadow-xl transition-all duration-300 transform hover:scale-[1.03] cursor-pointer 
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
              <span className="text-2xl font-bold text-gray-900">{value}</span>
            </div>
          </div>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-300 shrink-0" />
      </div>
    </div>
  );

  const ActivityItem = ({ item }) => {
    const Icon = item.icon;
    return (
      <div className="flex items-start space-x-3 p-3 rounded-xl hover:bg-blue-50/50 transition-colors duration-200 border border-transparent hover:border-blue-100/50">
        <div className={`p-2 rounded-lg bg-gray-50 shrink-0`}>
          <Icon className={`w-4 h-4 ${item.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 leading-snug">{item.message}</p>
          <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
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
              <p className="text-gray-600">Witaj ponownie, {user.name || user.companyName}</p>
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
            path="/drums"
          />

          <StatCard
            icon={CheckCircle}
            title="Aktywne bębny"
            value={stats.activeDrums}
            subtitle="Bębny w użyciu"
            color="text-green-600"
            path="/drums"
          />

          <StatCard
            icon={AlertCircle}
            title="Oczekujące zwroty"
            value={stats.pendingReturns}
            subtitle="Wymagają zwrotu"
            color="text-red-600"
            path="/my-returns"
          />

          <StatCard
            icon={TrendingUp}
            title="Ostatnie 30 dni"
            value={stats.recentReturns}
            subtitle="Nowe przyjęcia"
            color="text-purple-600"
            path="/drums"
          />
        </div>

        {/* Financial Summary Section */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-2xl border border-indigo-500/20 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4 border-b border-white/10 pb-6">
            <div>
              <span className="text-[10px] font-extrabold bg-blue-500/20 border border-blue-500/30 text-blue-300 px-3 py-1 rounded-full uppercase tracking-widest block w-fit mb-2">PODSUMOWANIE FINANSOWE KAUCJI</span>
              <h2 className="text-2xl font-bold tracking-tight">Wartość bębnów w Twoim posiadaniu</h2>
            </div>
            <div className="text-left lg:text-right">
              <p className="text-xs text-slate-400 font-medium">Szacowana całkowita wartość bębnów (z kaucją)</p>
              <p className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
                {financialStats.totalValue.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PLN
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Active Value */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:border-emerald-500/30 transition-all duration-300 group">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">W terminie (Pełny zwrot)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-extrabold uppercase">100% zwrotu</span>
              </div>
              <p className="text-2xl font-black text-white group-hover:text-emerald-300 transition-colors duration-200">
                {financialStats.activeValue.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PLN
              </p>
              <p className="text-xs text-slate-400 mt-2">Bębny z aktywnym terminem, bezpieczne do zwrotu.</p>
            </div>

            {/* Overdue Value */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:border-amber-500/30 transition-all duration-300 group">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">Przeterminowane</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-extrabold uppercase">Zmniejszony zwrot</span>
              </div>
              <p className="text-2xl font-black text-white group-hover:text-amber-300 transition-colors duration-200">
                {financialStats.overdueValue.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PLN
              </p>
              <p className="text-xs text-slate-400 mt-2">Bębny po terminie. Zwróć je pilnie, by zatrzymać amortyzację.</p>
            </div>

            {/* Lost Value */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:border-rose-500/30 transition-all duration-300 group">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block">Utracona kaucja (Strata)</span>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-extrabold uppercase">Bezpowrotne</span>
              </div>
              <p className="text-2xl font-black text-rose-400 group-hover:text-rose-300 transition-colors duration-200">
                {financialStats.lostValue.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PLN
              </p>
              <p className="text-xs text-slate-400 mt-2">Środki utracone w wyniku przekroczenia dopuszczalnego wieku bębnów.</p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Breakdown + Urgent list */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Breakdown Card */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-blue-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                Przegląd stanu bębnów
              </h2>

              {stats.totalDrums > 0 ? (
                <div>
                  {/* Stacked Progress Bar */}
                  <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden flex mb-6 shadow-inner">
                    {statusBreakdown.overduePercent > 0 && (
                      <div 
                        style={{ width: `${statusBreakdown.overduePercent}%` }} 
                        className="bg-gradient-to-r from-red-500 to-rose-600 h-full transition-all duration-500" 
                        title={`Przeterminowane: ${statusBreakdown.overdue}`} 
                      />
                    )}
                    {statusBreakdown.dueSoonPercent > 0 && (
                      <div 
                        style={{ width: `${statusBreakdown.dueSoonPercent}%` }} 
                        className="bg-gradient-to-r from-amber-400 to-yellow-500 h-full transition-all duration-500" 
                        title={`Termin pilny: ${statusBreakdown.dueSoon}`} 
                      />
                    )}
                    {statusBreakdown.activePercent > 0 && (
                      <div 
                        style={{ width: `${statusBreakdown.activePercent}%` }} 
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full transition-all duration-500" 
                        title={`Aktywne: ${statusBreakdown.active}`} 
                      />
                    )}
                    {statusBreakdown.reportedPercent > 0 && (
                      <div 
                        style={{ width: `${statusBreakdown.reportedPercent}%` }} 
                        className="bg-gradient-to-r from-orange-400 to-orange-500 h-full transition-all duration-500" 
                        title={`Zgłoszone: ${statusBreakdown.reported}`} 
                      />
                    )}
                  </div>

                  {/* Legend Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex flex-col">
                      <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1">Przeterminowane</span>
                      <span className="text-xl font-bold text-red-700">{statusBreakdown.overdue}</span>
                      <span className="text-xs text-red-400 mt-0.5">{statusBreakdown.overduePercent.toFixed(0)}% sumy</span>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex flex-col">
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Termin do 7 dni</span>
                      <span className="text-xl font-bold text-amber-700">{statusBreakdown.dueSoon}</span>
                      <span className="text-xs text-amber-500 mt-0.5">{statusBreakdown.dueSoonPercent.toFixed(0)}% sumy</span>
                    </div>

                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex flex-col">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Aktywne</span>
                      <span className="text-xl font-bold text-emerald-700">{statusBreakdown.active}</span>
                      <span className="text-xs text-emerald-500 mt-0.5">{statusBreakdown.activePercent.toFixed(0)}% sumy</span>
                    </div>

                    <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl flex flex-col">
                      <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-1">Zgłoszone zwroty</span>
                      <span className="text-xl font-bold text-orange-700">{statusBreakdown.reported}</span>
                      <span className="text-xs text-orange-500 mt-0.5">{statusBreakdown.reportedPercent.toFixed(0)}% sumy</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">Brak bębnów w systemie.</div>
              )}
            </div>

            {/* Urgent Deadlines Card */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-blue-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
                Wymagające zwrotu
              </h2>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                Poniższe bębny przekroczyły termin lub zbliżają się do daty zwrotu. Zgłoś ich zwrot jednym kliknięciem, aby uniknąć dodatkowych opłat.
              </p>

              {urgentDrumsList.length > 0 ? (
                <div className="space-y-3">
                  {urgentDrumsList.map((drum) => {
                    const returnDate = drum.clientReturnDeadline || drum.data_zwrotu_do_dostawcy;
                    const daysStr = drum.status === 'overdue' 
                      ? `Przeterminowany o ${drum.daysDiff} dni`
                      : `Pozostało ${drum.daysDiff} dni`;

                    return (
                      <div 
                        key={drum.id || drum.cecha} 
                        className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
                          drum.status === 'overdue' 
                            ? 'bg-red-50/30 border-red-100 hover:border-red-200' 
                            : 'bg-amber-50/20 border-amber-100 hover:border-amber-200'
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-3 sm:mb-0">
                          <div className={`p-2.5 rounded-lg shrink-0 ${
                            drum.status === 'overdue' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            <Package className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-bold text-gray-800 text-sm block">{drum.cecha || drum.kod_bebna}</span>
                            {drum.rozmiar_bebna && (
                              <span className="text-xs text-gray-500 block font-semibold">Rozmiar: {drum.rozmiar_bebna}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4">
                          <div className="text-left sm:text-right">
                            <span className={`text-xs font-bold block ${
                              drum.status === 'overdue' ? 'text-red-600' : 'text-amber-600'
                            }`}>{daysStr}</span>
                            {drum.cena_netto_bebna && (
                              <span className="text-[10px] font-bold text-gray-600 block mt-0.5">
                                Wartość: {((parseFloat(drum.cena_netto_bebna) || 0) * 1.2).toFixed(2)} PLN
                              </span>
                            )}
                            <span className="text-[10px] text-gray-400 block font-medium">Termin: {returnDate ? new Date(returnDate).toLocaleDateString('pl-PL') : 'Brak'}</span>
                          </div>

                          <button
                            onClick={() => navigate('/return', { state: { drum } })}
                            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all duration-200 hover:scale-105 shrink-0 ${
                              drum.status === 'overdue' 
                                ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700' 
                                : 'bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700'
                            }`}
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Zgłoś zwrot</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center space-x-3">
                  <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-800 text-sm">Wszystko pod kontrolą!</h4>
                    <p className="text-xs text-emerald-600 mt-0.5">Wszystkie Twoje bębny posiadają bezpieczne terminy zwrotu.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Recent Activity */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-blue-100 p-6 flex flex-col h-full">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center pb-2 border-b border-gray-100">
                <Clock className="w-5 h-5 mr-2 text-blue-600" />
                Ostatnia aktywność
              </h3>

              <div className="space-y-1.5 flex-grow">
                {recentActivity.map((item) => (
                  <ActivityItem key={item.id} item={item} />
                ))}
              </div>

              <button
                onClick={() => navigate('/drums')}
                className="w-full mt-6 py-3 px-4 text-xs font-bold text-blue-600 hover:text-blue-800 transition-all duration-200 border border-blue-200 hover:border-blue-300 rounded-xl hover:bg-blue-50 flex items-center justify-center space-x-1"
              >
                <span>Zobacz wszystkie bębny</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="mt-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-center md:text-left mb-4 md:mb-0">
              <h3 className="text-lg font-bold mb-1">Potrzebujesz pomocy?</h3>
              <p className="text-blue-100 text-sm">Skontaktuj się z naszym zespołem wsparcia logistycznego</p>
            </div>
            <div className="flex space-x-4">
              <a 
                href="tel:+48123456789" 
                className="px-6 py-2.5 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all duration-200 font-bold text-sm"
              >
                📞 Zadzwoń
              </a>
              <a 
                href="mailto:wsparcie@opakowania.pl" 
                className="px-6 py-2.5 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition-all duration-200 font-bold text-sm"
              >
                ✉️ Email
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
