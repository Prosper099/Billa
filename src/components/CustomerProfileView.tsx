import React, { useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Tag,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Plus,
  FileText,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Send,
  Trash2,
  MessageCircle,
  ExternalLink,
  Edit3,
  TrendingUp,
  Receipt,
  FileCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Customer, CustomerNote } from '../types';

interface CustomerProfileViewProps {
  customer: Customer;
  onBack: () => void;
}

export const CustomerProfileView: React.FC<CustomerProfileViewProps> = ({ customer, onBack }) => {
  const {
    invoices,
    activeCurrency,
    setCurrentView,
    setSelectedInvoice,
    setReminderModalInvoice,
    markInvoiceAsPaid,
    deleteInvoice,
    deleteCustomer,
    requestConfirmation,
    addCustomerNote,
    deleteCustomerNote,
    analyzeCustomerRiskWithAI,
    isAnalyzingCustomerRisk,
    updateCustomer,
    sendEmailReminder,
    sendWhatsAppReminder,
    showToast,
  } = useApp();

  // Note form state
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState<CustomerNote['category']>('general');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Edit Customer Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(customer.name);
  const [editCompany, setEditCompany] = useState(customer.companyName || '');
  const [editEmail, setEditEmail] = useState(customer.email);
  const [editPhone, setEditPhone] = useState(customer.phone);
  const [editAddress, setEditAddress] = useState(customer.address || '');
  const [editTaxId, setEditTaxId] = useState(customer.taxId || '');
  const [editTagInput, setEditTagInput] = useState(customer.tags?.join(', ') || '');
  const [editPaymentTerms, setEditPaymentTerms] = useState(customer.preferredPaymentTermsDays || 14);

  // Filter invoices for this specific customer
  const customerInvoices = invoices.filter(
    (inv) => inv.customerId === customer.id || inv.customerName.toLowerCase() === customer.name.toLowerCase()
  );

  const totalBilled = customerInvoices.reduce((sum, i) => sum + (i.status !== 'cancelled' ? i.total : 0), 0);
  const paidInvoices = customerInvoices.filter((i) => i.status === 'paid');
  const totalPaid = paidInvoices.reduce((sum, i) => sum + i.total, 0);
  const outstandingInvoices = customerInvoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled');
  const outstandingTotal = outstandingInvoices.reduce((sum, i) => sum + i.total, 0);
  const overdueInvoices = customerInvoices.filter(
    (i) => i.status === 'overdue' || (i.status === 'pending' && new Date(i.dueDate) < new Date())
  );
  const overdueTotal = overdueInvoices.reduce((sum, i) => sum + i.total, 0);

  const assessment = customer.riskAssessment;

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    addCustomerNote(customer.id, noteContent.trim(), noteCategory);
    setNoteContent('');
    setIsAddingNote(false);
  };

  const handleEditCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tagsArray = editTagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    updateCustomer(customer.id, {
      name: editName.trim(),
      companyName: editCompany.trim() || undefined,
      email: editEmail.trim(),
      phone: editPhone.trim(),
      address: editAddress.trim() || undefined,
      taxId: editTaxId.trim() || undefined,
      tags: tagsArray,
      preferredPaymentTermsDays: Number(editPaymentTerms),
    });

    setIsEditModalOpen(false);
  };

  const getCategoryBadge = (category: CustomerNote['category']) => {
    switch (category) {
      case 'call_log':
        return { label: 'Call Log', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'payment_promise':
        return { label: 'Payment Promise', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'discount_agreement':
        return { label: 'Agreement', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'reminder':
        return { label: 'Reminder Sent', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      default:
        return { label: 'General Note', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const getRiskColor = (level?: 'low' | 'medium' | 'high') => {
    if (level === 'low') return { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', bar: 'bg-emerald-500' };
    if (level === 'medium') return { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', bar: 'bg-amber-500' };
    return { text: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', bar: 'bg-rose-500' };
  };

  const riskColors = getRiskColor(assessment?.riskLevel);

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5 sm:space-y-6 animate-fadeIn pb-24 lg:pb-8">
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <button
          id="btn-back-to-directory"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customer Directory</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-edit-customer-profile"
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs shadow-2xs transition-all cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>

          <button
            id="btn-run-ai-risk-audit"
            onClick={() => analyzeCustomerRiskWithAI(customer.id)}
            disabled={isAnalyzingCustomerRisk}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold text-xs shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 text-indigo-600 ${isAnalyzingCustomerRisk ? 'animate-spin' : ''}`} />
            <span>{isAnalyzingCustomerRisk ? 'Analyzing Ledger...' : 'Run AI Risk Audit'}</span>
          </button>

          <button
            id="btn-bill-this-customer"
            onClick={() => {
              setCurrentView('invoice-create');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Create Invoice</span>
          </button>

          <button
            id="btn-delete-customer-profile"
            onClick={() => {
              requestConfirmation({
                title: 'Delete Customer?',
                message: `Are you sure you want to permanently delete ${customer.name} and all interaction notes? Invoices will be unlinked but retained.`,
                confirmText: 'Delete Customer',
                confirmVariant: 'danger',
                onConfirm: () => {
                  deleteCustomer(customer.id);
                  onBack();
                },
              });
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-600 font-bold text-xs shadow-2xs transition-all cursor-pointer"
            title="Delete customer record"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Customer Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-extrabold text-xl flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
              {customer.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{customer.name}</h1>
                {assessment && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${riskColors.bg} ${riskColors.text} border ${riskColors.border}`}
                  >
                    {assessment.riskLevel === 'low' ? (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    ) : (
                      <ShieldAlert className="w-3.5 h-3.5" />
                    )}
                    <span>{assessment.reliabilityRating}</span>
                  </span>
                )}
              </div>

              {customer.companyName && (
                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>{customer.companyName}</span>
                </div>
              )}

              {/* Tags */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {(customer.tags || ['Active Client']).map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200"
                  >
                    <Tag className="w-2.5 h-2.5 text-slate-400" />
                    <span>{tag}</span>
                  </span>
                ))}
                {customer.taxId && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50/70 text-indigo-700 text-[11px] font-mono border border-indigo-100">
                    <span>TIN: {customer.taxId}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Contact & WhatsApp Pill */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2 text-xs text-slate-600 shrink-0 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-mono font-medium">{customer.phone}</span>
              <a
                href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100/70 hover:bg-emerald-200/80 text-emerald-800 text-[10px] font-bold transition-colors"
              >
                <MessageCircle className="w-3 h-3" />
                <span>WhatsApp</span>
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <a href={`mailto:${customer.email}`} className="text-indigo-600 hover:underline truncate">
                {customer.email}
              </a>
            </div>
            {customer.address && (
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-slate-500 truncate max-w-[240px]">{customer.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Financial Metrics Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-slate-100">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Billed</span>
            <div className="text-base sm:text-lg font-extrabold font-mono text-slate-900">
              {formatCurrency(totalBilled, activeCurrency)}
            </div>
            <span className="text-[10px] text-slate-500">{customerInvoices.length} total invoice(s)</span>
          </div>

          <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100 space-y-1">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Total Paid</span>
            <div className="text-base sm:text-lg font-extrabold font-mono text-emerald-700">
              {formatCurrency(totalPaid, activeCurrency)}
            </div>
            <span className="text-[10px] text-emerald-600">{paidInvoices.length} settled</span>
          </div>

          <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-100 space-y-1">
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Outstanding</span>
            <div className="text-base sm:text-lg font-extrabold font-mono text-amber-700">
              {formatCurrency(outstandingTotal, activeCurrency)}
            </div>
            <span className="text-[10px] text-amber-600">{outstandingInvoices.length} active</span>
          </div>

          <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-100 space-y-1">
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Overdue Balance</span>
            <div className="text-base sm:text-lg font-extrabold font-mono text-rose-700">
              {formatCurrency(overdueTotal, activeCurrency)}
            </div>
            <span className="text-[10px] text-rose-600">{overdueInvoices.length} overdue</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Content: AI Risk & Insights (Left/Top), Payment History Ledger & CRM Notes (Right/Bottom) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: AI Credit Insight & Risk Scorecard (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">AI Payment & Risk Insight</h2>
                  <p className="text-[11px] text-slate-500">Pattern analysis & reliability forecast</p>
                </div>
              </div>

              <button
                onClick={() => analyzeCustomerRiskWithAI(customer.id)}
                disabled={isAnalyzingCustomerRisk}
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-colors cursor-pointer"
                title="Refresh AI Audit"
              >
                <RefreshCw className={`w-4 h-4 ${isAnalyzingCustomerRisk ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Score & Gauge Section */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Reliability Score
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black font-mono text-slate-900">
                      {assessment?.riskScore ?? 85}
                    </span>
                    <span className="text-xs font-bold text-slate-400">/ 100</span>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${riskColors.bg} ${riskColors.text} border ${riskColors.border}`}
                  >
                    {assessment?.riskLevel?.toUpperCase()} RISK
                  </span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">
                    {assessment?.paymentConsistency || 'Consistent'} Flow
                  </span>
                </div>
              </div>

              {/* Progress meter bar */}
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full ${riskColors.bar} transition-all duration-500 rounded-full`}
                  style={{ width: `${assessment?.riskScore ?? 85}%` }}
                />
              </div>

              {/* Mini behavioral stats */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Avg Settlement Speed</span>
                  <span className="font-bold text-slate-800">
                    ~{assessment?.averageDaysToPay ?? 7} business days
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">On-Time Settlement Rate</span>
                  <span className="font-bold text-slate-800">
                    {assessment?.onTimePaymentPercentage ?? 90}%
                  </span>
                </div>
              </div>
            </div>

            {/* AI Executive Summary */}
            {assessment?.summary && (
              <div className="space-y-1.5 text-xs text-slate-700 bg-indigo-50/40 border border-indigo-100 p-3.5 rounded-xl leading-relaxed">
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                  AI Behavioral Assessment
                </span>
                <p>{assessment.summary}</p>
              </div>
            )}

            {/* Strengths & Risk Factors */}
            <div className="space-y-3 text-xs">
              {assessment?.keyStrengths && assessment.keyStrengths.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Key Strengths
                  </span>
                  <ul className="space-y-1 pl-1">
                    {assessment.keyStrengths.map((st, i) => (
                      <li key={i} className="text-slate-600 flex items-start gap-1.5">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>{st}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {assessment?.riskFactors && assessment.riskFactors.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Potential Risk Factors
                  </span>
                  <ul className="space-y-1 pl-1">
                    {assessment.riskFactors.map((rf, i) => (
                      <li key={i} className="text-slate-600 flex items-start gap-1.5">
                        <span className="text-rose-500 font-bold">•</span>
                        <span>{rf}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Strategic Recommendations */}
            <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-2 text-xs">
              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-400" /> Suggested Payment Terms
              </span>
              <div className="text-sm font-bold text-white">
                {assessment?.suggestedPaymentTerms || 'Net 14 Days'}
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {assessment?.strategicRecommendation || 'Maintain standard Net 14 billing cycle.'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Complete Payment History & CRM Notes Timeline (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Invoices & Payment History Ledger */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">Payment History & Invoices</h2>
                  <p className="text-[11px] text-slate-500">All transactions billed to {customer.name}</p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                {customerInvoices.length} records
              </span>
            </div>

            {customerInvoices.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
                <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-600 font-medium">No invoices issued to this customer yet.</p>
                <button
                  onClick={() => setCurrentView('invoice-create')}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 cursor-pointer"
                >
                  Create First Invoice
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {customerInvoices.map((inv) => {
                  const isOverdue = inv.status === 'overdue' || (inv.status === 'pending' && new Date(inv.dueDate) < new Date());
                  return (
                    <div
                      key={inv.id}
                      className="p-3.5 rounded-xl bg-white hover:bg-slate-50/80 border border-slate-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{inv.invoiceNumber}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              inv.status === 'paid'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : isOverdue
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {inv.status === 'paid' ? 'PAID' : isOverdue ? 'OVERDUE' : 'PENDING'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
                          <span>Issued: {formatDate(inv.issueDate)}</span>
                          <span>Due: {formatDate(inv.dueDate)}</span>
                          {inv.paidAt && <span className="text-emerald-600 font-medium">Paid on {formatDate(inv.paidAt)}</span>}
                        </div>
                        <p className="text-[11px] text-slate-600 italic">
                          {inv.items.map((it) => it.description).join(', ')}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="text-right">
                          <span className="font-mono font-extrabold text-sm text-slate-900 block">
                            {formatCurrency(inv.total, activeCurrency)}
                          </span>
                          {inv.reminderCount && inv.reminderCount > 0 ? (
                            <span className="text-[10px] text-indigo-600 font-medium block">
                              {inv.reminderCount} reminder(s) sent
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setCurrentView('invoice-view');
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
                            title="View Invoice"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          {inv.status !== 'paid' && (
                            <>
                              <button
                                onClick={() => sendEmailReminder(inv.id)}
                                className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium transition-colors cursor-pointer"
                                title="Send Email Reminder"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => markInvoiceAsPaid(inv.id)}
                                className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-200 transition-colors cursor-pointer"
                                title="Mark as Paid"
                              >
                                Settle
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              requestConfirmation({
                                title: 'Delete Invoice?',
                                message: `Are you sure you want to delete invoice ${inv.invoiceNumber}? This will adjust ${customer.name}'s balance.`,
                                confirmText: 'Delete Invoice',
                                confirmVariant: 'danger',
                                onConfirm: () => deleteInvoice(inv.id),
                              });
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete invoice"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: CRM Notes & Activity Timeline */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">CRM Notes & Interaction Logs</h2>
                  <p className="text-[11px] text-slate-500">Record calls, agreements, payment promises, and follow-ups</p>
                </div>
              </div>

              {!isAddingNote && (
                <button
                  id="btn-add-note-toggle"
                  onClick={() => setIsAddingNote(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Note</span>
                </button>
              )}
            </div>

            {/* Note creation box */}
            {isAddingNote && (
              <form onSubmit={handleAddNoteSubmit} className="bg-slate-50 border border-indigo-200 rounded-xl p-4 space-y-3 animate-fadeIn text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">New Client Note / Call Log</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={noteCategory}
                      onChange={(e) => setNoteCategory(e.target.value as CustomerNote['category'])}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-medium focus:outline-none focus:border-indigo-500"
                    >
                      <option value="general">General Note</option>
                      <option value="call_log">Call Log</option>
                      <option value="payment_promise">Payment Promise</option>
                      <option value="discount_agreement">Discount / Agreement</option>
                      <option value="reminder">Reminder Record</option>
                    </select>
                  </div>
                </div>

                <textarea
                  rows={3}
                  required
                  placeholder="Record interaction summary, promised payment date, WhatsApp agreements, or client feedback..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 text-xs"
                />

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNote(false);
                      setNoteContent('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shadow-xs"
                  >
                    <Send className="w-3 h-3" />
                    <span>Save Note</span>
                  </button>
                </div>
              </form>
            )}

            {/* Notes List */}
            <div className="space-y-3">
              {(!customer.notes || customer.notes.length === 0) ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No notes recorded yet. Click "Add Note" to log client interactions.
                </div>
              ) : (
                customer.notes.map((note) => {
                  const badge = getCategoryBadge(note.category);
                  return (
                    <div
                      key={note.id}
                      className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-2 text-xs hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.color}`}>
                            {badge.label}
                          </span>
                          <span className="text-[11px] text-slate-500">by {note.author || 'Apex Staff'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400">
                            {formatDate(note.createdAt)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              requestConfirmation({
                                title: 'Delete Note?',
                                message: 'Are you sure you want to remove this CRM note?',
                                confirmText: 'Delete Note',
                                confirmVariant: 'danger',
                                onConfirm: () => deleteCustomerNote(customer.id, note.id),
                              });
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                            title="Delete Note"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Customer Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                <span>Edit Customer Profile</span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditCustomerSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">Company Name</label>
                <input
                  type="text"
                  value={editCompany}
                  onChange={(e) => setEditCompany(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">Phone / WhatsApp</label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">Tax ID / TIN</label>
                  <input
                    type="text"
                    placeholder="TIN-00000000-01"
                    value={editTaxId}
                    onChange={(e) => setEditTaxId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">Preferred Terms (Days)</label>
                  <input
                    type="number"
                    min={0}
                    max={90}
                    value={editPaymentTerms}
                    onChange={(e) => setEditPaymentTerms(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">Tags (comma separated)</label>
                <input
                  type="text"
                  placeholder="VIP, Logistics, Priority, Retainer"
                  value={editTagInput}
                  onChange={(e) => setEditTagInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">Billing Address</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
