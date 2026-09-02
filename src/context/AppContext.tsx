import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useFirebaseAuth } from './AuthContext';
import {
  BusinessProfile,
  Customer,
  CustomerNote,
  CustomerRiskAssessment,
  FinancialMetrics,
  Invoice,
  InvoiceStatus,
  RevenueTrendPoint,
  CurrencyCode,
  AIInsight,
  ReminderScheduleConfig,
  ReminderLog,
  ReminderTone,
  UserAccount,
} from '../types';
import {
  INITIAL_BUSINESS_PROFILE,
  INITIAL_CUSTOMERS,
  INITIAL_INVOICES,
  INITIAL_REMINDER_CONFIG,
  INITIAL_TREND_DATA,
} from '../data/mockData';

export type ActiveView =
  | 'dashboard'
  | 'invoices'
  | 'invoice-create'
  | 'invoice-view'
  | 'customers'
  | 'customer-profile'
  | 'reminders-hub'
  | 'ai-advisor'
  | 'settings';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

const DEFAULT_DEMO_ACCOUNT: UserAccount = {
  id: 'demo_account',
  businessName: 'Apex Studios Ltd',
  ownerName: 'Ndubuizu Prosper',
  email: 'hello@apexstudios.ng',
  phone: '+234 802 345 6789',
  currency: 'NGN',
  createdAt: '2026-08-01T00:00:00Z',
  isDemo: true,
};

