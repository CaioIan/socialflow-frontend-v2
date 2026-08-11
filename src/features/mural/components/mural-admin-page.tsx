import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Globe, Loader2, Megaphone, Plus, Trash2 } from 'lucide-react';
import { GlassCard } from '@/shared/components/glass-card';
import { ConfirmDialog } from '@/shared/components/confirm-dialog';
import { useToastStore } from '@/stores/use-toast-store';
import { muralService, type MuralItem } from '../api/mural-service';
import { MuralItemCard } from './mural-item-card';
import { MuralCarousel } from './mural-carousel';
import { MuralItemModal } from './mural-item-modal';

/**
 * Gestão do mural.
 *
 * Um lugar só para tudo: avisos globais e de cada empresa na mesma lista. O
 * administrador precisa enxergar o mural inteiro de uma vez — publicando de
 * dentro de uma organização, não haveria onde publicar o que é global.
 */
export default function MuralAdminPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  const [modalAberto, setModalAberto] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<MuralItem | undefined>(undefined);

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ['mural'],
    queryFn: muralService.listar,
  });

  const excluir = useMutation({
    mutationFn: muralService.remover,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mural'] });
      addToast('Item removido do mural.', 'success');
      setParaExcluir(undefined);
    },
    onError: () => {
      addToast('Não foi possível remover o item.', 'error');
      setParaExcluir(undefined);
    },
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-primary" />
            Mural
          </h1>
          <p className="text-zinc-500 mt-1">
            Avisos e informações que aparecem para clientes e designers.
          </p>
        </div>

        <button
          onClick={() => setModalAberto(true)}
          className="bg-brand-gradient hover:opacity-90 px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_oklch(var(--primary)/0.2)]"
        >
          <Plus className="w-5 h-5" />
          Novo item
        </button>
      </header>

      {/* O mesmo componente que o cliente vê. Publicar às cegas e só descobrir o
          resultado entrando com outra conta seria trabalhar no escuro. */}
      <GlassCard className="p-6 sm:p-8">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-5">
          Como o cliente vê
        </span>
        <MuralCarousel itens={itens} isLoading={isLoading} />
      </GlassCard>

      <div className="space-y-4">
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">
          Todos os itens ({itens.length})
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="aspect-video rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : itens.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[2rem] bg-white/[0.01]">
            <Megaphone className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 font-medium">O mural está vazio</p>
            <p className="text-zinc-600 text-sm mt-1 max-w-sm mx-auto">
              Publique um aviso ou uma imagem e ele aparece para quem você escolher.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {itens.map((item) => (
              <div key={item.id} className="space-y-2.5 group">
                <MuralItemCard item={item} />

                <div className="flex items-center justify-between gap-2">
                  {item.organizationId ? (
                    <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-zinc-400 truncate">
                      {item.organizationName}
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-lg bg-primary/10 border border-primary/25 text-[10px] font-bold text-primary flex items-center gap-1.5 shrink-0">
                      <Globe className="w-3 h-3" />
                      Global
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setParaExcluir(item)}
                    title="Remover do mural"
                    aria-label="Remover do mural"
                    className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <MuralItemModal isOpen={modalAberto} onClose={() => setModalAberto(false)} />

      <ConfirmDialog
        isOpen={!!paraExcluir}
        onClose={() => !excluir.isPending && setParaExcluir(undefined)}
        onConfirm={() => paraExcluir && excluir.mutate(paraExcluir.id)}
        title="Remover do mural?"
        description={
          <>
            O item sai do mural de{' '}
            <strong className="text-zinc-300">
              {paraExcluir?.organizationId ? paraExcluir.organizationName : 'todas as empresas'}
            </strong>{' '}
            imediatamente.
            {paraExcluir?.type === 'IMAGE' && ' A imagem também é apagada do armazenamento.'}{' '}
            Esta ação não pode ser desfeita.
          </>
        }
        confirmLabel="Remover"
        confirmingLabel="Removendo..."
        isConfirming={excluir.isPending}
      />

      {excluir.isPending && (
        <span className="sr-only" role="status">
          <Loader2 className="animate-spin" /> Removendo item
        </span>
      )}
    </div>
  );
}
