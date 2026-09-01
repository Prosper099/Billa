import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Users,
  Sparkles,
  Settings,
  Camera,
  Plus,
} from 'lucide-react';
import { useApp, ActiveView } from '../context/AppContext';

export const MobileNav: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    metrics,
    setIsReceiptScannerOpen,
  } = useApp();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-1.5 select-none shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between max-w-md mx-auto relative">
        {/* 1. Dashboard */}
        <button
          type="button"
          id="mobile-nav-dashboard"
          onClick={() => setCurrentView('dashboard')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl text-[10px] font-semibold transition-all cursor-pointer ${
            currentView === 'dashboard'
              ? 'text-indigo-600 font-bold scale-105'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="mt-0.5">Home</span>
        </button>

        {/* 2. Invoices */}
        <button
          type="button"
          id="mobile-nav-invoices"
          onClick={() => setCurrentView('invoices')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl text-[10px] font-semibold transition-all cursor-pointer relative ${
            currentView === 'invoices'
              ? 'text-indigo-600 font-bold scale-105'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="relative">
            <FileText className="w-5 h-5" />
            {metrics.overdueInvoicesCount > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center border border-white">
                {metrics.overdueInvoicesCount}
              </span>
            )}
          </div>
          <span className="mt-0.5">Invoices</span>
        </button>

        {/* 3. Center Floating Camera Receipt Scanner */}
        <button
          type="button"
          id="mobile-nav-camera-scan"
          onClick={() => setIsReceiptScannerOpen(true)}
          className="relative -top-3 flex flex-col items-center justify-center w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white shadow-lg shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer border-2 border-white"
          title="Scan Receipt Photo"
        >
          <Camera className="w-5 h-5" />
        </button>

        {/* 4. Customers */}
        <button
          type="button"
          id="mobile-nav-customers"
          onClick={() => setCurrentView('customers')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl text-[10px] font-semibold transition-all cursor-pointer ${
            currentView === 'customers'
              ? 'text-indigo-600 font-bold scale-105'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="mt-0.5">Clients</span>
        </button>

        {/* 5. AI Hub / Reminders */}
        <button
          type="button"
          id="mobile-nav-reminders"
          onClick={() => setCurrentView('reminders-hub')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl text-[10px] font-semibold transition-all cursor-pointer ${
            currentView === 'reminders-hub'
              ? 'text-indigo-600 font-bold scale-105'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="mt-0.5">AI Hub</span>
        </button>
      </div>
    </div>
  );
};
