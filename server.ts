import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { extractInvoiceFromPrompt } from './src/utils/promptExtractor';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ limit: '30mb', extended: true }));

// Lazy-initialized Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }
  return aiClient;
}

// Safe Promise timeout helper with unhandled rejection prevention
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: any;
  let settled = false;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        promise.catch(() => {});
        reject(new Error(`Operation timed out after ${ms}ms`));
      }
    }, ms);
  });
  return Promise.race([
    promise.then(
      (res) => {
        settled = true;
        return res;
      },
      (err) => {
        settled = true;
        throw err;
      }
    ),
    timeout,
  ]).finally(() => clearTimeout(timer));
}

export interface GeminiExecutionResult {
  text: string | null;
  modelUsed?: string;
  source: 'gemini' | 'gemini-vision' | 'fallback';
  fallbackReason?: string;
  durationMs: number;
}

// Resilient Gemini Generator with automatic model fallback and diagnostic logging
async function generateContentSafe(params: {
  contents: string;
  responseMimeType?: string;
  responseSchema?: any;
}): Promise<GeminiExecutionResult> {
  const overallStart = Date.now();
  const ai = getGeminiClient();
  if (!ai) {
    const reason = !process.env.GEMINI_API_KEY
      ? 'GEMINI_API_KEY is not defined in server environment variables.'
      : 'GoogleGenAI client failed to initialize.';
    console.warn(`[AI Backend >> Warning] ${reason}`);
    return {
      text: null,
      source: 'fallback',
      fallbackReason: reason,
      durationMs: Date.now() - overallStart,
    };
  }

  // Active verified Gemini models with automatic fallback across healthy quotas
  // gemini-3.1-flash-lite has the highest free-tier rate limits and sub-second latency
  const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
  const errors: string[] = [];

  for (const model of modelsToTry) {
    const attemptStart = Date.now();
    try {
      const config: any = {};
      if (params.responseMimeType) {
        config.responseMimeType = params.responseMimeType;
      }
      if (params.responseSchema) {
        config.responseSchema = params.responseSchema;
      }

      console.log(`[AI Backend >> Gemini] Processing with model: ${model} (${params.contents.length} chars)...`);
      const response = await withTimeout(
        ai.models.generateContent({
          model,
          contents: params.contents,
          config: Object.keys(config).length > 0 ? config : undefined,
        }),
        18000
      );

      const attemptDuration = Date.now() - attemptStart;
      if (response && response.text) {
        console.log(`[AI Backend >> Gemini] Model ${model} completed in ${attemptDuration}ms`);
        return {
          text: response.text,
          modelUsed: model,
          source: 'gemini',
          durationMs: Date.now() - overallStart,
        };
      } else {
        const err = `Model ${model} returned empty response in ${attemptDuration}ms`;
        console.log(`[AI Backend >> Gemini] ${err}`);
        errors.push(err);
      }
    } catch (err: any) {
      const attemptDuration = Date.now() - attemptStart;
      const isRateLimit = err?.status === 429 || (err?.message && String(err.message).includes('429'));
      const statusDesc = isRateLimit ? 'quota-busy' : (err?.status || 'unavailable');
      console.log(`[AI Backend >> Gateway] Model ${model} status ${statusDesc} (${attemptDuration}ms) -> trying next model`);
      errors.push(`Model ${model}: ${statusDesc}`);
      if (isRateLimit) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
  }

  return {
    text: null,
    source: 'fallback',
    fallbackReason: `All models failed: ${errors.join('; ')}`,
    durationMs: Date.now() - overallStart,
  };
}

// Resilient Multimodal (Vision) Generator for Receipts / Invoices OCR with diagnostic logging
async function generateContentSafeWithImage(params: {
  parts: any[];
  responseMimeType?: string;
  responseSchema?: any;
}): Promise<GeminiExecutionResult> {
  const overallStart = Date.now();
  const ai = getGeminiClient();
  if (!ai) {
    const reason = !process.env.GEMINI_API_KEY
      ? 'GEMINI_API_KEY is not defined in server environment variables.'
      : 'GoogleGenAI client failed to initialize.';
    console.warn(`[AI Backend >> Warning] ${reason}`);
    return {
      text: null,
      source: 'fallback',
      fallbackReason: reason,
      durationMs: Date.now() - overallStart,
    };
  }

  // Active verified Gemini models with vision capabilities
  const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
  const errors: string[] = [];

  for (const model of modelsToTry) {
    const attemptStart = Date.now();
    try {
      const config: any = {};
      if (params.responseMimeType) {
        config.responseMimeType = params.responseMimeType;
      }
      if (params.responseSchema) {
        config.responseSchema = params.responseSchema;
      }

      console.log(`[AI Backend >> Gemini Vision] Processing with model: ${model}...`);
      const response = await withTimeout(
        ai.models.generateContent({
          model,
          contents: { parts: params.parts },
          config: Object.keys(config).length > 0 ? config : undefined,
        }),
        28000
      );

      const attemptDuration = Date.now() - attemptStart;
      if (response && response.text) {
        console.log(`[AI Backend >> Gemini Vision] Model ${model} completed in ${attemptDuration}ms`);
        return {
          text: response.text,
          modelUsed: model,
          source: 'gemini-vision',
          durationMs: Date.now() - overallStart,
        };
      } else {
        const err = `Model ${model} returned empty vision response in ${attemptDuration}ms`;
        console.log(`[AI Backend >> Gemini Vision] ${err}`);
        errors.push(err);
      }
    } catch (err: any) {
      const attemptDuration = Date.now() - attemptStart;
      const isRateLimit = err?.status === 429 || (err?.message && String(err.message).includes('429'));
      const statusDesc = isRateLimit ? 'quota-busy' : (err?.status || 'unavailable');
      console.log(`[AI Backend >> Gateway Vision] Model ${model} status ${statusDesc} (${attemptDuration}ms) -> trying next model`);
      errors.push(`Model ${model}: ${statusDesc}`);
      if (isRateLimit) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
  }

  return {
    text: null,
    source: 'fallback',
    fallbackReason: `All vision models failed: ${errors.join('; ')}`,
    durationMs: Date.now() - overallStart,
  };
}

// Health check endpoint
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'Billa API',
    timestamp: new Date().toISOString(),
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Middleware: Deep Logging for all /api/ai/* and /ai/* Requests and Responses
app.use(['/api/ai', '/ai'], (req, res, next) => {
  const startTime = Date.now();
  const endpoint = req.originalUrl;
  const method = req.method;
  const clientLogId = req.headers['x-billa-client-log-id'] || 'no-client-id';

  // Sanitize bulky fields (e.g. imageBase64) to keep terminal logs clean and readable
  const sanitizedBody: Record<string, any> = {};
  for (const [k, v] of Object.entries(req.body || {})) {
    if (k === 'imageBase64' && typeof v === 'string') {
      sanitizedBody[k] = `[Base64 Image: ${v.length} characters, startsWith: "${v.substring(0, 30)}..."]`;
    } else {
      sanitizedBody[k] = v;
    }
  }

  console.log(`\n================== [AI API Inbound Request] ==================`);
  console.log(`Time:        ${new Date().toISOString()}`);
  console.log(`Route:       ${method} ${endpoint}`);
  console.log(`Client ID:   ${clientLogId}`);
  console.log(`API Key:     ${process.env.GEMINI_API_KEY ? 'CONFIGURED' : 'NOT CONFIGURED (Will use fallback engines)'}`);
  console.log(`Payload:     ${JSON.stringify(sanitizedBody, null, 2)}`);
  console.log(`==============================================================\n`);

  // Intercept json response
  const originalJson = res.json;
  res.json = function (body: any) {
    const durationMs = Date.now() - startTime;
    const source = body?.source || 'unknown';
    const isFallback = source !== 'gemini' && source !== 'gemini-vision';

    console.log(`\n================== [AI API Outbound Response] ==================`);
    console.log(`Time:        ${new Date().toISOString()}`);
    console.log(`Route:       ${method} ${endpoint}`);
    console.log(`Status:      ${res.statusCode}`);
    console.log(`Duration:    ${durationMs}ms`);
    console.log(`Source:      ${source}`);
    if (isFallback) {
      console.warn(`⚠️ FALLBACK ENGAGED! Reason: ${body?.fallbackReason || 'Non-Gemini engine or default invoked'}`);
    }
    console.log(`Response:    ${JSON.stringify(body, null, 2)}`);
    console.log(`================================================================\n`);

    return originalJson.call(this, body);
  };

  next();
});

// 1. AI Financial Narrative Endpoint (Fast & Human-Like)
app.post(['/api/ai/narrative', '/ai/narrative'], async (req, res) => {
  const { businessName, metrics, overdueInvoices, currencySymbol = '₦' } = req.body;

  const totalInvoiced = metrics?.totalInvoiced ?? 45000;
  const collected = metrics?.collected ?? 0;
  const outstanding = metrics?.outstanding ?? 45000;
  const overdueCount = overdueInvoices?.length || 0;
  const oldestOverdueName = overdueInvoices?.[0]?.customerName || 'Chinedu';

  const defaultGreeting = collected > 0
    ? `You've collected ${currencySymbol}${collected.toLocaleString()} this period, with ${currencySymbol}${outstanding.toLocaleString()} currently awaiting payment.`
    : `You have ${currencySymbol}${outstanding.toLocaleString()} in active invoices awaiting payment.`;

  const defaultInsight = overdueCount > 0
    ? `You have ${currencySymbol}${outstanding.toLocaleString()} outstanding across ${metrics?.activeInvoicesCount || 1} invoice(s). ${overdueCount} payment is past due from ${oldestOverdueName}.`
    : `All active billing items are within terms. Chinedu has an invoice for ${currencySymbol}${outstanding.toLocaleString()} due soon.`;

  const defaultStoryPoints = [
    `Total Invoiced: ${currencySymbol}${totalInvoiced.toLocaleString()}`,
    `Collected: ${currencySymbol}${collected.toLocaleString()} (${metrics?.collectionRate || 0}% recovery rate)`,
    `Pending Collection: ${currencySymbol}${outstanding.toLocaleString()}`,
    `Pro Tip: Send a friendly WhatsApp reminder 48 hours before due date to boost on-time settlement by up to 80%.`,
  ];

  let execResult: GeminiExecutionResult | null = null;
  try {
    const prompt = `You are Billa, an empathetic, sharp, and encouraging AI billing partner for small businesses.
Analyze this live financial snapshot for "${businessName || 'Apex Studios'}":
- Total Invoiced: ${currencySymbol}${totalInvoiced}
- Collected: ${currencySymbol}${collected}
- Outstanding: ${currencySymbol}${outstanding}
- Overdue Invoices: ${JSON.stringify(overdueInvoices || [])}

Respond conversationally, like a supportive human financial copilot. Return JSON:
{
  "greeting": "One conversational, natural sentence summarizing the current cash position.",
  "insight": "One or two concise sentences highlighting active invoices and key collection priorities.",
  "storyPoints": [
    "Summary of earnings",
    "Summary of collections in bank",
    "Summary of pending balance",
    "A proactive, practical tip for accelerating payment collection"
  ]
}`;

    execResult = await generateContentSafe({
      contents: prompt,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          greeting: { type: Type.STRING },
          insight: { type: Type.STRING },
          storyPoints: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['greeting', 'insight', 'storyPoints'],
      },
    });

    if (execResult.text) {
      const parsed = JSON.parse(execResult.text);
      return res.json({
        ...parsed,
        source: 'gemini',
        modelUsed: execResult.modelUsed,
      });
    }
  } catch (error: any) {
    console.warn('[AI Narrative Error]', error?.message || error);
  }

  return res.json({
    greeting: defaultGreeting,
    insight: defaultInsight,
    storyPoints: defaultStoryPoints,
    source: 'rule-based-narrative',
    fallbackReason: execResult?.fallbackReason || 'Gemini model returned empty response',
  });
});

// 2. AI Follow-Up Generator Endpoint (WhatsApp / Email)
app.post(['/api/ai/follow-up', '/ai/follow-up'], async (req, res) => {
  const {
    invoice,
    business,
    tone = 'friendly',
    channel = 'whatsapp',
  } = req.body;

  const customerName = invoice?.customerName || 'Valued Client';
  const invoiceNum = invoice?.invoiceNumber || 'BIL-2026-001';
  const currencySymbol = invoice?.currency === 'USD' ? '$' : invoice?.currency === 'EUR' ? '€' : invoice?.currency === 'GBP' ? '£' : '₦';
  const amount = invoice?.total ? `${currencySymbol}${invoice?.total?.toLocaleString()}` : `${currencySymbol}45,000`;
  const businessName = business?.name || 'Apex Studios';
  const bankInfo = business?.accountNumber ? `${business.bankName}, Acct: ${business.accountNumber} (${business.accountName})` : 'GTBank, Acct: 0239481920 (Apex Creative Media Ltd)';
  const lineItemsSummary = invoice?.items?.map((it: any) => `${it.description} (${it.quantity}x)`).join(', ') || 'Design & Creative Services';

  // Natural fallback messages
  let fallbackSubject = `Payment Reminder: Invoice ${invoiceNum} from ${businessName}`;
  let fallbackMessage = '';

  if (tone === 'friendly') {
    fallbackSubject = `Quick friendly note regarding Invoice ${invoiceNum} — ${businessName}`;
    fallbackMessage = channel === 'whatsapp'
      ? `Hi ${customerName}! 👋 Hope your week is off to a great start.\n\nJust a gentle reminder regarding Invoice *${invoiceNum}* for *${amount}* (${lineItemsSummary}).\n\nBank Settlement Details:\n🏦 ${bankInfo}\n\nKindly let us know once transferred so we can issue your official receipt. Thanks so much!\n— ${businessName}`
      : `Dear ${customerName},\n\nI hope this email finds you well.\n\nThis is a friendly reminder regarding Invoice ${invoiceNum} for ${amount} (${lineItemsSummary}), which is currently awaiting payment.\n\nBank Settlement Details:\n${bankInfo}\n\nThank you for your business. Please reply to this email or send your receipt once settled.\n\nWarm regards,\n${businessName}`;
  } else if (tone === 'firm') {
    fallbackSubject = `Important: Payment Due for Invoice ${invoiceNum} — ${businessName}`;
    fallbackMessage = channel === 'whatsapp'
      ? `Hello ${customerName},\n\nThis is a reminder regarding Invoice *${invoiceNum}* (*${amount}*). The payment deadline has passed.\n\nKindly remit payment today to:\n🏦 ${bankInfo}\n\nPlease reply with your payment confirmation receipt. Thank you!\n— ${businessName}`
      : `Dear ${customerName},\n\nOur records indicate that Invoice ${invoiceNum} for ${amount} (${lineItemsSummary}) is overdue.\n\nKindly remit payment at your earliest convenience to:\n${bankInfo}\n\nPlease reply directly with your transfer confirmation.\n\nSincerely,\n${businessName}`;
  } else {
    fallbackSubject = `Invoice ${invoiceNum} Payment Reminder — ${businessName}`;
    fallbackMessage = channel === 'whatsapp'
      ? `Good day ${customerName}! Reminder regarding Invoice *${invoiceNum}* (*${amount}*).\n\nBank Details:\n🏦 ${bankInfo}\n\nThank you!\n— ${businessName}`
      : `Dear ${customerName},\n\nHere is a reminder regarding Invoice ${invoiceNum} for ${amount}.\n\nPayment Details:\n${bankInfo}\n\nThank you for your partnership.\n\nBest regards,\n${businessName}`;
  }

  let execResult: GeminiExecutionResult | null = null;
  try {
    const prompt = `You are Billa, crafting a warm, human, high-conversion billing follow-up for a client.
Customer: ${customerName}
Business: ${businessName}
Invoice: ${invoiceNum} (${amount})
Items: ${lineItemsSummary}
Due Date: ${invoice?.dueDate || 'Recent'}
Tone: ${tone} (Options: friendly, professional, firm, urgent)
Channel: ${channel} (Options: whatsapp, email)
Bank: ${bankInfo}

Rules:
- Write like a real human professional, natural and courteous. No robotic stiff phrases.
- If WhatsApp, use bolding appropriately (*bold*).
- If Email, write a clean subject line and body paragraphs.
- Return JSON with "subject" and "message".`;

    execResult = await generateContentSafe({
      contents: prompt,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subject: { type: Type.STRING },
          message: { type: Type.STRING },
        },
        required: ['subject', 'message'],
      },
    });

    if (execResult.text) {
      const parsed = JSON.parse(execResult.text);
      return res.json({
        ...parsed,
        tone,
        channel,
        source: 'gemini',
        modelUsed: execResult.modelUsed,
      });
    }
  } catch (error: any) {
    console.warn('[AI Follow-Up Error]', error?.message || error);
  }

  return res.json({
    subject: fallbackSubject,
    message: fallbackMessage,
    tone,
    channel,
    source: 'template-engine',
    fallbackReason: execResult?.fallbackReason || 'Gemini model returned empty response',
  });
});

// 3. AI Customer Insight & Risk Rating Endpoint
app.post(['/api/ai/customer-insight', '/ai/customer-insight'], async (req, res) => {
  const { customer, invoices = [], businessProfile } = req.body;

  const customerInvoices = invoices.filter(
    (inv: any) => inv.customerId === customer?.id || inv.customerName?.toLowerCase() === customer?.name?.toLowerCase()
  );

  const totalBilled = customerInvoices.reduce((sum: number, i: any) => sum + (i.total || 0), 0);
  const paidInvoices = customerInvoices.filter((i: any) => i.status === 'paid');
  const overdueInvoices = customerInvoices.filter((i: any) => i.status === 'overdue' || (i.status === 'pending' && new Date(i.dueDate) < new Date()));
  const totalPaid = paidInvoices.reduce((sum: number, i: any) => sum + (i.total || 0), 0);
  const outstanding = totalBilled - totalPaid;

  const fallbackAssessment = {
    customerId: customer?.id,
    riskScore: 78,
    riskLevel: 'medium',
    reliabilityRating: 'Standard Commercial Terms',
    averageDaysToPay: 10,
    onTimePaymentPercentage: 80,
    paymentConsistency: 'Moderate',
    summary: `${customer?.name || 'Client'} has an active invoice for ₦${outstanding.toLocaleString()} awaiting settlement. Communication channels are responsive.`,
    keyStrengths: [
      'Responsive via WhatsApp and email',
      'Established service terms and project milestone approval',
    ],
    riskFactors: [
      'Active invoice pending settlement',
    ],
    strategicRecommendation: 'Send a gentle WhatsApp courtesy nudge 2 days before the due date to ensure timely transfer.',
    suggestedPaymentTerms: 'Net 14 Days',
    lastAnalyzedAt: new Date().toISOString(),
  };

  let execResult: GeminiExecutionResult | null = null;
  try {
    const prompt = `You are Billa's AI Credit & Customer Insight Analyst.
Analyze this customer's profile and payment history:
Customer: ${customer?.name} (${customer?.companyName || 'Individual'})
Total Invoiced: ₦${totalBilled}
Total Paid: ₦${totalPaid}
Outstanding: ₦${outstanding}
Invoices: ${JSON.stringify(customerInvoices)}

Provide a human-readable, practical risk assessment in JSON with:
- riskScore (integer 0 to 100)
- riskLevel ("low" | "medium" | "high")
- reliabilityRating (e.g. "Prompt & Reliable", "Standard Commercial Terms", "Requires Follow-Up")
- averageDaysToPay (integer)
- onTimePaymentPercentage (integer 0-100)
- paymentConsistency ("Very High" | "Moderate" | "Irregular")
- summary (2-3 natural sentences assessing payment behavior)
- keyStrengths (array of strings)
- riskFactors (array of strings)
- strategicRecommendation (practical billing advice for business owner)
- suggestedPaymentTerms (e.g. "Net 14 Days", "50% Upfront Deposit")`;

    execResult = await generateContentSafe({
      contents: prompt,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          riskScore: { type: Type.INTEGER },
          riskLevel: { type: Type.STRING },
          reliabilityRating: { type: Type.STRING },
          averageDaysToPay: { type: Type.INTEGER },
          onTimePaymentPercentage: { type: Type.INTEGER },
          paymentConsistency: { type: Type.STRING },
          summary: { type: Type.STRING },
          keyStrengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          riskFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
          strategicRecommendation: { type: Type.STRING },
          suggestedPaymentTerms: { type: Type.STRING },
        },
        required: [
          'riskScore',
          'riskLevel',
          'reliabilityRating',
          'averageDaysToPay',
          'onTimePaymentPercentage',
          'paymentConsistency',
          'summary',
          'keyStrengths',
          'riskFactors',
          'strategicRecommendation',
          'suggestedPaymentTerms',
        ],
      },
    });

    if (execResult.text) {
      const parsed = JSON.parse(execResult.text);
      return res.json({
        customerId: customer?.id,
        ...parsed,
        lastAnalyzedAt: new Date().toISOString(),
        source: 'gemini',
        modelUsed: execResult.modelUsed,
      });
    }
  } catch (error: any) {
    console.warn('[AI Customer Insight Error]', error?.message || error);
  }

  return res.json({
    ...fallbackAssessment,
    source: 'rule-based-insights',
    fallbackReason: execResult?.fallbackReason || 'Gemini model returned empty response',
  });
});

// 4. AI Batch Overdue Reminders Generator
app.post(['/api/ai/batch-reminders', '/ai/batch-reminders'], async (req, res) => {
  const { overdueInvoices = [], businessProfile, tone = 'friendly' } = req.body;
  const businessName = businessProfile?.name || 'Apex Studios';
  const bankInfo = businessProfile?.accountNumber
    ? `${businessProfile.bankName}, Acct: ${businessProfile.accountNumber} (${businessProfile.accountName})`
    : 'GTBank, Acct: 0239481920 (Apex Creative Media Ltd)';

  if (!overdueInvoices || overdueInvoices.length === 0) {
    return res.json({ reminders: [], count: 0, source: 'template-engine' });
  }

  const generatedReminders = overdueInvoices.map((inv: any) => {
    const custName = inv.customerName || 'Valued Client';
    const invNum = inv.invoiceNumber || 'BIL-2026-001';
    const amount = `₦${(inv.total || 0).toLocaleString()}`;
    const items = inv.items?.map((it: any) => it.description).join(', ') || 'Services rendered';
    const daysOverdue = Math.max(1, Math.floor((new Date().getTime() - new Date(inv.dueDate).getTime()) / (1000 * 3600 * 24)));

    let subject = `Payment Reminder: Invoice ${invNum} from ${businessName}`;
    let emailBody = `Dear ${custName},\n\nI hope you are having a productive week.\n\nThis is a polite reminder regarding Invoice ${invNum} for ${amount} (${items}), which was due on ${inv.dueDate}.\n\nSettlement Account Details:\n${bankInfo}\n\nKindly confirm once the transfer is completed. Thank you!\n\nWarm regards,\n${businessName}`;

    return {
      invoiceId: inv.id,
      invoiceNumber: invNum,
      customerId: inv.customerId,
      customerName: custName,
      customerEmail: inv.customerEmail || `${custName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      customerPhone: inv.customerPhone,
      amount: inv.total,
      dueDate: inv.dueDate,
      daysOverdue,
      subject,
      emailBody,
      tone,
      channel: 'email',
    };
  });

  return res.json({
    reminders: generatedReminders,
    count: generatedReminders.length,
    source: 'template-engine',
  });
});

// 5. AI Smart Invoice Creator (Prompt to Invoice)
app.post(['/api/ai/smart-extract', '/ai/smart-extract'], async (req, res) => {
  const { prompt: promptText, defaultCurrency = 'NGN' } = req.body;

  if (!promptText || promptText.trim().length === 0) {
    return res.status(400).json({ error: 'Prompt text is required' });
  }

  // Always compute an accurate deterministic fallback based on the actual prompt
  const fallbackInvoice = extractInvoiceFromPrompt(promptText, defaultCurrency);

  let execResult: GeminiExecutionResult | null = null;
  try {
    const prompt = `You are Billa's smart invoice builder. Extract structured invoice data from this user text:
"${promptText}"

Extract:
- customerName
- customerEmail (or create placeholder)
- customerPhone (or create placeholder)
- customerAddress
- items: array of { description, quantity, unitPrice, total } (in ${defaultCurrency})
- discountPercentage (number)
- dueDate (YYYY-MM-DD format if mentioned or relative days)
- notes (string)`;

    execResult = await generateContentSafe({
      contents: prompt,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          customerName: { type: Type.STRING },
          customerEmail: { type: Type.STRING },
          customerPhone: { type: Type.STRING },
          customerAddress: { type: Type.STRING },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                unitPrice: { type: Type.NUMBER },
                total: { type: Type.NUMBER },
              },
              required: ['description', 'quantity', 'unitPrice', 'total'],
            },
          },
          discountPercentage: { type: Type.NUMBER },
          dueDate: { type: Type.STRING },
          notes: { type: Type.STRING },
        },
        required: ['customerName', 'items'],
      },
    });

    if (execResult.text) {
      const parsed = JSON.parse(execResult.text);
      if (parsed && parsed.customerName && parsed.items && parsed.items.length > 0) {
        return res.json({
          invoice: parsed,
          source: 'gemini',
          modelUsed: execResult.modelUsed,
        });
      }
    }
  } catch (error: any) {
    console.warn('Smart extract Gemini note: Falling back to resilient prompt parser', error?.message || error);
  }

  return res.json({
    invoice: fallbackInvoice,
    source: 'nlp-parser',
    fallbackReason: execResult?.fallbackReason || 'Gemini model did not return structured invoice data',
  });
});

// 6. AI Advisor & Cashflow Diagnostic Endpoint (Dedicated Business Copilot)
app.post(['/api/ai/advisor', '/ai/advisor'], async (req, res) => {
  const { question, context } = req.body;
  const userQuery = (question || '').trim();

  const bp = context?.businessProfile || {};
  const businessName = bp.name || context?.businessName || 'Your Business';
  const currencySymbol = bp.currency === 'USD' ? '$' : bp.currency === 'GBP' ? '£' : bp.currency === 'EUR' ? '€' : '₦';

  const practicalTips = [
    `💡 **Tip for ${businessName}**: Keep bank transfer details saved at the top of your chat so clients never delay transfers searching for an account number.`,
    '💡 **Tip: Send WhatsApp Reminders**: Invoices followed up via WhatsApp receive payment 3x faster than email reminders.',
    '💡 **Tip: Use Milestone Deposits**: For engagements over ₦50,000, enforce a 50% upfront commitment deposit before starting work.',
    '💡 **Tip: Offer a 2-3% Prompt-Settlement Incentive**: A modest deduction for payment within 48 hours eliminates weeks of chasing.',
  ];

  let execResult: GeminiExecutionResult | null = null;
  try {
    const isGreeting = /^(hi|hello|hey|good\s*(morning|afternoon|evening)|howdy|sup|yo)\b/i.test(userQuery);

    const prompt = `You are Billa, the dedicated, intelligent in-house financial advisor, billing strategist, and cashflow copilot specifically built for "${businessName}".

You are not an external or generic chatbot. You are the operational billing brains inside "${businessName}". You know its bank accounts, clients, terms, invoice statuses, and numbers.

=== DEDICATED BUSINESS PROFILE FOR ${businessName.toUpperCase()} ===
• Business Name: ${businessName}
• Tagline / Trade: ${bp.tagline || 'Specialized Small Business'}
• Official Email: ${bp.email || 'Not specified'}
• Phone / WhatsApp: ${bp.phone || 'Not specified'}
• Physical Address: ${bp.address || 'Not specified'}
• Website: ${bp.website || 'Not specified'}
• Preferred Currency: ${bp.currency || 'NGN'} (${currencySymbol})
• Standard Payment Terms: Net ${bp.defaultPaymentTermsDays || 7} days
• Standard Tax / VAT: ${bp.defaultTaxRate ? `${bp.defaultTaxRate}%` : '0%'}
• Official Bank Transfer Details:
  - Bank Name: ${bp.bankName || '[Bank Name]'}
  - Account Number: ${bp.accountNumber || '[Account Number]'}
  - Account Name: ${bp.accountName || businessName}

=== LIVE FINANCIAL METRICS ===
• Total Billed: ${context?.metrics?.totalInvoiced || '₦0'}
• Total Collected: ${context?.metrics?.collected || '₦0'} (${context?.metrics?.collectionRate || '0%'} Collection Rate)
• Pending / Outstanding Receivables: ${context?.metrics?.outstanding || '₦0'}
• Overdue Invoices Count: ${context?.metrics?.overdueCount ?? 0}
• Pending Invoices Count: ${context?.metrics?.pendingCount ?? 0}

=== ACTIVE RECEIVABLES (OPEN & OVERDUE) ===
${context?.openInvoices && context.openInvoices.length > 0
  ? JSON.stringify(context.openInvoices, null, 2)
  : 'All billed accounts are currently settled and up to date!'}

=== TOP CLIENTS & ACCOUNTS ===
${context?.topCustomers && context.topCustomers.length > 0
  ? JSON.stringify(context.topCustomers, null, 2)
  : 'Client database active.'}

=== COMMON SERVICES & DELIVERABLES ===
${context?.typicalServices && context.typicalServices.length > 0
  ? context.typicalServices.join(', ')
  : 'Professional services and client deliverables'}

=== MASTER KNOWLEDGE BASE: WEB APP FEATURES & SMALL BUSINESS BILLING (COVERS 99% OF SCENARIOS) ===
1. INVOICE CREATION & SMART ASSISTANT:
   • Creating Invoices: Use '+ New Invoice' or type into the AI Smart Creator prompt (e.g., "Bill Nike $2500 for Brand Design due in 14 days") which automatically creates structured line items, calculates taxes/discounts, and assigns payment terms.
   • Invoicing Lifecycle: Draft → Pending (sent to client) → Overdue (past payment terms) → Paid / Partial Payment.
   • Templates & Styling: Modern, Minimal, Bold, and Classic PDF designs. Customize accent colors, upload company logo, and attach digital signatures in Settings.
   • Sharing: One-click export to PDF, copy public shareable invoice links, or direct 1-tap WhatsApp and Email dispatch.
   • Recurring Retainers: Set automated weekly/monthly recurring billing cycles for ongoing retainer clients.

2. RECEIVABLES, OVERDUE INVOICES & DEBT RECOVERY:
   • 3-Stage Follow-up System:
     - Stage 1 (Courtesy Check-in): 48 hours before due date — friendly WhatsApp message checking if the client received the invoice and has our bank details.
     - Stage 2 (Due Date / 3 Days Late): Direct, courteous reminder with invoice PDF link and copyable bank transfer card.
     - Stage 3 (7-14 Days Overdue): Firm notification. Pause any secondary deliverables, source code, or revisions until the balance clears.
     - Stage 4 (30+ Days Severely Overdue): Issue a formal written demand letter, halt all intellectual property transfers/services, and make direct phone outreach to senior management.
   • Batch Reminders: Use the Reminders tab in Billa to generate customized WhatsApp/Email reminders for all overdue accounts in 1 click.
   • Prompt Payment Discount: Offer 2%–5% early-settlement incentive for payments wired within 48 hours to quickly inject liquid cash.

3. RECEIPT SCANNER & OCR EXPENSE TRACKER:
   • Scanning: Upload receipts via camera, image files (PNG/JPG), or PDFs. The vision engine instantly extracts Vendor Name, Date, Currency, Tax, Line Items, and Total Amount.
   • Use Cases: Convert supplier receipts directly into business expense deductions or rebillable client invoice line items.

4. CLIENT MANAGEMENT & RISK PROFILES:
   • Client Profiles: Store contacts, company names, billing addresses, tax numbers, and custom payment terms.
   • Reliability Ratings:
     - 'Fast Payer': Settles within terms — reward with priority scheduling.
     - 'Consistent': Settles on or near due date.
     - 'Slow Payer': Habitually 7-14 days late — strictly enforce 50% upfront deposits and Net 7 terms.
     - 'High Risk': Chronic non-payment — strictly 100% upfront payment before any work commences.
   • Credit Limits: Cap exposure to maximum 2 unpaid milestones per client.

5. CASHFLOW METRICS, FORMULAS & FORECASTING:
   • Collection Rate: (Total Collected / Total Invoiced) * 100. Healthy target is >85%.
   • Days Sales Outstanding (DSO): Average number of days to collect payment. Halving DSO from 30 to 14 days doubles liquid operational runway.
   • Cash Buffer: Always maintain 3 to 6 months of baseline operational overhead in reserve.

6. PAYMENT INFRASTRUCTURE & MULTI-CURRENCY:
   • Local Bank Transfers: Always supply Bank Name, Account Number, and Account Name directly in message text.
   • Mobile Money & USSD: M-Pesa, MTN MoMo, Airtel Money for instant mobile transfers.
   • Foreign Currency (USD, EUR, GBP): Invoice in hard currency for international clients with domiciliary bank details and a 7-day exchange-rate expiration clause.

7. TAXES, VAT & WITHHOLDING TAX (WHT):
   • VAT: Explicitly note whether quoted fees are inclusive or exclusive of VAT (e.g. 7.5% in Nigeria).
   • Withholding Tax (WHT): Corporate clients frequently deduct 5% or 10% WHT at source. ALWAYS demand an official WHT Credit Note so your accountant can deduct it directly from annual company income tax filings.

8. CLIENT DISPUTES & AWKWARD SCENARIOS:
   • "Approver is traveling": Politely request the designated deputy or offer direct online bank transfer details.
   • Scope Creep: When clients demand additions before paying, issue a secondary Change Order / Milestone invoice to be paid upon completion.
   • Refusal to Pay: Withhold final high-resolution assets, deployment credentials, or physical deliverables until payment reflects in the bank account.

=== USER QUESTION / INSTRUCTION ===
"${userQuery || 'Give me an operational overview and tell me how to optimize my cashflow.'}"

=== RESPONSE GUIDELINES ===
1. EMBODY ${businessName.toUpperCase()}:
   - Answer as the expert, dedicated in-house billing copilot for ${businessName}.
   - If the user asks ANY question about the web app (invoices, receipts, clients, reminders, PDF, tax, exports, settings, currencies), explain step-by-step how to do it in Billa with practical, actionable clarity.
   - If the user asks about bank details: output a ready-to-copy card with ${bp.bankName || '[Bank Name]'}, ${bp.accountNumber || '[Account Number]'}, ${bp.accountName || businessName}.
   - If the user asks who owes money: list the specific clients and overdue balances from active receivables.
   - If the user asks for reminders or scripts: write copy-ready messages in blockquotes (>) with bank details included.
   - If the user asks for financial, tax, or business advice: give realistic, high-leverage strategies tailored to small businesses.
2. FORMATTING:
   - Use clean markdown with bold highlights, numbered action steps, and copyable text snippets.
   - Conclude with a punchy "💡 Billa Pro Tip for ${businessName}".`;

    execResult = await generateContentSafe({
      contents: prompt,
    });

    if (execResult.text) {
      return res.json({
        answer: execResult.text,
        tips: practicalTips,
        source: 'gemini',
        modelUsed: execResult.modelUsed,
      });
    }
  } catch (error: any) {
    console.log('AI Advisor note: utilizing contextual business fallback', error?.message || error);
  }

  // Dynamic business-specific fallback
  const isGreeting = /^(hi|hello|hey|good\s*(morning|afternoon|evening)|howdy)\b/i.test(userQuery);
  const lower = userQuery.toLowerCase();
  let fallbackAnswer = '';

  if (isGreeting) {
    const outstandingNote = context?.metrics?.outstanding
      ? `We currently have **${context.metrics.outstanding}** in open receivables.`
      : 'All billed accounts are currently settled!';
    fallbackAnswer = `Hello! 👋 Great to connect with you. I'm Billa, your dedicated billing and cashflow copilot for **${businessName}**.\n\n${outstandingNote}\n\nHere are a few quick things I can help you with right now:\n• 🏦 **Bank Snippet**: Get a copyable payment block with your bank details to send to clients.\n• 📋 **Receivables Audit**: Review who owes us and which invoices need a nudge.\n• 📱 **WhatsApp Reminders**: Draft a courteous reminder for any client.\n• ✍️ **Deposit Policy**: Generate a professional 50% deposit clause for new quotes.\n\nWhat would you like to tackle?`;
  } else if (/bank|account|transfer|details|where to pay|how to pay/i.test(lower)) {
    const bankName = bp.bankName || 'Your Bank';
    const accNum = bp.accountNumber || 'Your Account Number';
    const accName = bp.accountName || businessName;
    fallbackAnswer = `Here is our official, copyable payment card for **${businessName}** that you can send directly to clients on WhatsApp or Email:\n\n> 🏦 **Official Bank Transfer Details — ${businessName}**\n>\n> • **Bank Name**: ${bankName}\n> • **Account Number**: ${accNum}\n> • **Account Name**: ${accName}\n> • **Currency**: ${bp.currency || 'NGN'}\n>\n> *Kindly share your transfer receipt once payment is completed so we can credit your file and issue an official receipt immediately. Thank you!*\n\n💡 *Tip: Pin this snippet in your WhatsApp keyboard shortcuts for instant 1-tap sharing with clients.*`;
  } else if (/who owes|unpaid|overdue|debt|pending|receivable|chase/i.test(lower)) {
    if (context?.openInvoices && context.openInvoices.length > 0) {
      const list = context.openInvoices
        .map((inv: any) => `• **${inv.customerName}** — ${inv.amount} (Invoice #${inv.invoiceNumber}, Due: ${inv.dueDate}, Status: *${inv.status}*)`)
        .join('\n');
      fallbackAnswer = `Here are the active receivables currently awaiting collection for **${businessName}**:\n\n${list}\n\n💡 **Action Step**: Would you like me to draft a friendly WhatsApp reminder for any of these clients?`;
    } else {
      fallbackAnswer = `Great news! **${businessName}** has zero overdue or pending invoices right now. All billed accounts have been successfully settled!`;
    }
  } else {
    fallbackAnswer = `Regarding your question for **${businessName}**:\n\nTo ensure consistent cashflow and protect your project schedules, we recommend standardizing on a **50% commitment deposit** before commencing work, paired with **Net 7 payment terms** for final deliverables.\n\nAlways attach our bank details (*${bp.bankName || 'Bank'}: ${bp.accountNumber || 'Account #'}*) directly into your WhatsApp messages so clients can pay in seconds without searching through emails.\n\n${practicalTips[0]}`;
  }

  return res.json({
    answer: fallbackAnswer,
    tips: practicalTips,
    source: 'knowledge-base',
    fallbackReason: execResult?.fallbackReason || 'Generated with in-house business knowledge engine',
  });
});

// 7. AI Receipt / Camera Capture Parser (Multimodal Vision OCR to Invoice)
const handleReceiptParse = async (req: express.Request, res: express.Response) => {
  const { imageBase64, mimeType, defaultCurrency = 'NGN' } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'Receipt image data is required.' });
  }

  // Auto-detect exact mimeType from Data URL prefix if present
  const mimeMatch = typeof imageBase64 === 'string' ? imageBase64.match(/^data:([^;]+);base64,/) : null;
  const effectiveMime = mimeMatch ? mimeMatch[1] : (mimeType || 'image/jpeg');

  // Strip potential data URL prefix
  const cleanBase64 = typeof imageBase64 === 'string'
    ? imageBase64.replace(/^data:[^;]+;base64,/, '').trim()
    : imageBase64;

  const todayStr = new Date().toISOString().split('T')[0];
  const dueStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const fallbackReceipt = {
    merchantName: 'Store / Vendor',
    customerName: 'Customer',
    invoiceNumber: `REC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    date: todayStr,
    dueDate: dueStr,
    items: [
      {
        description: 'Goods / Services rendered (from Receipt)',
        quantity: 1,
        unitPrice: 0,
        total: 0,
      },
    ],
    subtotal: 0,
    taxRate: 0,
    taxAmount: 0,
    discountPercentage: 0,
    discountAmount: 0,
    total: 0,
    currency: defaultCurrency,
    notes: 'Scanned from camera photo. Please verify line items.',
    confidence: 60,
  };

  let execResult: GeminiExecutionResult | null = null;
  try {
    const prompt = `You are Billa's high-precision receipt and invoice OCR assistant.
Analyze this photo of a receipt, bill, or invoice carefully.
Extract all relevant billing details accurately:

1. Merchant or Vendor name (business issuing receipt)
2. Customer or Client name (if mentioned on bill, otherwise use the merchant name or "Customer")
3. Receipt or Invoice number (if visible, or generate a neat one like REC-${new Date().getFullYear()}-001)
4. Date of transaction (YYYY-MM-DD format, fallback to "${todayStr}")
5. Due Date (YYYY-MM-DD format, default to "${dueStr}")
6. All line items purchased/billed (description, quantity, unitPrice, total)
7. Subtotal, Tax/VAT percentage and amount, Discount percentage and amount, and Final Total
8. Currency (e.g. NGN, USD, EUR, GBP, KES, GHS, ZAR, CAD)
9. Notes / Payment method (e.g. "Paid via POS / Card", "Bank Transfer", or itemized remarks)

Return valid JSON with these fields:
- merchantName: string
- customerName: string
- invoiceNumber: string
- date: string (YYYY-MM-DD)
- dueDate: string (YYYY-MM-DD)
- items: array of { description: string, quantity: number, unitPrice: number, total: number }
- subtotal: number
- taxRate: number
- taxAmount: number
- discountPercentage: number
- discountAmount: number
- total: number
- currency: string
- notes: string
- confidence: number (1-100)`;

    execResult = await generateContentSafeWithImage({
      parts: [
        {
          inlineData: {
            mimeType: effectiveMime,
            data: cleanBase64,
          },
        },
        {
          text: prompt,
        },
      ],
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          merchantName: { type: Type.STRING },
          customerName: { type: Type.STRING },
          invoiceNumber: { type: Type.STRING },
          date: { type: Type.STRING },
          dueDate: { type: Type.STRING },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                unitPrice: { type: Type.NUMBER },
                total: { type: Type.NUMBER },
              },
              required: ['description', 'quantity', 'unitPrice', 'total'],
            },
          },
          subtotal: { type: Type.NUMBER },
          taxRate: { type: Type.NUMBER },
          taxAmount: { type: Type.NUMBER },
          discountPercentage: { type: Type.NUMBER },
          discountAmount: { type: Type.NUMBER },
          total: { type: Type.NUMBER },
          currency: { type: Type.STRING },
          notes: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
        },
        required: ['customerName', 'items', 'total'],
      },
    });

    if (execResult.text) {
      const parsed = JSON.parse(execResult.text);
      // Ensure numerical consistency
      const items = (parsed.items || []).map((it: any) => ({
        description: it.description || 'Item',
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        total: Number(it.total) || (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
      }));

      const subtotal = items.reduce((acc: number, item: any) => acc + item.total, 0);
      const taxRate = Number(parsed.taxRate) || 0;
      const taxAmount = Number(parsed.taxAmount) || (subtotal * (taxRate / 100));
      const discountPercentage = Number(parsed.discountPercentage) || 0;
      const discountAmount = Number(parsed.discountAmount) || (subtotal * (discountPercentage / 100));
      const calculatedTotal = Number(parsed.total) || Math.max(0, subtotal + taxAmount - discountAmount);

      return res.json({
        receipt: {
          merchantName: parsed.merchantName || 'Store / Merchant',
          customerName: parsed.customerName || parsed.merchantName || 'Customer',
          invoiceNumber: parsed.invoiceNumber || `REC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
          date: parsed.date || todayStr,
          dueDate: parsed.dueDate || dueStr,
          items: items.length > 0 ? items : fallbackReceipt.items,
          subtotal: items.length > 0 ? subtotal : 0,
          taxRate,
          taxAmount,
          discountPercentage,
          discountAmount,
          total: items.length > 0 ? calculatedTotal : 0,
          currency: parsed.currency || defaultCurrency,
          notes: parsed.notes || 'Extracted from camera photo with Billa Vision OCR.',
          confidence: parsed.confidence || 95,
        },
        source: 'gemini-vision',
        modelUsed: execResult.modelUsed,
      });
    }
  } catch (error: any) {
    console.error('Error parsing receipt image:', error?.message || error);
  }

  return res.json({
    receipt: fallbackReceipt,
    source: 'ocr-fallback',
    fallbackReason: execResult?.fallbackReason || 'Vision model returned no data',
  });
};

app.post(['/api/ai/parse-receipt', '/ai/parse-receipt'], handleReceiptParse);
app.post(['/api/ai/scan-receipt', '/ai/scan-receipt'], handleReceiptParse);

// Vite middleware & Static server
async function startServer() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Billa server running on http://localhost:${PORT}`);
    });
  }
}

// Prevent process-level crashes from detached network requests or timeouts
process.on('unhandledRejection', (reason: any) => {
  console.warn('[Server Handled Unhandled Rejection]:', reason?.message || reason);
});
process.on('uncaughtException', (error: any) => {
  console.warn('[Server Handled Uncaught Exception]:', error?.message || error);
});

if (!process.env.VERCEL) {
  startServer();
}

export default app;

