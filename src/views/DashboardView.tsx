import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  Users,
  Download,
  Calendar,
  ArrowRight,
  BellRing,
  Droplets,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  PackageCheck,
  Percent,
  Wallet,
  ArrowUpRight,
  Clock,
  Filter,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  formatAZN,
  formatDateAZ,
  getTodayISODate,
  getStartOfWeekISODate,
  getStartOfMonthISODate,
  isDateInRange,
  getDaysCountBetween,
} from '../utils/dateUtils';
import { calculateAllProductStocks, getLowStockProducts } from '../utils/stockCalculations';
import {
  calculatePaymentBreakdown,
  calculateProductSaleCounts,
  calculateNetProfit,
  checkDailyReportDiscrepancy,
  calculateDebtOverview,
  calculateCategoryBreakdown,
} from '../utils/financialCalculations';
import { exportSalesToCSV } from '../utils/exportUtils';
import { PWAInstallButton } from '../components/PWAInstallButton';

export type DashboardPeriod = 'daily' | 'weekly' | 'monthly' | 'custom';

export const DashboardView: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const {
    products,
    purchases,
    sales,
    debts,
    dailyReports,
    expenses,
    settings,
    notificationPermission,
    requestPushPermission,
  } = useApp();

  const todayISO = getTodayISODate();

  // Period state: 'daily' | 'weekly' | 'monthly' | 'custom'
  const [period, setPeriod] = useState<DashboardPeriod>('daily');
  const [customStartDate, setCustomStartDate] = useState<string>(() => getStartOfMonthISODate());
  const [customEndDate, setCustomEndDate] = useState<string>(() => todayISO);

  // Category table expand states
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Su': true,
    'Protein': true,
    'Əlavələr': true,
    'Digər': true,
  });

  const toggleCategoryExpand = (catName: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catName]: !prev[catName],
    }));
  };

  // Determine active start and end date based on selected period
  const { startDate, endDate, periodLabel } = useMemo(() => {
    if (period === 'daily') {
      return {
        startDate: todayISO,
        endDate: todayISO,
        periodLabel: `Bu gün (${formatDateAZ(todayISO)})`,
      };
    }
    if (period === 'weekly') {
      const mon = getStartOfWeekISODate();
      return {
        startDate: mon,
        endDate: todayISO,
        periodLabel: `Bu həftə (${formatDateAZ(mon)} – ${formatDateAZ(todayISO)})`,
      };
    }
    if (period === 'monthly') {
      const firstOfMonth = getStartOfMonthISODate();
      return {
        startDate: firstOfMonth,
        endDate: todayISO,
        periodLabel: `Bu ay (${formatDateAZ(firstOfMonth)} – ${formatDateAZ(todayISO)})`,
      };
    }
    // custom
    const start = customStartDate || todayISO;
    const end = customEndDate || todayISO;
    const days = getDaysCountBetween(start, end);
    return {
      startDate: start,
      endDate: end,
      periodLabel: `Xüsusi aralıq: ${formatDateAZ(start)} – ${formatDateAZ(end)} (${days} gün)`,
    };
  }, [period, customStartDate, customEndDate, todayISO]);

  // Stocks (Warehouse is current state)
  const allStocks = useMemo(
    () => calculateAllProductStocks(products, purchases, sales, settings.minStockThreshold),
    [products, purchases, sales, settings.minStockThreshold]
  );
  const lowStockItems = useMemo(
    () => getLowStockProducts(products, purchases, sales, settings.minStockThreshold),
    [products, purchases, sales, settings.minStockThreshold]
  );

  // Filter sales for the selected period
  const confirmedSales = useMemo(() => sales.filter(s => s.isConfirmed), [sales]);
  const periodSales = useMemo(
    () => confirmedSales.filter(s => isDateInRange(s.date, startDate, endDate)),
    [confirmedSales, startDate, endDate]
  );

  // Filter purchases and expenses for selected period
  const periodPurchases = useMemo(
    () => purchases.filter(p => isDateInRange(p.date, startDate, endDate)),
    [purchases, startDate, endDate]
  );
  const periodExpenses = useMemo(
    () => expenses.filter(e => isDateInRange(e.date, startDate, endDate)),
    [expenses, startDate, endDate]
  );

  // Financial Metrics for Period
  const periodRevenue = useMemo(
    () => periodSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0),
    [periodSales]
  );
  const periodGoodsPurchases = useMemo(
    () => periodPurchases.reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0),
    [periodPurchases]
  );
  const periodTotalExpenses = useMemo(
    () => periodExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
    [periodExpenses]
  );

  const profitData = useMemo(
    () => calculateNetProfit(periodRevenue, periodGoodsPurchases, periodTotalExpenses),
    [periodRevenue, periodGoodsPurchases, periodTotalExpenses]
  );

  // Payment Breakdown for Period
  const paymentBreakdown = useMemo(() => calculatePaymentBreakdown(periodSales), [periodSales]);
  const totalPaid = (paymentBreakdown.cash + paymentBreakdown.card + paymentBreakdown.pos + paymentBreakdown.balance) || 0;
  const cashPct = totalPaid > 0 ? Math.round((paymentBreakdown.cash / totalPaid) * 100) : 0;
  const cardPct = totalPaid > 0 ? Math.round((paymentBreakdown.card / totalPaid) * 100) : 0;
  const posPct = totalPaid > 0 ? Math.round((paymentBreakdown.pos / totalPaid) * 100) : 0;
  const balancePct = totalPaid > 0 ? Math.round((paymentBreakdown.balance / totalPaid) * 100) : 0;

  // Average Sale Amount in Period
  const averageTicket = periodSales.length > 0 ? periodRevenue / periodSales.length : 0;

  // Category & Product level breakdown for Period
  const categoryBreakdown = useMemo(
    () => calculateCategoryBreakdown(periodSales, products),
    [periodSales, products]
  );

  // Top products in Period
  const topProducts = useMemo(() => calculateProductSaleCounts(periodSales), [periodSales]);

  // Debt overview
  const debtOverview = useMemo(() => calculateDebtOverview(debts), [debts]);
  const periodDebts = useMemo(
    () => debts.filter(d => isDateInRange(d.date, startDate, endDate)),
    [debts, startDate, endDate]
  );
  const periodDebtAmount = useMemo(
    () => periodDebts.reduce((sum, d) => sum + (Number(d.totalAmount) || 0), 0),
    [periodDebts]
  );

  // Discrepancy verification for period
  // For daily: compare today's dailyReport vs today sales
  // For other periods: sum matching daily reports
  const periodReports = useMemo(
    () => dailyReports.filter(r => isDateInRange(r.date, startDate, endDate)),
    [dailyReports, startDate, endDate]
  );
  const periodReportTotal = periodReports.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
  const drawerSalesTotal = periodSales
    .filter(s => s.paymentType !== 'borc')
    .reduce((sum, s) => sum + s.totalAmount, 0);
  const periodDiff = Math.round((periodReportTotal - drawerSalesTotal) * 100) / 100;
  const isDrawerMatching = Math.abs(periodDiff) < 0.01;

  // ==========================================================
  // SU VƏ SU APARATI XÜSUSİ GÖSTƏRİCİLƏRİ (DÖVRƏ UYĞUN)
  // ==========================================================
  const waterCategory = useMemo(() => {
    return categoryBreakdown.categories.find(
      c => c.categoryName.trim().toLowerCase() === 'su'
    );
  }, [categoryBreakdown]);

  const waterRevenue = waterCategory ? waterCategory.totalRevenue : 0;
  const waterQuantity = waterCategory ? waterCategory.totalQuantity : 0;
  const waterPctOfRevenue =
    periodRevenue > 0 ? Math.round((waterRevenue / periodRevenue) * 1000) / 10 : 0;

  // All water products in inventory
  const waterProducts = useMemo(() => {
    return products.filter(
      p =>
        p.category.trim().toLowerCase() === 'su' ||
        p.name.toLowerCase().includes('su') ||
        p.barcode.toLowerCase().includes('su')
    );
  }, [products]);

  // Dynamic Trend Chart Data for the Selected Period
  const trendData = useMemo(() => {
    // If daily: show hourly or last 7 days leading up to today
    const days: { dateStr: string; label: string; amount: number }[] = [];
    if (period === 'daily') {
      // Show last 7 days trend for context
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${day}`;
        const dayTotal = confirmedSales
          .filter(s => s.date === dateStr)
          .reduce((sum, s) => sum + s.totalAmount, 0);
        days.push({
          dateStr,
          label: `${day}.${m}`,
          amount: dayTotal,
        });
      }
    } else {
      // Generate days between startDate and endDate (up to 14 days)
      const dStart = new Date(startDate);
      const dEnd = new Date(endDate);
      const diffDays = Math.min(14, Math.max(1, getDaysCountBetween(startDate, endDate)));

      // Step if range is large
      const step = Math.max(1, Math.floor(diffDays / 10));
      for (let i = 0; i < diffDays; i += step) {
        const curr = new Date(dStart);
        curr.setDate(curr.getDate() + i);
        if (curr > dEnd) break;
        const y = curr.getFullYear();
        const m = String(curr.getMonth() + 1).padStart(2, '0');
        const day = String(curr.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${day}`;
        const dayTotal = confirmedSales
          .filter(s => s.date === dateStr)
          .reduce((sum, s) => sum + s.totalAmount, 0);
        days.push({
          dateStr,
          label: `${day}.${m}`,
          amount: dayTotal,
        });
      }
    }
    return days;
  }, [period, startDate, endDate, confirmedSales]);

  const maxDayAmount = Math.max(...trendData.map(d => d.amount), 10);

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* ──────────────────────────────────────────────────────────
          TOP BAR & GLOBAL DÖVR SEÇİMİ (GÜNLÜK, HƏFTƏLİK, AYLIK, XÜSUSİ)
         ────────────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-3xl bg-zinc-900 border border-zinc-800/90 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Xülasə & Dashboard
              </h2>
              <span className="text-xs bg-red-600 text-white font-bold px-2.5 py-0.5 rounded-full shadow-sm shadow-red-600/30 animate-pulse">
                Canlı
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              Dövr: <span className="font-bold text-red-400">{periodLabel}</span> · Valyuta: AZN
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <PWAInstallButton variant="compact" />

            {notificationPermission !== 'granted' && (
              <button
                onClick={() => requestPushPermission()}
                className="px-3 py-1.5 text-xs font-semibold bg-zinc-950 border border-red-900/80 hover:bg-zinc-800 text-red-400 rounded-xl transition-colors flex items-center gap-1.5"
                title="Qalıq minimum həddə çatanda bildiriş al"
              >
                <BellRing className="w-3.5 h-3.5 text-red-500" />
                <span className="hidden sm:inline">Bildirişlər</span>
              </button>
            )}

            <button
              onClick={() => exportSalesToCSV(periodSales)}
              className="px-3 py-1.5 text-xs font-semibold bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Dövrün Satışlarını Yüklə</span>
            </button>

            <button
              onClick={() => onNavigate('pos')}
              className="px-4 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all shadow-md shadow-red-600/30 flex items-center gap-1.5"
            >
              <span>Kassaya Keç (POS)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* PERIOD SELECTOR PILLS */}
        <div className="pt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-zinc-950 rounded-2xl border border-zinc-800/90 overflow-x-auto">
            <button
              type="button"
              onClick={() => setPeriod('daily')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                period === 'daily'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Günlük (Bugün)
            </button>
            <button
              type="button"
              onClick={() => setPeriod('weekly')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                period === 'weekly'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Həftəlik
            </button>
            <button
              type="button"
              onClick={() => setPeriod('monthly')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                period === 'monthly'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Aylıq
            </button>
            <button
              type="button"
              onClick={() => setPeriod('custom')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                period === 'custom'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Xüsusi aralıq</span>
            </button>
          </div>

          {/* Custom Date Pickers (visible when period === 'custom') */}
          {period === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 p-2 bg-zinc-950 rounded-2xl border border-red-900/40 animate-in fade-in">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider pl-1">
                Tarix Aralığı:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-xl bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
                />
                <span className="text-zinc-500 text-xs">—</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-xl bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Critical Stock Warning Banner if any */}
      {lowStockItems.length > 0 && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-red-600/40">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-red-200">
                Depoda {lowStockItems.length} məhsulun qalığı kritik həddədir ({settings.minStockThreshold} və ya az)!
              </h4>
              <p className="text-xs text-red-300/80">
                {lowStockItems.map(i => `${i.product.name} (${i.activeStock} ədəd qalıb)`).join(' · ')}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('purchases')}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-colors shrink-0 shadow-sm"
          >
            Mal Qəbulu Et
          </button>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          BÖLMƏ 1: ƏSAS MALİYYƏ VƏ KASSA GÖSTƏRİCİLƏRİ (MİNİMAL KARTLAR)
         ────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
              1. Maliyyə və Kassa Göstəriciləri ({periodLabel})
            </h3>
          </div>
          <span className="text-xs text-zinc-500 font-mono">
            {periodSales.length} təsdiqlənmiş satış
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Revenue */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md relative overflow-hidden group hover:border-red-900/60 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Dövrün Satışı (Dövriyyə)
              </span>
              <div className="w-8 h-8 rounded-xl bg-red-950 text-red-400 flex items-center justify-center border border-red-900/60">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-white font-mono tracking-tight">
                {formatAZN(periodRevenue)}
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-400 mt-1.5">
                <span>Əməliyyat: <strong className="text-zinc-200">{periodSales.length} ədəd</strong></span>
                <span>Orta qəbz: <strong className="text-zinc-200">{formatAZN(averageTicket)}</strong></span>
              </div>
            </div>
          </div>

          {/* Card 2: Net Profit */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md relative overflow-hidden group hover:border-red-900/60 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Xalis Mənfəət
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center border border-emerald-900/60">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div
                className={`text-2xl font-black font-mono tracking-tight ${
                  profitData.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {formatAZN(profitData.netProfit)}
              </div>
              <p className="text-[11px] text-zinc-400 mt-1.5 truncate">
                Mal alışı: {formatAZN(periodGoodsPurchases)} · Xərc: {formatAZN(periodTotalExpenses)}
              </p>
            </div>
          </div>

          {/* Card 3: Drawer Cash & Verification */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md relative overflow-hidden group hover:border-red-900/60 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Kassa Girişi (Nağd+Kart+POS)
              </span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                isDrawerMatching ? 'bg-emerald-950 text-emerald-400 border-emerald-900/60' : 'bg-red-950 text-red-400 border-red-900/60'
              }`}>
                {isDrawerMatching ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-white font-mono tracking-tight">
                {formatAZN(totalPaid)}
              </div>
              <p className="text-[11px] text-zinc-400 mt-1.5 flex items-center justify-between">
                <span>Kassa fərqi:</span>
                <span className={`font-mono font-bold ${isDrawerMatching ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isDrawerMatching ? '0.00 AZN (Dəqiq ✓)' : `${periodDiff > 0 ? '+' : ''}${periodDiff} AZN`}
                </span>
              </p>
            </div>
          </div>

          {/* Card 4: Debts in Period & Overall */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md relative overflow-hidden group hover:border-red-900/60 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Nisyə & Qalıq Borc
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-950 text-amber-400 flex items-center justify-center border border-amber-900/60">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-amber-400 font-mono tracking-tight">
                {formatAZN(debtOverview.totalRemainingDebt)}
              </div>
              <p className="text-[11px] text-zinc-400 mt-1.5 flex items-center justify-between">
                <span>Dövrün nisyəsi: <strong className="text-zinc-200">{formatAZN(periodDebtAmount)}</strong></span>
                <span>Borclu: <strong className="text-amber-400">{debtOverview.unpaidDebtorsCount} nəfər</strong></span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
          BÖLMƏ 2: SU APARATI VƏ SU İSTEHLAKI GÖSTƏRİCİLƏRİ (XÜSUSİ ALT-BÖLMƏ)
         ────────────────────────────────────────────────────────── */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-sky-950/20 border border-sky-900/50 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shadow-lg shadow-sky-500/10">
              <Droplets className="w-5 h-5 stroke-[2.3]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white tracking-tight">
                  Su Aparatı və Su İstehlakı Göstəriciləri
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800 text-[10px] font-bold">
                  {periodLabel}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Zal barında və su aparatında satılan suların dəqiq statistikası, payı və aktiv anbar qalıqları
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('pos')}
            className="px-3 py-1.5 bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-800 font-bold text-xs rounded-xl transition-colors self-start sm:self-auto flex items-center gap-1.5"
          >
            <Droplets className="w-3.5 h-3.5 text-sky-400" />
            <span>Su Satışı Vur</span>
          </button>
        </div>

        {/* 3 Minimal KPI Badges for Water */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-sky-950 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                Su Satışından Gəlir
              </span>
              <span className="text-xl font-black font-mono text-sky-400 mt-1 block">
                {formatAZN(waterRevenue)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-zinc-300 block">
                {waterPctOfRevenue}%
              </span>
              <span className="text-[10px] text-zinc-500 block">Dövriyyə payı</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-sky-950 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                Satılan Su Həcmi / Sayı
              </span>
              <span className="text-xl font-black font-mono text-white mt-1 block">
                {waterQuantity} ədəd
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-sky-300 block">
                {waterCategory?.products.length || 0} çeşid
              </span>
              <span className="text-[10px] text-zinc-500 block">satışda</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-sky-950 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                Depoda Aktiv Su Qalığı
              </span>
              <span className="text-xl font-black font-mono text-emerald-400 mt-1 block">
                {waterProducts.reduce((sum, p) => sum + (allStocks[p.id]?.activeStock || 0), 0)} ədəd
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-zinc-300 block">
                {waterProducts.length} çeşid
              </span>
              <span className="text-[10px] text-zinc-500 block">anbarda</span>
            </div>
          </div>
        </div>

        {/* Detailed Minimal Cards for Every Water Product */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
            <span className="font-semibold text-zinc-300">Su Məhsulları Üzrə Ayrılmış Göstəricilər:</span>
            <span>Dövr ərzində satılan vs Depo qalığı</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {waterProducts.map(prod => {
              const stock = allStocks[prod.id];
              const soldInPeriod =
                waterCategory?.products.find(p => p.productId === prod.id)?.quantity || 0;
              const revInPeriod =
                waterCategory?.products.find(p => p.productId === prod.id)?.revenue || 0;
              const isLow = stock?.isLowStock;

              return (
                <div
                  key={prod.id}
                  className={`p-3.5 rounded-2xl bg-zinc-950/90 border transition-all ${
                    isLow
                      ? 'border-red-900/80 bg-red-950/20 shadow-sm'
                      : 'border-zinc-800/80 hover:border-sky-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-sky-950 text-sky-400 border border-sky-900/60 flex items-center justify-center shrink-0">
                        <Droplets className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-white truncate" title={prod.name}>
                        {prod.name}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-zinc-300 shrink-0">
                      {formatAZN(prod.salePrice)}
                    </span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-zinc-800/60 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-zinc-500 block text-[10px] uppercase">Dövrdə Satılan</span>
                      <span className="font-mono font-bold text-sky-400">
                        {soldInPeriod} ədəd{' '}
                        <span className="text-zinc-400 font-normal">({formatAZN(revInPeriod)})</span>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-zinc-500 block text-[10px] uppercase">Depo Qalığı</span>
                      <span
                        className={`font-mono font-bold inline-block px-1.5 py-0.5 rounded ${
                          isLow
                            ? 'bg-red-950 text-red-400 border border-red-800'
                            : 'bg-zinc-800 text-emerald-400'
                        }`}
                      >
                        {stock?.activeStock ?? 0} ədəd
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
          BÖLMƏ 3: ÖDƏNİŞ NÖVLƏRİ ÜZRƏ BÖLGÜ (MİNİMAL KARTLAR & PROGRESS)
         ────────────────────────────────────────────────────────── */}
      <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-500" />
              <span>2. Ödəniş Növləri Üzrə Bölgü ({periodLabel})</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Nağd, Bank Kartı, POS Terminal və Müştəri Balansı vasitəsilə daxilolmalar
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-zinc-200">
            Cəm: {formatAZN(totalPaid)}
          </span>
        </div>

        {/* 4 Minimal Payment Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Cash */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-emerald-950/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5" /> Nağd
              </span>
              <span className="font-bold">{cashPct}%</span>
            </div>
            <div className="text-lg font-black font-mono text-white">
              {formatAZN(paymentBreakdown.cash)}
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${cashPct}%` }} />
            </div>
          </div>

          {/* Card */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-blue-950/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-blue-400 font-medium">
              <span className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" /> Bank Kartı
              </span>
              <span className="font-bold">{cardPct}%</span>
            </div>
            <div className="text-lg font-black font-mono text-white">
              {formatAZN(paymentBreakdown.card)}
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1">
              <div className="bg-blue-500 h-full rounded-full" style={{ width: `${cardPct}%` }} />
            </div>
          </div>

          {/* POS Terminal */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-red-950/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-red-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" /> POS Terminal
              </span>
              <span className="font-bold">{posPct}%</span>
            </div>
            <div className="text-lg font-black font-mono text-white">
              {formatAZN(paymentBreakdown.pos)}
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1">
              <div className="bg-red-600 h-full rounded-full" style={{ width: `${posPct}%` }} />
            </div>
          </div>

          {/* Customer Balance */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-purple-950/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-purple-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" /> Balansdan
              </span>
              <span className="font-bold">{balancePct}%</span>
            </div>
            <div className="text-lg font-black font-mono text-white">
              {formatAZN(paymentBreakdown.balance)}
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1">
              <div className="bg-purple-500 h-full rounded-full" style={{ width: `${balancePct}%` }} />
            </div>
          </div>
        </div>

        {/* Visual Progress Bar Strip */}
        {totalPaid > 0 && (
          <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden flex shadow-inner">
            <div className="bg-emerald-500 h-full" style={{ width: `${cashPct}%` }} title={`Nağd: ${cashPct}%`} />
            <div className="bg-blue-500 h-full" style={{ width: `${cardPct}%` }} title={`Kart: ${cardPct}%`} />
            <div className="bg-red-600 h-full" style={{ width: `${posPct}%` }} title={`POS: ${posPct}%`} />
            <div className="bg-purple-500 h-full" style={{ width: `${balancePct}%` }} title={`Balans: ${balancePct}%`} />
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────
          BÖLMƏ 4: KATEQORİYALAR VƏ MƏHSULLAR ÜZRƏ DETALLI BÖLGÜ
         ────────────────────────────────────────────────────────── */}
      <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                3. Bütün Kateqoriyalar və Məhsul Satışları
              </h3>
              <p className="text-xs text-zinc-400">
                Seçilmiş dövrdə hər kateqoriyanın və hər məhsulun satışı
              </p>
            </div>
          </div>

          <div className="text-xs text-zinc-400 font-mono">
            Toplam: <strong className="text-white">{formatAZN(categoryBreakdown.totalRevenue)}</strong> ({categoryBreakdown.totalQuantity} ədəd)
          </div>
        </div>

        {categoryBreakdown.categories.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">
            Seçilmiş dövr üçün ({periodLabel}) hələ heç bir satış qeydə alınmayıb.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {categoryBreakdown.categories.map((cat, idx) => {
              const colors = [
                { border: 'border-sky-900/60', badge: 'bg-sky-950 text-sky-400 border-sky-800', bar: 'bg-sky-500', icon: Droplets },
                { border: 'border-red-900/60', badge: 'bg-red-950 text-red-400 border-red-800', bar: 'bg-red-600', icon: TrendingUp },
                { border: 'border-amber-900/60', badge: 'bg-amber-950 text-amber-400 border-amber-800', bar: 'bg-amber-500', icon: Sparkles },
                { border: 'border-purple-900/60', badge: 'bg-purple-950 text-purple-400 border-purple-800', bar: 'bg-purple-500', icon: Layers },
              ];
              const theme = colors[idx % colors.length];
              const IconComp = theme.icon;
              const isExpanded = expandedCategories[cat.categoryName] ?? true;

              return (
                <div
                  key={cat.categoryName}
                  className={`rounded-2xl bg-zinc-950/80 border ${theme.border} overflow-hidden transition-all`}
                >
                  {/* Category Header Row */}
                  <div
                    onClick={() => toggleCategoryExpand(cat.categoryName)}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-zinc-800/40 select-none transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${theme.badge}`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">
                            {cat.categoryName}
                          </h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${theme.badge}`}>
                            {cat.percentageOfTotal}% Pay
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Toplam satılan: <strong className="text-zinc-200">{cat.totalQuantity} ədəd</strong> · {cat.products.length} çeşid
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-right">
                        <div className="text-base font-black font-mono text-white">
                          {formatAZN(cat.totalRevenue)}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {cat.percentageOfTotal}% dövr gəliri
                        </div>
                      </div>
                      <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Product Details Table */}
                  {isExpanded && (
                    <div className="border-t border-zinc-800/80 bg-zinc-900/40 px-3 py-3 sm:px-4 sm:py-3.5">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-[10px] uppercase font-bold text-zinc-500 border-b border-zinc-800/60">
                              <th className="pb-2">Məhsulun Adı</th>
                              <th className="pb-2 text-right">Tək Qiymət</th>
                              <th className="pb-2 text-center">Satılan Say</th>
                              <th className="pb-2 text-right">Toplam Satış</th>
                              <th className="pb-2 text-right">Kateqoriyada Payı</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/50">
                            {cat.products.map(prod => (
                              <tr key={prod.productId} className="hover:bg-zinc-800/30 transition-colors">
                                <td className="py-2.5 font-medium text-zinc-200 pr-2">
                                  {prod.productName}
                                </td>
                                <td className="py-2.5 text-right font-mono text-zinc-400 whitespace-nowrap">
                                  {formatAZN(prod.unitPrice)}
                                </td>
                                <td className="py-2.5 text-center font-mono font-bold text-white whitespace-nowrap">
                                  <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-200">
                                    {prod.quantity} ədəd
                                  </span>
                                </td>
                                <td className="py-2.5 text-right font-mono font-bold text-red-400 whitespace-nowrap">
                                  {formatAZN(prod.revenue)}
                                </td>
                                <td className="py-2.5 text-right whitespace-nowrap pl-3">
                                  <div className="flex items-center justify-end gap-2">
                                    <span className="text-[11px] font-mono font-semibold text-zinc-300">
                                      {prod.percentageOfCategory}%
                                    </span>
                                    <div className="w-12 bg-zinc-800 h-1.5 rounded-full overflow-hidden hidden sm:block">
                                      <div
                                        className={`${theme.bar} h-full rounded-full`}
                                        style={{ width: `${prod.percentageOfCategory}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────
          BÖLMƏ 5: DİNAMİKA VƏ ƏN ÇOX SATILAN MƏHSULLAR (TOP 5)
         ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Bar Chart */}
        <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">
              Satış Dinamikası (Trend)
            </h3>
            <p className="text-xs text-zinc-400">
              {period === 'daily' ? 'Son 7 günlük satış dinamikası (AZN)' : 'Seçilmiş dövr üzrə günlərin dövriyyəsi (AZN)'}
            </p>
          </div>

          <div className="h-44 flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-zinc-800">
            {trendData.map(d => {
              const heightPercent = d.amount > 0 ? Math.max(12, Math.round((d.amount / maxDayAmount) * 100)) : 6;
              const isToday = d.dateStr === todayISO;
              return (
                <div key={d.dateStr} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="text-[10px] font-mono text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {d.amount.toFixed(1)} ₼
                  </div>
                  <div
                    className={`w-full max-w-[36px] rounded-t-lg transition-all duration-300 ${
                      isToday
                        ? 'bg-red-600 hover:bg-red-500 shadow-md shadow-red-600/30'
                        : 'bg-zinc-800 hover:bg-zinc-700'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                    title={`${d.label}: ${d.amount.toFixed(2)} AZN`}
                  />
                  <span className={`text-[11px] font-mono ${isToday ? 'font-bold text-red-400' : 'text-zinc-500'}`}>
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 Products Sold */}
        <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">
              Dövrün Ən Çox Satılan Məhsulları (TOP)
            </h3>
            <p className="text-xs text-zinc-400">
              {periodLabel} üzrə ən çox sayda satılan məhsullar
            </p>
          </div>

          {topProducts.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">
              Seçilmiş dövrdə hələ satış qeydə alınmayıb.
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {topProducts.slice(0, 5).map((item, idx) => {
                const maxQuantity = topProducts[0]?.quantity || 1;
                const widthPercent = Math.min(100, Math.round((item.quantity / maxQuantity) * 100));
                return (
                  <div key={item.productId} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-zinc-200 truncate max-w-[200px] flex items-center gap-1.5">
                        <span className="w-4 text-[10px] font-bold text-zinc-500">#{idx + 1}</span>
                        <span>{item.productName}</span>
                      </span>
                      <span className="text-zinc-400 font-mono">
                        <strong className="text-red-400">{item.quantity} ədəd</strong> ({formatAZN(item.revenue)})
                      </span>
                    </div>
                    <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-red-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
          BÖLMƏ 6: DÖVRÜN ƏN SON SATIŞLARI (MİNİMAL CƏDVƏL)
         ────────────────────────────────────────────────────────── */}
      <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">
              Dövrün Satış Əməliyyatları
            </h3>
            <p className="text-xs text-zinc-400">
              {periodLabel} üzrə təsdiqlənmiş əməliyyatlar (Son {Math.min(10, periodSales.length)} satış)
            </p>
          </div>
          <button
            onClick={() => onNavigate('pos')}
            className="text-xs font-semibold text-red-400 hover:underline flex items-center gap-1"
          >
            <span>Kassa ekranına keç</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {periodSales.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">
            Bu dövr üçün heç bir satış tapılmadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Tarix & Saat</th>
                  <th className="py-2.5 px-3">Məhsullar</th>
                  <th className="py-2.5 px-3">Ödəniş</th>
                  <th className="py-2.5 px-3 text-right">Məbləğ</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {periodSales.slice(0, 10).map(s => (
                  <tr key={s.id} className="hover:bg-zinc-800/40">
                    <td className="py-2.5 px-3 font-mono text-zinc-400 whitespace-nowrap">
                      {formatDateAZ(s.date)} {s.time}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-zinc-200 max-w-xs truncate">
                      {s.items.map(i => `${i.productName} (${i.quantity} əd.)`).join(', ')}
                    </td>
                    <td className="py-2.5 px-3 uppercase text-[10px] font-bold">
                      <span
                        className={`px-2 py-0.5 rounded-full ${
                          s.paymentType === 'naqd'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-900'
                            : s.paymentType === 'kart'
                            ? 'bg-blue-950 text-blue-300 border border-blue-900'
                            : s.paymentType === 'pos'
                            ? 'bg-red-950 text-red-300 border border-red-900'
                            : s.paymentType === 'balans'
                            ? 'bg-purple-950 text-purple-300 border border-purple-900'
                            : 'bg-amber-950 text-amber-300 border border-amber-900 font-bold'
                        }`}
                      >
                        {s.paymentType === 'borc'
                          ? `Borc (${s.debtorName || 'Adsız'})`
                          : s.paymentType === 'balans'
                          ? `Balans (${s.debtorName || 'Müştəri'})`
                          : s.paymentType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-white whitespace-nowrap">
                      {formatAZN(s.totalAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300">
                        Təsdiqlənib
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
