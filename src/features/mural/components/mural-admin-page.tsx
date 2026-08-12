import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Megaphone, Pencil, Plus, Trash2 } from 'lucide-react';
import { getApiErrorMessage } from '@/api/api-error';
import { ConfirmDialog } from '@/shared/components/confirm-dialog';
import { useToastStore } from '@/stores/use-toast-store';
import { useAuthStore } from '@/stores/use-auth-store';
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
  const user = useAuthStore((state) => state.user);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<
    (MuralItem & { audienceUserIds: string[] }) | undefined
  >(undefined);
  const [carregandoEdicaoId, setCarregandoEdicaoId] = useState<string | undefined>(undefined);
  const [paraExcluir, setParaExcluir] = useState<MuralItem | undefined>(undefined);

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ['mural', user?.id],
    queryFn: muralService.listar,
    enabled: Boolean(user?.id),
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

  const abrirCriacao = () => {
    setEditando(undefined);
    setModalAberto(true);
  };

  const abrirEdicao = async (item: MuralItem) => {
    setCarregandoEdicaoId(item.id);
    try {
      const { userIds } = await muralService.buscarAudienciaDoItem(item.id);
      setEditando({ ...item, audienceUserIds: userIds });
      setModalAberto(true);
    } catch (erro) {
      addToast(
        getApiErrorMessage(erro, 'Não foi possível carregar os dados deste item.'),
        'error',
      );
    } finally {
      setCarregandoEdicaoId(undefined);
    }
  };

  const fecharModal = () => {
    setModalAberto(false);
    setEditando(undefined);
  };

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
          onClick={abrirCriacao}
          className="bg-brand-gradient hover:opacity-90 px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_oklch(var(--primary)/0.2)]"
        >
          <Plus className="w-5 h-5" />
          Novo item
        </button>
      </header>

      {/* O mesmo componente que o cliente vê. Publicar às cegas e só descobrir o
          resultado entrando com outra conta seria trabalhar no escuro. */}
      <section>
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-5">
          Prévia do mural
        </span>
        <MuralCarousel
          itens={itens}
          isLoading={isLoading}
          showOrganizationBadge
          viewerName={user?.name}
        />
      </section>

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
                <MuralItemCard item={item} showOrganizationBadge />

                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => void abrirEdicao(item)}
                    disabled={Boolean(carregandoEdicaoId)}
                    title="Editar item do mural"
                    aria-label="Editar item do mural"
                    className="p-2 rounded-lg text-zinc-500 hover:text-primary hover:bg-primary/10 transition-colors shrink-0 disabled:opacity-40"
                  >
                    {carregandoEdicaoId === item.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Pencil className="w-4 h-4" />
                    )}
                  </button>
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

      {modalAberto && (
        <MuralItemModal isOpen onClose={fecharModal} item={editando} />
      )}

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
