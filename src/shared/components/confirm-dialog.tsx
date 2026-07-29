import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  confirmingLabel?: string;
  isConfirming?: boolean;
}

/**
 * Modal de confirmação pra ações destrutivas — usar sempre no lugar de
 * window.confirm(), que pode ficar bloqueado/descartado silenciosamente em
 * alguns navegadores e webviews (o clique parece simplesmente não fazer nada).
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  confirmingLabel = 'Processando...',
  isConfirming = false,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isConfirming && onClose()}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-zinc-900 border border-white/10 p-6 rounded-[2.5rem] w-full max-w-sm relative z-10 shadow-2xl"
          >
            <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center mb-6 mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white text-center mb-2 text-glow">{title}</h3>
            <div className="text-zinc-500 text-center text-sm mb-8">{description}</div>
            <div className="flex flex-col gap-3">
              <button
                onClick={onConfirm}
                disabled={isConfirming}
                className="w-full py-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {confirmingLabel}
                  </>
                ) : (
                  confirmLabel
                )}
              </button>
              <button
                onClick={onClose}
                disabled={isConfirming}
                className="w-full py-3 rounded-2xl text-zinc-400 hover:text-white hover:bg-white/5 font-bold transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
