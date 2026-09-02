export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';

export type CurrencyCode = 'NGN' | 'USD' | 'GBP' | 'EUR' | 'KES' | 'GHS';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  rateAgainstNGN: number; // For multi-currency display
  locale: string;
}

export interface UserAccount {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone?: string;
  currency: CurrencyCode;
  createdAt: string;
  isDemo?: boolean;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface CustomerNote {
  id: string;
  customerId: string;
  content: string;
  category: 'general' | 'payment_promise' | 'call_log' | 'discount_agreement' | 'reminder';
  createdAt: string; // ISO string
  author?: string;
}

export interface CustomerRiskAssessment {
  customerId: string;
  riskScore: number; // 0 - 100 (higher = more reliable / lower credit risk)
  riskLevel: 'low' | 'medium' | 'high';
  reliabilityRating: string; // e.g. "Prompt & Reliable", "Moderate Settler", "High Follow-Up Risk"
  averageDaysToPay: number;
  onTimePaymentPercentage: number;
  paymentConsistency: 'Very High' | 'Moderate' | 'Irregular' | 'Unpredictable';
  summary: string;
  keyStrengths: string[];
  riskFactors: string[];
  strategicRecommendation: string;
  suggestedPaymentTerms: string;
  lastAnalyzedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  companyName?: string;
  email: string;
  phone: string;
  address?: string;
  taxId?: string;
  preferredPaymentTermsDays?: number;
  tags?: string[];
  notes?: CustomerNote[];
  riskAssessment?: CustomerRiskAssessment;
  totalBilled: number;
  totalPaid: number;
  outstandingBalance: number;
  createdAt: string;
  paymentReliability?: 'high' | 'medium' | 'slow';
}

export interface BusinessProfile {
  name: string;
  tagline: string;
  email: string;
  phone: string;
  address: string;
  website?: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  preferredCurrency: CurrencyCode;
  defaultPaymentTermsDays: number;
  defaultTaxRate: number; // e.g., 7.5 for VAT
  taxNumber?: string;
  logoUrl?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. "INV-2026-001"
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress?: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  items: InvoiceItem[];
  subtotal: number;
  discountPercentage?: number;
  discountAmount?: number;
  taxRate?: number;
  taxAmount?: number;
  deliveryFee?: number;
  total: number;
  status: InvoiceStatus;
  notes?: string;
  paymentTerms?: string;
  paymentInstructions?: string;
  currency: CurrencyCode;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  lastReminderSentAt?: string;
  reminderCount?: number;
}

export interface FinancialMetrics {
  totalInvoiced: number;
  collected: number;
  outstanding: number;
  overdue: number;
  collectionRate: number; // percentage
  averageDaysToPay: number;
  activeInvoicesCount: number;
  overdueInvoicesCount: number;
}

export interface AIInsight {
  id: string;
  title: string;
  summary: string;
  type: 'action_required' | 'cashflow' | 'milestone' | 'recommendation';
  urgency: 'high' | 'medium' | 'low';
  targetInvoiceId?: string;
  targetCustomerName?: string;
  actionLabel?: string;
}

export type ReminderTone = 'friendly' | 'professional' | 'firm' | 'urgent' | 'warm_african';

export interface FollowUpTemplate {
  tone: ReminderTone;
  channel: 'whatsapp' | 'email';
  subject?: string;
  message: string;
}

export interface ReminderScheduleConfig {
  enabled: boolean;
  defaultTone: ReminderTone;
  sendEmail: boolean;
  sendWhatsApp: boolean;
  schedulePoints: {
    beforeDueDays: number; // e.g. 2 days before
    onDueDate: boolean;
    overdueDays: number[]; // e.g. [3, 7, 14, 21]
  };
  emailSenderName: string;
  autoAttachPdfStatement: boolean;
}

export interface ReminderLog {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  channel: 'email' | 'whatsapp';
  tone: ReminderTone;
  subject?: string;
  message: string;
  sentAt: string;
  status: 'delivered' | 'sent' | 'drafted';
}

export interface RevenueTrendPoint {
  month: string;
  invoiced: number;
  collected: number;
  outstanding: number;
}

export interface ConfirmationModalConfig {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
  onCancel?: () => void;
}

