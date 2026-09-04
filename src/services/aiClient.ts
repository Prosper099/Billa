/**
 * Billa AI Client & Interaction Flow Logger
 * Provides full logging of request payloads, response bodies, roundtrip latencies,
 * and explicit fallback diagnostics for all frontend-backend AI interactions.
 */

export interface AiInteractionLog {
  id: string;
  timestamp: string;
  endpoint: string;
  method: string;
  requestPayload: any;
  responseStatus?: number;
  responseBody?: any;
  durationMs: number;
  source: string;
  isFallback: boolean;
  fallbackReason?: string;
  error?: string;
}

// Global in-memory log buffer for developer inspection
const aiLogHistory: AiInteractionLog[] = [];
const MAX_LOGS = 100;
type LogListener = (log: AiInteractionLog) => void;
const logListeners = new Set<LogListener>();

export function subscribeToAiLogs(listener: LogListener): () => void {
  logListeners.add(listener);
  return () => {
    logListeners.delete(listener);
  };
}

function pushAiLog(log: AiInteractionLog) {
  aiLogHistory.unshift(log);
  if (aiLogHistory.length > MAX_LOGS) {
    aiLogHistory.pop();
  }
  logListeners.forEach((fn) => {
    try {
      fn(log);
    } catch {
      // ignore
    }
  });
}

/**
 * Safely sanitizes request bodies for display (e.g. truncates huge base64 strings)
 */
function sanitizeForLogging(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForLogging);

  const copy: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'imageBase64' && typeof v === 'string') {
      copy[k] = `[Base64 Image: length=${v.length} chars, prefix=${v.substring(0, 30)}...]`;
    } else if (typeof v === 'object' && v !== null) {
      copy[k] = sanitizeForLogging(v);
    } else {
      copy[k] = v;
    }
  }
  return copy;
}

/**
 * Core generic wrapper for all Billa AI calls
 */
export async function callAiEndpoint<TRes = any, TReq = any>(
  endpoint: string,
  payload: TReq,
  options?: {
    timeoutMs?: number;
    signal?: AbortSignal;
  }
): Promise<{
  data: TRes;
  status: number;
  durationMs: number;
  source: string;
  isFallback: boolean;
  fallbackReason?: string;
}> {
  const startTime = Date.now();
  const logId = `ai-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const sanitizedPayload = sanitizeForLogging(payload);

  // Standard high-visibility console log for developer terminal & browser devtools
  console.log(`%c[Billa AI Request >> ${endpoint}]`, 'color: #4f46e5; font-weight: bold; font-size: 11px;', {
    logId,
    endpoint,
    timestamp: new Date().toISOString(),
    requestPayload: sanitizedPayload,
  });

  let status = 0;
  let responseBody: any = null;
  let errorMsg: string | undefined;

  try {
    let fetchSignal = options?.signal;
    let timeoutId: any;

    if (!fetchSignal && options?.timeoutMs) {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);
      fetchSignal = controller.signal;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Billa-Client-Log-Id': logId,
      },
      body: JSON.stringify(payload),
      signal: fetchSignal,
    });

    if (timeoutId) clearTimeout(timeoutId);

    status = res.status;
    responseBody = await res.json();
    const durationMs = Date.now() - startTime;

    const source = responseBody?.source || (res.ok ? 'server' : 'error');
    const isFallback =
      !res.ok ||
      (source !== 'gemini' && source !== 'gemini-vision') ||
      Boolean(responseBody?.fallbackReason);
    const fallbackReason = responseBody?.fallbackReason;

    // High-visibility log of response body & fallback status
    if (res.ok && !isFallback) {
      console.log(`%c[Billa AI Response << ${endpoint}] (${status} OK - ${durationMs}ms - source: ${source})`, 'color: #059669; font-weight: bold; font-size: 11px;', {
        logId,
        endpoint,
        status,
        durationMs,
        source,
        modelUsed: responseBody?.modelUsed,
        responseBody,
      });
    } else {
      console.warn(`%c[Billa AI ⚠️ Fallback Response << ${endpoint}] (${status} - source: ${source})`, 'color: #d97706; font-weight: bold; font-size: 11px;', {
        logId,
        endpoint,
        status,
        durationMs,
        source,
        isFallback: true,
        fallbackReason: fallbackReason || `Status ${status} / Non-Gemini engine or default invoked`,
        responseBody,
      });
    }

    pushAiLog({
      id: logId,
      timestamp: new Date().toISOString(),
      endpoint,
      method: 'POST',
      requestPayload: sanitizedPayload,
      responseStatus: status,
      responseBody,
      durationMs,
      source,
      isFallback,
      fallbackReason,
    });

    return {
      data: responseBody as TRes,
      status,
      durationMs,
      source,
      isFallback,
      fallbackReason,
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    errorMsg = err?.message || 'Network / Fetch Exception';

    console.error(`%c[Billa AI ❌ Request Failed << ${endpoint}] (${durationMs}ms)`, 'color: #dc2626; font-weight: bold; font-size: 11px;', {
      logId,
      endpoint,
      durationMs,
      error: errorMsg,
      errorObj: err,
      action: 'Frontend engages deterministic local fallback.',
    });

    pushAiLog({
      id: logId,
      timestamp: new Date().toISOString(),
      endpoint,
      method: 'POST',
      requestPayload: sanitizedPayload,
      responseStatus: 0,
      durationMs,
      source: 'fetch-error',
      isFallback: true,
      fallbackReason: `Client network error: ${errorMsg}`,
      error: errorMsg,
    });

    throw err;
  }
}

/**
 * Returns all recorded AI interaction logs
 */
export function getAiLogs(): AiInteractionLog[] {
  return [...aiLogHistory];
}

/**
 * Clears the log history
 */
export function clearAiLogs(): void {
  aiLogHistory.length = 0;
  console.log('%c[Billa AI] Interaction logs cleared.', 'color: #64748b; font-style: italic;');
}

// Expose diagnostic tools to browser window for real-time debugging
if (typeof window !== 'undefined') {
  (window as any).__BILLA_AI_DEBUG__ = {
    getLogs: getAiLogs,
    clearLogs: clearAiLogs,
    history: aiLogHistory,
    checkBackendHealth: async () => {
      try {
        const res = await fetch('/api/health');
        const json = await res.json();
        console.log('[Billa Health Check]', json);
        return json;
      } catch (e) {
        console.error('[Billa Health Check Failed]', e);
        throw e;
      }
    },
  };
}
