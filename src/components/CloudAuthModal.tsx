import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Building2,
  Phone,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Globe,
  CheckCircle2,
  LogOut,
  Cloud,
  CloudOff,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { useFirebaseAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { BillaAIIcon } from './BrandLogo';
import firebaseConfig from '../../firebase-applet-config.json';

export const CloudAuthModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const {
    user,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOutUser,
    isCloudSyncActive,
  } = useFirebaseAuth();
  const { showToast, businessProfile, currentAccount } = useApp();

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState(false);
  const [domainCopied, setDomainCopied] = useState(false);

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  const copyCurrentDomain = () => {
    if (navigator?.clipboard && currentHostname) {
      navigator.clipboard.writeText(currentHostname);
      setDomainCopied(true);
      setTimeout(() => setDomainCopied(false), 2500);
      showToast('Domain Copied', `${currentHostname} copied to clipboard.`);
    }
  };

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsUnauthorizedDomain(false);
    setLoading(true);

    try {
      if (authMode === 'signup') {
        await signUpWithEmail(email, password, displayName || businessProfile.name);
        showToast('Account Created! 🎉', 'You can now log into your business workspace from any device.');
      } else {
        await signInWithEmail(email, password);
        showToast('Logged In Successfully', 'Connected to your cloud business workspace.');
      }
      onClose();
    } catch (err: any) {
      console.warn('Authentication attempt result:', err?.message || err);
      let msg = 'Authentication failed. Please check your credentials.';
      if (err.code === 'auth/network-request-failed') {
        msg = 'Network connection to the authentication service could not be established. Please check your internet connection or open the app in a new tab if running in an iframe.';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        msg = 'Invalid email or password. Please verify and try again.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Try signing in.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = 'Email/Password sign-in is not enabled. Please use Google Sign-in or local workspaces.';
      } else if (err.message) {
        msg = err.message;
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setIsUnauthorizedDomain(false);
    setLoading(true);
    try {
      await signInWithGoogle();
      showToast('Signed in with Google', 'Cloud synchronization activated across all devices.');
      onClose();
    } catch (err: any) {
      console.warn('Google sign-in attempt result:', err?.message || err);
      let msg = 'Google Sign-in was cancelled or encountered an issue.';
      if (err.code === 'auth/network-request-failed') {
        msg = 'Network issue connecting to Google authentication. If in an iframe preview, open the app in a new tab to complete sign-in.';
      } else if (err.code === 'auth/popup-blocked') {
        msg = 'The sign-in popup was blocked by your browser. Please allow popups or open in a new tab.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        msg = 'Sign-in popup was closed before completing.';
      } else if (err.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain')) {
        setIsUnauthorizedDomain(true);
        msg = 'This domain is not yet on the Authorized Domains list for Firebase project billaai-ten.';
      } else if (err.message) {
        msg = err.message;
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      showToast('Signed Out of Cloud', 'Working in offline local mode.', 'info');
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Sign out failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 pb-5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md shadow-inner">
              <Cloud className="w-6 h-6 text-indigo-200" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-white">
                {user ? 'Cloud Sync Active' : 'Sign In Anywhere'}
              </h2>
              <p className="text-xs text-indigo-200/90 mt-0.5">
                {user
                  ? 'Access your invoices, CRM, and settings on all devices'
                  : 'Sync your business across your phone, tablet, & PC'}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {user ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-900">
                    Logged in as {user.email}
                  </h4>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Your invoices, customers, and business data are safely connected and accessible on any device.
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Business Workspace</span>
                  <span className="font-bold text-slate-800">{businessProfile.name || 'Billa Workspace'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Account ID</span>
                  <span className="font-mono text-[10px] text-slate-600 truncate max-w-[180px]">{user.uid}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Sync Status</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <Cloud className="w-3 h-3" /> Real-time Cloud Active
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Disconnect Cloud Account (Sign Out)</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Google One-Tap Sign In */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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

              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-slate-200 w-full"></div>
                <span className="bg-white px-3 text-[10px] uppercase font-bold text-slate-400">
                  Or Email & Password
                </span>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium space-y-2">
                  <p>{errorMessage}</p>

                  {isUnauthorizedDomain && (
                    <div className="p-2.5 rounded-lg bg-white/90 border border-rose-200 text-slate-700 space-y-2 text-[11px]">
                      <div className="font-semibold text-slate-900">
                        How to authorize this domain in Firebase:
                      </div>
                      <ol className="list-decimal pl-4 space-y-1 text-slate-600">
                        <li>
                          Open <span className="font-semibold text-indigo-700">Firebase Console</span> for project <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-indigo-900 font-bold">{firebaseConfig.projectId}</code>
                        </li>
                        <li>
                          Go to <strong>Authentication</strong> &rarr; <strong>Settings</strong> &rarr; <strong>Authorized domains</strong>
                        </li>
                        <li>
                          Click <strong>Add domain</strong> and paste the host without <code className="text-rose-600 bg-rose-50 px-1 rounded">https://</code> or trailing <code className="text-rose-600 bg-rose-50 px-1 rounded">/</code>:
                        </li>
                      </ol>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          readOnly
                          value={currentHostname}
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[10px] text-slate-800 select-all"
                        />
                        <button
                          type="button"
                          onClick={copyCurrentDomain}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shrink-0 transition-colors cursor-pointer"
                        >
                          {domainCopied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-300" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Domain</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleEmailAuth} className="space-y-3">
                {authMode === 'signup' && (
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Full Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Prosper Ndubuizu"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50 mt-1"
                >
                  <span>{authMode === 'signin' ? 'Sign In to Workspace' : 'Create Cloud Account'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="text-center pt-1">
                {authMode === 'signin' ? (
                  <p className="text-xs text-slate-500">
                    Don't have a cloud account yet?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthMode('signup')}
                      className="text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                    >
                      Sign Up Free
                    </button>
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    Already registered?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthMode('signin')}
                      className="text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                    >
                      Sign In
                    </button>
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                <span>
                  Firebase Project:{' '}
                  <strong className="text-slate-600 font-mono font-semibold">{firebaseConfig.projectId}</strong>
                </span>
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <Cloud className="w-3 h-3" /> Ready
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
