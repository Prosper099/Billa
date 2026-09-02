import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  Building2,
  Globe,
  Play,
  X,
  CheckCircle2,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useFirebaseAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { CURRENCIES } from '../utils/formatters';
import { CurrencyCode } from '../types';

export const HomePage: React.FC = () => {
  const {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    continueAsGuest,
    authError,
    clearAuthError,
  } = useFirebaseAuth();

  const { createAccount } = useApp();

  // Dynamic Headline & Synchronized Tagline Animation
  const heroSteps = [
    {
      action: 'Create',
      tagline: 'Itemized invoices and estimates in seconds.',
    },
    {
      action: 'Track',
      tagline: 'Real-time debtor ledgers and overdue alerts.',
    },
    {
      action: 'Get Paid',
      tagline: 'Faster settlements with WhatsApp reminders.',
    },
  ];
  const [activeWordIndex, setActiveWordIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveWordIndex((prev) => (prev + 1) % heroSteps.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  // Auth Form State
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom Test Run Modal State
  const [isTestRunModalOpen, setIsTestRunModalOpen] = useState(false);
  const [testBusinessName, setTestBusinessName] = useState('My Test Business');
  const [testOwnerName, setTestOwnerName] = useState('Business Owner');
  const [testCurrency, setTestCurrency] = useState<CurrencyCode>('NGN');

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    clearAuthError();
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.warn('Google sign in note:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      return;
    }

    setIsSubmitting(true);
    clearAuthError();

    try {
      if (authMode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, displayName || 'Business Owner');
      }
    } catch (err: any) {
      console.warn('Auth form error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLaunchCustomTestRun = (e: React.FormEvent) => {
    e.preventDefault();
    const finalBusinessName = testBusinessName.trim() || 'My Test Company';
    const finalOwner = testOwnerName.trim() || 'Tester';
    const finalEmail = `test_${Date.now()}@workspace.local`;

    // 1. Sign in locally as guest
    continueAsGuest(finalBusinessName, finalEmail);

    // 2. Initialize clean user-created account with custom details
    createAccount({
      businessName: finalBusinessName,
      ownerName: finalOwner,
      email: finalEmail,
      currency: testCurrency,
    });

    setIsTestRunModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white font-sans antialiased">
      {/* Top Ambient Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-indigo-600/20 via-indigo-900/10 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* TOP HEADER */}
      <header className="w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 sm:h-13 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandLogo size="xs" showTagline={false} variant="dark" />
          </div>

          <div className="flex items-center gap-2">
            {/* Custom Test Run Button */}
            <button
              type="button"
              id="btn-nav-create-test-run"
              onClick={() => setIsTestRunModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white text-[11px] font-semibold transition-all cursor-pointer shadow-xs"
            >
              <Play className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400" />
              <span>Create Test Run</span>
            </button>

            {/* Jump to Sign In */}
            <a
              href="#auth-portal"
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold shadow-xs shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer"
            >
              <span>Sign In</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </header>

      {/* MAIN HERO & AUTH SECTION */}
      <section className="relative pt-4 pb-8 sm:pt-6 sm:pb-12 lg:pt-8 lg:pb-14 overflow-hidden flex-1 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 items-center">
            
            {/* Left Column: Clean, Compact Hero with Synchronized Action & Writeup */}
            <div className="lg:col-span-7 space-y-3.5 text-left">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-700/50 text-[11px] font-semibold text-indigo-300 shadow-xs">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Smart AI Invoicing & Billing Copilot</span>
              </div>

              {/* Dynamic Animated Action & Short Writeup */}
              <div className="space-y-1">
                <div className="h-8 sm:h-10 flex items-center">
                  <AnimatePresence mode="wait">
                    <motion.h1
                      key={activeWordIndex}
                      initial={{ opacity: 0, y: 10, filter: 'blur(3px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, y: -10, filter: 'blur(3px)' }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight select-none"
                    >
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-sky-300">
                        {heroSteps[activeWordIndex].action}
                      </span>
                    </motion.h1>
                  </AnimatePresence>
                </div>

                <div className="h-5 flex items-center">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={activeWordIndex}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 6 }}
                      transition={{ duration: 0.25 }}
                      className="text-xs sm:text-sm text-indigo-300 font-medium"
                    >
                      {heroSteps[activeWordIndex].tagline}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>

              {/* Progress Step Indicators */}
              <div className="flex items-center gap-1.5 pt-0.5">
                {heroSteps.map((step, idx) => (
                  <button
                    key={step.action}
                    type="button"
                    onClick={() => setActiveWordIndex(idx)}
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      activeWordIndex === idx
                        ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                        : 'bg-slate-900/60 text-slate-500 border border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    <span>{step.action}</span>
                  </button>
                ))}
              </div>

              <p className="text-xs sm:text-sm text-slate-300 max-w-lg leading-relaxed">
                Generate professional invoices with instant multi-currency math, automatic WhatsApp payment reminders, and real-time debtor tracking.
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  id="btn-hero-create-test-run"
                  onClick={() => setIsTestRunModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-white" />
                  <span>Test Run</span>
                </button>

                <a
                  href="#auth-portal"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-xs transition-all cursor-pointer"
                >
                  <span>Sign In</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Right Column: Authentication Card (Compact & Crisp) */}
            <div id="auth-portal" className="lg:col-span-5">
              <div className="rounded-2xl bg-slate-900/95 border border-slate-800 p-4 sm:p-6 shadow-xl shadow-indigo-950/40 backdrop-blur-2xl space-y-4">
                <div className="space-y-1 text-center">
                  <div className="inline-flex p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-0.5">
                    <Lock className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    {authMode === 'signin' ? 'Sign In to Workspace' : 'Create Free Account'}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Access your cloud workspace to manage invoices and clients securely.
                  </p>
                </div>

                {/* Google Sign In */}
                <button
                  type="button"
                  id="btn-google-login-home"
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-slate-800" />
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                    or with email
                  </span>
                  <div className="flex-1 h-px bg-slate-800" />
                </div>

                {/* Error Banner */}
                {authError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <p className="flex-1 text-[11px]">{authError}</p>
                  </div>
                )}

                {/* Email Form */}
                <form onSubmit={handleSubmitAuth} className="space-y-2.5">
                  {authMode === 'signup' && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-300">Your Full Name</label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="e.g. Ndubuizu Prosper"
                          className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 text-xs focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Email Address</label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Password</label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-8 pr-9 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 text-xs focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="btn-email-auth-submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting
                      ? 'Processing...'
                      : authMode === 'signin'
                      ? 'Sign In to Workspace'
                      : 'Create Account & Sync'}
                  </button>
                </form>

                <div className="flex items-center justify-between pt-0.5 text-[11px]">
                  <span className="text-slate-400">
                    {authMode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                      clearAuthError();
                    }}
                    className="text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                  >
                    {authMode === 'signin' ? 'Sign up' : 'Sign in'}
                  </button>
                </div>

                {/* Create Custom Test Run CTA */}
                <div className="pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    id="btn-open-test-run-modal"
                    onClick={() => setIsTestRunModalOpen(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                    <span>Create Your Own Test Run</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CUSTOM TEST RUN MODAL */}
      {isTestRunModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Play className="w-4 h-4 fill-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Create Test Run Workspace</h3>
                  <p className="text-[11px] text-slate-400">Set up your test workspace parameters</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTestRunModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLaunchCustomTestRun} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Test Business / Company Name</span>
                </label>
                <input
                  type="text"
                  required
                  value={testBusinessName}
                  onChange={(e) => setTestBusinessName(e.target.value)}
                  placeholder="e.g. Prosper Logistics or Studio X"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Your Name / Profile</span>
                </label>
                <input
                  type="text"
                  required
                  value={testOwnerName}
                  onChange={(e) => setTestOwnerName(e.target.value)}
                  placeholder="e.g. Ndubuizu Prosper"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Base Workspace Currency</span>
                </label>
                <select
                  value={testCurrency}
                  onChange={(e) => setTestCurrency(e.target.value as CurrencyCode)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {Object.values(CURRENCIES).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol}) - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTestRunModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-launch-test-run"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Launch Workspace</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="mt-auto border-t border-slate-800/80 py-3 sm:py-4 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <BrandLogo size="xs" showTagline={false} variant="dark" />
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">Secure Cloud Invoicing</span>
          </div>

          <div className="flex items-center gap-3 whitespace-nowrap">
            <button
              type="button"
              onClick={() => setIsTestRunModalOpen(true)}
              className="text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer transition-colors"
            >
              Test Run
            </button>
            <span className="text-slate-600">•</span>
            <span className="text-slate-500">© {new Date().getFullYear()} Billa Inc.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

