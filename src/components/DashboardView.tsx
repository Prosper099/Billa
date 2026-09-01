import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  Send,
  Plus,
  ArrowRight,
  DollarSign,
  Zap,
  RefreshCw,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getDaysDifference } from '../utils/formatters';
import { MonthlyIncomeGraph } from './MonthlyIncomeGraph';
import { BillaAIIcon } from './BrandLogo';
import { Invoice } from '../types';

export const DashboardView: React.FC = () => {
  const {
    businessProfile,
    currentAccount,
    accounts,
    setIsAuthModalOpen,
    logout,
    metrics,
    invoices,
    trendData,
    activeCurrency,
    setCurrentView,
    setSelectedInvoice,
    setReminderModalInvoice,
    markInvoiceAsPaid,
    setIsQuickPromptOpen,
  } = useApp();

  const [aiSummary, setAiSummary] = useState<{
    greeting: string;
    insight: string;
    storyPoints: string[];
    isLoading: boolean;
  }>({
    greeting: `You're in good shape this week. ${formatCurrency(metrics.collected, activeCurrency)} has been collected and ${formatCurrency(metrics.outstanding, activeCurrency)} is currently awaiting payment.`,
    insight: `You have ${formatCurrency(metrics.outstanding, activeCurrency)} in active invoices. Keep close track of settlement due dates.`,
    storyPoints: [
      `Earned & Billed: ${formatCurrency(metrics.totalInvoiced, activeCurrency)}`,
      `Collected in Bank: ${formatCurrency(metrics.collected, activeCurrency)} (${metrics.collectionRate}% recovery)`,
      `Awaiting Settlement: ${formatCurrency(metrics.outstanding, activeCurrency)}`,
      `💡 Billa Tip: Send a quick WhatsApp nudge 48 hours before due date to boost fast settlement.`,
    ],
    isLoading: false,
  });

  // Time-based greeting calculation
  const getGreetingTime = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const overdueInvoices = invoices.filter(
    (inv) => inv.status === 'overdue' || (inv.status === 'pending' && getDaysDifference(inv.dueDate) < 0)
  );

  // Fetch / Refresh AI financial narrative
  const refreshAiNarrative = async () => {
    setAiSummary((prev) => ({ ...prev, isLoading: true }));
    try {
      const res = await fetch('/api/ai/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: businessProfile.name,
          metrics,
          overdueInvoices: overdueInvoices.map((i) => ({
            customerName: i.customerName,
            amount: i.total,
            dueDate: i.dueDate,
          })),
          currencySymbol: activeCurrency === 'USD' ? '$' : '₦',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiSummary({
          greeting: data.greeting || `You're in good shape this week. ${formatCurrency(metrics.collected, activeCurrency)} has been collected.`,
          insight: data.insight || `You have ${formatCurrency(metrics.outstanding, activeCurrency)} outstanding.`,
          storyPoints: data.storyPoints || [],
          isLoading: false,
        });
      } else {
        setAiSummary((prev) => ({ ...prev, isLoading: false }));
      }
    } catch {
      setAiSummary((prev) => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    refreshAiNarrative();
  }, [metrics.totalInvoiced, metrics.collected, activeCurrency]);

  return (
    <div className="px-3.5 py-4 sm:px-6 sm:py-6 lg:px-8 max-w-7xl mx-auto space-y-5 sm:space-y-7 animate-fadeIn">
      {/* 1. Clean, Streamlined Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {getGreetingTime()},{' '}
              <span className="text-indigo-600">
                {businessProfile.name || 'Apex Studios'}
              </span>
            </h1>
            {currentAccount.isDemo ? (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                Demo
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Live
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            {aiSummary.greeting}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            id="btn-refresh-ai-summary"
            onClick={refreshAiNarrative}
            disabled={aiSummary.isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
            title="Refresh AI financial insight"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${aiSummary.isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">Refresh Insight</span>
          </button>
        </div>
      </div>

      {/* 2. ✨ Clean AI Financial Insight Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-50/80 via-white to-indigo-50/40 border border-indigo-100 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-start gap-3">
            <BillaAIIcon size="sm" />
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                  Billa AI Financial Copilot
                </span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-700 leading-relaxed">
                {aiSummary.insight}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0 pt-1 sm:pt-0">
            {overdueInvoices.length > 0 && (
              <button
                id="btn-quick-remind-oldest"
                onClick={() => {
                  const oldest = overdueInvoices[0];
                  setReminderModalInvoice(oldest);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Nudge {overdueInvoices[0]?.customerName?.split(' ')[0]}</span>
              </button>
            )}
            <button
              id="btn-view-ai-advisor"
              onClick={() => setCurrentView('ai-advisor')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            >
              <span>Ask Advisor</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. The 4 Key Financial Metrics Cards (Single column on mobile, 2 on tablet, 4 on desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4.5">
        {/* Total Invoiced */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold tracking-wide uppercase">Total Invoiced</span>
            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#1A1C1E] tracking-tight">
            {formatCurrency(metrics.totalInvoiced, activeCurrency)}
          </div>
          <div className="text-xs text-slate-500">
            <span>{invoices.length} active billing record(s)</span>
          </div>
        </div>

        {/* Collected */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-emerald-200 shadow-xs relative overflow-hidden space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold tracking-wide uppercase text-emerald-700">
              Collected Cash
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-emerald-600 tracking-tight">
            {formatCurrency(metrics.collected, activeCurrency)}
          </div>
          <div className="text-xs text-emerald-700 font-medium">
            <span>{metrics.collectionRate}% cash recovery rate</span>
          </div>
        </div>

        {/* Outstanding */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-amber-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold tracking-wide uppercase text-amber-700">
              Pending Receivables
            </span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-amber-600 tracking-tight">
            {formatCurrency(metrics.outstanding, activeCurrency)}
          </div>
          <div className="text-xs text-slate-500">
            <span>{metrics.activeInvoicesCount} invoice(s) pending payment</span>
          </div>
        </div>

        {/* Overdue */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-rose-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold tracking-wide uppercase text-rose-700">
              Overdue Attention
            </span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-rose-600 tracking-tight">
            {formatCurrency(metrics.overdue, activeCurrency)}
          </div>
          <div className="text-xs text-rose-700 font-medium">
            <span>{metrics.overdueInvoicesCount} overdue follow-up notice(s)</span>
          </div>
        </div>
      </div>

      {/* 4. Dedicated Interactive Graph for Month's Income & Receivables */}
      <MonthlyIncomeGraph />

      {/* 5. Executive Storytelling & Next Action Step */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-4 sm:p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            <span>Cash Flow Trajectory & Strategic Steps</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">Current Cycle</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {aiSummary.storyPoints.map((point, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-2 hover:border-indigo-200 hover:bg-indigo-50/20 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Focus 0{idx + 1}
                </span>
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <p className="text-xs font-semibold text-slate-700 leading-relaxed">{point}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Active Invoices / Needs Attention Section */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-4 sm:p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[#1A1C1E]">Active Invoices & Client Follow-Ups</h3>
          </div>
          <button
            onClick={() => setCurrentView('invoices')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            <span>View All Invoices</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-3">
          {invoices.length === 0 ? (
            <div className="p-6 sm:p-8 rounded-xl bg-slate-50 text-center space-y-3 border border-dashed border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
                <Plus className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">No active invoices in this workspace</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Your workspace is clean. Create your first invoice or add a new customer to start tracking payments.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setCurrentView('customers')}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
                >
                  Add Customer
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('invoice-create')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-colors cursor-pointer"
                >
                  Create Invoice
                </button>
              </div>
            </div>
          ) : (
            invoices.map((inv) => {
              const isOverdue = inv.status === 'overdue' || (inv.status === 'pending' && getDaysDifference(inv.dueDate) < 0);
              return (
                <div
                  key={inv.id}
                  className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{inv.customerName}</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        inv.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : isOverdue
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span className="font-mono">{inv.invoiceNumber}</span>
                      <span>•</span>
                      <span>Due {formatDate(inv.dueDate)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                    <div className="text-left sm:text-right">
                      <div className="text-base font-extrabold text-slate-900">
                        {formatCurrency(inv.total, activeCurrency)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {inv.status !== 'paid' && (
                        <button
                          onClick={() => setReminderModalInvoice(inv)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Remind</span>
                        </button>
                      )}
                      {inv.status !== 'paid' && (
                        <button
                          onClick={() => markInvoiceAsPaid(inv.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                        >
                          Mark Paid
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setCurrentView('invoice-view');
                        }}
                        className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 transition-colors cursor-pointer"
                        title="View Invoice"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

