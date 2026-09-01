import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Zap,
  Camera,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useFirebaseAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

export const HomePage: React.FC = () => {
  const {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    continueAsGuest,
    authError,
    clearAuthError,
  } = useFirebaseAuth();

  const { showToast } = useApp();

  // Word cycle animation for "Create", "Track", "Get Paid"
  const rotatingWords = [
    {
      word: 'Create',
      colorClass: 'from-indigo-400 via-blue-400 to-indigo-300',
      subtitle: 'Invoices in under 10 seconds with AI text & voice prompts',
      description:
        'Turn informal client agreements and notes into verified, tax-compliant invoices with automatic NGN/USD/GBP currency calculation.',
      perks: [
        'Instant AI Prompt to Invoice',
        'Automatic 7.5% VAT & WHT math',
        'Multi-currency exchange rates',
        'Direct PDF & web share links',
      ],
    },
    {
      word: 'Track',
      colorClass: 'from-violet-400 via-purple-400 to-indigo-300',
      subtitle: 'Payment statuses, overdue aging & debtor risk',
      description:
        'Know precisely who has paid, who is overdue, and monitor customer payment reliability with real-time financial health intelligence.',
      perks: [
        'Live debtor aging breakdown',
        'Customer reliability scorecards',
        'Collection velocity dashboard',
        'Full customer transaction ledgers',
      ],
    },
    {
      word: 'Get Paid',
      colorClass: 'from-emerald-400 via-teal-400 to-emerald-200',
      subtitle: '3x faster with direct bank details & WhatsApp reminders',
      description:
        'Give clients clear settlement account details with 1-click copy, automated WhatsApp notices, and polite-to-firm escalation tones.',
      perks: [
        'Prominent NUBAN bank settlement box',
        '1-click account number copy button',
        'Automated WhatsApp follow-up links',
        'Customizable polite or urgent tones',
      ],
    },
  ];

  const [wordIndex, setWordIndex] = useState(0);

  // Auto-cycle words every 3.2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % rotatingWords.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [rotatingWords.length]);

  const currentItem = rotatingWords[wordIndex];

  // Auth Form State
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    clearAuthError();
    try {
      await signInWithGoogle();
      showToast('Welcome to Billa!', 'You have successfully signed in with Google.', 'success');
    } catch (err: any) {
      console.warn('Google sign in note:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      showToast('Missing Fields', 'Please enter both your email and password.', 'error');
      return;
    }

    setIsSubmitting(true);
    clearAuthError();

    try {
      if (authMode === 'signin') {
        await signInWithEmail(email, password);
        showToast('Signed In', 'Welcome back to your Billa workspace!', 'success');
      } else {
        await signUpWithEmail(email, password, displayName || 'Business Owner');
        showToast('Account Created', 'Welcome to Billa! Your cloud workspace is ready.', 'success');
      }
    } catch (err: any) {
      console.warn('Auth form error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoAccess = () => {
    continueAsGuest('Apex Studios', 'guest@apexstudios.ng');
    showToast('Demo Workspace Ready', 'Loaded full workspace with sample business data!', 'success');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white font-sans antialiased">
      {/* Top Ambient Light Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-indigo-600/15 via-indigo-900/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* 1. TOP HEADER NAVIGATION */}
      <header className="w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size="md" showTagline={true} />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Demo CTA */}
            <button
              type="button"
              id="btn-nav-demo-access"
              onClick={handleDemoAccess}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Instant Demo Access</span>
            </button>

            {/* Jump to Sign In */}
            <a
              href="#auth-portal"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer"
            >
              <span>Sign In / Enter</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION WITH CHANGING WORD ANIMATION */}
      <section className="relative pt-8 pb-16 lg:pt-14 lg:pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Vertical Rotating Word Headline & Dynamic Capability Box */}
            <div className="lg:col-span-7 space-y-6">
              {/* Dynamic Changing Word Headline */}
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800/40 text-xs font-semibold text-indigo-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Next-Generation AI Billing Suite</span>
                </div>

                <div className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.12]">
                  <span>Effortlessly </span>
                  <div className="inline-block relative overflow-hidden align-top h-[1.25em] min-w-[220px]">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={currentItem.word}
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -50, opacity: 0 }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        className={`inline-block font-black text-transparent bg-clip-text bg-gradient-to-r ${currentItem.colorClass}`}
                      >
                        {currentItem.word}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                  <div className="block mt-1">Invoices & Get Paid Fast.</div>
                </div>

                {/* Subtitle & Dynamic Description */}
                <div className="min-h-[100px] pt-1">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentItem.word}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                      className="space-y-3"
                    >
                      <p className="text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed">
                        {currentItem.description}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        {currentItem.perks.map((perk, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs sm:text-sm text-slate-200">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>{perk}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Word Selector Quick Controls */}
              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs font-semibold text-slate-400 mr-1">Experience:</span>
                {rotatingWords.map((item, idx) => {
                  const isActive = wordIndex === idx;
                  return (
                    <button
                      key={item.word}
                      type="button"
                      onClick={() => setWordIndex(idx)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30 scale-105'
                          : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {item.word}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Premium Authentication Card / Workspace Gateway */}
            <div id="auth-portal" className="lg:col-span-5">
              <div className="rounded-3xl bg-slate-900/95 border border-slate-800 p-6 sm:p-8 shadow-2xl shadow-indigo-950/50 backdrop-blur-2xl space-y-6">
                <div className="space-y-2 text-center">
                  <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    {authMode === 'signin' ? 'Access Your Workspace' : 'Create Free Account'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Sign in to manage your invoices, customers, and AI reminders securely.
                  </p>
                </div>

                {/* Google Sign In Primary Option */}
                <button
                  type="button"
                  id="btn-google-login-home"
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-800" />
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                    or with email
                  </span>
                  <div className="flex-1 h-px bg-slate-800" />
                </div>

                {/* Error Banner */}
                {authError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p>{authError}</p>
                    </div>
                  </div>
                )}

                {/* Email / Password Form */}
                <form onSubmit={handleSubmitAuth} className="space-y-3.5">
                  {authMode === 'signup' && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Your Full Name</label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="e.g. Ndubuizu Prosper"
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 text-xs focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-10 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 text-xs focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
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
                      : 'Create Free Account & Sync'}
                  </button>
                </form>

                {/* Switch between signin and signup */}
                <div className="flex items-center justify-between pt-1 text-xs">
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
                    {authMode === 'signin' ? 'Sign up free' : 'Sign in'}
                  </button>
                </div>

                {/* Instant Guest / Demo Entrance */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Want to test without an account?</span>
                  </div>
                  <button
                    type="button"
                    id="btn-instant-guest-access"
                    onClick={handleDemoAccess}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Try Instant Demo Workspace (No Login Needed)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. WHY BILLA: CORE ARCHITECTURE PILLARS */}
      <section className="py-16 bg-slate-900/60 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs uppercase tracking-widest text-indigo-400 font-bold">
              Built for Modern Entrepreneurs
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Everything You Need to Bill, Collect & Prosper
            </h2>
            <p className="text-sm text-slate-400">
              Stop chasing late payments manually. Billa streamlines your entire accounts receivable pipeline with automated AI superpowers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">AI Prompt to Invoice</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Type "Bill Dangote 1.4m for 3-day brand consultancy with 7.5% VAT" and watch Billa generate a finalized, calculation-verified PDF invoice immediately.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                <Camera className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Camera Receipt Vision</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Take a quick camera snapshot of physical paper receipts, handwritten bills, or supplier invoices. Our OCR vision auto-extracts line items and tax.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">WhatsApp & Email Follow-Ups</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automate polite, firm, or urgent overdue reminders directly to client WhatsApp with 1-click links and your NUBAN bank settlement details.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FOOTER */}
      <footer className="mt-auto border-t border-slate-800 py-8 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <BrandLogo size="sm" showTagline={false} />
            <span>• Bank-Grade 256-bit Security & Cloud Synchronization</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleDemoAccess}
              className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
            >
              Open Demo Workspace
            </button>
            <span>© {new Date().getFullYear()} Billa Inc. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
