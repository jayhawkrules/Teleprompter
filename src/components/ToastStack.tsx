import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface Props {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastStack({ toasts, onDismiss }: Props) {
  return (
    <div className="absolute top-6 right-6 z-[60] flex flex-col gap-2 w-80">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`flex items-start gap-3 p-4 rounded-xl border shadow-2xl ${
              toast.type === 'success' ? 'bg-zinc-900 border-green-500/30' :
              toast.type === 'error'   ? 'bg-zinc-900 border-red-500/30' :
                                        'bg-zinc-900 border-zinc-700'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />}
            {toast.type === 'error'   && <XCircle      className="w-5 h-5 text-red-500   shrink-0 mt-0.5" />}
            {toast.type === 'info'    && <AlertCircle  className="w-5 h-5 text-zinc-400  shrink-0 mt-0.5" />}
            <p className="text-sm text-zinc-200 flex-1 leading-snug">{toast.message}</p>
            <button onClick={() => onDismiss(toast.id)} className="text-zinc-600 hover:text-zinc-300 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
