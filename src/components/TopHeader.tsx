import React from 'react';
import {
  Menu,
  Plus,
  Zap,
  Camera,
  Cloud,
  Globe,
  User,
  LogOut,
  PanelLeftOpen,
  PanelLeftClose,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useApp } from '../context/AppContext';
import { useFirebaseAuth } from '../context/AuthContext';
import { CURRENCIES } from '../utils/formatters';
import { CurrencyCode } from '../types';

export const TopHeader: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    activeCurrency,
    setActiveCurrency,
    setIsQuickPromptOpen,
    setIsReceiptScannerOpen,
    setIsMobileSidebarOpen,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    toggleSidebar,
    businessProfile,
    logout,
  } = useApp();

  const { user, signOutUser } = useFirebaseAuth();

  const handleLogout = async () => {
    logout();
    await signOutUser();
  };

  const getTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return 'Executive Overview';
      case 'invoices':
        return 'Invoices & Billing';
      case 'reminders-hub':
        return 'AI Overdue Reminders Hub';
      case 'invoice-create':
        return 'New Invoice Studio';
      case 'invoice-view':
        return 'Invoice Document';
      case 'customers':
        return 'Customer CRM & Ledgers';
      case 'customer-profile':
        return 'Customer Profile & Insights';
      case 'ai-advisor':
        return 'Billa AI Financial Advisor';
      case 'settings':
        return 'Business Settings';
      default:
        return 'Billa';
    }
  };

  return (
    <header className="no-print bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-3.5 sm:px-4 lg:px-8 py-3 sticky top-0 z-30 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      {/* Left: Mobile Hamburger & Desktop Toggle + Title */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          type="button"
          id="btn-mobile-menu-toggle"
          onClick={() => setIsMobileSidebarOpen(true)}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Sidebar Open Toggle (when collapsed) */}
        {isSidebarCollapsed && (
          <button
            type="button"
            id="btn-desktop-sidebar-open"
            onClick={() => setIsSidebarCollapsed(false)}
            className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 text-xs font-semibold transition-all cursor-pointer mr-2"
            title="Open Sidebar"
          >
            <PanelLeftOpen className="w-4 h-4 text-indigo-600" />
            <span>Open Menu</span>
          </button>
        )}

        <div className="lg:hidden flex items-center">
          <BrandLogo size="sm" />
        </div>

        {isSidebarCollapsed && (
          <div className="hidden lg:flex items-center mr-3">
            <BrandLogo size="sm" showTagline={false} />
          </div>
        )}

        <div className="hidden lg:block">
          <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{getTitle()}</span>
          </h1>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Scan Receipt Quick Button */}
        <button
          type="button"
          id="top-scan-receipt-btn"
          onClick={() => setIsReceiptScannerOpen(true)}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-950 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer group"
          title="Scan Receipt with Camera"
        >
          <Camera className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">Scan Receipt</span>
          <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-1 py-0.2 rounded font-mono hidden md:inline">
            OCR
          </span>
        </button>

        {/* Active Workspace Status Badge */}
        <div
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold"
          title={user?.email ? `Logged in as ${user.email}` : 'Local Workspace Active'}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-medium truncate max-w-[120px]">
            {user ? (user.displayName || user.email?.split('@')[0] || 'Synced') : 'Workspace'}
          </span>
        </div>

        {/* Dedicated Log Out Button */}
        <button
          type="button"
          id="top-header-logout-btn"
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200/80 text-xs font-bold transition-all cursor-pointer"
          title="Sign out of workspace"
        >
          <LogOut className="w-3.5 h-3.5 stroke-[2.2]" />
          <span className="hidden sm:inline">Log Out</span>
        </button>

        {/* Primary New Invoice Button */}
        {currentView !== 'invoice-create' && (
          <button
            id="top-create-invoice-btn"
            onClick={() => setCurrentView('invoice-create')}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden xs:inline sm:inline">New Invoice</span>
          </button>
        )}
      </div>
    </header>
  );
};
