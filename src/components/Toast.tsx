import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast, dismissToast } = useApp();

  const handleDismiss = (id: string) => {
    if (typeof removeToast === 'function') {
      removeToast(id);
    } else if (typeof dismissToast === 'function') {
      dismissToast(id);
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-16 lg:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none no-print">
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
          error: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />,
          warning: <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />,
          info: <Info className="w-4 h-4 text-indigo-600 shrink-0" />,
        };

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl bg-white/95 border border-slate-200 shadow-xl backdrop-blur-md animate-slideUp text-xs"
          >
            {icons[toast.type]}
            <div className="flex-1 space-y-0.5">
              <p className="font-bold text-slate-900 leading-tight">{toast.title}</p>
              {toast.message && <p className="text-slate-500 leading-snug">{toast.message}</p>}
            </div>
            <button
              onClick={() => handleDismiss(toast.id)}
              className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
