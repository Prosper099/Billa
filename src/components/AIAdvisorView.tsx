import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  MessageCircle,
  Mail,
  Copy,
  Check,
  Zap,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Lightbulb,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { BillaAIIcon } from './BrandLogo';
import { Invoice } from '../types';
import { callAiEndpoint } from '../services/aiClient';
import { launchWhatsApp } from '../utils/whatsapp';

export const AIAdvisorView: React.FC = () => {
  const {
    businessProfile,
    invoices,
    customers,
    metrics,
    activeCurrency,
    showToast,
  } = useApp();

  // Selected invoice for follow-up testing
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(
    invoices.find((i) => i.status === 'overdue')?.id || invoices[0]?.id || ''
  );
  const [tone, setTone] = useState<'friendly' | 'professional' | 'firm' | 'urgent'>('friendly');
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [generatedMessage, setGeneratedMessage] = useState<string>('');
  const [generatedSubject, setGeneratedSubject] = useState<string>('');
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const [copied, setCopied] = useState(false);

  // Chat Copilot State
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<
    { role: 'user' | 'assistant'; text: string; timestamp: string }[]
  >([
    {
      role: 'assistant',
      text: `Hi there! I'm Billa, your personal billing copilot for ${businessProfile.name || 'Apex Studios'}. I keep an eye on your cashflow and receivables so you never have to feel awkward chasing clients. Currently you have ${formatCurrency(metrics.collected, activeCurrency)} collected and ${formatCurrency(metrics.outstanding, activeCurrency)} pending. What would you like help with today?`,
      timestamp: 'Just now',
    },
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const proactivePrompts = [
    '🏦 Copy our official bank transfer payment card',
    '📋 Who owes us money and what invoices are open?',
    '💡 How can I get clients to pay 3 days faster?',
    '📊 Analyze our cashflow risk score & collection rate',
    '✍️ Draft our studio 50% upfront deposit policy',
    '📱 Generate a polite WhatsApp reminder for overdue clients',
  ];

  const sampleInvoiceFallback = {
    id: 'sample-inv-01',
    invoiceNumber: 'BIL-2026-001',
    customerId: 'cust-demo',
    customerName: 'Fatima Aliyu',
    customerEmail: 'fatima@apexcreatives.com',
    customerPhone: '+234 803 123 4567',
    customerAddress: 'Victoria Island, Lagos',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    items: [
      { id: 'it-1', description: 'Brand Identity & Design System', quantity: 1, unitPrice: 120000, total: 120000 },
      { id: 'it-2', description: 'Mobile UI Prototype & Assets', quantity: 1, unitPrice: 85000, total: 85000 },
    ],
    subtotal: 205000,
    discountPercentage: 0,
    discountAmount: 0,
    taxRate: 0,
    taxAmount: 0,
    deliveryFee: 0,
    total: 205000,
    status: 'pending' as const,
    notes: 'Standard payment terms.',
    paymentTerms: 'Due in 3 days',
    currency: activeCurrency,
  };

  const currentSelectedInvoice =
    (selectedInvoiceId ? invoices.find((i) => i.id === selectedInvoiceId) : invoices[0]) ||
    sampleInvoiceFallback;

  // Generate Follow-up with AI
  const handleGenerateFollowUp = async () => {
    const targetInvoice = currentSelectedInvoice || sampleInvoiceFallback;
    setIsGeneratingMessage(true);

    try {
      const { data, isFallback } = await callAiEndpoint('/api/ai/follow-up', {
        invoice: targetInvoice,
        business: businessProfile,
        tone,
        channel,
      }, { timeoutMs: 12000 });

      if (data?.message) {
        setGeneratedMessage(data.message);
        setGeneratedSubject(data.subject || `Payment Reminder: Invoice ${targetInvoice.invoiceNumber}`);
        showToast('Billa AI Follow-up Generated', isFallback ? 'Generated with offline template engine.' : 'Tailored message crafted by Gemini.');
      } else {
        const fallbackMsg = channel === 'whatsapp'
          ? `Hi ${targetInvoice.customerName}! 👋 Hope you are having a wonderful week.\n\nJust following up on invoice *${targetInvoice.invoiceNumber}* for *${formatCurrency(targetInvoice.total, activeCurrency)}*.\n\nBank: ${businessProfile.bankName || 'GTBank'} (${businessProfile.accountNumber || '0239481920'})\n\nThank you so much!\n— ${businessProfile.name || 'Apex Studios'}`
          : `Dear ${targetInvoice.customerName},\n\nI hope this message finds you well.\n\nThis is a polite reminder regarding Invoice ${targetInvoice.invoiceNumber} for ${formatCurrency(targetInvoice.total, activeCurrency)}.\n\nPayment Details:\nBank: ${businessProfile.bankName || 'GTBank'}\nAccount Number: ${businessProfile.accountNumber || '0239481920'}\n\nWarm regards,\n${businessProfile.name || 'Apex Studios'}`;
        setGeneratedMessage(fallbackMsg);
        setGeneratedSubject(`Payment Reminder: Invoice ${targetInvoice.invoiceNumber}`);
        showToast('Draft Ready', 'Template generated successfully.');
      }
    } catch {
      const fallbackMsg = `Hi ${targetInvoice.customerName}! Friendly reminder regarding Invoice ${targetInvoice.invoiceNumber} for ${formatCurrency(targetInvoice.total, activeCurrency)}. Please confirm once transferred. Thank you! — ${businessProfile.name || 'Billa'}`;
      setGeneratedMessage(fallbackMsg);
      showToast('Offline Draft Generated', 'Ready to copy and share.');
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  // Send Chat to Gemini AI Advisor
  const handleSendChat = async (e?: React.FormEvent, customQuestion?: string) => {
    if (e) e.preventDefault();
    const query = customQuestion || chatQuestion;
    if (!query.trim() || isChatLoading) return;

    const userText = query.trim();
    setChatQuestion('');
    setChatHistory((prev) => [
      ...prev,
      { role: 'user', text: userText, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ]);
    setIsChatLoading(true);

    // Compile rich business context tailored to this specific business
    const invoicedServices = Array.from(
      new Set(
        invoices
          .flatMap((inv) => inv.items?.map((it) => it.description.trim()) || [])
          .filter((desc) => desc && desc.length > 0)
      )
    ).slice(0, 10);

    const openInvoicesList = invoices
      .filter((inv) => inv.status === 'pending' || inv.status === 'overdue')
      .slice(0, 8)
      .map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customerName,
        amount: formatCurrency(inv.total, activeCurrency),
        dueDate: inv.dueDate,
        status: inv.status,
      }));

    const topCustomers = customers.slice(0, 6).map((c) => ({
      name: c.name,
      company: c.companyName || '',
      totalBilled: formatCurrency(c.totalBilled || 0, activeCurrency),
      outstanding: formatCurrency(c.outstandingBalance || 0, activeCurrency),
      reliability: c.paymentReliability || 'standard',
    }));

    const context = {
      businessProfile: {
        name: businessProfile.name || 'Your Business',
        tagline: businessProfile.tagline || '',
        email: businessProfile.email || '',
        phone: businessProfile.phone || '',
        address: businessProfile.address || '',
        website: businessProfile.website || '',
        bankName: businessProfile.bankName || '',
        accountNumber: businessProfile.accountNumber || '',
        accountName: businessProfile.accountName || '',
        currency: activeCurrency,
        defaultPaymentTermsDays: businessProfile.defaultPaymentTermsDays || 7,
        defaultTaxRate: businessProfile.defaultTaxRate || 0,
        taxNumber: businessProfile.taxNumber || '',
      },
      metrics: {
        totalInvoiced: formatCurrency(metrics.totalInvoiced, activeCurrency),
        collected: formatCurrency(metrics.collected, activeCurrency),
        outstanding: formatCurrency(metrics.outstanding, activeCurrency),
        overdueCount: metrics.overdueInvoicesCount,
        pendingCount: metrics.pendingInvoicesCount,
        collectionRate: `${metrics.collectionRate}%`,
      },
      openInvoices: openInvoicesList,
      topCustomers,
      typicalServices: invoicedServices.length > 0 ? invoicedServices : ['Custom Client Services', 'Professional Deliverables'],
    };

    const generateSmartLocalAdvice = (text: string): string => {
      const lower = text.toLowerCase().trim();
      const bizName = businessProfile.name || 'your business';

      // Greetings
      if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|howdy|sup)\b/i.test(lower)) {
        const pendingNote = metrics.outstanding > 0
          ? `Currently, ${bizName} has **${formatCurrency(metrics.outstanding, activeCurrency)}** in pending receivables across ${metrics.pendingInvoicesCount} open invoice(s).`
          : 'All your billed accounts are currently settled and up to date!';
        return `Hello! 👋 I'm Billa, the dedicated in-house billing copilot and financial strategist for **${bizName}**.\n\n${pendingNote}\n\nHere is how I can help you right now:\n• 🏦 **Bank Card**: Copy our verified bank transfer snippet to paste to a client\n• 📋 **Receivables Audit**: See who has open or overdue balances\n• 📱 **WhatsApp Follow-up**: Draft a high-converting payment reminder\n• ✍️ **Deposit Policy**: Generate a protective 50% commitment clause for quotes\n\nWhat would you like to do?`;
      }

      // Bank Details & Payment Snippet
      if (/bank|account|transfer|details|where to pay|how to pay|payment card/i.test(lower)) {
        const bName = businessProfile.bankName || 'Your Bank';
        const aNum = businessProfile.accountNumber || 'Your Account Number';
        const aName = businessProfile.accountName || bizName;
        return `Here is the official, copy-ready payment snippet for **${bizName}**:\n\n> 🏦 **Official Bank Transfer Details — ${bizName}**\n>\n> • **Bank Name**: ${bName}\n> • **Account Number**: ${aNum}\n> • **Account Name**: ${aName}\n> • **Currency**: ${activeCurrency}\n>\n> *Kindly send a screenshot or PDF of your transfer receipt once completed so we can immediately mark your invoice as settled. Thank you for your business!*\n\n💡 *Tip: You can send this card directly to clients over WhatsApp or paste it into your emails.*`;
      }

      // Who owes money / Open Receivables
      if (/who owes|unpaid|overdue|debt|pending|receivable|chase/i.test(lower)) {
        if (openInvoicesList.length > 0) {
          const list = openInvoicesList
            .map((inv) => `• **${inv.customerName}**: ${inv.amount} (Invoice #${inv.invoiceNumber}, Due: ${inv.dueDate}, Status: *${inv.status}*)`)
            .join('\n');
          return `Here are the active invoices currently awaiting payment for **${bizName}**:\n\n${list}\n\n💡 **Recommendation**: Tap the **Reminders** tab or ask me to draft a friendly WhatsApp nudge for any of these clients!`;
        }
        return `Great news! **${bizName}** has no pending or overdue invoices right now. All client accounts are fully settled!`;
      }

      // Faster payment strategies
      if (/faster|speed|delay|slow|chasing|prompt/i.test(lower)) {
        return `Here are 4 proven strategies to accelerate client payments for **${bizName}** by 3–5 days:

1. 📱 **Send Reminders via WhatsApp**: 85%+ of clients open and read WhatsApp messages within 15 minutes, compared to under 25% for emails.
2. ⚡ **Offer a Quick-Pay Incentive**: A modest 2–3% prompt settlement discount for transfers completed within 48 hours dramatically improves turnover.
3. ⏱️ **Standardize Payment Terms**: Maintain our standard **Net ${businessProfile.defaultPaymentTermsDays || 7} days** policy or "Due Upon Receipt" for final creative deliverables.
4. 🏦 **Instant Bank Details**: Always paste our bank account (${businessProfile.bankName || 'Bank'} ${businessProfile.accountNumber || ''}) directly in the message text so clients don't have to open an attachment.`;
      }

      // Cashflow and Risk Assessment
      if (/cashflow|risk|score|health|financial/i.test(lower)) {
        return `📊 **Cashflow & Risk Health Assessment for ${bizName}**:
• **Billed Total**: ${formatCurrency(metrics.totalInvoiced, activeCurrency)}
• **Collected**: ${formatCurrency(metrics.collected, activeCurrency)} (${metrics.collectionRate}% Collection Rate)
• **Pending Receivables**: ${formatCurrency(metrics.outstanding, activeCurrency)}
• **Overdue Invoices**: ${metrics.overdueInvoicesCount}

💡 **Action Plan**: ${metrics.overdueInvoicesCount > 0 ? `Prioritize following up on your ${metrics.overdueInvoicesCount} overdue invoice(s). Head to the Reminders tab to launch tailored WhatsApp reminders with one click.` : `Your billing flow is healthy! Continue applying upfront milestone deposits on new customer orders to keep your cash buffer strong.`}`;
      }

      // 50% Deposit Policy
      if (/deposit|policy|quote|commitment|upfront|50%/i.test(lower)) {
        return `Here is a clear, professional 50% deposit clause customized for **${bizName}** that you can insert into quotes or message to clients:

> *"To lock in project scheduling and commence immediate production, our standard policy at ${bizName} requires a 50% commitment deposit. The remaining balance is payable upon milestone approval prior to final delivery.\n\nBank Transfer Details:\n${businessProfile.bankName ? `🏦 ${businessProfile.bankName} | ${businessProfile.accountNumber} | ${businessProfile.accountName}` : '🏦 [Your Bank Name] | [Account Number] | [Account Name]'}"*

This secures your working capital, weeds out tire-kickers, and prevents non-payment before you invest time.`;
      }

      // WhatsApp reminder script
      if (/whatsapp|script|reminder|template|message|nudge/i.test(lower)) {
        const bankInfo = businessProfile.bankName ? `${businessProfile.bankName} - ${businessProfile.accountNumber} (${businessProfile.accountName})` : '[Bank Name] - [Account Number]';
        return `Here is a high-converting, courteous WhatsApp payment reminder template for **${bizName}**:

> *"Hi [Client Name]! 👋 Hope you're having a wonderful week.\n\nJust a quick courtesy reminder regarding Invoice #[InvoiceNumber] for [Amount], which is due on [DueDate].\n\n🏦 Payment Details:\nBank: ${bankInfo}\n\nKindly send over your transfer receipt once settled so we can update your file immediately. Thank you so much!\n— ${bizName}"*`;
      }

      // Tax & VAT & Withholding Tax (WHT)
      if (/tax|vat|wht|withholding/i.test(lower)) {
        return `Tax & Withholding Tax Guide for **${bizName}**:

• **Standard Tax Rate**: Currently configured at **${businessProfile.defaultTaxRate || 0}%**. You can adjust this anytime in **Settings**.
• **VAT Invoicing**: Always explicitly mark on your line items whether prices are *Inclusive* or *Exclusive* of VAT so clients do not arbitrarily deduct tax from your earnings.
• **Withholding Tax (WHT) by Corporates**: Many corporate/enterprise clients automatically deduct 5% or 10% WHT before wiring funds.
  - **Rule**: If a client deducts WHT, NEVER let it disappear into thin air.
  - **Action**: Immediately demand an official **WHT Credit Note** from their finance team.
  - **Benefit**: Your accountant or tax authority can use this credit note as a direct cash deduction against your annual company income tax liabilities!`;
      }

      // Receipt Scanning & OCR
      if (/receipt|scan|ocr|camera|photo|expense/i.test(lower)) {
        return `Receipt & Expense Scanning Guide for **${bizName}**:

• **Where to Scan**: Click the **Scan Receipt** button on the Invoices dashboard or tap the camera icon.
• **Supported Formats**: Snap a live camera photo, or upload existing image files (JPG, PNG) or digital PDFs.
• **AI Extraction**: Billa's vision engine instantly reads the merchant name, date, line items, taxes, currency, and total amount.
• **Actionable Uses**:
  1. Save as an operational business expense to track real net margins.
  2. Convert directly into billable client invoice line items for project reimbursements.`;
      }

      // Invoice Creation & Smart Prompt
      if (/create invoice|new invoice|how to invoice|make invoice|generate invoice|prompt/i.test(lower)) {
        return `How to Create Invoices in Billa for **${bizName}**:

1. **AI Smart Creator (Fastest)**:
   - Type naturally into the prompt box at the top of the Invoices view, like:
   > *"Bill Acme Corp ₦450,000 for Mobile App UI/UX Design due in 14 days"*
   - Billa will instantly parse the client, amount, line items, and payment terms into a complete invoice draft.
2. **Manual Form**:
   - Click **+ New Invoice** on the top right.
   - Select or add a customer, set the issue and due dates, and add line items with rates, quantities, and discounts.
3. **Save & Dispatch**:
   - Save as **Draft** or **Pending**, then download a PDF, copy a public view link, or tap **WhatsApp** to send directly.`;
      }

      // PDF Templates, Logo & Branding
      if (/pdf|template|logo|brand|color|design|signature|look/i.test(lower)) {
        return `Customizing Your Invoice Brand & PDF for **${bizName}**:

• **Templates**: Billa offers 4 distinct styles: **Modern**, **Minimal**, **Bold**, and **Classic**. Choose your preferred layout in **Settings**.
• **Brand Colors**: Pick your company's primary accent color to tint tables, headers, and badges.
• **Company Logo**: Upload your PNG/JPG logo in Settings; it will be automatically sized and embedded on every exported PDF.
• **Digital Signature**: Add your authorized signatory name or digital signature image to make every invoice legally binding.`;
      }

      // Recurring Invoices & Retainers
      if (/recurring|retainer|subscription|monthly|repeat|auto/i.test(lower)) {
        return `Recurring Retainers & Subscriptions in Billa:

• **When to use**: For clients on monthly maintenance, ongoing marketing, consulting retainers, or software subscriptions.
• **How it works**: Toggle **Recurring Invoice** when creating or editing an invoice, and set the repeat cycle (Weekly, Monthly, Quarterly).
• **Benefit**: Billa prepares the next billing cycle automatically so you never forget to bill ongoing services on the 1st of the month!`;
      }

      // Late Payers, Chasing & Debt Escalation
      if (/late|refuse|ghost|excuse|ignore|dispute|delay|won't pay|dont pay|not paying/i.test(lower)) {
        return `The 4-Stage Debt Recovery Playbook for **${bizName}**:

1. **Stage 1 (Day 1 Overdue — Gentle Courtesy Check-in)**:
   - Assume it's a simple oversight. Send a friendly WhatsApp message with our bank details asking if they need anything to process payment.
2. **Stage 2 (Day 7 Overdue — Official Follow-up)**:
   - Send the official overdue notice from the **Reminders** tab. Politely remind them of our Net ${businessProfile.defaultPaymentTermsDays || 7} terms.
3. **Stage 3 (Day 14 Overdue — Service Pause Warning)**:
   - Inform the client that active production, source files, or ongoing support will be paused until the balance is settled.
4. **Stage 4 (Day 30+ Severely Overdue — Final Notice)**:
   - Issue a formal written final demand. Make a direct phone call to senior leadership or finance directors. Withhold all copyrights, logins, and project deliverables.`;
      }

      // Multi-Currency & International Clients
      if (/currency|dollar|usd|foreign|international|exchange|gbp|eur/i.test(lower)) {
        return `International Billing & Multi-Currency for **${bizName}**:

• **Switching Currencies**: Billa supports NGN (₦), USD ($), GBP (£), EUR (€), and other global currencies. Toggle the currency directly when creating an invoice.
• **Foreign Exchange Fluctuation Tip**: When quoting international clients in foreign currency, add a clause: *"Invoice is valid for 7 days based on current FX interbank settlement rates."*
• **Bank Details**: If accepting USD/GBP/EUR, ensure your Domiciliary Bank Account or foreign routing details are saved in Settings so clients can wire funds smoothly.`;
      }

      // Export, Backup & Reports
      if (/export|csv|excel|backup|download data|report|accountant/i.test(lower)) {
        return `Data Export & Accounting Reports in Billa:

• **CSV / Excel Export**: Navigate to **Reports** or **Settings** to export all your invoice histories, client records, and transaction logs in a universal CSV format.
• **Sharing with Accountants**: Use the CSV export at month-end or tax season for your accountant or bookkeeping software (QuickBooks, Zoho, Excel).
• **Local & Cloud Backup**: All your data is securely persisted in real time to both your local offline storage and your linked cloud database.`;
      }

      // Client Payment Ratings & Risk
      if (/client rating|customer score|reliability|risk score|slow payer/i.test(lower)) {
        return `Client Payment Reliability System in Billa:

Billa tracks client payment habits automatically:
• ⭐ **Fast Payer**: Consistently settles before or on the due date. Prioritize these clients for fast turnaround and discounts.
• 🕒 **Consistent**: Pays within a few days of the due date.
• ⚠️ **Slow Payer**: Frequently requires multiple reminders. Enforce a **50% upfront commitment deposit** before doing new work.
• 🚨 **High Risk**: History of severe delays or disputes. Enforce **100% upfront payment** before commencing any project.`;
      }

      // General intelligent financial guidance
      return `Regarding "${text}" for **${bizName}**:

Here is the operational rule of thumb:
1. **Terms**: Maintain standard **Net ${businessProfile.defaultPaymentTermsDays || 7} days** payment terms across all contracts.
2. **Commitment**: Require a **50% upfront deposit** on creative and service projects to protect working capital.
3. **Instant Details**: Always attach our official bank details (*${businessProfile.bankName || 'Bank'}: ${businessProfile.accountNumber || 'Account #'}*) directly into your message text so clients can pay in seconds.
4. **Reminders**: Send courtesy nudges 48 hours before due dates via WhatsApp for a 3x higher collection speed.

Would you like me to draft a reminder, check who currently owes us, or generate a copy-ready bank transfer snippet?`;
    };

    try {
      const { data } = await callAiEndpoint('/api/ai/advisor', {
        question: userText,
        context,
      }, { timeoutMs: 14000 });

      const answerText = data?.answer || generateSmartLocalAdvice(userText);
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: answerText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch {
      const fallbackText = generateSmartLocalAdvice(userText);
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: fallbackText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Copied to Clipboard', 'You can now paste into WhatsApp or Email.');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn pb-24 lg:pb-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <BillaAIIcon size="md" />
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A1C1E] tracking-tight">
              Billa AI Financial Advisor & Copilot
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Conversational cashflow intelligence, polite follow-ups, and proactive revenue tips
            </p>
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Left Column: AI Follow-Up Message Studio (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl bg-white border border-slate-200/90 p-4 sm:p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Smart Reminder Generator</h2>
            </div>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
              Conversion Optimized
            </span>
          </div>

          {/* Form Controls for Reminder Generator */}
          <div className="space-y-4 text-xs">
            {/* 1. Target Invoice Selector */}
            <div className="space-y-1.5">
              <label className="text-slate-700 font-semibold">Select Target Invoice</label>
              <select
                value={selectedInvoiceId || (invoices.length === 0 ? 'sample-inv-01' : '')}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {invoices.length === 0 ? (
                  <option value="sample-inv-01">
                    ⚡ Demo Invoice: BIL-2026-001 — Fatima Aliyu (₦205,000 • PENDING)
                  </option>
                ) : (
                  invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — {inv.customerName} ({formatCurrency(inv.total, activeCurrency)} • {inv.status.toUpperCase()})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* 2. Tone Selector */}
            <div className="space-y-1.5">
              <label className="text-slate-700 font-semibold">Tone of Communication</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'friendly', label: '😊 Friendly', desc: 'Warm & polite' },
                  { id: 'professional', label: '👔 Professional', desc: 'Standard business' },
                  { id: 'firm', label: '⚖️ Firm Notice', desc: 'Due reminder' },
                  { id: 'urgent', label: '🚨 Urgent', desc: 'Immediate action' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTone(t.id as any)}
                    className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      tone === t.id
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs">{t.label}</div>
                    <div className="text-[10px] text-slate-500 font-normal">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Channel Selector */}
            <div className="space-y-1.5">
              <label className="text-slate-700 font-semibold">Channel</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setChannel('whatsapp')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    channel === 'whatsapp'
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>WhatsApp Message</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('email')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    channel === 'email'
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Mail className="w-4 h-4 text-indigo-600" />
                  <span>Official Email</span>
                </button>
              </div>
            </div>

            {/* Generate Trigger Button */}
            <button
              type="button"
              id="btn-generate-ai-followup-now"
              onClick={handleGenerateFollowUp}
              disabled={isGeneratingMessage}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Sparkles className={`w-4 h-4 ${isGeneratingMessage ? 'animate-spin' : ''}`} />
              <span>{isGeneratingMessage ? 'Billa AI is crafting message...' : 'Generate Follow-Up Message'}</span>
            </button>
          </div>

          {/* Generated Follow-up Output Preview Card */}
          {generatedMessage && (
            <div className="pt-4 border-t border-slate-100 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                  <BillaAIIcon size="sm" />
                  <span>Generated {channel === 'whatsapp' ? 'WhatsApp Message' : 'Email Draft'}</span>
                </span>
                <button
                  onClick={() => copyToClipboard(generatedMessage)}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {generatedSubject && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-slate-500 font-semibold">Subject: </span>
                  <span className="text-slate-900 font-medium">{generatedSubject}</span>
                </div>
              )}

              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                {generatedMessage}
              </div>

              {/* Instant WhatsApp Launch Button */}
              {channel === 'whatsapp' && currentSelectedInvoice?.customerPhone && (
                <div className="space-y-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      launchWhatsApp(currentSelectedInvoice.customerPhone!, generatedMessage)
                    }
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer active:scale-[0.99]"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Open in WhatsApp ({currentSelectedInvoice.customerPhone})</span>
                  </button>
                  <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500">
                    <span>Opens in WhatsApp app.</span>
                    <a
                      href={`https://wa.me/${currentSelectedInvoice.customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                        generatedMessage
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 hover:underline font-medium ml-1"
                    >
                      No app? Open in browser
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: AI Cashflow Copilot Chat (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl bg-white border border-slate-200/90 p-4 sm:p-6 space-y-4 shadow-xs flex flex-col justify-between h-[640px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <BillaAIIcon size="sm" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Billa Copilot</h2>
            </div>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Fast AI Active</span>
            </span>
          </div>

          {/* Quick Proactive Tip Chips */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold">
              <Lightbulb className="w-3 h-3 text-amber-500" />
              <span>Quick Tips & Prompts:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {proactivePrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendChat(undefined, prompt)}
                  className="text-[11px] text-left px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-900 transition-colors cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs my-2">
            {chatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="shrink-0 pt-0.5" title="Billa AI Advisor">
                    <BillaAIIcon size="sm" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[88%] space-y-1 ${
                    msg.role === 'user' ? 'items-end flex flex-col' : 'items-start flex flex-col'
                  }`}
                >
                  <div className="flex items-center gap-1.5 px-0.5">
                    {msg.role === 'assistant' ? (
                      <span className="text-[10px] font-bold text-indigo-700">Billa AI Advisor</span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-500">You</span>
                    )}
                    <span className="text-[9px] text-slate-400 font-mono">• {msg.timestamp}</span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white font-medium rounded-tr-xs shadow-2xs'
                        : 'bg-slate-50 border border-slate-200/90 text-slate-800 rounded-tl-xs shadow-2xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex items-center gap-2.5 text-slate-500 text-xs p-2.5 bg-indigo-50/50 rounded-xl border border-indigo-100">
                <BillaAIIcon size="xs" className="animate-pulse" />
                <div className="flex items-center gap-1.5 text-indigo-900 font-semibold text-xs">
                  <Sparkles className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  <span>Billa is reviewing your metrics & formulating advice...</span>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={(e) => handleSendChat(e)} className="pt-2 border-t border-slate-100 flex gap-2">
            <input
              type="text"
              placeholder="Ask Billa anything about billing, terms, cashflow..."
              value={chatQuestion}
              onChange={(e) => setChatQuestion(e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={isChatLoading || !chatQuestion.trim()}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition-colors cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

