import { useState } from 'react';
import { Clock, Loader2 } from 'lucide-react';
import { Modal } from '@/shared/components/modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (hora: number, minuto: number) => void;
  quantidade: number;
  isConfirming?: boolean;
}

/**
 * Troca só o horário. A data de cada post é preservada — o caso real é "a marca
 * passou a publicar às 18h", não "todos os posts saem no mesmo instante".
 */
export function BulkRescheduleModal({
  isOpen,
  onClose,
  onConfirm,
  quantidade,
  isConfirming,
}: Props) {
  const [horario, setHorario] = useState('');

  const valido = /^([01]\d|2[0-3]):([0-5]\d)$/.test(horario);

  const confirmar = () => {
    if (!valido || isConfirming) return;
    const [hora, minuto] = horario.split(':').map(Number);
    onConfirm(hora, minuto);
  };

  return (
    <Modal
      // `key` zera o campo a cada abertura: herdar o horário da vez anterior
      // faria o botão nascer liberado para um valor que o operador não digitou.
      key={isOpen ? 'aberto' : 'fechado'}
      isOpen={isOpen}
      onClose={onClose}
      title="Alterar horário"
      className="max-w-sm"
    >
      <div className="space-y-6">
        <p className="text-sm text-zinc-500">
          <strong className="text-zinc-300">
            {quantidade} {quantidade === 1 ? 'post' : 'posts'}
          </strong>{' '}
          {quantidade === 1 ? 'passa' : 'passam'} a sair neste horário.{' '}
          <span className="text-zinc-400">A data de cada um é mantida.</span>
        </p>

        <div className="space-y-2">
          <label htmlFor="horario-massa" className="text-sm font-medium text-zinc-400 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Novo horário
          </label>
          <input
            id="horario-massa"
            type="time"
            value={horario}
            onChange={(e) => setHorario(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && confirmar()}
            className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white text-lg font-mono focus:outline-none focus:border-primary/50 transition-colors"
          />
          <p className="text-[11px] text-zinc-600">Horário de Brasília.</p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={confirmar}
            disabled={!valido || isConfirming}
            className="w-full py-3.5 rounded-2xl bg-brand-gradient text-white font-bold transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            {isConfirming && <Loader2 className="w-4 h-4 animate-spin" />}
            {isConfirming ? 'Alterando...' : 'Alterar horário'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="w-full py-3 rounded-2xl text-zinc-400 hover:text-white hover:bg-white/5 font-bold transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
}
