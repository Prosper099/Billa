export interface ExtractedPromptInvoice {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  discountPercentage: number;
  dueDate: string;
  notes: string;
}

/**
 * Intelligent deterministic NLP prompt parser for Billa AI.
 * Extracts customer, amounts, quantities, line items, discounts, and due dates.
 * Used for instant client-side execution, offline operation, and reliable server-side fallback.
 */
export function extractInvoiceFromPrompt(
  promptText: string,
  defaultCurrency: string = 'NGN'
): ExtractedPromptInvoice {
  const text = promptText.trim();

  // 1. Extract Customer Name
  let customerName = 'Valued Client';
  const customerPrefixMatch = text.match(
    /(?:billed|invoiced|invoice|bill|charge|send invoice to|work for|consulted for|shoot for|for|to)\s+([A-Za-z\s.-]+?)(?=\s*[:,\n]|\s+for\b|\s+at\b|\s+[₦\$€£]|\s+\b\d+|\s+with\b|\s+due\b|$)/i
  );

  if (customerPrefixMatch && customerPrefixMatch[1]) {
    const candidate = customerPrefixMatch[1].trim();
    if (candidate.length >= 2 && !/^(?:a|an|the|my|our|some|new|all)$/i.test(candidate)) {
      customerName = candidate;
    }
  } else {
    const colonMatch = text.match(/^([A-Za-z\s.-]+?)\s*:/);
    if (colonMatch && colonMatch[1]) {
      customerName = colonMatch[1].trim();
    }
  }

  // Clean customer name if any trailing punctuation
  customerName = customerName.replace(/^[:,\s-]+|[:,\s-]+$/g, '');

  // 2. Extract Discount
  let discountPercentage = 0;
  const discountMatch = text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:discount|off|disc)/i);
  if (discountMatch) {
    discountPercentage = parseFloat(discountMatch[1]) || 0;
  }

  // 3. Extract Due Date
  let dueDate = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
  const dueDaysMatch = text.match(/due\s+in\s+(\d+)\s*days?/i);
  if (dueDaysMatch) {
    const days = parseInt(dueDaysMatch[1], 10) || 14;
    dueDate = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
  } else if (/due\s+tomorrow/i.test(text)) {
    dueDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  } else if (/due\s+next\s+week/i.test(text)) {
    dueDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  } else if (/due\s+next\s+friday/i.test(text)) {
    const now = new Date();
    const day = now.getDay();
    const daysUntilFriday = (5 - day + 7) % 7 || 7;
    dueDate = new Date(Date.now() + daysUntilFriday * 86400000).toISOString().split('T')[0];
  }

  // 4. Extract Email & Phone if present
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  const customerEmail = emailMatch
    ? emailMatch[0]
    : `${customerName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'client'}@example.com`;

  const phoneMatch = text.match(/(?:\+?\d{1,4}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const customerPhone = phoneMatch ? phoneMatch[0] : '+234 800 000 0000';

  // 5. Parse Line Items
  const items: Array<{ description: string; quantity: number; unitPrice: number; total: number }> = [];

  const clauses = text
    .split(/\s*\+\s*|\s+and\s+(?=[₦\$€£]|\d+)|[\n;]/i)
    .map((c) => c.trim())
    .filter(Boolean);

  for (const clause of clauses) {
    const priceMatch =
      clause.match(/(?:[₦\$€£]|NGN|USD|EUR|GBP|KES|GHS)\s*([\d,]+(?:\.\d+)?)/i) ||
      clause.match(/(?:at|for|fee of|worth|costing)\s+([\d,]+(?:\.\d+)?)/i) ||
      clause.match(/\b(\d{1,3}(?:,\d{3})+|\d{3,9})\b/);
    if (!priceMatch) continue;

    const rawNum = (priceMatch[1] || priceMatch[0]).replace(/[^0-9.]/g, '');
    const unitPrice = parseFloat(rawNum);
    if (isNaN(unitPrice) || unitPrice <= 0) continue;

    let quantity = 1;
    const qtyMatch = clause.match(/\b(\d+)\s*(?:x|sessions?|sprints?|hours?|items?|units?|days?|audits?|[A-Za-z]+)/i);
    if (qtyMatch) {
      const q = parseInt(qtyMatch[1], 10);
      if (q > 0 && q < 100 && q !== unitPrice) {
        quantity = q;
      }
    }

    let desc = clause
      .replace(priceMatch[0], '')
      .replace(/\bat\s+each\b/i, '')
      .replace(/\s*each\b/i, '')
      .replace(/\bdue\s+.*$/i, '')
      .replace(/\bwith\s+\d+%.*$/i, '');

    if (customerName && customerName !== 'Valued Client') {
      desc = desc.replace(new RegExp('.*?' + customerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[:\\s]*', 'i'), '');
    }

    desc = desc
      .replace(/^(?:for|billed|to|consulted for|work for|photographed|invoice|bill)\s+/i, '')
      .replace(/^\d+\s*(?:x|sprints?|hours?|items?|units?|audits?)?\s*/i, '')
      .replace(/\s+for\s*$/i, '')
      .replace(/^[:,\s-]+|[:,\s-]+$/g, '')
      .trim();

    if (!desc || desc.length < 2) {
      if (/shoot|photo/i.test(clause)) desc = 'Photography Session';
      else if (/sprint|design|ui|ux/i.test(clause)) desc = 'UI/UX Design Sprint';
      else if (/consult/i.test(clause)) desc = 'Professional Consultation';
      else if (/maintenance|web/i.test(clause)) desc = 'Website Maintenance';
      else if (/lighting|studio/i.test(clause)) desc = 'Studio Lighting & Equipment Fee';
      else if (/seo|audit/i.test(clause)) desc = 'SEO Strategy & Technical Audit';
      else if (/cake|food|cater/i.test(clause)) desc = 'Catering Services';
      else if (/cloth|tailor|wear|dress/i.test(clause)) desc = 'Bespoke Tailoring & Fashion';
      else if (/repair|wire|plumb/i.test(clause)) desc = 'Technical & Maintenance Services';
      else desc = 'Goods & Professional Services';
    }

    desc = desc.charAt(0).toUpperCase() + desc.slice(1);
    const total = quantity * unitPrice;

    items.push({
      description: desc,
      quantity,
      unitPrice,
      total,
    });
  }

  // If no items were parsed by clause, look for any price or default to 0 for real entry
  if (items.length === 0) {
    const anyNumberMatch = text.match(/(?:[₦\$€£]|NGN|USD|EUR|GBP)?\s*(\d{1,3}(?:,\d{3})+|\d{3,9})/i);
    const detectedAmount = anyNumberMatch ? parseFloat(anyNumberMatch[1].replace(/,/g, '')) : 0;

    // Extract description from prompt text
    let promptDesc = text
      .replace(new RegExp(customerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '')
      .replace(/\b(?:invoice|bill|billed|invoiced|charge|to|for|due in \d+ days?)\b/gi, '')
      .replace(/[₦\$€£\d,]+/g, '')
      .replace(/^[:,\s-]+|[:,\s-]+$/g, '')
      .trim();

    if (!promptDesc || promptDesc.length < 2) {
      promptDesc = 'Professional Services';
    } else {
      promptDesc = promptDesc.charAt(0).toUpperCase() + promptDesc.slice(1);
    }

    items.push({
      description: promptDesc,
      quantity: 1,
      unitPrice: detectedAmount,
      total: detectedAmount,
    });
  }

  return {
    customerName,
    customerEmail,
    customerPhone,
    customerAddress: 'Business Workspace',
    items,
    discountPercentage,
    dueDate,
    notes: `Created via Billa AI prompt: "${promptText.slice(0, 70)}${promptText.length > 70 ? '...' : ''}"`,
  };
}
