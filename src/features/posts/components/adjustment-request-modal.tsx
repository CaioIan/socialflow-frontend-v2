import * as React from 'react';
import { useState } from 'react';
import { X, Send, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/shared/components/glass-card';

interface AdjustmentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (comment: string) => Promise<void>;
  isLoading: boolean;
  initialComment?: string;
  initialTarget?: 'FEED' | 'STORIES' | 'GENERAL';
}

export function AdjustmentRequestModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  initialComment = '',
  initialTarget = 'GENERAL'
}: AdjustmentRequestModalProps) {
  const [comment, setComment] = useState(initialComment);
  const [target, setTarget] = useState<'FEED' | 'STORIES' | 'GENERAL'>(initialTarget);

  // Sincronizar estado local com props quando o modal abre
  React.useEffect(() => {
    if (isOpen) {
      setComment(initialComment);
      setTarget(initialTarget);
    }
  }, [isOpen, initialComment, initialTarget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    await onSubmit(comment);
    setComment('');
    setTarget('GENERAL');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg z-10"
          >
            <GlassCard className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 text-amber-400">
                  <AlertCircle className="w-5 h-5" />
                  <h2 className="text-xl font-bold text-white">Solicitar Ajuste</h2>
                </div>
                <button title="Fechar" aria-label="Fechar"
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Onde o ajuste deve ser feito?</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['GENERAL', 'FEED', 'STORIES'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTarget(t as any)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-colors ${
                          target === t
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                            : 'bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {t === 'GENERAL' ? 'GERAL' : t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300 flex justify-between">
                    <span>Instruções para o Designer</span>
                    <span className="text-zinc-500 font-normal">Detalhamento do ajuste</span>
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Descreva claramente as alterações necessárias (ex: trocar a cor do botão para vermelho, diminuir a fonte no stories...)"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 min-h-[120px] resize-none"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 px-4 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white transition-colors"
                    disabled={isLoading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!comment.trim() || isLoading}
                    className="flex-[2] py-3 px-4 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Enviar Solicitação
                      </>
                    )}
                  </button>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
