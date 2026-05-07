import { Modal } from '@/shared/components/modal';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmUnlinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
  orgName: string;
  isLoading: boolean;
}

export function ConfirmUnlinkModal({
  isOpen,
  onClose,
  onConfirm,
  userName,
  orgName,
  isLoading
}: ConfirmUnlinkModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Remover Alocação">
      <div className="space-y-6">
        <div className="flex items-center gap-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400">
          <AlertTriangle className="w-8 h-8 shrink-0" />
          <p className="text-sm">
            Esta ação removerá o acesso de <strong>{userName}</strong> à organização <strong>{orgName}</strong>.
          </p>
        </div>

        <p className="text-zinc-400 text-sm">
          O usuário não poderá mais visualizar ou interagir com posts desta organização até que seja alocado novamente.
        </p>

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-3 px-4 rounded-xl font-bold bg-red-500 hover:bg-red-600 text-white shadow-lg transition-all flex justify-center items-center gap-2"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Remover'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