interface AppContextType {
  currentAccount: UserAccount;
  accounts: UserAccount[];
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: 'cloud' | 'create' | 'switch';
  setAuthModalMode: (mode: 'cloud' | 'create' | 'switch') => void;
  openAuthModal: (mode?: 'cloud' | 'create' | 'switch') => void;
  createAccount: (data: {
    businessName: string;
    ownerName: string;
    email: string;
    phone?: string;
    currency: CurrencyCode;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
  }) => void;
  switchAccount: (accountId: string) => void;
  deleteAccount: (accountId: string) => void;
  logout: (options?: { clearLocalData?: boolean; deleteProfile?: boolean }) => void;
  businessProfile: BusinessProfile;
  updateBusinessProfile: (profile: Partial<BusinessProfile>) => void;
  invoices: Invoice[];
  customers: Customer[];
  activeCurrency: CurrencyCode;
  setActiveCurrency: (code: CurrencyCode) => void;
  currentView: ActiveView;
  setCurrentView: (view: ActiveView) => void;
  selectedInvoice: Invoice | null;
  setSelectedInvoice: (invoice: Invoice | null) => void;
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  metrics: FinancialMetrics;
  trendData: RevenueTrendPoint[];
  aiInsights: AIInsight[];
  toasts: ToastMessage[];
  showToast: (title: string, description?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  dismissToast: (id: string) => void;
  removeToast: (id: string) => void;
  createInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => Invoice;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  markInvoiceAsPaid: (id: string) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'totalBilled' | 'totalPaid' | 'outstandingBalance' | 'createdAt'>) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  addCustomerNote: (customerId: string, content: string, category?: CustomerNote['category'], author?: string) => void;
  deleteCustomerNote: (customerId: string, noteId: string) => void;
  analyzeCustomerRiskWithAI: (customerId: string) => Promise<CustomerRiskAssessment | null>;
  isAnalyzingCustomerRisk: boolean;
  reminderConfig: ReminderScheduleConfig;
  updateReminderConfig: (updates: Partial<ReminderScheduleConfig>) => void;
  reminderLogs: ReminderLog[];
  sendEmailReminder: (invoiceId: string, customSubject?: string, customBody?: string, tone?: ReminderTone) => Promise<boolean>;
  sendWhatsAppReminder: (invoiceId: string, customMessage?: string, tone?: ReminderTone) => void;
  autoScanAndDraftReminders: () => Promise<any[]>;
  isAutoScanningReminders: boolean;
  reminderModalInvoice: Invoice | null;
  setReminderModalInvoice: (invoice: Invoice | null) => void;
  isQuickPromptOpen: boolean;
  setIsQuickPromptOpen: (open: boolean) => void;
  isReceiptScannerOpen: boolean;
  setIsReceiptScannerOpen: (open: boolean) => void;
  receiptDraftData: any;
  setReceiptDraftData: (data: any) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebar: () => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
  isCloudAuthModalOpen: boolean;
  setIsCloudAuthModalOpen: (open: boolean) => void;
  isCloudSyncActive: boolean;
  resetToDefaultData: () => void;
  clearAllData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ACCOUNTS_LIST: 'billa_accounts_list_v3',
  ACTIVE_ACCOUNT_ID: 'billa_active_account_id_v3',
  PROFILE: 'billa_business_profile_v2',
  INVOICES: 'billa_invoices_v2',
  CUSTOMERS: 'billa_customers_v2',
  CURRENCY: 'billa_active_currency_v2',
  REMINDER_CONFIG: 'billa_reminder_config_v2',
  REMINDER_LOGS: 'billa_reminder_logs_v2',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Accounts List
  const [accounts, setAccounts] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACCOUNTS_LIST);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [DEFAULT_DEMO_ACCOUNT];
  });

  // Active Account ID
  const [activeAccountId, setActiveAccountId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_ACCOUNT_ID);
      if (saved) return saved;
    } catch {}
    return DEFAULT_DEMO_ACCOUNT.id;
  });

  const currentAccount = useMemo(() => {
    return accounts.find((a) => a.id === activeAccountId) || accounts[0] || DEFAULT_DEMO_ACCOUNT;
  }, [accounts, activeAccountId]);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'create' | 'switch'>('create');

  const openAuthModal = (mode: 'create' | 'switch' = 'create') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const getAccountKey = (accountId: string, suffix: string) => `billa_acc_${accountId}_${suffix}`;

  // State initialization with account key fallbacks
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(() => {
    try {
      const accKey = getAccountKey(activeAccountId, 'profile');
      const saved = localStorage.getItem(accKey) || localStorage.getItem(STORAGE_KEYS.PROFILE);
      return saved ? JSON.parse(saved) : INITIAL_BUSINESS_PROFILE;
    } catch {
      return INITIAL_BUSINESS_PROFILE;
    }
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    try {
      const accKey = getAccountKey(activeAccountId, 'invoices');
      const savedAcc = localStorage.getItem(accKey);
      if (savedAcc !== null) return JSON.parse(savedAcc);
      const saved = localStorage.getItem(STORAGE_KEYS.INVOICES);
      return saved ? JSON.parse(saved) : INITIAL_INVOICES;
    } catch {
      return INITIAL_INVOICES;
    }
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const accKey = getAccountKey(activeAccountId, 'customers');
      const savedAcc = localStorage.getItem(accKey);
      if (savedAcc !== null) return JSON.parse(savedAcc);
      const saved = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
    } catch {
      return INITIAL_CUSTOMERS;
    }
  });

  const [activeCurrency, setActiveCurrencyState] = useState<CurrencyCode>(() => {
    try {
      const accKey = getAccountKey(activeAccountId, 'currency');
      const saved = (localStorage.getItem(accKey) || localStorage.getItem(STORAGE_KEYS.CURRENCY)) as CurrencyCode;
      return saved || currentAccount.currency || 'NGN';
    } catch {
      return 'NGN';
    }
  });

  const [reminderConfig, setReminderConfig] = useState<ReminderScheduleConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.REMINDER_CONFIG);
      return saved ? JSON.parse(saved) : INITIAL_REMINDER_CONFIG;
    } catch {
      return INITIAL_REMINDER_CONFIG;
    }
  });

  const [reminderLogs, setReminderLogs] = useState<ReminderLog[]>(() => {
    try {
      const accKey = getAccountKey(activeAccountId, 'logs');
      const saved = localStorage.getItem(accKey) || localStorage.getItem(STORAGE_KEYS.REMINDER_LOGS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const { user, isCloudSyncActive } = useFirebaseAuth();

  const [currentView, setCurrentView] = useState<ActiveView>('dashboard');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [reminderModalInvoice, setReminderModalInvoice] = useState<Invoice | null>(null);
  const [isQuickPromptOpen, setIsQuickPromptOpen] = useState(false);
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false);
  const [receiptDraftData, setReceiptDraftData] = useState<any>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCloudAuthModalOpen, setIsCloudAuthModalOpen] = useState(false);
  const [isAnalyzingCustomerRisk, setIsAnalyzingCustomerRisk] = useState(false);
  const [isAutoScanningReminders, setIsAutoScanningReminders] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  // Real-time Cloud Synchronization with Firebase Firestore
  useEffect(() => {
    if (!user) return;

    // 1. Sync Business Profile from Cloud
    const unsubProfile = onSnapshot(
      doc(db, 'users', user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const cloudData = docSnap.data() as Partial<BusinessProfile>;
          setBusinessProfile((prev) => ({ ...prev, ...cloudData }));
        } else {
          // Upload initial profile to user's cloud document
          setDoc(
            doc(db, 'users', user.uid),
            {
              ...businessProfile,
              userId: user.uid,
              email: user.email || businessProfile.email,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          ).catch((e) => console.warn('Cloud profile sync write notice:', e));
        }
      },
      (error) => {
        console.warn('Cloud profile sync listener notice:', error?.message || error);
      }
    );

    // 2. Sync Invoices from Cloud
    const unsubInvoices = onSnapshot(
      collection(db, 'users', user.uid, 'invoices'),
      (snap) => {
        if (!snap.empty) {
          const cloudInvoices: Invoice[] = [];
          snap.forEach((d) => {
            cloudInvoices.push(d.data() as Invoice);
          });
          cloudInvoices.sort(
            (a, b) => new Date(b.createdAt || b.issueDate).getTime() - new Date(a.createdAt || a.issueDate).getTime()
          );
          setInvoices(cloudInvoices);
        }
      },
      (error) => {
        console.warn('Cloud invoices sync listener notice:', error?.message || error);
      }
    );

    // 3. Sync Customers from Cloud
    const unsubCustomers = onSnapshot(
      collection(db, 'users', user.uid, 'customers'),
      (snap) => {
        if (!snap.empty) {
          const cloudCustomers: Customer[] = [];
          snap.forEach((d) => {
            cloudCustomers.push(d.data() as Customer);
          });
          setCustomers(cloudCustomers);
        }
      },
      (error) => {
        console.warn('Cloud customers sync listener notice:', error?.message || error);
      }
    );

    // 4. Sync Reminders from Cloud
    const unsubReminders = onSnapshot(
      collection(db, 'users', user.uid, 'reminders'),
      (snap) => {
        if (!snap.empty) {
          const cloudLogs: ReminderLog[] = [];
          snap.forEach((d) => {
            cloudLogs.push(d.data() as ReminderLog);
          });
          cloudLogs.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
          setReminderLogs(cloudLogs);
        }
      },
      (error) => {
        console.warn('Cloud reminders sync listener notice:', error?.message || error);
      }
    );

    return () => {
      unsubProfile();
      unsubInvoices();
      unsubCustomers();
      unsubReminders();
    };
  }, [user]);

  // Sync Accounts List & Active ID to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS_LIST, JSON.stringify(accounts));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ACCOUNT_ID, activeAccountId);
    } catch {}
  }, [accounts, activeAccountId]);

  // Sync Per-Account state to local storage
  useEffect(() => {
    try {
      localStorage.setItem(getAccountKey(activeAccountId, 'profile'), JSON.stringify(businessProfile));
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(businessProfile));
    } catch (e) {
      console.warn('Storage save failed', e);
    }
  }, [businessProfile, activeAccountId]);

  useEffect(() => {
    try {
      localStorage.setItem(getAccountKey(activeAccountId, 'invoices'), JSON.stringify(invoices));
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
    } catch (e) {
      console.warn('Storage save failed', e);
    }
  }, [invoices, activeAccountId]);

  useEffect(() => {
    try {
      localStorage.setItem(getAccountKey(activeAccountId, 'customers'), JSON.stringify(customers));
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    } catch (e) {
      console.warn('Storage save failed', e);
    }
  }, [customers, activeAccountId]);

  useEffect(() => {
    try {
      localStorage.setItem(getAccountKey(activeAccountId, 'logs'), JSON.stringify(reminderLogs));
      localStorage.setItem(STORAGE_KEYS.REMINDER_LOGS, JSON.stringify(reminderLogs));
    } catch (e) {
      console.warn('Storage save failed', e);
    }
  }, [reminderLogs, activeAccountId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.REMINDER_CONFIG, JSON.stringify(reminderConfig));
    } catch (e) {
      console.warn('Storage save failed', e);
    }
  }, [reminderConfig]);

  const setActiveCurrency = (code: CurrencyCode) => {
    setActiveCurrencyState(code);
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENCY, code);
    } catch {}
  };

  const showToast = (
    title: string,
    description?: string,
    type: 'success' | 'info' | 'warning' | 'error' = 'success'
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Keep customer financial totals in sync with invoices
  useEffect(() => {
    setCustomers((prevCustomers) => {
      let changed = false;
      const updated = prevCustomers.map((cust) => {
        const custInvoices = invoices.filter(
          (inv) => inv.customerId === cust.id || inv.customerName.toLowerCase() === cust.name.toLowerCase()
        );
        const totalBilled = custInvoices.reduce((sum, i) => sum + (i.status !== 'cancelled' ? i.total : 0), 0);
        const totalPaid = custInvoices.reduce((sum, i) => sum + (i.status === 'paid' ? i.total : 0), 0);
        const outstandingBalance = totalBilled - totalPaid;

        if (
          cust.totalBilled !== totalBilled ||
          cust.totalPaid !== totalPaid ||
          cust.outstandingBalance !== outstandingBalance
        ) {
          changed = true;
          return {
            ...cust,
            totalBilled,
            totalPaid,
            outstandingBalance,
          };
        }
        return cust;
      });
      return changed ? updated : prevCustomers;
    });
  }, [invoices]);

  // Derived financial metrics
  const metrics: FinancialMetrics = useMemo(() => {
    let totalInvoiced = 0;
    let collected = 0;
    let outstanding = 0;
    let overdue = 0;
    let overdueCount = 0;
    let activeCount = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    invoices.forEach((inv) => {
      if (inv.status === 'cancelled') return;

      totalInvoiced += inv.total;

      if (inv.status === 'paid') {
        collected += inv.total;
      } else {
        outstanding += inv.total;
        activeCount++;

        const due = new Date(inv.dueDate);
        due.setHours(0, 0, 0, 0);
        if (inv.status === 'overdue' || due < today) {
          overdue += inv.total;
          overdueCount++;
        }
      }
    });

    const collectionRate = totalInvoiced > 0 ? Math.round((collected / totalInvoiced) * 100) : 0;

    return {
      totalInvoiced,
      collected,
      outstanding,
      overdue,
      collectionRate,
      averageDaysToPay: 8,
      activeInvoicesCount: activeCount,
      overdueInvoicesCount: overdueCount,
    };
  }, [invoices]);

  // Derived AI insights based on live business state
  const aiInsights: AIInsight[] = useMemo(() => {
    const insights: AIInsight[] = [];
    const overdueInvoices = invoices.filter(
      (i) => i.status === 'overdue' || (i.status === 'pending' && new Date(i.dueDate) < new Date())
    );

    if (overdueInvoices.length > 0) {
      const oldest = [...overdueInvoices].sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      )[0];
      insights.push({
        id: 'ins-overdue',
        title: 'Outstanding Collection Alert',
        summary: `You have ₦${metrics.outstanding.toLocaleString()} outstanding across ${metrics.activeInvoicesCount} invoices. ${overdueInvoices.length} payment${overdueInvoices.length > 1 ? 's are' : ' is'} overdue. ${oldest.customerName} has the oldest outstanding invoice.`,
        type: 'action_required',
        urgency: 'high',
        targetInvoiceId: oldest.id,
        targetCustomerName: oldest.customerName,
        actionLabel: 'View details',
      });
    }

    if (metrics.collectionRate >= 65) {
      insights.push({
        id: 'ins-healthy',
        title: 'Strong Cashflow Velocity',
        summary: `${metrics.collectionRate}% of your total billed revenue is collected. Your average settlement time is 8 days, outpacing the small business average of 21 days.`,
        type: 'cashflow',
        urgency: 'low',
        actionLabel: 'Explore Insights',
      });
    }

    return insights;
  }, [invoices, metrics]);

  const updateBusinessProfile = (profileUpdates: Partial<BusinessProfile>) => {
    const updated = { ...businessProfile, ...profileUpdates };
    setBusinessProfile(updated);
    if (user) {
      setDoc(
        doc(db, 'users', user.uid),
        {
          ...updated,
          userId: user.uid,
          email: user.email || updated.email,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch((err) => console.warn('Cloud sync error (profile):', err));
    }
    showToast('Business Profile Updated', 'Your company and banking details have been saved.');
  };

  const updateReminderConfig = (updates: Partial<ReminderScheduleConfig>) => {
    setReminderConfig((prev) => ({ ...prev, ...updates }));
    showToast('Follow-Up Rules Updated', 'Your AI reminder schedule and tone preferences have been saved.');
  };

  const createInvoice = (invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Invoice => {
    const now = new Date().toISOString();
    const newInvoice: Invoice = {
      ...invoiceData,
      id: `inv-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
      reminderCount: 0,
    };

    setInvoices((prev) => [newInvoice, ...prev]);

    if (user) {
      setDoc(doc(db, 'users', user.uid, 'invoices', newInvoice.id), {
        ...newInvoice,
        userId: user.uid,
      }).catch((err) => console.warn('Cloud sync error (create invoice):', err));
    }

    // Update or link customer
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === newInvoice.customerId || c.name.toLowerCase() === newInvoice.customerName.toLowerCase()) {
          const updatedCust = {
            ...c,
            totalBilled: c.totalBilled + newInvoice.total,
            outstandingBalance: c.outstandingBalance + (newInvoice.status === 'paid' ? 0 : newInvoice.total),
            totalPaid: c.totalPaid + (newInvoice.status === 'paid' ? newInvoice.total : 0),
          };
          if (user) {
            setDoc(doc(db, 'users', user.uid, 'customers', updatedCust.id), {
              ...updatedCust,
              userId: user.uid,
            }).catch((err) => console.warn('Cloud sync error (customer totals):', err));
          }
          return updatedCust;
        }
        return c;
      })
    );

    showToast('Invoice Created', `Invoice ${newInvoice.invoiceNumber} has been generated successfully.`);
    return newInvoice;
  };

  const updateInvoice = (id: string, updates: Partial<Invoice>) => {
    const updatedAt = new Date().toISOString();
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === id) {
          const merged = { ...inv, ...updates, updatedAt };
          if (user) {
            setDoc(doc(db, 'users', user.uid, 'invoices', id), merged, { merge: true }).catch((err) =>
              console.warn('Cloud sync error (update invoice):', err)
            );
          }
          return merged;
        }
        return inv;
      })
    );
    if (selectedInvoice?.id === id) {
      setSelectedInvoice((prev) => (prev ? { ...prev, ...updates, updatedAt } : null));
    }
    showToast('Invoice Updated', 'Changes saved successfully.');
  };

  const deleteInvoice = (id: string) => {
    setInvoices((prev) => prev.filter((i) => i.id !== id));
    if (user) {
      deleteDoc(doc(db, 'users', user.uid, 'invoices', id)).catch((err) =>
        console.warn('Cloud sync error (delete invoice):', err)
      );
    }
    if (selectedInvoice?.id === id) {
      setSelectedInvoice(null);
      setCurrentView('invoices');
    }
    showToast('Invoice Deleted', 'The invoice has been removed.', 'info');
  };

  const markInvoiceAsPaid = (id: string) => {
    const target = invoices.find((i) => i.id === id);
    if (!target) return;

    const now = new Date().toISOString();
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === id) {
          const merged = { ...inv, status: 'paid' as const, paidAt: now, updatedAt: now };
          if (user) {
            setDoc(doc(db, 'users', user.uid, 'invoices', id), merged, { merge: true }).catch((err) =>
              console.warn('Cloud sync error (mark invoice paid):', err)
            );
          }
          return merged;
        }
        return inv;
      })
    );

    if (selectedInvoice?.id === id) {
      setSelectedInvoice((prev) => (prev ? { ...prev, status: 'paid', paidAt: now } : null));
    }

    // Add note to customer profile if matched
    if (target.customerId) {
      addCustomerNote(
        target.customerId,
        `Payment confirmed for Invoice ${target.invoiceNumber} (₦${target.total.toLocaleString()}) via bank settlement.`,
        'payment_promise',
        'System Automated'
      );
    }

    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4F46E5', '#6366F1', '#10B981', '#34D399', '#FFFFFF'],
      });
    } catch {}

    showToast(
      'Payment Confirmed! 🎉',
      `Invoice ${target.invoiceNumber} (₦${target.total.toLocaleString()}) marked as paid.`,
      'success'
    );
  };

  const addCustomer = (
    custData: Omit<Customer, 'id' | 'totalBilled' | 'totalPaid' | 'outstandingBalance' | 'createdAt'>
  ): Customer => {
    const newCustomer: Customer = {
      ...custData,
      id: `cust-${Date.now()}`,
      totalBilled: 0,
      totalPaid: 0,
      outstandingBalance: 0,
      createdAt: new Date().toISOString().split('T')[0],
      paymentReliability: 'high',
      notes: [
        {
          id: `note-${Date.now()}`,
          customerId: `cust-${Date.now()}`,
          category: 'general',
          content: `Customer profile created. Initial contact details saved.`,
          createdAt: new Date().toISOString(),
          author: businessProfile.name || 'Admin',
        },
      ],
      riskAssessment: {
        customerId: `cust-${Date.now()}`,
        riskScore: 85,
        riskLevel: 'low',
        reliabilityRating: 'New Client (Initial Rating)',
        averageDaysToPay: 7,
        onTimePaymentPercentage: 100,
        paymentConsistency: 'Very High',
        summary: `${custData.name} has been onboarded. No historical arrears detected.`,
        keyStrengths: ['New client profile', 'Complete contact details provided'],
        riskFactors: ['No extensive payment track record yet'],
        strategicRecommendation: 'Standard Net 14 terms apply. Require milestone sign-offs.',
        suggestedPaymentTerms: 'Net 14 Days',
        lastAnalyzedAt: new Date().toISOString(),
      },
    };
    setCustomers((prev) => [newCustomer, ...prev]);

    if (user) {
      setDoc(doc(db, 'users', user.uid, 'customers', newCustomer.id), {
        ...newCustomer,
        userId: user.uid,
      }).catch((err) => console.warn('Cloud sync error (add customer):', err));
    }

    showToast('Customer Added', `${newCustomer.name} has been added to your CRM directory.`);
    return newCustomer;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const updated = { ...c, ...updates };
          if (user) {
            setDoc(doc(db, 'users', user.uid, 'customers', id), updated, { merge: true }).catch((err) =>
              console.warn('Cloud sync error (update customer):', err)
            );
          }
          if (selectedCustomer?.id === id) {
            setSelectedCustomer(updated);
          }
          return updated;
        }
        return c;
      })
    );
    showToast('Customer Updated', 'Client contact information refreshed.');
  };

  const deleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    if (user) {
      deleteDoc(doc(db, 'users', user.uid, 'customers', id)).catch((err) =>
        console.warn('Cloud sync error (delete customer):', err)
      );
    }
    if (selectedCustomer?.id === id) {
      setSelectedCustomer(null);
      setCurrentView('customers');
    }
    showToast('Customer Removed', 'Customer record has been deleted.', 'info');
  };

  const addCustomerNote = (
    customerId: string,
    content: string,
    category: CustomerNote['category'] = 'general',
    author: string = businessProfile.name || 'Staff'
  ) => {
    const newNote: CustomerNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      customerId,
      content,
      category,
      createdAt: new Date().toISOString(),
      author,
    };

    setCustomers((prev) =>
      prev.map((cust) => {
        if (cust.id === customerId) {
          const updatedNotes = [newNote, ...(cust.notes || [])];
          const updatedCust = { ...cust, notes: updatedNotes };
          if (user) {
            setDoc(doc(db, 'users', user.uid, 'customers', customerId), updatedCust, { merge: true }).catch((err) =>
              console.warn('Cloud sync error (add note):', err)
            );
          }
          if (selectedCustomer?.id === customerId) {
            setSelectedCustomer(updatedCust);
          }
          return updatedCust;
        }
        return cust;
      })
    );

    showToast('Note Added', 'Note saved to customer profile.', 'success');
  };

  const deleteCustomerNote = (customerId: string, noteId: string) => {
    setCustomers((prev) =>
      prev.map((cust) => {
        if (cust.id === customerId) {
          const updatedNotes = (cust.notes || []).filter((n) => n.id !== noteId);
          const updatedCust = { ...cust, notes: updatedNotes };
          if (user) {
            setDoc(doc(db, 'users', user.uid, 'customers', customerId), updatedCust, { merge: true }).catch((err) =>
              console.warn('Cloud sync error (delete note):', err)
            );
          }
          if (selectedCustomer?.id === customerId) {
            setSelectedCustomer(updatedCust);
          }
          return updatedCust;
        }
        return cust;
      })
    );
    showToast('Note Deleted', 'Customer note removed.', 'info');
  };

  const analyzeCustomerRiskWithAI = async (customerId: string): Promise<CustomerRiskAssessment | null> => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return null;

    setIsAnalyzingCustomerRisk(true);
    try {
      const response = await fetch('/api/ai/customer-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer,
          invoices,
          businessProfile,
        }),
      });

      if (!response.ok) throw new Error('AI analysis service error');
      const assessment: CustomerRiskAssessment = await response.json();

      // Update customer in state
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === customerId) {
            const updated = {
              ...c,
              riskAssessment: assessment,
              paymentReliability: assessment.riskLevel === 'low' ? 'high' : assessment.riskLevel === 'medium' ? 'medium' : 'slow',
            };
            if (selectedCustomer?.id === customerId) {
              setSelectedCustomer(updated);
            }
            return updated;
          }
          return c;
        })
      );

      // Add a note about the audit
      addCustomerNote(
        customerId,
        `AI Risk Audit conducted: Risk Score ${assessment.riskScore}/100 (${assessment.reliabilityRating}). Recommendation: ${assessment.strategicRecommendation}`,
        'reminder',
        'Gemini AI Engine'
      );

      showToast('AI Risk Audit Complete', `Reliability Rating: ${assessment.reliabilityRating} (${assessment.riskScore}/100)`);
      return assessment;
    } catch (error) {
      console.error('Error analyzing customer risk:', error);
      showToast('Risk Analysis Note', 'Generated algorithmic rating from recent payment history.', 'info');
      return null;
    } finally {
      setIsAnalyzingCustomerRisk(false);
    }
  };

  const sendEmailReminder = async (
    invoiceId: string,
    customSubject?: string,
    customBody?: string,
    tone: ReminderTone = reminderConfig.defaultTone
  ): Promise<boolean> => {
    const invoice = invoices.find((i) => i.id === invoiceId);
    if (!invoice) return false;

    const subject = customSubject || `Payment Reminder: Invoice ${invoice.invoiceNumber} from ${businessProfile.name}`;
    const bankInfo = `${businessProfile.bankName}, Acct: ${businessProfile.accountNumber} (${businessProfile.accountName})`;
    const body = customBody || `Dear ${invoice.customerName},\n\nThis is a polite reminder regarding Invoice ${invoice.invoiceNumber} for ₦${invoice.total.toLocaleString()}, which was due on ${invoice.dueDate}.\n\nSettlement Bank Details:\n${bankInfo}\n\nKindly remit payment and share the confirmation receipt.\n\nWarm regards,\n${businessProfile.name}`;

    const now = new Date().toISOString();

    // 1. Create reminder log
    const log: ReminderLog = {
      id: `log-${Date.now()}`,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      customerEmail: invoice.customerEmail,
      channel: 'email',
      tone,
      subject,
      message: body,
      sentAt: now,
      status: 'delivered',
    };

    setReminderLogs((prev) => [log, ...prev]);

    if (user) {
      setDoc(doc(db, 'users', user.uid, 'reminders', log.id), {
        ...log,
        userId: user.uid,
      }).catch((err) => console.warn('Cloud sync error (email reminder log):', err));
    }
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? {
              ...inv,
              reminderCount: (inv.reminderCount || 0) + 1,
              lastReminderSentAt: now,
              updatedAt: now,
            }
          : inv
      )
    );

    // 3. Add CRM Note to customer profile
    if (invoice.customerId) {
      addCustomerNote(
        invoice.customerId,
        `Automated Email Reminder dispatched for Invoice ${invoice.invoiceNumber} (₦${invoice.total.toLocaleString()}). Tone: ${tone}.`,
        'reminder',
        reminderConfig.emailSenderName || 'AI Auto-Reminder'
      );
    }

    // 4. Open mailto client as fallback/real trigger
    try {
      const mailtoUrl = `mailto:${encodeURIComponent(invoice.customerEmail)}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`;
      window.open(mailtoUrl, '_blank');
    } catch {}

    showToast('Email Reminder Sent 📧', `Dispatched to ${invoice.customerEmail} (${invoice.invoiceNumber})`);
    return true;
  };

  const sendWhatsAppReminder = (
    invoiceId: string,
    customMessage?: string,
    tone: ReminderTone = reminderConfig.defaultTone
  ) => {
    const invoice = invoices.find((i) => i.id === invoiceId);
    if (!invoice) return;

    const bankInfo = `${businessProfile.bankName}, Acct: ${businessProfile.accountNumber} (${businessProfile.accountName})`;
    const message =
      customMessage ||
      `Hi ${invoice.customerName}! Gentle reminder regarding Invoice *${invoice.invoiceNumber}* (*₦${invoice.total.toLocaleString()}*).\n\nBank Details:\n🏦 ${bankInfo}\n\nKindly let us know once transferred. Thank you!\n— ${businessProfile.name}`;

    const now = new Date().toISOString();

    // Log reminder
    const log: ReminderLog = {
      id: `log-${Date.now()}`,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      customerEmail: invoice.customerEmail,
      channel: 'whatsapp',
      tone,
      message,
      sentAt: now,
      status: 'sent',
    };

    setReminderLogs((prev) => [log, ...prev]);

    if (user) {
      setDoc(doc(db, 'users', user.uid, 'reminders', log.id), {
        ...log,
        userId: user.uid,
      }).catch((err) => console.warn('Cloud sync error (whatsapp reminder log):', err));
    }
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? {
              ...inv,
              reminderCount: (inv.reminderCount || 0) + 1,
              lastReminderSentAt: now,
              updatedAt: now,
            }
          : inv
      )
    );

    // Add CRM note
    if (invoice.customerId) {
      addCustomerNote(
        invoice.customerId,
        `WhatsApp Reminder sent for Invoice ${invoice.invoiceNumber}. Tone: ${tone}.`,
        'reminder',
        'WhatsApp Messenger'
      );
    }

    const cleanPhone = invoice.customerPhone.replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    showToast('WhatsApp Reminder Sent', `Opened WhatsApp chat for ${invoice.customerName}`);
  };

  const autoScanAndDraftReminders = async (): Promise<any[]> => {
    setIsAutoScanningReminders(true);
    const overdueInvoices = invoices.filter(
      (i) => i.status === 'overdue' || (i.status === 'pending' && new Date(i.dueDate) < new Date())
    );

    try {
      const response = await fetch('/api/ai/batch-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overdueInvoices,
          businessProfile,
          tone: reminderConfig.defaultTone,
        }),
      });

      const data = await response.json();
      showToast(
        'Overdue Invoices Scanned',
        `Generated ${data.reminders?.length || 0} customized follow-up reminders.`,
        'success'
      );
      return data.reminders || [];
    } catch (e) {
      console.error('Batch scan error:', e);
      showToast('Scan Note', 'Detected overdue invoices for review.', 'info');
      return [];
    } finally {
      setIsAutoScanningReminders(false);
    }
  };

  const createAccount = (data: {
    businessName: string;
    ownerName: string;
    email: string;
    phone?: string;
    currency: CurrencyCode;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
  }) => {
    const newId = `acc_${Date.now()}`;
    const newAccount: UserAccount = {
      id: newId,
      businessName: data.businessName,
      ownerName: data.ownerName,
      email: data.email,
      phone: data.phone || '',
      currency: data.currency,
      createdAt: new Date().toISOString(),
      isDemo: false,
    };

    const newProfile: BusinessProfile = {
      name: data.businessName,
      tagline: 'Professional Billing & Invoicing',
      email: data.email,
      phone: data.phone || '',
      address: '',
      bankName: data.bankName || '',
      accountNumber: data.accountNumber || '',
      accountName: data.accountName || data.businessName,
      preferredCurrency: data.currency,
      defaultPaymentTermsDays: 14,
      defaultTaxRate: data.currency === 'NGN' ? 7.5 : 0,
    };

    // Save newly created account data to storage
    try {
      localStorage.setItem(getAccountKey(newId, 'profile'), JSON.stringify(newProfile));
      localStorage.setItem(getAccountKey(newId, 'invoices'), JSON.stringify([]));
      localStorage.setItem(getAccountKey(newId, 'customers'), JSON.stringify([]));
      localStorage.setItem(getAccountKey(newId, 'logs'), JSON.stringify([]));
      localStorage.setItem(getAccountKey(newId, 'currency'), data.currency);
    } catch {}

    const updatedAccounts = [newAccount, ...accounts];
    setAccounts(updatedAccounts);
    setActiveAccountId(newId);

    // Set state to completely clean slate
    setBusinessProfile(newProfile);
    setInvoices([]);
    setCustomers([]);
    setReminderLogs([]);
    setActiveCurrencyState(data.currency);
    setSelectedInvoice(null);
    setSelectedCustomer(null);
    setReminderModalInvoice(null);
    setCurrentView('dashboard');

    showToast(
      `Welcome to ${data.businessName}!`,
      'Clean slate workspace created with zero dummy data. You are ready to issue invoices!',
      'success'
    );
  };

  const switchAccount = (accountId: string) => {
    const target = accounts.find((a) => a.id === accountId);
    if (!target) return;

    setActiveAccountId(accountId);

    // Load target account data from local storage
    try {
      const profileStr = localStorage.getItem(getAccountKey(accountId, 'profile'));
      if (profileStr) {
        setBusinessProfile(JSON.parse(profileStr));
      } else if (target.isDemo) {
        setBusinessProfile(INITIAL_BUSINESS_PROFILE);
      }

      const invStr = localStorage.getItem(getAccountKey(accountId, 'invoices'));
      if (invStr) {
        setInvoices(JSON.parse(invStr));
      } else if (target.isDemo) {
        setInvoices(INITIAL_INVOICES);
      } else {
        setInvoices([]);
      }

      const custStr = localStorage.getItem(getAccountKey(accountId, 'customers'));
      if (custStr) {
        setCustomers(JSON.parse(custStr));
      } else if (target.isDemo) {
        setCustomers(INITIAL_CUSTOMERS);
      } else {
        setCustomers([]);
      }

      const logsStr = localStorage.getItem(getAccountKey(accountId, 'logs'));
      if (logsStr) {
        setReminderLogs(JSON.parse(logsStr));
      } else {
        setReminderLogs([]);
      }

      const curr = (localStorage.getItem(getAccountKey(accountId, 'currency')) as CurrencyCode) || target.currency || 'NGN';
      setActiveCurrencyState(curr);
    } catch (e) {
      console.warn('Switch account load error', e);
    }

    setSelectedInvoice(null);
    setSelectedCustomer(null);
    setReminderModalInvoice(null);
    setCurrentView('dashboard');
    showToast('Workspace Switched', `Active Profile: ${target.businessName}`, 'info');
  };

  const deleteAccount = (accountId: string) => {
    const updated = accounts.filter((a) => a.id !== accountId);
    if (updated.length === 0) {
      setAccounts([DEFAULT_DEMO_ACCOUNT]);
      switchAccount(DEFAULT_DEMO_ACCOUNT.id);
    } else {
      setAccounts(updated);
      if (activeAccountId === accountId) {
        switchAccount(updated[0].id);
      }
    }
    showToast('Account Deleted', 'Removed workspace profile from registry.', 'info');
  };

  const logout = (options?: { clearLocalData?: boolean; deleteProfile?: boolean }) => {
    if (options?.deleteProfile) {
      deleteAccount(activeAccountId);
    } else if (options?.clearLocalData) {
      // Clear data for this account specifically
      try {
        localStorage.removeItem(getAccountKey(activeAccountId, 'profile'));
        localStorage.removeItem(getAccountKey(activeAccountId, 'invoices'));
        localStorage.removeItem(getAccountKey(activeAccountId, 'customers'));
        localStorage.removeItem(getAccountKey(activeAccountId, 'logs'));
        localStorage.removeItem(getAccountKey(activeAccountId, 'currency'));
      } catch {}

      // Reset state in memory
      setBusinessProfile({
        name: '',
        tagline: '',
        email: '',
        phone: '',
        address: '',
        bankName: '',
        accountNumber: '',
        accountName: '',
        preferredCurrency: 'NGN',
        defaultPaymentTermsDays: 14,
        defaultTaxRate: 7.5,
      });
      setInvoices([]);
      setCustomers([]);
      setReminderLogs([]);
    }

    // Reset current active session pointers
    setSelectedInvoice(null);
    setSelectedCustomer(null);
    setReminderModalInvoice(null);
    setCurrentView('dashboard');

    // Prompt user with fresh account setup immediately
    setAuthModalMode('create');
    setIsAuthModalOpen(true);
    showToast(
      'Session Reset & Logged Out',
      'Local business profile has been reset. Enter your new details to sign into a fresh workspace.',
      'info'
    );
  };

  const resetToDefaultData = () => {
    setBusinessProfile(INITIAL_BUSINESS_PROFILE);
    setInvoices(INITIAL_INVOICES);
    setCustomers(INITIAL_CUSTOMERS);
    setReminderConfig(INITIAL_REMINDER_CONFIG);
    setActiveCurrency('NGN');
    showToast('Reset Complete', 'Sample business data, CRM notes, and invoices reloaded.');
  };

  const clearAllData = () => {
    setInvoices([]);
    setCustomers([]);
    setReminderLogs([]);
    setSelectedInvoice(null);
    setSelectedCustomer(null);
    setReminderModalInvoice(null);
    try {
      localStorage.setItem(getAccountKey(activeAccountId, 'invoices'), JSON.stringify([]));
      localStorage.setItem(getAccountKey(activeAccountId, 'customers'), JSON.stringify([]));
      localStorage.setItem(getAccountKey(activeAccountId, 'logs'), JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.REMINDER_LOGS, JSON.stringify([]));
    } catch {}
    showToast('Clean Slate Ready', 'All data cleared. You can now add your own customers and invoices from scratch!', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        currentAccount,
        accounts,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        openAuthModal,
        createAccount,
        switchAccount,
        deleteAccount,
        logout,
        businessProfile,
        updateBusinessProfile,
        invoices,
        customers,
        activeCurrency,
        setActiveCurrency,
        currentView,
        setCurrentView,
        selectedInvoice,
        setSelectedInvoice,
        selectedCustomer,
        setSelectedCustomer,
        metrics,
        trendData: INITIAL_TREND_DATA,
        aiInsights,
        toasts,
        showToast,
        dismissToast,
        removeToast: dismissToast,
        createInvoice,
        updateInvoice,
        deleteInvoice,
        markInvoiceAsPaid,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addCustomerNote,
        deleteCustomerNote,
        analyzeCustomerRiskWithAI,
        isAnalyzingCustomerRisk,
        reminderConfig,
        updateReminderConfig,
        reminderLogs,
        sendEmailReminder,
        sendWhatsAppReminder,
        autoScanAndDraftReminders,
        isAutoScanningReminders,
        reminderModalInvoice,
        setReminderModalInvoice,
        isQuickPromptOpen,
        setIsQuickPromptOpen,
        isReceiptScannerOpen,
        setIsReceiptScannerOpen,
        receiptDraftData,
        setReceiptDraftData,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebar,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        isCloudAuthModalOpen,
        setIsCloudAuthModalOpen,
        isCloudSyncActive: !!user,
        resetToDefaultData,
        clearAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

