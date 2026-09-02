import React, { useState } from 'react';
import {
  X,
  LayoutDashboard,
  FileText,
  Users,
  Sparkles,
  Settings,
  Plus,
  Zap,
  Camera,
  Cloud,
  Globe,
  ArrowUpRight,
  LogOut,
  CreditCard,
  Copy,
  Check,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useApp, ActiveView } from '../context/AppContext';
import { useFirebaseAuth } from '../context/AuthContext';
import { CURRENCIES } from '../utils/formatters';
import { CurrencyCode } from '../types';

export const MobileSidebarDrawer: React.FC = () => {
  const {
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    currentView,
    setCurrentView,
    metrics,
    customers,
    businessProfile,
    activeCurrency,
    setActiveCurrency,
    setIsQuickPromptOpen,
    setIsReceiptScannerOpen,
    setIsAuthModalOpen,
    setIsCloudAuthModalOpen,
    showToast,
    logout,
  } = useApp();

  const { user, signOutUser } = useFirebaseAuth();
  const [copiedAccount, setCopiedAccount] = useState(false);

  if (!isMobileSidebarOpen) return null;

  const handleLogout = async () => {
    setIsMobileSidebarOpen(false);
    logout();
    await signOutUser();
  };

  const handleNavClick = (view: ActiveView) => {
    setCurrentView(view);
    setIsMobileSidebarOpen(false);
  };

  const handleCopyAccount = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!businessProfile.accountNumber) return;
    navigator.clipboard.writeText(businessProfile.accountNumber);
    setCopiedAccount(true);
    showToast('Account Number Copied', `${businessProfile.accountNumber} copied to clipboard!`, 'success');
    setTimeout(() => setCopiedAccount(false), 2500);
  };

  const navItems: {
    id: ActiveView;
    label: string;
    icon: React.ReactNode;
    badge?: number | string;
    badgeColor?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5 shrink-0" />,
    },
    {
      id: 'invoices',
      label: 'Invoices & Billing',
      icon: <FileText className="w-5 h-5 shrink-0" />,
      badge: metrics.overdueInvoicesCount > 0 ? `${metrics.overdueInvoicesCount} overdue` : undefined,
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    {
      id: 'reminders-hub',
      label: 'AI Reminders Hub',
      icon: <Sparkles className="w-5 h-5 shrink-0 text-indigo-600" />,
      badge: metrics.overdueInvoicesCount > 0 ? `${metrics.overdueInvoicesCount}` : 'AUTO',
      badgeColor: metrics.overdueInvoicesCount > 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    {
      id: 'customers',
      label: 'Customers & CRM',
      icon: <Users className="w-5 h-5 shrink-0" />,
      badge: `${customers.length}`,
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    },
    {
      id: 'ai-advisor',
      label: 'AI Financial Advisor',
      icon: <Sparkles className="w-5 h-5 shrink-0" />,
    },
    {
      id: 'settings',
      label: 'Business Settings',
      icon: <Settings className="w-5 h-5 shrink-0" />,
    },
  ];

  return (
    <div className="lg:hidden fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-fadeIn"
        onClick={() => setIsMobileSidebarOpen(false)}
      />

      {/* Drawer Body */}
      <div className="relative w-4/5 max-w-sm bg-white h-full shadow-2xl flex flex-col justify-between p-5 overflow-y-auto z-10 animate-slideRight">
        <div className="space-y-5">
          {/* Header & Close */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <BrandLogo size="sm" showTagline={true} />
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action Tools Card */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
              Quick Actions
            </div>

            {/* 1. Camera Receipt Scanner */}
            <button
              type="button"
              id="mobile-drawer-scan-btn"
              onClick={() => {
                setIsMobileSidebarOpen(false);
                setIsReceiptScannerOpen(true);
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs active:scale-[0.98] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Camera className="w-4 h-4 text-indigo-400 shrink-0 group-hover:scale-110 transition-transform" />
                <span className="truncate whitespace-nowrap">Scan Receipt Photo</span>
              </div>
              <span className="shrink-0 ml-1 text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded font-mono font-bold whitespace-nowrap">
                AI Vision
              </span>
            </button>

            {/* 2. New Invoice */}
            <button
              type="button"
              onClick={() => handleNavClick('invoice-create')}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
                <span className="truncate whitespace-nowrap">Create New Invoice</span>
              </div>
            </button>

            {/* 3. AI Voice/Text Prompt */}
            <button
              type="button"
              onClick={() => {
                setIsMobileSidebarOpen(false);
                setIsQuickPromptOpen(true);
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-slate-800 font-semibold text-xs transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="truncate whitespace-nowrap">Prompt to Invoice</span>
              </div>
              <span className="shrink-0 ml-1 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono font-bold whitespace-nowrap">
                Voice/Text
              </span>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 pb-1">
              Navigation
            </div>
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={isActive ? 'text-indigo-600' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <span className="truncate whitespace-nowrap">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`shrink-0 ml-2 text-[10px] px-2 py-0.5 rounded-full font-semibold border whitespace-nowrap ${
                        item.badgeColor || 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Currency Selection Dropdown */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-600 font-semibold shrink-0">
              <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Active Currency</span>
            </span>
            <select
              aria-label="Select mobile currency"
              value={activeCurrency}
              onChange={(e) => setActiveCurrency(e.target.value as CurrencyCode)}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-indigo-600 focus:outline-none cursor-pointer"
            >
              {Object.values(CURRENCIES).map((curr) => (
                <option key={curr.code} value={curr.code}>
                  {curr.symbol} {curr.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer Workspace Status & Dedicated Logout */}
        <div className="pt-4 border-t border-slate-200 space-y-2">
          {/* Quick Account Copy on Mobile */}
          {businessProfile.accountNumber && (
            <div
              onClick={handleCopyAccount}
              className="p-2 rounded-xl bg-indigo-50/60 hover:bg-indigo-100 border border-indigo-200/70 flex items-center justify-between text-xs cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <CreditCard className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] uppercase font-bold text-indigo-700 leading-none">
                    Settlement Acct
                  </p>
                  <p className="text-[11px] font-mono font-bold text-slate-900 truncate mt-0.5">
                    {businessProfile.accountNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyAccount}
                className="shrink-0 p-1 text-indigo-600 hover:bg-white/80 rounded"
              >
                {copiedAccount ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          )}

          {/* Active Workspace Status & Dedicated Logout */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {user ? (user.displayName || user.email?.split('@')[0] || 'Active User') : 'Workspace Active'}
                </p>
                <p className="text-[10px] text-slate-500 truncate font-normal">
                  {user ? (user.email || 'Cloud Synced') : 'Local Mode'}
                </p>
              </div>
            </div>

            <button
              type="button"
              id="mobile-drawer-logout-btn"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer border border-rose-200/60 shrink-0"
              title="Sign out of workspace"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
