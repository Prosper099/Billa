import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  ArrowRight,
  Lightbulb,
  X,
  FileText,
} from 'lucide-react';
import { BillaAIIcon } from './BrandLogo';
import { useApp } from '../context/AppContext';
import { generateInvoiceNumber } from '../utils/formatters';
import { extractInvoiceFromPrompt } from '../utils/promptExtractor';

export const QuickPromptModal: React.FC = () => {
  const {
    isQuickPromptOpen,
    setIsQuickPromptOpen,
    createInvoice,
    invoices,
    activeCurrency,
    setSelectedInvoice,
    setCurrentView,
    showToast,
  } = useApp();

  const [promptText, setPromptText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isQuickPromptOpen) return null;

  const presets = [
    'Billed Fatima for 3 UI Design Sprints at ₦120,000 each with 5% discount, due in 10 days',
    'Photographed product shoot for Kemi: 2 sessions at ₦45,000 each + ₦15,000 studio lighting fee',
    'Consulted for Babatunde: 1 Brand Strategy Audit ₦180,000 due next Friday',
  ];

  const handleProcessPrompt = async (textToUse?: string) => {
    const text = textToUse || promptText;
    if (!text.trim() || isProcessing) return;

    setIsProcessing(true);

    let extracted: any = null;

    try {
      const res = await fetch('/api/ai/smart-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, defaultCurrency: activeCurrency }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.invoice && data.invoice.customerName) {
          extracted = data.invoice;
        }
      }
    } catch {
      // Backend fetch skipped/failed, will use instant deterministic NLP parser
    }

    // Resilient fallback: parse text directly with NLP extractor
    if (!extracted) {
      extracted = extractInvoiceFromPrompt(text, activeCurrency);
    }

    // Calculate totals & items
    const items =
      extracted.items && extracted.items.length > 0
        ? extracted.items
        : [{ description: 'Professional Services', quantity: 1, unitPrice: 50000, total: 50000 }];

    const subtotal = items.reduce(
      (sum: number, it: any) => sum + (it.total || it.quantity * it.unitPrice || 0),
      0
    );
    const discountPercentage = extracted.discountPercentage || 0;
    const discountAmount = (subtotal * discountPercentage) / 100;
    const total = Math.max(0, subtotal - discountAmount);

    const newInv = createInvoice({
      invoiceNumber: generateInvoiceNumber(invoices.length),
      customerId: 'cust-extracted',
      customerName: extracted.customerName || 'Valued Client',
      customerEmail: extracted.customerEmail || 'client@example.com',
      customerPhone: extracted.customerPhone || '+234 800 000 0000',
      customerAddress: extracted.customerAddress || 'Lagos, Nigeria',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: extracted.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      items,
      subtotal,
      discountPercentage,
      discountAmount,
      taxRate: 0,
      taxAmount: 0,
      deliveryFee: 0,
      total,
      status: 'pending',
      notes: extracted.notes || 'Created via Billa AI smart extraction.',
      paymentTerms: 'Payment due on receipt.',
      currency: activeCurrency,
    });

    setIsQuickPromptOpen(false);
    setPromptText('');
    setSelectedInvoice(newInv);
    setCurrentView('invoice-view');
    showToast('Invoice Created by AI', `Extracted invoice for ${extracted.customerName || 'Client'}.`, 'success');
    setIsProcessing(false);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsQuickPromptOpen(false);
      }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-5 space-y-3.5 shadow-2xl animate-scaleUp my-auto max-h-[92vh] flex flex-col justify-between overflow-y-auto">
        {/* Modal Header with official Billa AI branding */}
        <div className="flex items-start justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <BillaAIIcon size="sm" />
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight truncate">
                Billa AI Prompt to Invoice
              </h3>
              <p className="text-[11px] text-slate-500 leading-tight">
                Describe a transaction in plain English to auto-extract details.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsQuickPromptOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input Textarea */}
        <div className="space-y-1 shrink-0">
          <textarea
            rows={2}
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="e.g. Billed Tunde ₦75,000 for website maintenance and ₦25,000 for SEO audit due in 5 days..."
            className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors leading-relaxed resize-none"
          />
        </div>

        {/* Presets / Suggestions */}
        <div className="space-y-1.5 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="font-semibold">Try clicking an example:</span>
          </div>
          <div className="space-y-1">
            {presets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPromptText(preset);
                  handleProcessPrompt(preset);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/90 hover:border-indigo-200 text-[11px] sm:text-xs text-slate-700 hover:text-indigo-950 transition-all flex items-center justify-between group cursor-pointer"
              >
                <span className="truncate pr-2">{preset}</span>
                <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={() => setIsQuickPromptOpen(false)}
            className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer border border-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            id="btn-run-ai-extract"
            disabled={isProcessing || !promptText.trim()}
            onClick={() => handleProcessPrompt()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>{isProcessing ? 'Extracting...' : 'Generate Invoice'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
