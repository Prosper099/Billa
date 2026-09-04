import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Send,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import {
  getAiLogs,
  clearAiLogs,
  subscribeToAiLogs,
  callAiEndpoint,
  AiInteractionLog,
} from '../services/aiClient';

export const AiDiagnosticLogsSection: React.FC = () => {
  const [logs, setLogs] = useState<AiInteractionLog[]>([]);
  const [filter, setFilter] = useState<'all' | 'success' | 'fallback'>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [healthInfo, setHealthInfo] = useState<{
    status: string;
    geminiKeyConfigured: boolean;
    timestamp: string;
  } | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [isTestingAi, setIsTestingAi] = useState(false);

  useEffect(() => {
    setLogs(getAiLogs());
    const unsubscribe = subscribeToAiLogs(() => {
      setLogs(getAiLogs());
    });
    fetchHealth();
    return () => unsubscribe();
  }, []);

  const fetchHealth = async () => {
    setIsPinging(true);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealthInfo(data);
    } catch {
      setHealthInfo({
        status: 'error',
        geminiKeyConfigured: false,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsPinging(false);
    }
  };

  const handleTestAiCall = async () => {
    setIsTestingAi(true);
    try {
      await callAiEndpoint('/api/ai/narrative', {
        businessName: 'Apex Creative Studio',
        currencySymbol: '₦',
        metrics: {
          totalInvoiced: 125000,
          collected: 80000,
          outstanding: 45000,
          collectionRate: 64,
          activeInvoicesCount: 3,
        },
        overdueInvoices: [
          { customerName: 'Chinedu Okeke', amount: 45000, daysOverdue: 8 },
        ],
      });
    } catch {
      // Handled in aiClient logging
    } finally {
      setIsTestingAi(false);
      setLogs(getAiLogs());
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === 'success') return !log.isFallback && log.responseStatus === 200;
    if (filter === 'fallback') return log.isFallback;
    return true;
  });

  const totalCount = logs.length;
  const fallbackCount = logs.filter((l) => l.isFallback).length;
  const successCount = totalCount - fallbackCount;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-6 space-y-6">
      {/* Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>AI Integration & Diagnostic Logs</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                Live
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Inspect raw request payloads, response bodies, and fallback root causes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchHealth}
            disabled={isPinging}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Ping backend health endpoint"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            <span>{isPinging ? 'Pinging...' : 'Ping API'}</span>
          </button>

          <button
            type="button"
            onClick={handleTestAiCall}
            disabled={isTestingAi}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Send sample test prompt to verify logging"
          >
            <Send className={`w-3.5 h-3.5 ${isTestingAi ? 'animate-pulse' : ''}`} />
            <span>{isTestingAi ? 'Testing...' : 'Test AI Ping'}</span>
          </button>
        </div>
      </div>

      {/* Health & Engine Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
          <div className="text-xs font-semibold text-slate-500 mb-1">Gemini Key Configuration</div>
          <div className="flex items-center gap-2">
            {healthInfo?.geminiKeyConfigured ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-800">Key Active & Configured</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-800">Default Offline Engine Active</span>
              </>
            )}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
          <div className="text-xs font-semibold text-slate-500 mb-1">Multi-Model Fallback Chain</div>
          <div className="text-xs font-medium text-slate-700 truncate" title="gemini-3.8-flash -> gemini-flash-latest -> gemini-2.5-flash -> gemini-3.1-flash-lite">
            gemini-3.8-flash &rarr; flash-latest &rarr; 2.5-flash
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
          <div className="text-xs font-semibold text-slate-500 mb-1">Session Interaction Ratio</div>
          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="text-emerald-700">{successCount} AI Hits</span>
            <span className="text-slate-300">|</span>
            <span className="text-amber-700">{fallbackCount} Fallbacks</span>
          </div>
        </div>
      </div>

      {/* Log Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Logs ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('success')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filter === 'success'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Gemini OK ({successCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('fallback')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filter === 'fallback'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Fallbacks ({fallbackCount})
          </button>
        </div>

        {logs.length > 0 && (
          <button
            type="button"
            onClick={() => {
              clearAiLogs();
              setLogs([]);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer w-fit"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Logs</span>
          </button>
        )}
      </div>

      {/* Logs Accordion List */}
      <div className="space-y-2.5">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <Info className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600">No recorded AI interactions matching filter.</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Trigger a scan, request financial advice, or click "Test AI Ping" above to capture payloads.
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const isFallback = log.isFallback;

            return (
              <div
                key={log.id}
                className={`rounded-xl border transition-all text-xs overflow-hidden ${
                  isFallback
                    ? 'border-amber-200 bg-amber-50/30'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {/* Item Header */}
                <div
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                  className="p-3 sm:px-4 sm:py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/60 transition-colors select-none"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      className="text-slate-400 hover:text-slate-600"
                      aria-label={isExpanded ? 'Collapse log item' : 'Expand log item'}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 shrink-0 text-slate-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4 shrink-0 text-slate-400" />
                      )}
                    </button>

                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono font-bold text-slate-900 truncate">
                        {log.endpoint}
                      </span>
                      <span className="text-[10px] text-slate-400 hidden sm:inline">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {log.durationMs}ms
                    </span>

                    {isFallback ? (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-semibold text-[10px] flex items-center gap-1 border border-amber-200">
                        <AlertTriangle className="w-3 h-3" />
                        Fallback
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold text-[10px] flex items-center gap-1 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        {log.source || 'Gemini'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded Payload & Body Viewer */}
                {isExpanded && (
                  <div className="border-t border-slate-200/80 p-3 sm:p-4 bg-slate-900 text-slate-200 space-y-4 font-mono text-[11px]">
                    {/* Fallback Reason banner if applicable */}
                    {isFallback && log.fallbackReason && (
                      <div className="p-2.5 rounded-lg bg-amber-950/80 border border-amber-800 text-amber-200 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-amber-300">Fallback Triggered</div>
                          <div className="text-[11px] text-amber-200/90 break-words mt-0.5">
                            {log.fallbackReason}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Request Payload */}
                    <div>
                      <div className="flex items-center justify-between text-slate-400 mb-1.5 font-sans">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-indigo-400">
                          Inbound Request Payload
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              JSON.stringify(log.requestPayload, null, 2),
                              `${log.id}-req`
                            )
                          }
                          className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 cursor-pointer"
                        >
                          {copiedId === `${log.id}-req` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-400" />
                          )}
                          <span>{copiedId === `${log.id}-req` ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <pre className="p-3 rounded-lg bg-slate-950/90 border border-slate-800 text-slate-300 overflow-x-auto max-h-56 leading-relaxed">
                        {JSON.stringify(log.requestPayload, null, 2)}
                      </pre>
                    </div>

                    {/* Response Body */}
                    <div>
                      <div className="flex items-center justify-between text-slate-400 mb-1.5 font-sans">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-400">
                          Outbound Response Body ({log.responseStatus || 200})
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              JSON.stringify(log.responseBody, null, 2),
                              `${log.id}-res`
                            )
                          }
                          className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 cursor-pointer"
                        >
                          {copiedId === `${log.id}-res` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-400" />
                          )}
                          <span>{copiedId === `${log.id}-res` ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <pre className="p-3 rounded-lg bg-slate-950/90 border border-slate-800 text-emerald-300/90 overflow-x-auto max-h-64 leading-relaxed">
                        {JSON.stringify(log.responseBody, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
