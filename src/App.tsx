import React from 'react';
import { FirebaseAuthProvider, useFirebaseAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { HomePage } from './components/HomePage';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { MobileNav } from './components/MobileNav';
import { DashboardView } from './components/DashboardView';
import { InvoicesView } from './components/InvoicesView';
import { InvoiceEditor } from './components/InvoiceEditor';
import { InvoiceDocument } from './components/InvoiceDocument';
import { CustomersView } from './components/CustomersView';
import { CustomerProfileView } from './components/CustomerProfileView';
import { RemindersHubView } from './components/RemindersHubView';
import { AIAdvisorView } from './components/AIAdvisorView';
import { SettingsView } from './components/SettingsView';
import { QuickPromptModal } from './components/QuickPromptModal';
import { ReminderModal } from './components/ReminderModal';
import { ReceiptScannerModal } from './components/ReceiptScannerModal';
import { MobileSidebarDrawer } from './components/MobileSidebarDrawer';
import { ConfirmationModal } from './components/ConfirmationModal';
import { ToastContainer } from './components/Toast';

const AppRoot: React.FC = () => {
  const { isAuthenticated, isLoading } = useFirebaseAuth();
  const {
    currentView,
    setCurrentView,
    selectedInvoice,
    selectedCustomer,
    setSelectedCustomer,
    businessProfile,
  } = useApp();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono tracking-wider text-slate-400">CONNECTING TO BILLA WORKSPACE...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <HomePage />
        <ToastContainer />
      </>
    );
  }

  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'invoices':
        return <InvoicesView />;
      case 'reminders-hub':
        return <RemindersHubView />;
      case 'invoice-create':
        return <InvoiceEditor />;
      case 'invoice-view':
        return selectedInvoice ? (
          <InvoiceDocument
            invoice={selectedInvoice}
            businessProfile={businessProfile}
            onBack={() => setCurrentView('invoices')}
          />
        ) : (
          <InvoicesView />
        );
      case 'customers':
        return <CustomersView />;
      case 'customer-profile':
        return selectedCustomer ? (
          <CustomerProfileView
            customer={selectedCustomer}
            onBack={() => {
              setSelectedCustomer(null);
              setCurrentView('customers');
            }}
          />
        ) : (
          <CustomersView />
        );
      case 'ai-advisor':
        return <AIAdvisorView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7F9] text-[#1A1C1E] flex flex-col antialiased">
      <div className="flex flex-1">
        {/* Persistent Desktop Sidebar */}
        <Sidebar />

        {/* Main Content Body */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Sticky Header */}
          <TopHeader />

          {/* Page View Canvas with bottom padding for mobile bar */}
          <main className="flex-1 pb-24 lg:pb-12">
            {renderActiveView()}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation & Mobile Sidebar Drawer */}
      <MobileNav />
      <MobileSidebarDrawer />

      {/* Global Interactive Modals & Floating Toasts */}
      <ReceiptScannerModal />
      <QuickPromptModal />
      <ReminderModal />
      <ConfirmationModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <FirebaseAuthProvider>
      <AppProvider>
        <AppRoot />
      </AppProvider>
    </FirebaseAuthProvider>
  );
}


