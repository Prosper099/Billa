import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Building2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Phone,
  LogOut,
  FileText,
  CreditCard,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { useFirebaseAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { BrandLogo } from './BrandLogo';
import { CURRENCIES } from '../utils/formatters';
import { CurrencyCode } from '../types';

export const WorkspaceOnboardingScreen: React.FC = () => {
  const { user, signOutUser } = useFirebaseAuth();
  const { completeWorkspaceOnboarding, activeCurrency, businessProfile } = useApp();

  // Extract names from Google profile
  const userDisplayName = user?.displayName?.trim() || '';
  const firstName = userDisplayName.split(' ')[0] || 'My';

  // Smart suggestions derived from Google profile
  const smartSuggestions = useMemo(() => {
    if (!userDisplayName) {
      return ['Apex Creative Lab', 'Horizon Media & Co', 'Vanguard Consulting'];
    }
    const cleanName = userDisplayName;
    return [
      `${cleanName} Studios`,
      `${cleanName} & Co.`,
      `${firstName} Creative Agency`,
      `${cleanName} Enterprises`,
    ];
  }, [userDisplayName, firstName]);

  // Form State
  const [businessName, setBusinessName] = useState(
    businessProfile.name && businessProfile.name !== 'Apex Studios'
      ? businessProfile.name
      : smartSuggestions[0] || 'My Business Workspace'
  );
  const [tagline, setTagline] = useState(
    businessProfile.tagline && businessProfile.tagline !== 'Brand Strategy, Digital Production & UI/UX Design'
      ? businessProfile.tagline
      : 'Professional Services & Consulting'
  );
  const [currency, setCurrency] = useState<CurrencyCode>(activeCurrency || 'NGN');
  const [phone, setPhone] = useState(
    businessProfile.phone && businessProfile.phone !== '+234 803 555 0192'
      ? businessProfile.phone
      : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  const selectedCurrencyConfig = CURRENCIES[currency] || CURRENCIES.NGN;

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      setValidationError('Please enter a business or company name to continue.');
      return;
    }

    setValidationError('');
    setIsSubmitting(true);

    try {
      await completeWorkspaceOnboarding({
        businessName: businessName.trim(),
        tagline: tagline.trim(),
        currency,
        phone: phone.trim(),
        ownerName: userDisplayName || 'Business Owner',
      });
    } catch (err) {
      console.warn('Workspace onboarding error:', err);
      setIsSubmitting(false);
    }
  };

  const handleApplySuggestion = (suggestion: string) => {
    setBusinessName(suggestion);
    setValidationError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Ambient background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo size="md" variant="dark" showTagline={false} />
          <span className="hidden sm:inline-block h-4 w-px bg-slate-800" />
          <span className="hidden sm:inline-block text-xs font-semibold text-slate-400">
            Workspace Initialization
          </span>
        </div>

        {/* User Google Badge & Sign Out */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Google Account'}
                className="w-5 h-5 rounded-full object-cover border border-indigo-400/50"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
                {firstName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-slate-300 font-medium hidden md:inline truncate max-w-[160px]">
              {user?.email || 'Google Account'}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Google Connected" />
          </div>

          <button
            type="button"
            id="onboarding-signout-btn"
            onClick={() => signOutUser()}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 text-xs font-medium transition-colors cursor-pointer"
            title="Sign out or switch Google account"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Switch</span>
          </button>
        </div>
      </header>

      {/* Main Form Centerpiece */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 my-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start"
        >
          {/* Left Column: Form Controls */}
          <div className="lg:col-span-7 bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl shadow-black/50 space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Google Sign-In Successful</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Name Your Workspace
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                Before launching, tell us your business identity. We’ll customize your invoices, client ledgers, and automated payment follow-ups immediately.
              </p>
            </div>

            <form onSubmit={handleLaunch} className="space-y-5">
              {/* Business Name Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="onboarding-business-name"
                    className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Business / Brand Name *</span>
                  </label>
                  <span className="text-[11px] text-indigo-400 font-medium">Shown on Invoices</span>
                </div>

                <div className="relative">
                  <input
                    id="onboarding-business-name"
                    type="text"
                    required
                    autoFocus
                    value={businessName}
                    onChange={(e) => {
                      setBusinessName(e.target.value);
                      if (validationError) setValidationError('');
                    }}
                    placeholder="e.g. Apex Creative Studio, Prosper & Co."
                    className={`w-full px-4 py-3 rounded-xl bg-slate-950/80 border ${
                      validationError ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/30'
                    } text-white placeholder-slate-500 text-sm font-semibold focus:outline-none focus:ring-2 transition-all`}
                  />
                </div>

                {validationError && (
                  <p className="text-xs text-rose-400 font-medium">{validationError}</p>
                )}

                {/* Smart Suggestion Chips */}
                <div className="pt-1">
                  <span className="text-[11px] text-slate-500 block mb-1.5">Quick Suggestions:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {smartSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleApplySuggestion(suggestion)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          businessName === suggestion
                            ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 font-bold'
                            : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300 font-medium'
                        }`}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tagline / Industry */}
              <div className="space-y-1.5">
                <label
                  htmlFor="onboarding-tagline"
                  className="text-xs font-bold text-slate-300 uppercase tracking-wider block"
                >
                  Tagline / Specialization (Optional)
                </label>
                <input
                  id="onboarding-tagline"
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Creative Production & Brand Design, Consulting"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 text-white placeholder-slate-500 text-sm font-normal focus:outline-none transition-all"
                />
              </div>

              {/* Primary Currency Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Primary Invoicing Currency *</span>
                  <span className="text-[11px] text-slate-500 lowercase font-normal">Change anytime in settings</span>
                </label>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => {
                    const c = CURRENCIES[code];
                    const isSelected = currency === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setCurrency(code)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30 scale-[1.02]'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="text-sm font-mono font-bold leading-tight">{c.symbol}</span>
                        <span className="text-[10px] font-bold tracking-wider mt-0.5">{c.code}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Contact Phone / WhatsApp */}
              <div className="space-y-1.5">
                <label
                  htmlFor="onboarding-phone"
                  className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Business Phone / WhatsApp (Optional)</span>
                </label>
                <input
                  id="onboarding-phone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +234 802 000 0000"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 text-white placeholder-slate-500 text-sm font-normal focus:outline-none transition-all"
                />
                <p className="text-[11px] text-slate-500">
                  Used for WhatsApp invoice sharing and client payment reminders.
                </p>
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  id="btn-launch-workspace"
                  disabled={isSubmitting || !businessName.trim()}
                  className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm sm:text-base shadow-xl shadow-indigo-600/30 transition-all active:scale-[0.99] cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Configuring Workspace...</span>
                    </>
                  ) : (
                    <>
                      <span>Launch Workspace</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Live Interactive Invoice Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Live Invoicing Preview</span>
            </div>

            {/* Simulated Clean Invoice Card */}
            <div className="bg-white text-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100/90 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full pointer-events-none" />

              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div className="min-w-0 pr-2">
                    <h3 className="font-extrabold text-base sm:text-lg text-slate-900 truncate">
                      {businessName.trim() || 'Your Business Name'}
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate">
                      {tagline.trim() || 'Professional Invoicing & Services'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono truncate">
                      {user?.email || 'billing@company.com'} {phone ? `• ${phone}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-mono font-bold uppercase tracking-wider">
                      Invoice
                    </span>
                    <p className="text-[10px] font-mono text-slate-400 mt-1">#INV-2026-001</p>
                  </div>
                </div>

                {/* Sample Invoice Table */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">
                    <span>Description</span>
                    <span>Amount</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-700 py-1">
                    <span className="font-medium">Strategic Consulting & Design Deliverables</span>
                    <span className="font-mono font-bold">
                      {selectedCurrencyConfig.symbol}
                      {currency === 'NGN' ? '350,000' : '1,250'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 py-0.5">
                    <span>VAT / Sales Tax (7.5%)</span>
                    <span className="font-mono font-medium">
                      {selectedCurrencyConfig.symbol}
                      {currency === 'NGN' ? '26,250' : '93.75'}
                    </span>
                  </div>
                </div>

                {/* Total Box */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Due</span>
                  <span className="text-base font-extrabold text-indigo-700 font-mono">
                    {selectedCurrencyConfig.symbol}
                    {currency === 'NGN' ? '376,250' : '1,343.75'}
                  </span>
                </div>

                {/* Settlement badge */}
                <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">
                    Bank transfer details & instant receipt generation enabled
                  </span>
                </div>
              </div>
            </div>

            {/* Feature reassurance bullet cards */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Real-time cloud database backup for all invoices and customers</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>AI financial advisor & WhatsApp debtor nudge templates</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Encrypted private storage per user account</span>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Subtle Footer */}
      <footer className="relative z-10 border-t border-slate-900 py-3 text-center text-slate-600 text-[11px]">
        <span>Powered by Billa Financial Suite • Firebase Cloud Storage Connected</span>
      </footer>
    </div>
  );
};
