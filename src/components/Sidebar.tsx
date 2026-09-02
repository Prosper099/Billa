import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  Users,
  Sparkles,
  Settings,
  Plus,
  ArrowUpRight,
  Zap,
  Cloud,
  Globe,
  Camera,
  CreditCard,
  Copy,
  Check,
  ChevronLeft,
  LogOut,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useApp, ActiveView } from '../context/AppContext';
import { useFirebaseAuth } from '../context/AuthContext';
import { CURRENCIES } from '../utils/formatters';
import { CurrencyCode } from '../types';

export const Sidebar: React.FC = () => {
  const {
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
    isSidebarCollapsed,
    setIsSidebarCollapsed,
  } = useApp();

  const { user, signOutUser } = useFirebaseAuth();
  const [copiedAccount, setCopiedAccount] = useState(false);

  const handleLogout = async () => {
    logout({ clearLocalData: false });
    await signOutUser();
  };

  if (isSidebarCollapsed) {
    return null;
  }

  const handleCopyAccount = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!businessProfile.accountNumber) {
      showToast('No Account Number', 'Set up your bank account in Settings.', 'error');
      return;
    }
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
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'invoices',
      label: 'Invoices',
      icon: <FileText className="w-4 h-4 shrink-0" />,
      badge: metrics.overdueInvoicesCount > 0 ? `${metrics.overdueInvoicesCount} overdue` : undefined,
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    {
      id: 'reminders-hub',
      label: 'AI Reminders',
      icon: <Sparkles className="w-4 h-4 shrink-0 text-indigo-600" />,
      badge: metrics.overdueInvoicesCount > 0 ? `${metrics.overdueInvoicesCount}` : 'AUTO',
      badgeColor: metrics.overdueInvoicesCount > 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    {
      id: 'customers',
      label: 'Customers & CRM',
      icon: <Users className="w-4 h-4 shrink-0" />,
      badge: `${customers.length}`,
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    },
    {
      id: 'ai-advisor',
      label: 'AI Advisor',
      icon: <Sparkles className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4 shrink-0" />,
    },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-200/90 p-5 shrink-0 h-screen sticky top-0 justify-between select-none shadow-[1px_0_4px_rgba(0,0,0,0.02)] overflow-y-auto">
      <div className="space-y-4">
        {/* Logo & Close Button Section */}
        <div className="flex items-center justify-between gap-2">
          <div
            id="billa-sidebar-logo"
            onClick={() => setCurrentView('dashboard')}
            className="cursor-pointer transition-opacity hover:opacity-90 py-1 flex-1 min-w-0"
          >
            <BrandLogo size="md" showTagline={true} />
          </div>
          <button
            type="button"
            id="btn-sidebar-collapse"
            onClick={() => setIsSidebarCollapsed(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Action Buttons */}
        <div className="space-y-2 pt-1">
          {/* Create Invoice Primary Button */}
          <button
            type="button"
            id="sidebar-create-invoice-btn"
            onClick={() => setCurrentView('invoice-create')}
            className="w-full group flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition-all duration-150 active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5] group-hover:rotate-90 transition-transform duration-200 shrink-0" />
            <span className="whitespace-nowrap font-bold">Create Invoice</span>
          </button>

          {/* 📸 Scan Receipt / Take Camera Photo Button */}
          <button
            type="button"
            id="sidebar-scan-receipt-btn"
            onClick={() => setIsReceiptScannerOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Camera className="w-3.5 h-3.5 text-indigo-400 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="whitespace-nowrap truncate">Scan Receipt</span>
            </div>
            <span className="shrink-0 text-[10px] bg-indigo-500/30 text-indigo-200 px-1.5 py-0.5 rounded font-mono font-bold whitespace-nowrap">
              AI Vision
            </span>
          </button>

          {/* AI Quick Voice/Text Prompt CTA */}
          <button
            type="button"
            id="sidebar-ai-prompt-btn"
            onClick={() => setIsQuickPromptOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-indigo-50/70 text-slate-700 hover:text-indigo-900 border border-slate-200 hover:border-indigo-200 text-xs font-medium transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Zap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="whitespace-nowrap truncate">Prompt to Invoice</span>
            </div>
            <span className="shrink-0 text-[10px] bg-slate-200/70 group-hover:bg-indigo-100 px-1.5 py-0.5 rounded text-slate-600 group-hover:text-indigo-700 font-mono font-bold whitespace-nowrap">
              Voice/Text
            </span>
          </button>
        </div>

        {/* Main Navigation Links */}
        <nav className="space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-1">
            Menu
          </div>
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                id={`sidebar-nav-${item.id}`}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50/90 text-indigo-900 border border-indigo-200/80 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/90'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`shrink-0 ${
                      isActive
                        ? 'text-indigo-600'
                        : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  >
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

        {/* Currency Switcher in Sidebar */}
        <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-slate-500 font-medium whitespace-nowrap shrink-0">
            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Currency:</span>
          </span>
          <select
            id="sidebar-currency-selector"
            aria-label="Select currency"
            value={activeCurrency}
            onChange={(e) => setActiveCurrency(e.target.value as CurrencyCode)}
            className="bg-transparent text-xs font-bold text-indigo-700 focus:outline-none cursor-pointer pr-1 truncate"
          >
            {Object.values(CURRENCIES).map((curr) => (
              <option key={curr.code} value={curr.code}>
                {curr.symbol} {curr.code}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bottom Business Card & Settlement Account with Switch & Logout */}
      <div className="pt-3 border-t border-slate-200 space-y-2">
        {/* Quick Settlement Account Number Copy Box */}
        {businessProfile.accountNumber && (
          <div
            id="sidebar-quick-account-copy"
            onClick={handleCopyAccount}
            className="p-2 rounded-xl bg-indigo-50/60 hover:bg-indigo-100/70 border border-indigo-200/70 flex items-center justify-between text-xs cursor-pointer transition-colors group"
            title="Click to copy account number"
          >
            <div className="flex items-center gap-2 min-w-0">
              <CreditCard className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] uppercase font-bold text-indigo-700 tracking-wider leading-none">
                  Settlement Acct
                </p>
                <p className="text-[11px] font-mono font-bold text-slate-900 truncate mt-0.5">
                  {businessProfile.bankName ? `${businessProfile.bankName}: ` : ''}
                  {businessProfile.accountNumber}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyAccount}
              className="shrink-0 p-1 rounded-md text-indigo-600 hover:bg-white/80 transition-colors"
              title="Copy Account Number"
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
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-800 truncate">
                {user ? (user.displayName || user.email?.split('@')[0] || 'Active Workspace') : 'Workspace Active'}
              </p>
              <p className="text-[10px] text-slate-500 truncate font-normal">
                {user ? (user.email || 'Cloud Synced') : 'Local Session'}
              </p>
            </div>
          </div>
          <button
            type="button"
            id="sidebar-logout-btn"
            onClick={handleLogout}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold transition-all cursor-pointer shrink-0 border border-rose-200/60"
            title="Log out of workspace"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
