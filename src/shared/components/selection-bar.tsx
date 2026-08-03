import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface Props {
  /** Quantos itens estão marcados agora. */
  quantidade: number;
  /** Palavra no singular e no plural, para a contagem soar natural. */
  substantivo: { singular: string; plural: string };
  /** `true` quando todos os itens visíveis já estão marcados. */
  tudoMarcado: boolean;
  onAlternarTudo: () => void;
  onSair: () => void;
  /** Botões de ação — variam por tela. */
  children: ReactNode;
}

/**
 * Barra fixa no rodapé enquanto o modo de seleção está ligado.
 *
 * Fica ancorada na tela, e não no topo da lista, porque a seleção acontece
 * enquanto se rola o cronograma: uma barra no topo sairia de vista justamente
 * quando o operador termina de escolher.
 */
export function SelectionBar({
  quantidade,
  substantivo,
  tudoMarcado,
  onAlternarTudo,
  onSair,
  children,
}: Props) {
  return (
    <AnimatePresence>
      {quantidade > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="fixed bottom-4 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-50 md:w-auto md:min-w-[34rem]"
        >
          <div className="bg-zinc-900/95 border border-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl p-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                type="button"
                onClick={onSair}
                title="Sair da seleção"
                aria-label="Sair da seleção"
                className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>

              <span className="text-sm font-bold text-white whitespace-nowrap">
                {quantidade}{' '}
                {quantidade === 1 ? substantivo.singular : substantivo.plural}
              </span>

              <button
                type="button"
                onClick={onAlternarTudo}
                className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors whitespace-nowrap"
              >
                {tudoMarcado ? 'Limpar seleção' : 'Selecionar todos'}
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">{children}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
