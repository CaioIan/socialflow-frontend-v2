import { Modal } from '@/shared/components/modal';
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

interface LateApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newDate: Date) => void;
  isPending: boolean;
}

export function LateApprovalModal({ isOpen, onClose, onConfirm, isPending }: LateApprovalModalProps) {
  const newDate = new Date(Date.now() + 5 * 60 * 1000);
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  }).format(newDate).replace(' de ', ' de ').replace(',', ' às');

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Aprovação de Post Atrasado" 
      className="max-w-md"
    >
      <div className="space-y-6 py-2">
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <p className="text-sm font-medium">
            Este post está com o horário agendado no passado.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-zinc-400 text-sm leading-relaxed text-center px-4">
            Para garantir que a publicação ocorra corretamente, o sistema irá reagendar este post para daqui a 5 minutos:
          </p>
          
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 shadow-inner">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <Clock className="w-6 h-6" />
            </div>
            <div className="text-center">
              <span className="block text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-1">Novo Horário Sugerido</span>
              <span className="text-lg font-bold text-white">{formattedDate}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <button
            onClick={() => onConfirm(newDate)}
            disabled={isPending}
            className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_oklch(var(--primary)/0.3)] active:scale-95 disabled:opacity-50"
          >
            {isPending ? (
              <Clock className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
            Aprovar mesmo assim
          </button>
          
          <button
            onClick={onClose}
            disabled={isPending}
            className="w-full py-3 rounded-xl font-bold text-zinc-500 hover:text-white hover:bg-white/5 transition-all text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
}
