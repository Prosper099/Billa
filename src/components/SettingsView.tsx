import React, { useState, useEffect } from 'react';
import {
  Building2,
  CreditCard,
  Globe,
  Percent,
  RotateCcw,
  Save,
  Shield,
  Download,
  User,
  Plus,
  LogOut,
  Trash2,
  CheckCircle2,
  Cloud,
  Smartphone,
  Laptop,
  ArrowRight,
  ShieldCheck,
  Copy,
  Check,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useFirebaseAuth } from '../context/AuthContext';
import firebaseConfig from '../../firebase-applet-config.json';
import { CURRENCIES } from '../utils/formatters';
import { CurrencyCode } from '../types';

export const SettingsView: React.FC = () => {
  const {
    businessProfile,
    updateBusinessProfile,
    activeCurrency,
    setActiveCurrency,
    invoices,
    customers,
    resetToDefaultData,
    clearAllData,
    showToast,
    accounts,
    currentAccount,
    switchAccount,
    deleteAccount,
    requestConfirmation,
    setIsAuthModalOpen,
    setIsCloudAuthModalOpen,
    logout,
  } = useApp();

  const { user, isCloudSyncActive, signOutUser } = useFirebaseAuth();

  const [formData, setFormData] = useState(businessProfile);
  const [copiedAccNumber, setCopiedAccNumber] = useState(false);

  useEffect(() => {
    setFormData(businessProfile);
  }, [businessProfile]);

  const handleCopyAccountNumber = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const num = formData.accountNumber || businessProfile.accountNumber;
    if (!num) {
      showToast('No Account Number', 'Please enter your account number first.', 'error');
      return;
    }
    navigator.clipboard.writeText(num);
    setCopiedAccNumber(true);
    showToast('Account Number Copied', `Account Number ${num} copied to clipboard!`, 'success');
    setTimeout(() => setCopiedAccNumber(false), 2500);
  };

  const handleChange = (field: keyof typeof businessProfile, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateBusinessProfile(formData);
  };

  const handleExportData = () => {
    const data = {
      businessProfile,
      invoices,
      customers,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `billa_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Data Exported', 'JSON backup file downloaded.');
  };

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn pb-24 lg:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A1C1E] tracking-tight">Business Settings</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure company branding, official bank settlement details, and invoice rules
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              await signOutUser();
              logout();
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out of Workspace</span>
          </button>
        </div>
      </div>

      {/* Cloud Authentication & Sync Status Card */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Workspace & Cloud Status
            </h2>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${user ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
            {user ? 'Cloud Synced' : 'Active Session'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-sky-50/50 to-indigo-50/40 border border-indigo-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold text-base shadow-sm shrink-0 mt-0.5 ${
              user ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'
            }`}>
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-extrabold text-slate-900">
                  {user ? (user.displayName || user.email) : 'Billa Local Workspace'}
                </h3>
                {user ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Live Sync Enabled
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-xl">
                {user
                  ? `Your business profile, invoices, customers, and AI reminders are securely synced to your cloud account (${user.email}). Any changes made on this device will instantly sync in real time.`
                  : 'Your business profile, invoices, and customer CRM are active in this workspace session.'}
              </p>
              <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500 font-medium flex-wrap">
                <span className="flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-indigo-500" /> Phone & Tablet
                </span>
                <span className="flex items-center gap-1">
                  <Laptop className="w-3.5 h-3.5 text-indigo-500" /> Desktop & Mac
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> 256-Bit Encryption
                </span>
                <span className="flex items-center gap-1 bg-slate-100/90 px-2 py-0.5 rounded-md font-mono text-[10px] text-slate-600">
                  Firebase: {firebaseConfig.projectId}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200">
            <button
              type="button"
              onClick={async () => {
                await signOutUser();
                logout();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* 0. Multi-Account Management Card */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Active Workspace & Business Profiles
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {accounts.length} profile(s) saved
          </span>
        </div>

        {/* Current Active Account Banner with Logout Action */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/80 via-slate-50 to-indigo-50/40 border border-indigo-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white font-extrabold text-base flex items-center justify-center shadow-sm shrink-0 mt-0.5">
              {businessProfile.name ? businessProfile.name.charAt(0).toUpperCase() : 'B'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-extrabold text-slate-900">
                  {businessProfile.name || 'Untitled Workspace'}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Active Session
                </span>
                {currentAccount.isDemo && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    Demo Account
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {currentAccount.ownerName} • {businessProfile.email || 'No email configured'} • {businessProfile.phone || 'No phone'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Settlement: {businessProfile.bankName ? `${businessProfile.bankName} - ${businessProfile.accountNumber}` : 'Not configured yet'} • Currency: <span className="font-bold text-indigo-700">{activeCurrency}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200">
            <button
              type="button"
              id="btn-settings-logout-fresh"
              onClick={() => {
                requestConfirmation({
                  title: 'Log Out & Start Fresh?',
                  message: 'Log out of your current session and sign into a fresh business account with clean details?',
                  confirmText: 'Log Out',
                  confirmVariant: 'warning',
                  onConfirm: () => logout({ clearLocalData: true }),
                });
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out & Start Fresh</span>
            </button>

            <button
              type="button"
              id="btn-settings-switch-profile"
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs transition-colors cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Switch Workspace</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {accounts.map((acc) => {
            const isActive = acc.id === currentAccount.id;
            return (
              <div
                key={acc.id}
                className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  isActive
                    ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-400/30'
                    : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                }`}
              >
                <div className="min-w-0 flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${
                      isActive ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {acc.businessName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {acc.businessName}
                      </p>
                      {acc.isDemo && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                          Demo
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {acc.ownerName} • {acc.currency}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isActive ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-white px-2 py-1 rounded-lg border border-indigo-200 shadow-2xs">
                      <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                      Active
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => switchAccount(acc.id)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-600 hover:text-white border border-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Switch
                    </button>
                  )}
                  {accounts.length > 1 && !isActive && (
                    <button
                      type="button"
                      onClick={() => {
                        requestConfirmation({
                          title: 'Delete Workspace?',
                          message: `Delete workspace "${acc.businessName}" and all associated invoices and customer ledgers?`,
                          confirmText: 'Delete Workspace',
                          confirmVariant: 'danger',
                          onConfirm: () => deleteAccount(acc.id),
                        });
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete profile"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* 1. Company Profile */}
        <div className="rounded-2xl bg-white border border-slate-200/90 p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Company & Brand Profile
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-slate-700 font-semibold">Business Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-700 font-semibold">Tagline / Services Description</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => handleChange('tagline', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-700 font-semibold">Official Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-700 font-semibold">Phone / WhatsApp</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-slate-700 font-semibold">Physical / Studio Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* 2. Bank Settlement Details (Crucial for Invoicing) */}
        <div className="rounded-2xl bg-white border border-slate-200/90 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Bank Settlement Account Details
              </h2>
            </div>
            {formData.accountNumber && (
              <button
                type="button"
                id="btn-copy-account-number-settings"
                onClick={handleCopyAccountNumber}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition-colors cursor-pointer"
                title="Copy Account Number to Clipboard"
              >
                {copiedAccNumber ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Account No.</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-slate-700 font-semibold">Bank Name *</label>
              <input
                type="text"
                required
                value={formData.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
                placeholder="e.g. GTBank / Zenith / Access"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-slate-700 font-semibold">Account Number (NUBAN) *</label>
                <button
                  type="button"
                  onClick={handleCopyAccountNumber}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedAccNumber ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Copied
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5">
                      <Copy className="w-3 h-3" /> Copy
                    </span>
                  )}
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.accountNumber}
                  onChange={(e) => handleChange('accountNumber', e.target.value)}
                  className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleCopyAccountNumber}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Copy Account Number"
                >
                  {copiedAccNumber ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-700 font-semibold">Beneficiary Account Name *</label>
              <input
                type="text"
                required
                value={formData.accountName}
                onChange={(e) => handleChange('accountName', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* 3. Defaults & Localization */}
        <div className="rounded-2xl bg-white border border-slate-200/90 p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Globe className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Defaults & Currency
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-slate-700 font-semibold">Default Currency</label>
              <select
                value={formData.preferredCurrency}
                onChange={(e) => {
                  const val = e.target.value as CurrencyCode;
                  handleChange('preferredCurrency', val);
                  setActiveCurrency(val);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {Object.values(CURRENCIES).map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.symbol} {curr.name} ({curr.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-700 font-semibold">Default Payment Term (Days)</label>
              <input
                type="number"
                min="1"
                max="90"
                value={formData.defaultPaymentTermsDays}
                onChange={(e) => handleChange('defaultPaymentTermsDays', Number(e.target.value) || 14)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-700 font-semibold">Standard VAT Rate (%)</label>
              <input
                type="number"
                min="0"
                max="30"
                step="0.1"
                value={formData.defaultTaxRate}
                onChange={(e) => handleChange('defaultTaxRate', Number(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="submit"
            id="btn-save-settings"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportData}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium transition-colors cursor-pointer text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Backup</span>
            </button>

            <button
              type="button"
              onClick={() => {
                requestConfirmation({
                  title: 'Clear Workspace Slate?',
                  message: 'Clear all invoices, customers, and reminder logs to start fresh? Values will be reset to zero.',
                  confirmText: 'Clear All Data',
                  confirmVariant: 'danger',
                  onConfirm: () => clearAllData(),
                });
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-amber-50 text-slate-600 hover:text-amber-700 border border-slate-200 font-medium transition-colors cursor-pointer text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              <span>Clear Slate (Start Fresh)</span>
            </button>

            <button
              type="button"
              id="btn-settings-bottom-logout"
              onClick={() => {
                requestConfirmation({
                  title: 'Reset & Sign Out?',
                  message: 'Reset your current local session and log in with fresh business details?',
                  confirmText: 'Reset & Sign Out',
                  confirmVariant: 'warning',
                  onConfirm: () => logout({ clearLocalData: true }),
                });
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold transition-colors cursor-pointer text-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Reset & Sign Out</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
