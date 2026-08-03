import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Building2, Loader2, Plus, X } from 'lucide-react';
import { Modal } from '@/shared/components/modal';
import { useToastStore } from '@/stores/use-toast-store';
import { getApiErrorMessage } from '@/api/api-error';
import { organizationsService } from '@/features/organizations/api/organizations-service';
import { usersService, type UserWithOrgs } from '../api/users-service';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: UserWithOrgs | undefined;
}

export function EditUserModal({ isOpen, onClose, user }: Props) {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  const [nome, setNome] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [orgParaVincular, setOrgParaVincular] = useState('');

  const { data: organizacoes = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => organizationsService.getAll(),
    enabled: isOpen,
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['team'] });

  const salvarDados = useMutation({
    mutationFn: usersService.update,
    onSuccess: () => {
      invalidar();
      addToast('Dados atualizados.', 'success');
      onClose();
    },
    onError: (erro) => addToast(getApiErrorMessage(erro, 'Erro ao salvar os dados.'), 'error'),
  });

  const vincular = useMutation({
    mutationFn: usersService.linkToOrganization,
    onSuccess: () => {
      invalidar();
      setOrgParaVincular('');
      addToast('Organização vinculada.', 'success');
    },
    onError: (erro) => addToast(getApiErrorMessage(erro, 'Erro ao vincular.'), 'error'),
  });

  const desvincular = useMutation({
    mutationFn: usersService.unlinkFromOrganization,
    onSuccess: () => {
      invalidar();
      addToast('Organização desvinculada.', 'success');
    },
    // A API recusa tirar a última organização — a mensagem dela diz o porquê e
    // o que fazer, então vale mais que um texto genérico nosso.
    onError: (erro) => addToast(getApiErrorMessage(erro, 'Erro ao desvincular.'), 'error'),
  });

  if (!user) return null;

  const vinculadas = user.organizations ?? [];
  const jaVinculadas = new Set(vinculadas.map((v) => v.organization.id));
  const disponiveis = organizacoes.filter((o) => !jaVinculadas.has(o.id));

  const emailMudou = email.trim().toLowerCase() !== user.email.toLowerCase();
  const nomeMudou = nome.trim() !== (user.name ?? '');
  const podeSalvar = (nomeMudou || emailMudou) && email.trim().length > 0 && !salvarDados.isPending;

  return (
    <Modal
      // `key` recarrega os campos ao trocar de usuário: sem isso o modal abriria
      // com o nome de quem foi editado antes.
      key={user.id}
      isOpen={isOpen}
      onClose={() => !salvarDados.isPending && onClose()}
      title="Editar usuário"
      className="max-w-lg"
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="edit-nome" className="text-sm font-medium text-zinc-400">
              Nome
            </label>
            <input
              id="edit-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-email" className="text-sm font-medium text-zinc-400">
              E-mail
            </label>
            <input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
            />
            {emailMudou && (
              <p className="text-[11px] text-amber-400 flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl py-2 px-3">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  O e-mail é o login. Depois de salvar, esta pessoa entra com o
                  endereço novo — o antigo para de funcionar.
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3 pt-5 border-t border-white/5">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Organizações
          </h3>

          {vinculadas.length === 0 ? (
            <p className="text-sm text-zinc-600">Nenhuma organização vinculada.</p>
          ) : (
            <ul className="space-y-2">
              {vinculadas.map((vinculo) => (
                <li
                  key={vinculo.organization.id}
                  className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2"
                >
                  <Building2 className="w-4 h-4 text-zinc-500 shrink-0" />
                  <span className="flex-1 text-sm text-zinc-300 truncate">
                    {vinculo.organization.name}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      desvincular.mutate({
                        userId: user.id,
                        organizationId: vinculo.organization.id,
                      })
                    }
                    disabled={desvincular.isPending}
                    title={`Desvincular de ${vinculo.organization.name}`}
                    aria-label={`Desvincular de ${vinculo.organization.name}`}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {disponiveis.length > 0 && (
            <div className="flex gap-2">
              <select
                value={orgParaVincular}
                onChange={(e) => setOrgParaVincular(e.target.value)}
                aria-label="Organização para vincular"
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50"
              >
                <option value="">Vincular a outra organização...</option>
                {disponiveis.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  vincular.mutate({
                    userId: user.id,
                    organizationId: orgParaVincular,
                    role: user.role,
                  })
                }
                disabled={!orgParaVincular || vincular.isPending}
                className="px-4 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40 flex items-center gap-1.5 text-sm font-bold"
              >
                {vincular.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Vincular
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            onClick={() =>
              salvarDados.mutate({
                id: user.id,
                name: nomeMudou ? nome.trim() : undefined,
                email: emailMudou ? email.trim() : undefined,
              })
            }
            disabled={!podeSalvar}
            className="w-full py-3.5 rounded-2xl bg-brand-gradient text-white font-bold transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            {salvarDados.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {salvarDados.isPending ? 'Salvando...' : 'Salvar alterações'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={salvarDados.isPending}
            className="w-full py-3 rounded-2xl text-zinc-400 hover:text-white hover:bg-white/5 font-bold transition-all disabled:opacity-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
}
