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

export const AIAdvisorView: React.FC = () => {
  const {
    businessProfile,
    invoices,
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
    '💡 How can I get clients to pay 3 days faster?',
    '📊 Analyze my current cashflow risk score',
    '✍️ Draft a polite 50% deposit policy for quotes',
    '📱 What is the best WhatsApp reminder script?',
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

    try {
      const { data } = await callAiEndpoint('/api/ai/advisor', {
        question: userText,
        context: {
          businessName: businessProfile.name,
          totalInvoiced: metrics.totalInvoiced,
          collected: metrics.collected,
          outstanding: metrics.outstanding,
          overdueCount: metrics.overdueInvoicesCount,
          collectionRate: metrics.collectionRate,
        },
      }, { timeoutMs: 14000 });

      if (data?.answer) {
        setChatHistory((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: data.answer,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        const isGreeting = /^(hi|hello|hey|good\s*(morning|afternoon|evening))/i.test(userText);
        const dynamicFallback = isGreeting
          ? `Hello! 👋 How can I help you today? I can help you draft a high-converting WhatsApp reminder, analyze your open receivables, or configure optimal milestone deposit rules for your clients.`
          : `Based on your question regarding "${userText}": I recommend reviewing your active invoices, keeping clear payment bank details directly in all chat communications, and considering a 50% upfront deposit standard on future orders to eliminate collection delays.`;
        setChatHistory((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: dynamicFallback,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch {
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Regarding "${userText}": To protect your business cashflow, always ask for a 50% commitment deposit before starting projects. It filters high-intent clients and covers initial expenses immediately.`,
          timestamp: 'Just now',
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

              {/* Instant WhatsApp Redirect Button */}
              {channel === 'whatsapp' && currentSelectedInvoice?.customerPhone && (
                <a
                  href={`https://wa.me/${currentSelectedInvoice.customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    generatedMessage
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Open WhatsApp Web ({currentSelectedInvoice.customerPhone})</span>
                </a>
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

