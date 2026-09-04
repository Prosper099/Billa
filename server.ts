import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
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

// Safe Promise timeout helper
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: any;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
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
  const modelsToTry = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-3.1-flash-lite'];
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

      console.log(`[AI Backend >> Gemini] Trying model: ${model} (payload size: ${params.contents.length} chars)...`);
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
        console.log(`[AI Backend >> Gemini] Model ${model} SUCCEEDED in ${attemptDuration}ms (${response.text.length} chars returned)`);
        return {
          text: response.text,
          modelUsed: model,
          source: 'gemini',
          durationMs: Date.now() - overallStart,
        };
      } else {
        const err = `Model ${model} returned empty response in ${attemptDuration}ms`;
        console.warn(`[AI Backend >> Gemini] ${err}`);
        errors.push(err);
      }
    } catch (err: any) {
      const attemptDuration = Date.now() - attemptStart;
      const errMsg = `Model ${model} failed in ${attemptDuration}ms: ${err?.status || err?.message || 'timeout'}`;
      console.warn(`[AI Backend >> Gemini Note] ${errMsg}`);
      errors.push(errMsg);
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
  const modelsToTry = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-3.1-flash-lite'];
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

      console.log(`[AI Backend >> Gemini Vision] Trying model: ${model} with image parts...`);
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
        console.log(`[AI Backend >> Gemini Vision] Model ${model} SUCCEEDED in ${attemptDuration}ms (${response.text.length} chars returned)`);
        return {
          text: response.text,
          modelUsed: model,
          source: 'gemini-vision',
          durationMs: Date.now() - overallStart,
        };
      } else {
        const err = `Model ${model} returned empty vision response in ${attemptDuration}ms`;
        console.warn(`[AI Backend >> Gemini Vision] ${err}`);
        errors.push(err);
      }
    } catch (err: any) {
      const attemptDuration = Date.now() - attemptStart;
      const errMsg = `Model ${model} failed in ${attemptDuration}ms: ${err?.status || err?.message || 'timeout'}`;
      console.warn(`[AI Backend >> Gemini Vision Note] ${errMsg}`);
      errors.push(errMsg);
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
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Billa API',
    timestamp: new Date().toISOString(),
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Middleware: Deep Logging for all /api/ai/* Requests and Responses
app.use('/api/ai', (req, res, next) => {
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
app.post('/api/ai/narrative', async (req, res) => {
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
app.post('/api/ai/follow-up', async (req, res) => {
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
app.post('/api/ai/customer-insight', async (req, res) => {
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
app.post('/api/ai/batch-reminders', async (req, res) => {
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
app.post('/api/ai/smart-extract', async (req, res) => {
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

// 6. AI Advisor & Cashflow Diagnostic Endpoint (Conversational, Human-like, with Proactive Tips)
app.post('/api/ai/advisor', async (req, res) => {
  const { question, context } = req.body;
  const userQuery = (question || '').trim();

  const practicalTips = [
    '💡 **Tip: Send WhatsApp Reminders**: Invoices sent or followed up on WhatsApp have a 3x higher open and payment rate than email alone.',
    '💡 **Tip: Offer a 3-5% Quick-Pay Discount**: Incentivize clients to settle within 48 hours to accelerate your cashflow turnaround.',
    '💡 **Tip: Use Milestone Payments**: For projects over ₦50,000, split billing into 50% upfront deposit and 50% upon final delivery.',
    '💡 **Tip: Clear Bank Details**: Ensure your account number, bank name, and account holder name are prominently stated at the top of every reminder.',
  ];

  let execResult: GeminiExecutionResult | null = null;
  try {
    const isGreeting = /^(hi|hello|hey|good\s*(morning|afternoon|evening)|howdy|sup|yo)\b/i.test(userQuery);

    const prompt = `You are Billa, an empathetic, encouraging, and razor-sharp AI financial advisor and billing copilot for small businesses.
The business owner asks: "${userQuery || 'How can I improve my payment collections?'}"

Business Context:
${JSON.stringify(context || {})}

Guidelines for your response:
1. Speak warmly, conversationally, and authentically like a knowledgeable human friend and business copilot (not like a robotic corporate algorithm).
${
  isGreeting
    ? `2. The user greeted you ("${userQuery}"). Greet them warmly in return, mention that you're ready to help their business (${context?.businessName || 'your business'}), and suggest 2 or 3 quick things you can do together right now (e.g. review overdue invoices, draft a friendly WhatsApp follow-up, optimize invoice payment terms, or analyze cashflow).`
    : `2. Provide direct, highly practical advice tailored to African & international small business dynamics (e.g. WhatsApp follow-ups, direct bank transfers, deposit policies, milestone invoicing).
3. Include 2-3 specific, actionable steps the business owner can take immediately.
4. End with one punchy, memorable "💡 Billa Pro Tip".`
}`;

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
    console.warn('AI Advisor Gemini note: using dynamic contextual fallback', error?.message || error);
  }

  // Dynamic contextual fallback
  const isGreeting = /^(hi|hello|hey|good\s*(morning|afternoon|evening)|howdy)\b/i.test(userQuery);
  let fallbackAnswer = '';
  if (isGreeting) {
    fallbackAnswer = `Hello! 👋 Great to connect with you. I'm Billa, your financial copilot for ${context?.businessName || 'your business'}.\n\nHow can I help you today? Here are a few things we can do right now:\n• **Draft polite WhatsApp payment reminders** for any open invoices\n• **Review your cash flow** and collection rate\n• **Generate a new invoice** with automated terms\n• **Optimize your billing policy** (like a 50% upfront deposit)\n\nWhat would you like to tackle?`;
  } else if (/risk|cashflow|score|health/i.test(userQuery)) {
    fallbackAnswer = `Here is a quick look at your current cashflow health:\n\n• **Collected**: ${context?.collected ? '₦' + Number(context.collected).toLocaleString() : '₦0'}\n• **Outstanding**: ${context?.outstanding ? '₦' + Number(context.outstanding).toLocaleString() : '₦0'}\n\n**Key Recommendation:** Keep client communication active on WhatsApp 48 hours before due dates to ensure zero payment friction!\n\n${practicalTips[0]}`;
  } else {
    fallbackAnswer = `Here are 3 practical recommendations to optimize your receivables:\n\n1. **Send a friendly WhatsApp check-in**: Reaching out casually 2 days before the due date gives clients ample time to process bank transfers.\n2. **Include instant payment details**: Always paste your account details directly in the message.\n3. **Establish a 50% upfront standard**: For upcoming creative or service orders, ask for 50% upfront.\n\n${practicalTips[Math.floor(Math.random() * practicalTips.length)]}`;
  }

  return res.json({
    answer: fallbackAnswer,
    tips: practicalTips,
    source: 'knowledge-base',
    fallbackReason: execResult?.fallbackReason || 'Gemini model did not respond',
  });
});

// 7. AI Receipt / Camera Capture Parser (Multimodal Vision OCR to Invoice)
app.post('/api/ai/parse-receipt', async (req, res) => {
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
});

// Vite middleware & Static server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Billa server running on http://localhost:${PORT}`);
  });
}

startServer();

