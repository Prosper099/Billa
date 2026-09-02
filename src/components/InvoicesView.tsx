import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  ExternalLink,
  MessageCircle,
  CheckCircle2,
  Trash2,
  Copy,
  Download,
  AlertCircle,
  Clock,
  Sparkles,
  Camera,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getDaysDifference } from '../utils/formatters';
import { Invoice, InvoiceStatus } from '../types';

export const InvoicesView: React.FC = () => {
  const {
    invoices,
    activeCurrency,
    setCurrentView,
    setSelectedInvoice,
    setReminderModalInvoice,
    markInvoiceAsPaid,
    deleteInvoice,
    requestConfirmation,
    setIsReceiptScannerOpen,
    showToast,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'customer'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((inv) => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'overdue') {
          return inv.status === 'overdue' || (inv.status === 'pending' && getDaysDifference(inv.dueDate) < 0);
        }
        return inv.status === statusFilter;
      })
      .filter((inv) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          inv.customerName.toLowerCase().includes(q) ||
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.items.some((it) => it.description.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortBy === 'amount') {
          return sortOrder === 'desc' ? b.total - a.total : a.total - b.total;
        }
        if (sortBy === 'customer') {
          return sortOrder === 'desc'
            ? b.customerName.localeCompare(a.customerName)
            : a.customerName.localeCompare(b.customerName);
        }
        // default date
        return sortOrder === 'desc'
          ? new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
          : new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime();
      });
  }, [invoices, statusFilter, searchQuery, sortBy, sortOrder]);

  const counts = useMemo(() => {
    return {
      all: invoices.length,
      pending: invoices.filter((i) => i.status === 'pending').length,
      overdue: invoices.filter((i) => i.status === 'overdue' || (i.status === 'pending' && getDaysDifference(i.dueDate) < 0)).length,
      paid: invoices.filter((i) => i.status === 'paid').length,
    };
  }, [invoices]);

  const getStatusBadge = (invoice: Invoice) => {
    const isActuallyOverdue = invoice.status === 'overdue' || (invoice.status === 'pending' && getDaysDifference(invoice.dueDate) < 0);

    if (invoice.status === 'paid') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" />
          <span>Paid</span>
        </span>
      );
    }
    if (isActuallyOverdue) {
      const days = Math.abs(getDaysDifference(invoice.dueDate));
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertCircle className="w-3 h-3" />
          <span>{days}d Overdue</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-3 h-3" />
        <span>Pending</span>
      </span>
    );
  };

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5 sm:space-y-6 pb-24 lg:pb-8 animate-fadeIn">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A1C1E] tracking-tight">Invoices</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Manage, track, and generate AI follow-ups for all billing records</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {counts.overdue > 0 && (
            <button
              id="btn-invoices-open-reminders"
              onClick={() => setCurrentView('reminders-hub')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold text-xs shadow-2xs transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Reminders Hub ({counts.overdue})</span>
            </button>
          )}

          <button
            id="btn-invoices-scan-receipt"
            onClick={() => setIsReceiptScannerOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-indigo-400" />
            <span>Scan Receipt</span>
          </button>

          <button
            id="btn-invoices-create-new"
            onClick={() => setCurrentView('invoice-create')}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 md:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'All Invoices', count: counts.all },
            { id: 'overdue', label: 'Overdue', count: counts.overdue, alert: counts.overdue > 0 },
            { id: 'pending', label: 'Pending', count: counts.pending },
            { id: 'paid', label: 'Paid', count: counts.paid },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                id={`filter-tab-${tab.id}`}
                onClick={() => setStatusFilter(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-indigo-700 border border-slate-200 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    tab.alert
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="invoice-search-input"
            type="text"
            placeholder="Search client, invoice #, service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Invoice Content Card */}
      <div className="rounded-2xl bg-white border border-slate-200/90 overflow-hidden shadow-sm">
        {filteredInvoices.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center mx-auto text-indigo-600 shadow-xs">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {searchQuery || statusFilter !== 'all' ? 'No matching invoices' : 'No invoices yet'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search query or status filter.'
                  : 'Create your first invoice and let Billa handle the tracking and follow-ups.'}
              </p>
            </div>
            <button
              onClick={() => setCurrentView('invoice-create')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create First Invoice</span>
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Card Layout (sm:hidden) - Uncramped, spacious cards */}
            <div className="sm:hidden divide-y divide-slate-100">
              {filteredInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 space-y-3 hover:bg-slate-50/80 transition-colors"
                  onClick={() => {
                    setSelectedInvoice(inv);
                    setCurrentView('invoice-view');
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-indigo-600 text-xs">
                        {inv.invoiceNumber}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm mt-0.5">
                        {inv.customerName}
                      </h4>
                      {inv.items[0]?.description && (
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {inv.items[0].description}
                        </p>
                      )}
                    </div>
                    <div>{getStatusBadge(inv)}</div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>Due {formatDate(inv.dueDate)}</span>
                    <span className="text-base font-black font-mono text-slate-900">
                      {formatCurrency(inv.total, activeCurrency)}
                    </span>
                  </div>

                  {/* Mobile Action Buttons Bar */}
                  <div
                    className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {inv.status !== 'paid' && (
                      <button
                        onClick={() => setReminderModalInvoice(inv)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Remind</span>
                      </button>
                    )}

                    {inv.status !== 'paid' && (
                      <button
                        onClick={() => markInvoiceAsPaid(inv.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 font-bold text-xs border border-slate-200 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Paid</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSelectedInvoice(inv);
                        setCurrentView('invoice-view');
                      }}
                      className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 cursor-pointer"
                      title="View document"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        requestConfirmation({
                          title: 'Delete Invoice?',
                          message: `Are you sure you want to permanently delete invoice ${inv.invoiceNumber} for ${inv.customerName}?`,
                          confirmText: 'Delete Invoice',
                          confirmVariant: 'danger',
                          onConfirm: () => deleteInvoice(inv.id),
                        });
                      }}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Delete invoice"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table Layout (hidden sm:block) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 select-none">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Invoice #</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4 hidden md:table-cell">Issue Date</th>
                    <th className="py-3.5 px-4">Due Date</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((inv) => {
                    return (
                      <tr
                        key={inv.id}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setCurrentView('invoice-view');
                        }}
                      >
                        {/* Invoice Number */}
                        <td className="py-4 px-4 sm:px-6 font-mono font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {inv.invoiceNumber}
                        </td>

                        {/* Customer Name & Company */}
                        <td className="py-4 px-4">
                          <div className="font-semibold text-slate-900">{inv.customerName}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                            {inv.items[0]?.description}
                          </div>
                        </td>

                        {/* Issue Date */}
                        <td className="py-4 px-4 text-slate-500 hidden md:table-cell">
                          {formatDate(inv.issueDate)}
                        </td>

                        {/* Due Date */}
                        <td className="py-4 px-4 text-slate-700 font-medium">
                          {formatDate(inv.dueDate)}
                        </td>

                        {/* Total Amount */}
                        <td className="py-4 px-4 font-mono-num font-extrabold text-slate-900 text-sm">
                          {formatCurrency(inv.total, activeCurrency)}
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-4">
                          {getStatusBadge(inv)}
                        </td>

                        {/* Action buttons (click stopped propagation) */}
                        <td
                          className="py-4 px-4 sm:px-6 text-right space-x-1 whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {inv.status !== 'paid' && (
                            <button
                              onClick={() => setReminderModalInvoice(inv)}
                              className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
                              title="Generate AI Follow-up"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {inv.status !== 'paid' ? (
                            <button
                              onClick={() => markInvoiceAsPaid(inv.id)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                              title="Mark as paid"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="p-1.5 text-emerald-600 inline-block">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </span>
                          )}

                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setCurrentView('invoice-view');
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer"
                            title="View document"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              requestConfirmation({
                                title: 'Delete Invoice?',
                                message: `Are you sure you want to delete invoice ${inv.invoiceNumber} for ${inv.customerName}?`,
                                confirmText: 'Delete Invoice',
                                confirmVariant: 'danger',
                                onConfirm: () => deleteInvoice(inv.id),
                              });
                            }}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete invoice"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
