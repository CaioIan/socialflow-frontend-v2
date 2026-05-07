import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Loader2, X } from 'lucide-react';

interface ConfirmDeactivateOrgModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  orgName: string;
  isPending: boolean;
}

export function ConfirmDeactivateOrgModal({
  isOpen,
  onClose,
  onConfirm,
  orgName,
  isPending,
}: ConfirmDeactivateOrgModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-zinc-900 border border-white/10 p-8 rounded-[2.5rem] w-full max-w-md relative z-10 shadow-2xl"
        >
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center mb-6 mx-auto">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          
          <h3 className="text-2xl font-bold text-white text-center mb-2 text-glow">Desativar Organização?</h3>
          <p className="text-zinc-500 text-center text-sm mb-8">
            Você está prestes a desativar a organização <strong className="text-white">{orgName}</strong>. 
            Isso impedirá o acesso de todos os membros e pausará as campanhas ativas.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="w-full py-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Desativando...
                </>
              ) : (
                'Sim, Desativar Organização'
              )}
            </button>
            <button
              onClick={onClose}
              disabled={isPending}
              className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all active:scale-95 border border-white/5"
            >
              Cancelar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
