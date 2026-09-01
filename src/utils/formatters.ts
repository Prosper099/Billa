import { CurrencyCode, CurrencyConfig } from '../types';

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  NGN: {
    code: 'NGN',
    symbol: '₦',
    name: 'Nigerian Naira',
    rateAgainstNGN: 1,
    locale: 'en-NG',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    rateAgainstNGN: 1550,
    locale: 'en-US',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    rateAgainstNGN: 1950,
    locale: 'en-GB',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    rateAgainstNGN: 1680,
    locale: 'de-DE',
  },
  KES: {
    code: 'KES',
    symbol: 'KSh',
    name: 'Kenyan Shilling',
    rateAgainstNGN: 12,
    locale: 'en-KE',
  },
  GHS: {
    code: 'GHS',
    symbol: 'GH₵',
    name: 'Ghanaian Cedi',
    rateAgainstNGN: 105,
    locale: 'en-GH',
  },
};

export function formatCurrency(
  amount: number,
  currencyCode: CurrencyCode = 'NGN',
  options?: { compact?: boolean; hideDecimals?: boolean }
): string {
  const currency = CURRENCIES[currencyCode] || CURRENCIES.NGN;
  const val = isNaN(amount) ? 0 : amount;

  if (options?.compact && Math.abs(val) >= 1000000) {
    return `${currency.symbol}${(val / 1000000).toFixed(1)}M`;
  }
  if (options?.compact && Math.abs(val) >= 10000) {
    return `${currency.symbol}${(val / 1000).toFixed(0)}k`;
  }

  const formattedNumber = new Intl.NumberFormat(currency.locale, {
    minimumFractionDigits: options?.hideDecimals ? 0 : (currencyCode === 'NGN' || currencyCode === 'KES' ? 0 : 2),
    maximumFractionDigits: 2,
  }).format(val);

  return `${currency.symbol}${formattedNumber}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function getDaysDifference(dueDateString: string): number {
  if (!dueDateString) return 0;
  const due = new Date(dueDateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function generateInvoiceNumber(existingCount: number = 0): string {
  const currentYear = new Date().getFullYear();
  const nextNum = String(existingCount + 1).padStart(3, '0');
  return `BIL-${currentYear}-${nextNum}`;
}
