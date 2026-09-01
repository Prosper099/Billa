import { BusinessProfile, Customer, Invoice, ReminderScheduleConfig, RevenueTrendPoint } from '../types';

export const INITIAL_BUSINESS_PROFILE: BusinessProfile = {
  name: 'Apex Studios',
  tagline: 'Brand Strategy, Digital Production & UI/UX Design',
  email: 'billing@apexstudios.africa',
  phone: '+234 803 555 0192',
  address: '14 Admiralty Way, Lekki Phase 1, Lagos, Nigeria',
  website: 'https://apexstudios.africa',
  bankName: 'Guaranty Trust Bank (GTBank)',
  accountNumber: '0239481920',
  accountName: 'Apex Creative Media Ltd',
  preferredCurrency: 'NGN',
  defaultPaymentTermsDays: 14,
  defaultTaxRate: 7.5,
  taxNumber: 'TIN-99482019-001',
};

export const INITIAL_REMINDER_CONFIG: ReminderScheduleConfig = {
  enabled: true,
  defaultTone: 'friendly',
  sendEmail: true,
  sendWhatsApp: true,
  schedulePoints: {
    beforeDueDays: 2,
    onDueDate: true,
    overdueDays: [3, 7, 14],
  },
  emailSenderName: 'Apex Studios Billing',
  autoAttachPdfStatement: true,
};

// Clean database starter: Exactly ONE initial customer example
export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Chinedu Okonkwo',
    companyName: 'Chinedu Enterprises & Logistics',
    email: 'chinedu@enterprises.ng',
    phone: '+234 802 334 9910',
    address: 'Plot 8 Commercial Avenue, Yaba, Lagos',
    taxId: 'TIN-49201922-01',
    preferredPaymentTermsDays: 14,
    tags: ['VIP Client', 'Logistics'],
    totalBilled: 45000,
    totalPaid: 0,
    outstandingBalance: 45000,
    createdAt: '2026-08-15',
    paymentReliability: 'medium',
    notes: [
      {
        id: 'note-1-1',
        customerId: 'cust-1',
        category: 'general',
        content: 'Client onboarded for Brand Identity & Digital Design project.',
        createdAt: '2026-08-15T10:00:00Z',
        author: 'Apex Billing Desk',
      },
    ],
    riskAssessment: {
      customerId: 'cust-1',
      riskScore: 78,
      riskLevel: 'medium',
      reliabilityRating: 'Standard Commercial Terms',
      averageDaysToPay: 10,
      onTimePaymentPercentage: 80,
      paymentConsistency: 'Moderate',
      summary: 'Chinedu Okonkwo has an active invoice for ₦45,000 awaiting settlement.',
      keyStrengths: [
        'Responsive to WhatsApp communication',
        'Clear project scope and signed terms',
      ],
      riskFactors: [
        'Active invoice nearing payment due date',
      ],
      strategicRecommendation: 'Send a gentle WhatsApp courtesy nudge 2 days before payment due date.',
      suggestedPaymentTerms: 'Net 14 Days',
      lastAnalyzedAt: '2026-08-31T08:00:00Z',
    },
  },
];

// Clean database starter: Exactly ONE initial invoice example
export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'BIL-2026-001',
    customerId: 'cust-1',
    customerName: 'Chinedu Okonkwo',
    customerEmail: 'chinedu@enterprises.ng',
    customerPhone: '+234 802 334 9910',
    customerAddress: 'Plot 8 Commercial Avenue, Yaba, Lagos',
    issueDate: '2026-08-20',
    dueDate: '2026-09-03',
    items: [
      {
        id: 'item-1-1',
        description: 'Brand Identity Redesign & Social Media Kit',
        quantity: 1,
        unitPrice: 45000,
        total: 45000,
      },
    ],
    subtotal: 45000,
    taxRate: 0,
    taxAmount: 0,
    total: 45000,
    status: 'pending',
    notes: 'Thank you for your business! Payment due via direct bank transfer.',
    paymentTerms: 'Payment due within 14 days of invoice receipt.',
    currency: 'NGN',
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z',
    reminderCount: 0,
  },
];

export const INITIAL_TREND_DATA: RevenueTrendPoint[] = [
  { month: 'Apr', invoiced: 0, collected: 0, outstanding: 0 },
  { month: 'May', invoiced: 0, collected: 0, outstanding: 0 },
  { month: 'Jun', invoiced: 0, collected: 0, outstanding: 0 },
  { month: 'Jul', invoiced: 0, collected: 0, outstanding: 0 },
  { month: 'Aug (Current)', invoiced: 45000, collected: 0, outstanding: 45000 },
];
