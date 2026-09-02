import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, HelpCircle, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ConfirmationModal: React.FC = () => {
  const { confirmationModal, closeConfirmationModal } = useApp();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && confirmationModal?.isOpen) {
        closeConfirmationModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmationModal, closeConfirmationModal]);

  if (!confirmationModal || !confirmationModal.isOpen) return null;

  const {
    title,
    message,
    confirmText = 'Delete',
    cancelText = 'Cancel',
    confirmVariant = 'danger',
    onConfirm,
  } = confirmationModal;

  const getVariantStyles = () => {
    switch (confirmVariant) {
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
          iconBg: 'bg-amber-50 border-amber-200',
          confirmBtn:
            'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20 focus:ring-amber-500',
        };
      case 'primary':
        return {
          icon: <HelpCircle className="w-6 h-6 text-indigo-600" />,
          iconBg: 'bg-indigo-50 border-indigo-200',
          confirmBtn:
            'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 focus:ring-indigo-500',
        };
      case 'danger':
      default:
        return {
          icon: <Trash2 className="w-6 h-6 text-rose-600" />,
          iconBg: 'bg-rose-50 border-rose-200',
          confirmBtn:
            'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20 focus:ring-rose-500',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
      onClick={closeConfirmationModal}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white border border-slate-200/90 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-5 animate-scaleUp overflow-hidden"
      >
        {/* Close "X" Button */}
        <button
          type="button"
          onClick={closeConfirmationModal}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content Header */}
        <div className="flex items-start gap-4 pr-6">
          <div
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-xs ${styles.iconBg}`}
          >
            {styles.icon}
          </div>
          <div className="space-y-1">
            <h3
              id="confirmation-modal-title"
              className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight"
            >
              {title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
              {message}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            id="btn-cancel-confirm-modal"
            onClick={closeConfirmationModal}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-all cursor-pointer border border-slate-200"
          >
            {cancelText}
          </button>
          <button
            type="button"
            id="btn-confirm-action"
            onClick={onConfirm}
            className={`min-h-[42px] px-5 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 ${styles.confirmBtn}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
