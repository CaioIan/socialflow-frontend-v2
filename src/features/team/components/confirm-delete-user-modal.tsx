import { Modal } from '@/shared/components/modal';
import { Loader2, Trash2 } from 'lucide-react';

interface ConfirmDeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
  isLoading: boolean;
}

export function ConfirmDeleteUserModal({
  isOpen,
  onClose,
  onConfirm,
  userName,
  isLoading
}: ConfirmDeleteUserModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Desativar Usuário">
      <div className="space-y-6">
        <div className="flex items-center gap-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400">
          <Trash2 className="w-8 h-8 shrink-0" />
          <p className="text-sm">
            Tem certeza que deseja desativar o usuário <strong>{userName}</strong>?
          </p>
        </div>

        <p className="text-zinc-400 text-sm">
          Esta ação impedirá que o usuário acesse o sistema. O histórico de posts e comentários dele será preservado, mas ele não poderá mais logar.
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
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Desativação'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
