import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  Tag,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatters';
import { Customer } from '../types';
import { CustomerProfileView } from './CustomerProfileView';

export const CustomersView: React.FC = () => {
  const {
    customers,
    invoices,
    activeCurrency,
    addCustomer,
    setCurrentView,
    selectedCustomer,
    setSelectedCustomer,
    showToast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New customer form state
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [paymentTermsDays, setPaymentTermsDays] = useState(14);

  // If a customer is selected for profile view, show CustomerProfileView
  if (selectedCustomer) {
    return (
      <CustomerProfileView
        customer={selectedCustomer}
        onBack={() => setSelectedCustomer(null)}
      />
    );
  }

  // Extract all unique tags
  const allTags = Array.from(
    new Set(customers.flatMap((c) => c.tags || []))
  );

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.companyName && c.companyName.toLowerCase().includes(q)) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.tags && c.tags.some((t) => t.toLowerCase().includes(q)));

    const matchesTag =
      selectedTagFilter === 'all' || (c.tags && c.tags.includes(selectedTagFilter));

    return matchesSearch && matchesTag;
  });

  const totalCRMInvoiced = customers.reduce((sum, c) => sum + c.totalBilled, 0);
  const totalCRMBalance = customers.reduce((sum, c) => sum + c.outstandingBalance, 0);
  const avgRiskScore =
    customers.length > 0
      ? Math.round(
          customers.reduce((sum, c) => sum + (c.riskAssessment?.riskScore || 80), 0) /
            customers.length
        )
      : 85;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const tagsArray = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    addCustomer({
      name: name.trim(),
      companyName: companyName.trim() || undefined,
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim() || undefined,
      taxId: taxId.trim() || undefined,
      tags: tagsArray.length > 0 ? tagsArray : ['New Client'],
      preferredPaymentTermsDays: Number(paymentTermsDays),
    });

    setName('');
    setCompanyName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setTaxId('');
    setTagInput('');
    setPaymentTermsDays(14);
    setIsAddModalOpen(false);
  };

  const getReliabilityBadge = (customer: Customer) => {
    const assessment = customer.riskAssessment;
    const reliability = customer.paymentReliability;

    if (assessment) {
      if (assessment.riskLevel === 'low') {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>{assessment.riskScore}/100 • {assessment.reliabilityRating}</span>
          </span>
        );
      }
      if (assessment.riskLevel === 'high') {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <ShieldAlert className="w-3 h-3 text-rose-600" />
            <span>{assessment.riskScore}/100 • {assessment.reliabilityRating}</span>
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>{assessment.riskScore}/100 • {assessment.reliabilityRating}</span>
        </span>
      );
    }

    if (reliability === 'high') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-2.5 h-2.5" />
          <span>Prompt Payer</span>
        </span>
      );
    }
    if (reliability === 'slow') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertCircle className="w-2.5 h-2.5" />
          <span>Follow-up Needed</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-2.5 h-2.5" />
        <span>Standard Terms</span>
      </span>
    );
  };

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5 sm:space-y-6 animate-fadeIn pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A1C1E] tracking-tight">Customer CRM & Ledgers</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage customer contact information, complete payment history, CRM interaction notes, and AI reliability risk scores
          </p>
        </div>

        <button
          id="btn-add-customer-open"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition-all active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* CRM Summary Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total CRM Clients</span>
          <div className="text-2xl font-black font-mono text-slate-900">{customers.length}</div>
          <span className="text-xs text-slate-500">Active billing accounts</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Lifetime Invoiced</span>
          <div className="text-2xl font-black font-mono text-slate-900">
            {formatCurrency(totalCRMInvoiced, activeCurrency)}
          </div>
          <span className="text-xs text-emerald-600 font-medium">Billed across clients</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Receivables</span>
          <div className={`text-2xl font-black font-mono ${totalCRMBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {formatCurrency(totalCRMBalance, activeCurrency)}
          </div>
          <span className="text-xs text-slate-500">Outstanding balance</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Credit Reliability</span>
          <div className="text-2xl font-black font-mono text-indigo-700">{avgRiskScore} / 100</div>
          <span className="text-xs text-indigo-600 font-medium">AI behavioral average</span>
        </div>
      </div>

      {/* Search & Tag Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by client name, company, phone, email, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
          />
        </div>

        {/* Tag Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedTagFilter('all')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedTagFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            All Clients ({customers.length})
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTagFilter(tag)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedTagFilter === tag
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Customers Cards Grid or Empty State */}
      {filteredCustomers.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-8 sm:p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
            <Users className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-900">
              {searchQuery ? 'No Customers Matching Search' : 'No Customers in Directory Yet'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {searchQuery
                ? `No clients found matching "${searchQuery}". Try a different name or clear filters.`
                : 'Your CRM directory is currently empty. Add your first client to start generating invoices, tracking payments, and issuing AI WhatsApp reminders!'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Customer</span>
            </button>
            {customers.length === 0 && (
              <button
                type="button"
                onClick={() => {
                  const { resetToDefaultData } = useApp ? (window as any)._appContext || {} : {};
                  // or use context
                }}
                id="btn-load-sample-customers"
                className="hidden"
              >
                Load Sample
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredCustomers.map((cust) => {
            const custInvoices = invoices.filter(
              (inv) => inv.customerId === cust.id || inv.customerName.toLowerCase() === cust.name.toLowerCase()
            );
            const outstandingTotal = custInvoices
              .filter((inv) => inv.status !== 'paid' && inv.status !== 'cancelled')
              .reduce((sum, i) => sum + i.total, 0);

            const notesCount = cust.notes?.length || 0;

            return (
              <div
                key={cust.id}
                onClick={() => setSelectedCustomer(cust)}
                className="rounded-2xl bg-white border border-slate-200 hover:border-indigo-400/80 p-5 space-y-4 shadow-sm hover:shadow-md flex flex-col justify-between transition-all cursor-pointer group"
              >
                <div className="space-y-3">
                  {/* Header with Monogram and Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold text-sm flex items-center justify-center shadow-2xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        {cust.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
                          {cust.name}
                        </h3>
                        {cust.companyName && (
                          <p className="text-xs text-slate-500 line-clamp-1">{cust.companyName}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Reliability & Tags */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {getReliabilityBadge(cust)}
                    {(cust.tags || []).slice(0, 2).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Contact info list */}
                  <div className="space-y-1 text-xs text-slate-500 pt-1">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{cust.phone || 'No phone added'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{cust.email || 'No email added'}</span>
                    </div>
                  </div>
                </div>

                {/* Financial Snapshot for Customer */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                        Total Invoiced
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatCurrency(cust.totalBilled, activeCurrency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                        Outstanding
                      </span>
                      <span
                        className={`font-mono font-bold ${
                          outstandingTotal > 0 ? 'text-amber-600' : 'text-emerald-600'
                        }`}
                      >
                        {formatCurrency(outstandingTotal, activeCurrency)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                    <span className="text-[11px] text-slate-500 font-medium">
                      {custInvoices.length} invoice(s) • {notesCount} note(s)
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                        <span>View Profile & CRM</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Add New Customer</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Babatunde Jinadu"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">Company Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Jinadu Holdings Ltd"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">Phone / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    placeholder="+234 800 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="client@domain.ng"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">Tags (comma separated)</label>
                  <input
                    type="text"
                    placeholder="Tech, VIP, Retainer"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">Billing Address</label>
                <input
                  type="text"
                  placeholder="Street, City, State"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
