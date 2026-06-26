import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Bloqueia scroll do body quando o modal está aberto
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Scroll container — cobre toda a tela, scroll vertical, fecha ao clicar fora */}
          <div
            className="fixed inset-0 z-[101] overflow-y-auto overscroll-contain"
            onClick={onClose}
          >
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "w-full max-w-md bg-zinc-900/90 border border-white/10 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl relative",
                  className
                )}
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
                  <button
                    title="Fechar"
                    aria-label="Fechar"
                    onClick={onClose}
                    className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {children}
              </motion.div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
