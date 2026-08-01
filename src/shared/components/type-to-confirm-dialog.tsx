import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface TypeToConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  /** Texto exato que o usuário precisa digitar para liberar o botão. */
  confirmationText: string;
  confirmLabel?: string;
  confirmingLabel?: string;
  isConfirming?: boolean;
}

/**
 * Confirmação para ações destrutivas e irreversíveis.
 *
 * Diferente do ConfirmDialog comum, aqui não basta clicar: é preciso digitar o
 * nome do que será apagado. O atrito é o ponto — impede que um clique de reflexo
 * apague algo que não tem como voltar.
 */
export function TypeToConfirmDialog({ isOpen, confirmationText, ...resto }: TypeToConfirmDialogProps) {
  if (!isOpen) return null;

  // O `key` faz o React descartar e recriar o conteúdo a cada abertura e a cada
  // troca de alvo, zerando o campo digitado. Sem isso, reabrir o modal para
  // outro item herdaria o texto anterior e o botão nasceria liberado para a
  // coisa errada — e resolver por efeito causaria renderização em cascata.
  return (
    <ConteudoDoDialogo
      key={`${confirmationText}`}
      confirmationText={confirmationText}
      {...resto}
    />
  );
}

function ConteudoDoDialogo({
  onClose,
  onConfirm,
  title,
  description,
  confirmationText,
  confirmLabel = 'Excluir',
  confirmingLabel = 'Excluindo...',
  isConfirming = false,
}: Omit<TypeToConfirmDialogProps, 'isOpen'>) {
  const [digitado, setDigitado] = useState('');

  const liberado = digitado.trim() === confirmationText.trim() && !isConfirming;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => !isConfirming && onClose()}
      />

      <div className="relative w-full max-w-md glass-card p-6 space-y-5 border-red-500/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <div className="text-sm text-zinc-400 leading-relaxed">{description}</div>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmacao" className="block text-xs text-zinc-400">
            Digite <span className="font-mono font-bold text-zinc-200">{confirmationText}</span> para
            confirmar:
          </label>
          <input
            id="confirmacao"
            value={digitado}
            onChange={(event) => setDigitado(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && liberado) onConfirm();
            }}
            autoComplete="off"
            disabled={isConfirming}
            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500/50 transition-colors disabled:opacity-50"
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-zinc-300 hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!liberado}
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isConfirming && <Loader2 className="w-4 h-4 animate-spin" />}
            {isConfirming ? confirmingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
