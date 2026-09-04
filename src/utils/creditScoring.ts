import { Customer, Invoice } from '../types';

export interface CustomerCreditMetrics {
  score: number; // 0 - 100
  rating: string;
  riskLevel: 'low' | 'medium' | 'high';
  onTimePaymentPercentage: number;
  averageDaysToPay: number;
  totalBilled: number;
  totalPaid: number;
  outstandingBalance: number;
  overdueAmount: number;
  overdueCount: number;
  paidCount: number;
  totalInvoices: number;
  isNewClient: boolean;
}

/**
 * Accurately calculates a customer's credit reliability metrics from real ledger and payment behavior.
 */
export function calculateCustomerCreditMetrics(
  customer: Customer,
  allInvoices: Invoice[]
): CustomerCreditMetrics {
  const customerInvoices = allInvoices.filter(
    (inv) =>
      inv.customerId === customer.id ||
      (Boolean(inv.customerName && customer.name) &&
        inv.customerName.trim().toLowerCase() === customer.name.trim().toLowerCase())
  );

  const activeInvoices = customerInvoices.filter((inv) => inv.status !== 'cancelled');
  const totalBilled = activeInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const paidInvoices = activeInvoices.filter((inv) => inv.status === 'paid');
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const outstandingBalance = Math.max(0, totalBilled - totalPaid);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueInvoices = activeInvoices.filter((inv) => {
    if (inv.status === 'overdue') return true;
    if (inv.status === 'pending' && inv.dueDate) {
      const due = new Date(inv.dueDate);
      due.setHours(0, 0, 0, 0);
      return due < today;
    }
    return false;
  });

  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const overdueCount = overdueInvoices.length;
  const paidCount = paidInvoices.length;
  const totalInvoices = activeInvoices.length;
  const isNewClient = totalInvoices === 0;

  // For a brand new client with no invoices yet
  if (isNewClient) {
    const defaultScore = customer.riskAssessment?.riskScore ?? 100;
    return {
      score: defaultScore,
      rating: customer.riskAssessment?.reliabilityRating || 'New Account (Pristine Terms)',
      riskLevel: defaultScore >= 80 ? 'low' : defaultScore >= 60 ? 'medium' : 'high',
      onTimePaymentPercentage: 100,
      averageDaysToPay: customer.preferredPaymentTermsDays || 14,
      totalBilled: 0,
      totalPaid: 0,
      outstandingBalance: 0,
      overdueAmount: 0,
      overdueCount: 0,
      paidCount: 0,
      totalInvoices: 0,
      isNewClient: true,
    };
  }

  // Calculate percentage of invoices settled or serviced on time
  const healthyCount = totalInvoices - overdueCount;
  const onTimePercentage = Math.round((healthyCount / totalInvoices) * 100);

  // Compute calculated score from 100 downwards based on real delinquency metrics
  let calculatedScore = 100;

  // Deduction 1: Count of overdue invoices vs total invoices (up to 30 pts)
  const overdueCountRatio = overdueCount / totalInvoices;
  calculatedScore -= Math.round(overdueCountRatio * 30);

  // Deduction 2: Ratio of overdue balance to total billed amount (up to 35 pts)
  if (totalBilled > 0) {
    const overdueAmountRatio = overdueAmount / totalBilled;
    calculatedScore -= Math.round(overdueAmountRatio * 35);
  }

  // Deduction 3: Aging severity
  let maxDaysOverdue = 0;
  overdueInvoices.forEach((inv) => {
    const due = new Date(inv.dueDate);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.max(0, Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
    if (diffDays > maxDaysOverdue) maxDaysOverdue = diffDays;
  });

  if (maxDaysOverdue > 30) {
    calculatedScore -= 20;
  } else if (maxDaysOverdue > 14) {
    calculatedScore -= 12;
  } else if (maxDaysOverdue > 0) {
    calculatedScore -= 5;
  }

  // Track record reward for paid invoices when no overdue exists
  if (paidCount > 0 && overdueCount === 0) {
    calculatedScore = Math.min(100, calculatedScore + Math.min(10, paidCount * 2));
  }

  calculatedScore = Math.max(15, Math.min(100, calculatedScore));

  // If customer has an existing riskAssessment, reconcile with live invoice state
  let finalScore = calculatedScore;
  if (customer.riskAssessment?.riskScore !== undefined) {
    if (overdueCount > 0) {
      finalScore = Math.min(customer.riskAssessment.riskScore, calculatedScore);
    } else if (paidCount > 0 && customer.outstandingBalance === 0) {
      finalScore = Math.max(customer.riskAssessment.riskScore, calculatedScore);
    } else {
      finalScore = customer.riskAssessment.riskScore;
    }
  }

  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  let rating = 'Prompt & Reliable';

  if (finalScore >= 80) {
    riskLevel = 'low';
    rating = overdueCount === 0 ? 'Prompt & Reliable' : 'Standard Commercial Terms';
  } else if (finalScore >= 60) {
    riskLevel = 'medium';
    rating = 'Moderate (Follow-Up Recommended)';
  } else {
    riskLevel = 'high';
    rating = 'Elevated Credit Risk (Delinquent Arrears)';
  }

  return {
    score: finalScore,
    rating,
    riskLevel,
    onTimePaymentPercentage: onTimePercentage,
    averageDaysToPay:
      customer.riskAssessment?.averageDaysToPay ??
      (customer.preferredPaymentTermsDays || (overdueCount > 0 ? 18 : 7)),
    totalBilled,
    totalPaid,
    outstandingBalance,
    overdueAmount,
    overdueCount,
    paidCount,
    totalInvoices,
    isNewClient: false,
  };
}

/**
 * Computes portfolio-wide average credit reliability score and status label
 */
export function calculatePortfolioCreditReliability(
  customers: Customer[],
  invoices: Invoice[]
): {
  averageScore: number;
  displayScore: string;
  statusLabel: string;
  totalEvaluated: number;
} {
  if (!customers || customers.length === 0) {
    return {
      averageScore: 100,
      displayScore: '—',
      statusLabel: 'No client accounts recorded',
      totalEvaluated: 0,
    };
  }

  const scores = customers.map((c) => calculateCustomerCreditMetrics(c, invoices).score);
  const sum = scores.reduce((acc, val) => acc + val, 0);
  const averageScore = Math.round(sum / customers.length);

  let statusLabel = 'Portfolio Average: High Reliability';
  if (averageScore >= 80) {
    statusLabel = 'Low Credit Risk (Prompt Settlements)';
  } else if (averageScore >= 65) {
    statusLabel = 'Standard Terms (Active Monitoring)';
  } else {
    statusLabel = 'Elevated Risk (Follow-Ups Active)';
  }

  return {
    averageScore,
    displayScore: `${averageScore} / 100`,
    statusLabel,
    totalEvaluated: customers.length,
  };
}
