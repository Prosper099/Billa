import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Building2,
  Mail,
  Phone,
  DollarSign,
  ArrowRight,
  LogOut,
  Sparkles,
  CheckCircle2,
  Trash2,
  Globe,
  Briefcase,
  ShieldCheck,
  RotateCcw,
  Cloud,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CurrencyCode, UserAccount } from '../types';
import { CURRENCIES, formatCurrency } from '../utils/formatters';
import { BillaAIIcon } from './BrandLogo';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    currentAccount,
    accounts,
    createAccount,
    switchAccount,
    deleteAccount,
    requestConfirmation,
    clearAllData,
    resetToDefaultData,
    setIsCloudAuthModalOpen,
  } = useApp();

  const mode = authModalMode;
  const setMode = setAuthModalMode;
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('NGN');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  if (!isAuthModalOpen) return null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) return;

    createAccount({
      businessName: businessName.trim(),
      ownerName: ownerName.trim() || 'Business Owner',
      email: email.trim() || 'billing@example.com',
      phone: phone.trim(),
      currency,
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      accountName: accountName.trim() || businessName.trim(),
    });

    // Reset form
    setBusinessName('');
    setOwnerName('');
    setEmail('');
    setPhone('');
    setIsAuthModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="relative bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 pb-5 shrink-0">
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md shadow-inner">
              <Building2 className="w-6 h-6 text-indigo-200" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-white">
                {mode === 'create' ? 'Create Business Account' : 'Switch Workspace'}
              </h2>
              <p className="text-xs text-indigo-200/90 mt-0.5">
                {mode === 'create'
                  ? 'Start with a 100% clean slate workspace for your business'
                  : 'Manage and switch between your business profiles'}
              </p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex bg-white/10 p-1 rounded-xl mt-5 border border-white/15 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode('create')}
              className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'create'
                  ? 'bg-white text-indigo-900 shadow-sm font-bold'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>New Account (Clean Slate)</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('switch')}
              className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'switch'
                  ? 'bg-white text-indigo-900 shadow-sm font-bold'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Switch Accounts ({accounts.length})</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Cloud Account Prompt */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-sky-50 to-indigo-50 border border-indigo-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Cloud className="w-4 h-4 text-indigo-600 shrink-0" />
              <div className="text-left min-w-0">
                <p className="text-xs font-bold text-indigo-950 truncate">Need to access your data on another device?</p>
                <p className="text-[11px] text-indigo-700 truncate">Sign in with Firebase Cloud to sync across phones & laptops.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsAuthModalOpen(false);
                setIsCloudAuthModalOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0 transition-colors cursor-pointer"
            >
              Cloud Login
            </button>
          </div>

          {mode === 'create' ? (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-3 text-xs text-indigo-950">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Zero dummy data guaranteed:</strong> Creating a new account starts with empty invoices, customers, and ledgers so you can enter your genuine business records.
                </p>
              </div>

              {/* Business Name */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">
                  Business / Company Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Ndubuizu Digital Agency or Apex Creative"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Owner Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">
                    Your Name / Owner
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Prosper Ndubuizu"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">
                    Business Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="billing@yourdomain.com"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Phone & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">
                    WhatsApp / Phone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234 800 000 0000"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">
                    Billing Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-indigo-700 focus:bg-white focus:border-indigo-500 focus:outline-none transition-colors cursor-pointer"
                  >
                    {Object.values(CURRENCIES).map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.symbol} {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bank Details (Optional) */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Bank Settlement Info (Optional for Invoices)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Bank Name (e.g. GTBank / Zenith)"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none"
                  />
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Account Number (e.g. 0123456789)"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/25 transition-all cursor-pointer mt-2"
              >
                <span>Create & Open Fresh Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Select an account below to switch immediately, or manage your existing workspaces.
              </p>

              <div className="space-y-2.5">
                {accounts.map((acc) => {
                  const isActive = currentAccount?.id === acc.id;
                  return (
                    <div
                      key={acc.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isActive
                          ? 'bg-indigo-50/80 border-indigo-400/80 shadow-xs ring-1 ring-indigo-400/40'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div
                        onClick={() => {
                          if (!isActive) switchAccount(acc.id);
                          setIsAuthModalOpen(false);
                        }}
                        className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                      >
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {acc.businessName.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 truncate">
                              {acc.businessName}
                            </h4>
                            {acc.isDemo && (
                              <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[9px] font-bold">
                                DEMO
                              </span>
                            )}
                            {isActive && (
                              <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate">
                            {acc.ownerName} • {acc.currency} • {acc.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => {
                              switchAccount(acc.id);
                              setIsAuthModalOpen(false);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                          >
                            Switch
                          </button>
                        )}
                        {!acc.isDemo && accounts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              requestConfirmation({
                                title: 'Delete Account Workspace?',
                                message: `Delete account "${acc.businessName}" and all of its associated records?`,
                                confirmText: 'Delete Account',
                                confirmVariant: 'danger',
                                onConfirm: () => deleteAccount(acc.id),
                              });
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Fast Clean Slate Current Account Button */}
              <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    requestConfirmation({
                      title: 'Clear Workspace?',
                      message: 'Clear all invoices and customers in the current workspace for a clean slate?',
                      confirmText: 'Clear All Data',
                      confirmVariant: 'danger',
                      onConfirm: () => {
                        clearAllData();
                        setIsAuthModalOpen(false);
                      },
                    });
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                  <span>Erase All Data in Current Account</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('create')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Create Another Business Account</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
