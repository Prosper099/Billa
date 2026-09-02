import React, { useState, useEffect } from 'react';
import {
  Bell,
  Sparkles,
  Send,
  Sliders,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Mail,
  MessageCircle,
  RefreshCw,
  Eye,
  ShieldCheck,
  Calendar,
  Settings2,
  ChevronRight,
  ExternalLink,
  DollarSign,
  User,
  CheckCheck,
  FileText,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { ReminderScheduleConfig, ReminderTone, Invoice } from '../types';

export const RemindersHubView: React.FC = () => {
  const {
    invoices,
    customers,
    businessProfile,
    activeCurrency,
    reminderConfig,
    updateReminderConfig,
    reminderLogs,
    sendEmailReminder,
    sendWhatsAppReminder,
    autoScanAndDraftReminders,
    isAutoScanningReminders,
    setSelectedInvoice,
    setCurrentView,
    showToast,
  } = useApp();

  // Local draft reminder cards
  const [draftedReminders, setDraftedReminders] = useState<any[]>([]);
  const [selectedDraftIndex, setSelectedDraftIndex] = useState<number>(0);
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [activeTone, setActiveTone] = useState<ReminderTone>(reminderConfig.defaultTone);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [isConfigDrawerOpen, setIsConfigDrawerOpen] = useState(false);

  // Editable config state
  const [configEnabled, setConfigEnabled] = useState(reminderConfig.enabled);
  const [configTone, setConfigTone] = useState<ReminderTone>(reminderConfig.defaultTone);
  const [configSenderName, setConfigSenderName] = useState(reminderConfig.emailSenderName || businessProfile.name);
  const [configBeforeDue, setConfigBeforeDue] = useState(reminderConfig.schedulePoints.beforeDueDays || 2);
  const [configOnDue, setConfigOnDue] = useState(reminderConfig.schedulePoints.onDueDate);
  const [configOverdueDays, setConfigOverdueDays] = useState(
    reminderConfig.schedulePoints.overdueDays.join(', ')
  );
  const [configSendEmail, setConfigSendEmail] = useState(reminderConfig.sendEmail);
  const [configSendWhatsApp, setConfigSendWhatsApp] = useState(reminderConfig.sendWhatsApp);

  // Detect overdue invoices
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueInvoices = invoices.filter((inv) => {
    if (inv.status === 'paid' || inv.status === 'cancelled') return false;
    const due = new Date(inv.dueDate);
    due.setHours(0, 0, 0, 0);
    return inv.status === 'overdue' || due < today;
  });

  const totalOverdueAmount = overdueInvoices.reduce((sum, i) => sum + i.total, 0);

  // Auto-scan on initial view load if overdue invoices exist
  useEffect(() => {
    handleScanOverdue();
  }, [invoices.length]);

  const handleScanOverdue = async () => {
    const drafts = await autoScanAndDraftReminders();
    setDraftedReminders(drafts);
    if (drafts.length > 0) {
      setCustomSubject(drafts[0].subject || '');
      setCustomBody(drafts[0].emailBody || '');
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedOverdueDays = configOverdueDays
      .split(',')
      .map((d) => parseInt(d.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);

    updateReminderConfig({
      enabled: configEnabled,
      defaultTone: configTone,
      emailSenderName: configSenderName.trim(),
      sendEmail: configSendEmail,
      sendWhatsApp: configSendWhatsApp,
      schedulePoints: {
        beforeDueDays: Number(configBeforeDue),
        onDueDate: configOnDue,
        overdueDays: parsedOverdueDays.length > 0 ? parsedOverdueDays : [3, 7, 14, 21],
      },
    });

    setIsConfigDrawerOpen(false);
  };

  const handleOpenDraftPreview = (draft: any, index: number) => {
    setSelectedDraftIndex(index);
    setCustomSubject(draft.subject);
    setCustomBody(draft.emailBody);
    setActiveTone(draft.tone || reminderConfig.defaultTone);
    setIsDraftModalOpen(true);
  };

  const handleSendDraftEmail = async (draft: any) => {
    await sendEmailReminder(draft.invoiceId, customSubject || draft.subject, customBody || draft.emailBody, activeTone);
    setIsDraftModalOpen(false);
  };

  const handleSendAllBatchEmails = async () => {
    if (draftedReminders.length === 0) return;

    for (const draft of draftedReminders) {
      await sendEmailReminder(draft.invoiceId, draft.subject, draft.emailBody, reminderConfig.defaultTone);
    }
    showToast('Batch Reminders Processed', `Dispatched ${draftedReminders.length} reminder emails to customers.`);
  };

  const toneOptions: { id: ReminderTone; title: string; desc: string; badge: string }[] = [
    {
      id: 'friendly',
      title: 'Friendly & Casual',
      desc: 'Gentle, warm check-in with polite emojis and courteous language.',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      id: 'professional',
      title: 'Polished Business',
      desc: 'Clear, direct, formal corporate settlement request.',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    {
      id: 'firm',
      title: 'Firm & Action-Oriented',
      desc: 'Highlights overdue days and requests payment confirmation within 24h.',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      id: 'urgent',
      title: 'Final Escalation',
      desc: 'Formal overdue warning to prevent service suspension.',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    {
      id: 'warm_african',
      title: 'Warm & Respectful',
      desc: 'Tailored for high-touch personal business relationships with customary respect.',
      badge: 'bg-purple-50 text-purple-700 border-purple-200',
    },
  ];

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5 sm:space-y-6 animate-fadeIn pb-24 lg:pb-8">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A1C1E] tracking-tight">AI Follow-Up Reminders</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              <span>Gemini Automated</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Detect overdue invoices, customize tone schedules, and send automated settlement reminders via Email & WhatsApp
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-open-reminder-schedule-config"
            onClick={() => setIsConfigDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs shadow-2xs transition-all cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Configure AI Schedule & Tone</span>
          </button>

          <button
            id="btn-scan-overdue-reminders"
            onClick={handleScanOverdue}
            disabled={isAutoScanningReminders}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAutoScanningReminders ? 'animate-spin' : ''}`} />
            <span>{isAutoScanningReminders ? 'Scanning Ledger...' : 'Scan Overdue Invoices'}</span>
          </button>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Overdue Invoices</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">{overdueInvoices.length}</div>
          <span className="text-xs text-rose-600 font-medium">Requires follow-up action</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Overdue Receivables</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            {formatCurrency(totalOverdueAmount, activeCurrency)}
          </div>
          <span className="text-xs text-slate-500">Unsettled past due date</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Active AI Tone</span>
            <Sparkles className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-lg font-bold text-indigo-700 capitalize">
            {reminderConfig.defaultTone.replace('_', ' ')}
          </div>
          <span className="text-xs text-slate-500">
            Schedule: -{reminderConfig.schedulePoints.beforeDueDays}d, Due, +
            {reminderConfig.schedulePoints.overdueDays.join(', +')}d
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Dispatched Reminders</span>
            <CheckCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">{reminderLogs.length}</div>
          <span className="text-xs text-emerald-600 font-medium">Delivered via Email & WhatsApp</span>
        </div>
      </div>

      {/* Main Section: Overdue Invoices Detection & AI Reminder Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Main: Overdue Queue & AI Drafts (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-600" />
                  <span>Overdue Invoices Radar & AI Drafts</span>
                </h2>
                <p className="text-xs text-slate-500">
                  AI generates personalized emails and WhatsApp messages referencing exact line items & settlement accounts
                </p>
              </div>

              {draftedReminders.length > 0 && (
                <button
                  id="btn-send-all-overdue-reminders"
                  onClick={handleSendAllBatchEmails}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
                >
                  <Send className="w-3 h-3" />
                  <span>Send All ({draftedReminders.length})</span>
                </button>
              )}
            </div>

            {overdueInvoices.length === 0 ? (
              <div className="text-center py-12 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">All Invoices in Good Standing!</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    No overdue invoices currently detected. You can configure your automated schedule to ping clients before due dates.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {overdueInvoices.map((inv, idx) => {
                  const draft = draftedReminders.find((d) => d.invoiceId === inv.id) || {
                    subject: `Payment Reminder: Invoice ${inv.invoiceNumber} from ${businessProfile.name}`,
                    emailBody: `Dear ${inv.customerName},\n\nPolite reminder regarding Invoice ${inv.invoiceNumber} for ₦${inv.total.toLocaleString()}...`,
                  };
                  const daysOverdue = Math.max(
                    1,
                    Math.floor((new Date().getTime() - new Date(inv.dueDate).getTime()) / (1000 * 3600 * 24))
                  );

                  return (
                    <div
                      key={inv.id}
                      className="p-4 rounded-xl bg-white hover:bg-slate-50/90 border border-slate-200 transition-all space-y-3 text-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 text-sm">{inv.invoiceNumber}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              {daysOverdue} DAYS OVERDUE
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="font-semibold text-slate-800">{inv.customerName}</span>
                          </div>
                          <p className="text-slate-500 text-[11px]">
                            Due date was {formatDate(inv.dueDate)} • Billed: {formatCurrency(inv.total, activeCurrency)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleOpenDraftPreview(draft, idx)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Review Draft</span>
                          </button>

                          <button
                            onClick={() => sendEmailReminder(inv.id, draft.subject, draft.emailBody)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-xs cursor-pointer"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Email Reminder</span>
                          </button>

                          <button
                            onClick={() => sendWhatsAppReminder(inv.id)}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                            title="Send WhatsApp Reminder"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* AI Draft Preview Snippet */}
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-700">Subject: {draft.subject}</span>
                          <span className="text-indigo-600 font-medium">To: {inv.customerEmail}</span>
                        </div>
                        <p className="text-slate-600 text-[11px] line-clamp-2 italic">{draft.emailBody}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dispatched Reminders History & Audit Trail */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Reminder Dispatch Log & Audit Trail</span>
              </h2>
              <span className="text-xs text-slate-500 font-mono">{reminderLogs.length} logged</span>
            </div>

            {reminderLogs.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No reminders dispatched yet. Follow-up logs will appear here.
              </div>
            ) : (
              <div className="space-y-2.5">
                {reminderLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            log.channel === 'email'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {log.channel.toUpperCase()}
                        </span>
                        <span className="font-bold text-slate-900">{log.customerName}</span>
                        <span className="font-mono text-slate-500">({log.invoiceNumber})</span>
                      </div>
                      <p className="text-[11px] text-slate-500">{log.subject || log.message.substring(0, 70)}...</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-slate-400 text-[11px]">
                      <span>{formatDate(log.sentAt)}</span>
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Delivered</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: AI Tone & Schedule Rules Card (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>AI Schedule & Tone Rules</span>
              </h3>
              <button
                onClick={() => setIsConfigDrawerOpen(true)}
                className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                Modify
              </button>
            </div>

            {/* Current Active Tone Card */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Current AI Reminder Tone
              </span>
              <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-1">
                <div className="font-bold text-indigo-900 text-xs capitalize">
                  {reminderConfig.defaultTone.replace('_', ' ')} Tone
                </div>
                <p className="text-[11px] text-slate-600">
                  {toneOptions.find((t) => t.id === reminderConfig.defaultTone)?.desc ||
                    'Polite, polished, and culturally considerate.'}
                </p>
              </div>
            </div>

            {/* Schedule Timeline Points */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Automated Schedule Triggers
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center">
                    1
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">
                      {reminderConfig.schedulePoints.beforeDueDays} Days Before Due Date
                    </span>
                    <p className="text-[10px] text-slate-500">Gentle courtesy heads-up email</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 font-bold text-xs flex items-center justify-center">
                    2
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">On Due Date Morning</span>
                    <p className="text-[10px] text-slate-500">Settlement day notice with bank details</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 font-bold text-xs flex items-center justify-center">
                    3
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">
                      Overdue Cadence: Day +{reminderConfig.schedulePoints.overdueDays.join(', +')}
                    </span>
                    <p className="text-[10px] text-slate-500">Escalating reminder tones</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Settlement Bank Reference */}
            <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-2 text-xs">
              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">
                Settlement Account Attached
              </span>
              <div className="text-sm font-bold">{businessProfile.bankName}</div>
              <div className="font-mono text-slate-300 text-xs">
                Acct: {businessProfile.accountNumber} ({businessProfile.accountName})
              </div>
              <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                All AI reminder messages automatically embed these exact bank details.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Review & Edit Reminder Draft Modal */}
      {isDraftModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600" />
                <span>Customize & Dispatch Reminder</span>
              </h3>
              <button
                onClick={() => setIsDraftModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Tone Selector within Modal */}
            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-slate-700">AI Message Tone</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {toneOptions.map((tone) => (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => setActiveTone(tone.id)}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                      activeTone === tone.id
                        ? 'border-indigo-600 bg-indigo-50/60 font-bold text-indigo-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="block">{tone.title}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-semibold text-slate-700">Email Subject</label>
              <input
                type="text"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 text-xs font-medium"
              />
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-semibold text-slate-700">Email Message Body</label>
              <textarea
                rows={7}
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 text-xs leading-relaxed font-sans"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDraftModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer border border-slate-200 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSendDraftEmail(draftedReminders[selectedDraftIndex])}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Reminder Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configure AI Schedule & Tone Modal / Drawer */}
      {isConfigDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-indigo-600" />
                <span>Configure AI Follow-Up Automation</span>
              </h3>
              <button
                onClick={() => setIsConfigDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              {/* Tone Selection */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800">Default AI Tone</label>
                <div className="grid grid-cols-1 gap-2">
                  {toneOptions.map((tone) => (
                    <label
                      key={tone.id}
                      onClick={() => setConfigTone(tone.id)}
                      className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                        configTone === tone.id
                          ? 'border-indigo-600 bg-indigo-50/50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="configTone"
                        checked={configTone === tone.id}
                        onChange={() => setConfigTone(tone.id)}
                        className="mt-0.5 text-indigo-600"
                      />
                      <div>
                        <div className="font-bold text-slate-900">{tone.title}</div>
                        <p className="text-[11px] text-slate-500">{tone.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Schedule Parameters */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Days Before Due Date</label>
                  <input
                    type="number"
                    min={0}
                    max={14}
                    value={configBeforeDue}
                    onChange={(e) => setConfigBeforeDue(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Overdue Days (Cadence)</label>
                  <input
                    type="text"
                    placeholder="3, 7, 14, 21"
                    value={configOverdueDays}
                    onChange={(e) => setConfigOverdueDays(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Email Sender Display Name</label>
                <input
                  type="text"
                  value={configSenderName}
                  onChange={(e) => setConfigSenderName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsConfigDrawerOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  Save Schedule Rules
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
