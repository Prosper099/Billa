import React, { useState, useEffect } from 'react';
import {
  MessageCircle,
  Mail,
  Copy,
  Check,
  Sparkles,
  X,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { callAiEndpoint } from '../services/aiClient';

export const ReminderModal: React.FC = () => {
  const {
    reminderModalInvoice,
    setReminderModalInvoice,
    businessProfile,
    activeCurrency,
    showToast,
  } = useApp();

  const [tone, setTone] = useState<'friendly' | 'professional' | 'firm' | 'urgent'>('friendly');
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!reminderModalInvoice) return;

    const generate = async () => {
      setIsLoading(true);
      try {
        const { data } = await callAiEndpoint('/api/ai/follow-up', {
          invoice: reminderModalInvoice,
          business: businessProfile,
          tone,
          channel,
        }, { timeoutMs: 12000 });

        if (data?.message) {
          setMessage(data.message);
          setSubject(data.subject || `Payment Reminder: Invoice ${reminderModalInvoice.invoiceNumber}`);
        } else {
          // Fallback template
          setMessage(
            `Hello ${reminderModalInvoice.customerName},\n\nJust a gentle reminder regarding invoice ${reminderModalInvoice.invoiceNumber} for ${formatCurrency(reminderModalInvoice.total, activeCurrency)} which was due on ${formatDate(reminderModalInvoice.dueDate)}.\n\nBank: ${businessProfile.bankName} (${businessProfile.accountNumber})\n\nThank you!\n${businessProfile.name}`
          );
        }
      } catch {
        setMessage(
          `Hello ${reminderModalInvoice.customerName},\n\nKindly check invoice ${reminderModalInvoice.invoiceNumber} for ${formatCurrency(reminderModalInvoice.total, activeCurrency)}.\n\nAccount: ${businessProfile.bankName} - ${businessProfile.accountNumber}`
        );
      } finally {
        setIsLoading(false);
      }
    };

    generate();
  }, [reminderModalInvoice, tone, channel]);

  if (!reminderModalInvoice) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    showToast('Copied to Clipboard', 'Reminder text ready to paste.');
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappPhone = reminderModalInvoice.customerPhone?.replace(/[^0-9]/g, '') || '';
  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-scaleUp">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-2xs">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                AI Follow-Up for {reminderModalInvoice.customerName}
              </h3>
              <p className="text-xs text-slate-500">
                Invoice {reminderModalInvoice.invoiceNumber} • {formatCurrency(reminderModalInvoice.total, activeCurrency)}
              </p>
            </div>
          </div>
          <button
            onClick={() => setReminderModalInvoice(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tone Selector */}
        <div className="space-y-1.5">
          <label className="text-xs text-slate-500 font-semibold">Choose Reminder Tone:</label>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: 'friendly', label: '😊 Friendly' },
              { id: 'professional', label: '👔 Business' },
              { id: 'firm', label: '⚖️ Firm' },
              { id: 'urgent', label: '🚨 Urgent' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTone(t.id as any)}
                className={`py-1.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  tone === t.id
                    ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message Preview Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Personalized Message</span>
            {isLoading && (
              <span className="flex items-center gap-1 text-indigo-600 font-medium">
                <Sparkles className="w-3 h-3 animate-spin" />
                <span>Crafting...</span>
              </span>
            )}
          </div>
          <textarea
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 font-sans leading-relaxed"
          />
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          {whatsappPhone ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Send via WhatsApp Web ({reminderModalInvoice.customerPhone})</span>
            </a>
          ) : null}

          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Message'}</span>
            </button>
            <button
              onClick={() => setReminderModalInvoice(null)}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
