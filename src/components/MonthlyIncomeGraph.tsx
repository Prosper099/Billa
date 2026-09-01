import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Plus,
  Info,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatters';

interface MonthlyIncomeGraphProps {
  compact?: boolean;
}

export const MonthlyIncomeGraph: React.FC<MonthlyIncomeGraphProps> = ({ compact = false }) => {
  const { invoices, metrics, activeCurrency, setCurrentView } = useApp();
  const [timeRange, setTimeRange] = useState<'current_month' | 'last_30_days' | 'quarter'>('current_month');
  const [activeHoverBar, setActiveHoverBar] = useState<number | null>(null);

  // Month stats calculation (safe for 0 / null / empty states)
  const totalBilled = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalPaid = invoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalPending = Math.max(0, totalBilled - totalPaid);

  // Dynamic bar data based on invoices or clean time buckets
  const barData = useMemo(() => {
    if (timeRange === 'current_month') {
      // 4 Weekly intervals for August 2026
      const weeks = [
        { label: 'Week 1 (Aug 1 - 7)', shortLabel: 'Week 1', date: 'Aug 1 - 7', invoiced: 0, collected: 0 },
        { label: 'Week 2 (Aug 8 - 14)', shortLabel: 'Week 2', date: 'Aug 8 - 14', invoiced: 0, collected: 0 },
        { label: 'Week 3 (Aug 15 - 21)', shortLabel: 'Week 3', date: 'Aug 15 - 21', invoiced: 0, collected: 0 },
        { label: 'Week 4 (Aug 22 - 31)', shortLabel: 'Week 4', date: 'Aug 22 - 31', invoiced: 0, collected: 0 },
      ];

      invoices.forEach((inv) => {
        if (inv.status === 'cancelled') return;
        const invDate = new Date(inv.issueDate || inv.createdAt);
        const day = isNaN(invDate.getDate()) ? 15 : invDate.getDate();

        let weekIndex = 0;
        if (day <= 7) weekIndex = 0;
        else if (day <= 14) weekIndex = 1;
        else if (day <= 21) weekIndex = 2;
        else weekIndex = 3;

        weeks[weekIndex].invoiced += inv.total || 0;
        if (inv.status === 'paid') {
          weeks[weekIndex].collected += inv.total || 0;
        }
      });

      return weeks;
    } else if (timeRange === 'last_30_days') {
      // 5 intervals of 6 days
      const intervals = [
        { label: 'Days 1 - 6', shortLabel: 'D 1-6', date: 'Aug 1 - 6', invoiced: 0, collected: 0 },
        { label: 'Days 7 - 12', shortLabel: 'D 7-12', date: 'Aug 7 - 12', invoiced: 0, collected: 0 },
        { label: 'Days 13 - 18', shortLabel: 'D 13-18', date: 'Aug 13 - 18', invoiced: 0, collected: 0 },
        { label: 'Days 19 - 24', shortLabel: 'D 19-24', date: 'Aug 19 - 24', invoiced: 0, collected: 0 },
        { label: 'Days 25 - 31', shortLabel: 'D 25-31', date: 'Aug 25 - 31', invoiced: 0, collected: 0 },
      ];

      invoices.forEach((inv) => {
        if (inv.status === 'cancelled') return;
        const invDate = new Date(inv.issueDate || inv.createdAt);
        const day = isNaN(invDate.getDate()) ? 15 : invDate.getDate();
        const idx = Math.min(4, Math.floor((day - 1) / 6));
        intervals[idx].invoiced += inv.total || 0;
        if (inv.status === 'paid') {
          intervals[idx].collected += inv.total || 0;
        }
      });

      return intervals;
    } else {
      // Quarter months (Jun, Jul, Aug, Sep)
      const months = [
        { label: 'June 2026', shortLabel: 'Jun', date: 'Jun 1 - 30', invoiced: 0, collected: 0 },
        { label: 'July 2026', shortLabel: 'Jul', date: 'Jul 1 - 31', invoiced: 0, collected: 0 },
        { label: 'August 2026', shortLabel: 'Aug', date: 'Aug 1 - 31', invoiced: 0, collected: 0 },
        { label: 'September 2026', shortLabel: 'Sep', date: 'Sep 1 - 30', invoiced: 0, collected: 0 },
      ];

      invoices.forEach((inv) => {
        if (inv.status === 'cancelled') return;
        const invDate = new Date(inv.issueDate || inv.createdAt);
        const m = isNaN(invDate.getMonth()) ? 7 : invDate.getMonth(); // 0-indexed (Aug = 7)
        let idx = 2; // default Aug
        if (m === 5) idx = 0; // Jun
        else if (m === 6) idx = 1; // Jul
        else if (m === 7) idx = 2; // Aug
        else if (m === 8) idx = 3; // Sep

        months[idx].invoiced += inv.total || 0;
        if (inv.status === 'paid') {
          months[idx].collected += inv.total || 0;
        }
      });

      return months;
    }
  }, [invoices, timeRange]);

  const isEmpty = totalBilled === 0;

  // Maximum value for scaling bars (safe fallback when values are 0 or null)
  const maxBarValue = useMemo(() => {
    const highestData = Math.max(...barData.map((d) => Math.max(d.invoiced, d.collected)), 0);
    return Math.max(highestData, 10000);
  }, [barData]);

  // SVG Chart Geometry
  const chartHeight = compact ? 140 : 180;
  const chartWidth = 600;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 35;
  const usableWidth = chartWidth - paddingLeft - paddingRight;
  const usableHeight = chartHeight - paddingTop - paddingBottom;

  const groupWidth = usableWidth / barData.length;
  const barWidth = Math.min(22, groupWidth * 0.3);
  const barGap = 4;

  return (
    <div className="rounded-2xl bg-white border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-5">
      {/* Header with Title & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Monthly Income & Billing Velocity
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Weekly invoiced billing vs. collected cashflow comparisons
          </p>
        </div>

        {/* Range Selector Buttons */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-50 p-1 rounded-xl border border-slate-200/80 text-xs">
          <button
            type="button"
            onClick={() => setTimeRange('current_month')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              timeRange === 'current_month'
                ? 'bg-white text-indigo-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            This Month
          </button>
          <button
            type="button"
            onClick={() => setTimeRange('last_30_days')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              timeRange === 'last_30_days'
                ? 'bg-white text-indigo-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            30 Days
          </button>
          <button
            type="button"
            onClick={() => setTimeRange('quarter')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              timeRange === 'quarter'
                ? 'bg-white text-indigo-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Quarter
          </button>
        </div>
      </div>

      {/* 3 Metric Summary Cards for the Period */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span>Period Invoiced</span>
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
          </div>
          <div className="text-lg font-extrabold text-slate-900">
            {formatCurrency(totalBilled, activeCurrency)}
          </div>
          <div className="text-[10px] text-slate-400">
            {invoices.length > 0 ? `${invoices.length} billing records` : 'No invoices yet'}
          </div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-1">
          <div className="flex items-center justify-between text-emerald-700 text-[11px] font-semibold">
            <span>Received & Settled</span>
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          </div>
          <div className="text-lg font-extrabold text-emerald-950">
            {formatCurrency(totalPaid, activeCurrency)}
          </div>
          <div className="text-[10px] text-emerald-700/80">
            {totalPaid > 0 ? 'Settled in bank account' : 'Awaiting client transfers'}
          </div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl bg-amber-50/60 border border-amber-100 space-y-1">
          <div className="flex items-center justify-between text-amber-700 text-[11px] font-semibold">
            <span>Pending Receivables</span>
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
          </div>
          <div className="text-lg font-extrabold text-amber-950">
            {formatCurrency(totalPending, activeCurrency)}
          </div>
          <div className="text-[10px] text-amber-700/80">
            {totalPending > 0 ? `${invoices.filter((i) => i.status !== 'paid').length} pending payment` : 'All cleared'}
          </div>
        </div>
      </div>

      {/* SVG Bar Chart Graphic */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
              <span className="w-3 h-3 rounded-xs bg-indigo-600 inline-block" />
              Invoiced Amount
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
              <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" />
              Collected Cash
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Peak: {formatCurrency(maxBarValue, activeCurrency)}
          </span>
        </div>

        <div className="relative w-full overflow-hidden bg-slate-50/80 rounded-xl border border-slate-200/80 p-2 sm:p-4">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-auto overflow-visible select-none"
          >
            <defs>
              <linearGradient id="invoicedBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4F46E5" />
                <stop offset="100%" stopColor="#6366F1" />
              </linearGradient>
              <linearGradient id="collectedBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#059669" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines & Y-Axis values */}
            {[0, 0.33, 0.66, 1].map((factor, i) => {
              const y = paddingTop + usableHeight * (1 - factor);
              const val = Math.round(maxBarValue * factor);
              return (
                <g key={i}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={chartWidth - paddingRight}
                    y2={y}
                    stroke="#E2E8F0"
                    strokeDasharray={factor === 0 ? 'none' : '4 4'}
                    strokeWidth={factor === 0 ? '1.5' : '1'}
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 3}
                    textAnchor="end"
                    fontSize="9"
                    fontWeight="500"
                    fill="#94A3B8"
                    className="font-mono"
                  >
                    {val >= 1000 ? `${Math.round(val / 1000)}k` : val}
                  </text>
                </g>
              );
            })}

            {/* Bar Groups for each interval */}
            {barData.map((item, index) => {
              const groupCenterX = paddingLeft + index * groupWidth + groupWidth / 2;
              const invoicedX = groupCenterX - barWidth - barGap / 2;
              const collectedX = groupCenterX + barGap / 2;

              const invoicedHeight =
                item.invoiced > 0
                  ? Math.max(4, (item.invoiced / maxBarValue) * usableHeight)
                  : 2; // subtle 2px baseline for 0/null
              const collectedHeight =
                item.collected > 0
                  ? Math.max(4, (item.collected / maxBarValue) * usableHeight)
                  : 2;

              const invoicedY = paddingTop + usableHeight - invoicedHeight;
              const collectedY = paddingTop + usableHeight - collectedHeight;

              const isHovered = activeHoverBar === index;

              return (
                <g
                  key={index}
                  className="cursor-pointer group"
                  onMouseEnter={() => setActiveHoverBar(index)}
                  onMouseLeave={() => setActiveHoverBar(null)}
                  onClick={() => setActiveHoverBar(index)}
                >
                  {/* Hover background column highlight */}
                  {isHovered && (
                    <rect
                      x={paddingLeft + index * groupWidth + 4}
                      y={paddingTop}
                      width={groupWidth - 8}
                      height={usableHeight}
                      fill="#EEF2FF"
                      opacity="0.6"
                      rx="8"
                    />
                  )}

                  {/* Invoiced Bar */}
                  <rect
                    x={invoicedX}
                    y={invoicedY}
                    width={barWidth}
                    height={invoicedHeight}
                    fill={item.invoiced > 0 ? 'url(#invoicedBarGrad)' : '#CBD5E1'}
                    opacity={item.invoiced > 0 ? 1 : 0.4}
                    rx={item.invoiced > 0 ? 4 : 1}
                    className="transition-all duration-200"
                  />

                  {/* Collected Bar */}
                  <rect
                    x={collectedX}
                    y={collectedY}
                    width={barWidth}
                    height={collectedHeight}
                    fill={item.collected > 0 ? 'url(#collectedBarGrad)' : '#CBD5E1'}
                    opacity={item.collected > 0 ? 1 : 0.4}
                    rx={item.collected > 0 ? 4 : 1}
                    className="transition-all duration-200"
                  />

                  {/* X Axis Label */}
                  <text
                    x={groupCenterX}
                    y={chartHeight - 12}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight={isHovered ? '700' : '600'}
                    fill={isHovered ? '#4F46E5' : '#64748B'}
                    className="transition-colors"
                  >
                    {item.shortLabel}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Dynamic Hover Tooltip Card */}
          {activeHoverBar !== null && (
            <div className="absolute top-3 right-3 bg-slate-900/95 text-white backdrop-blur-md px-3.5 py-2.5 rounded-xl text-xs space-y-1 shadow-xl pointer-events-none animate-fadeIn border border-slate-700">
              <div className="font-bold text-slate-100 border-b border-slate-700/80 pb-1">
                {barData[activeHoverBar].label}
              </div>
              <div className="flex items-center justify-between gap-4 text-[11px] text-indigo-300">
                <span>Invoiced:</span>
                <span className="font-mono font-bold">
                  {formatCurrency(barData[activeHoverBar].invoiced, activeCurrency)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 text-[11px] text-emerald-300">
                <span>Collected:</span>
                <span className="font-mono font-bold">
                  {formatCurrency(barData[activeHoverBar].collected, activeCurrency)}
                </span>
              </div>
              {barData[activeHoverBar].invoiced > 0 && (
                <div className="text-[10px] text-slate-400 pt-0.5">
                  Recovery:{' '}
                  {Math.round(
                    (barData[activeHoverBar].collected / barData[activeHoverBar].invoiced) * 100
                  )}
                  %
                </div>
              )}
            </div>
          )}

          {/* Empty / Zero-State Inline Banner if no invoices */}
          {isEmpty && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/75 backdrop-blur-[1px] rounded-xl p-4 text-center space-y-2">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-2xs">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">No Billing Activity Recorded Yet</p>
                <p className="text-[11px] text-slate-500 max-w-xs mt-0.5">
                  Create your first invoice or add a customer to see your weekly bar velocity chart populate automatically!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentView('invoice-create')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Invoice</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Proactive Monthly Tip Footer */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="text-slate-700">
            <strong className="text-indigo-950 font-semibold">Billa Tip:</strong>{' '}
            {totalPending > 0
              ? `You have ${formatCurrency(totalPending, activeCurrency)} awaiting payment. Send a 1-click WhatsApp nudge for fast turnaround.`
              : `All current billing is settled! Keep up the great velocity.`}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setCurrentView('ai-advisor')}
          className="shrink-0 ml-2 font-bold text-indigo-600 hover:text-indigo-800 text-xs flex items-center gap-1 cursor-pointer"
        >
          <span>Open Advisor</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
