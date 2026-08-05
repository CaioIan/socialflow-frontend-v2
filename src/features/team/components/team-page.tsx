import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { usersService, type UserWithOrgs } from '../api/users-service';
import { GlassCard } from '../../../shared/components/glass-card';
import {
  Users,
  UserPlus,
  Search,
  Mail,
  Building,
  Plus,
  Pencil,
  CheckCircle2,
  Loader2,
  PowerOff,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreateUserModal } from './create-user-modal';
import { LinkOrganizationModal } from './link-organization-modal';
import { EditUserModal } from './edit-user-modal';
import { ConfirmDialog } from '@/shared/components/confirm-dialog';
import { useToastStore } from '@/stores/use-toast-store';

function mensagemDoErro(erro: unknown): string {
  if (axios.isAxiosError(erro) && typeof erro.response?.data?.message === 'string') {
    return erro.response.data.message;
  }
  return 'Não foi possível concluir a operação.';
}

/** As duas abas de papel mostram só gente ativa; a terceira junta os desativados. */
type Aba = 'DESIGNER' | 'CLIENT' | 'INATIVOS';

export default function TeamPage() {
  const [activeTab, setActiveTab] = useState<Aba>('DESIGNER');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithOrgs | null>(null);
  const [usuarioParaDesativar, setUsuarioParaDesativar] = useState<UserWithOrgs | null>(null);
  const [usuarioParaEditar, setUsuarioParaEditar] = useState<UserWithOrgs | undefined>(undefined);

  const queryClient = useQueryClient();
  const { addToast } = useToastStore();

  const naAbaDeInativos = activeTab === 'INATIVOS';

  const { data: users, isLoading } = useQuery({
    queryKey: ['team', activeTab],
    // Desativado não é um papel: a aba pede todo mundo e separa por `isActive`,
    // senão um cliente desligado sumiria da tela junto com os designers.
    queryFn: () => (naAbaDeInativos ? usersService.getAll() : usersService.getAll(activeTab)),
  });

  const invalidarEquipe = () => queryClient.invalidateQueries({ queryKey: ['team'] });

  const desativar = useMutation({
    mutationFn: usersService.deactivate,
    onSuccess: () => {
      invalidarEquipe();
      setUsuarioParaDesativar(null);
      addToast('Usuário desativado. O acesso dele foi cortado.', 'success');
    },
    onError: (erro) => addToast(mensagemDoErro(erro), 'error'),
  });

  const reativar = useMutation({
    mutationFn: usersService.reactivate,
    onSuccess: () => {
      invalidarEquipe();
      addToast('Usuário reativado.', 'success');
    },
    onError: (erro) => addToast(mensagemDoErro(erro), 'error'),
  });

  const filteredUsers = users
    ?.filter((u) => (naAbaDeInativos ? !u.isActive : u.isActive))
    .filter(u =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p>Carregando equipe...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Gestão de Equipe
          </h1>
          <p className="text-zinc-500 mt-1">Gerencie designers, clientes e suas alocações.</p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-brand-gradient hover:opacity-90 px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_oklch(var(--primary)/0.2)]"
        >
          <UserPlus className="w-5 h-5" />
          Novo Usuário
        </button>
      </header>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 p-2 rounded-2xl border border-white/10 backdrop-blur-md">
        {/* Rolagem horizontal: em 375px as três abas não cabem lado a lado e a
            última ficava fora da tela, inalcançável. */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {([
            { chave: 'DESIGNER', rotulo: 'Designers' },
            { chave: 'CLIENT', rotulo: 'Clientes (Contatos)' },
            { chave: 'INATIVOS', rotulo: 'Desativados' },
          ] as const).map(({ chave, rotulo }) => (
            <button
              key={chave}
              onClick={() => setActiveTab(chave)}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap shrink-0 ${activeTab === chave
                ? 'bg-brand-gradient text-white shadow-lg'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}
            >
              {rotulo}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder={`Buscar por nome ou e-mail...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredUsers?.map((u) => (
            <motion.div
              key={u.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <GlassCard className="p-6 h-full flex flex-col group hover:bg-brand-gradient transition-all border-white/5">
                {/* Nome longo empurrava o crachá e o botão para fora do card,
                    cortando a única forma de ativar ou desativar a pessoa.
                    `basis-48` dá um piso ao bloco do nome: quando ele e as ações
                    não cabem lado a lado, as ações descem para a linha de baixo
                    em vez de espremer o nome até virar reticências. */}
                <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
                  <div className="flex items-center gap-4 min-w-0 flex-1 basis-48">
                    <div className="w-12 h-12 shrink-0 rounded-2xl bg-brand-gradient border border-white/10 flex items-center justify-center text-white text-xl font-bold shadow-[0_0_15px_oklch(var(--primary)/0.3)]">
                      {u.name?.charAt(0) || 'U'}
                    </div>
                    <div className="min-w-0">
                      <h3
                        title={u.name || 'Sem nome'}
                        className="font-bold text-white text-lg group-hover:text-white transition-colors truncate"
                      >
                        {u.name || 'Sem nome'}
                      </h3>
                      <div className="flex items-center gap-1.5 text-zinc-500 group-hover:text-white/80 text-xs transition-colors min-w-0">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate" title={u.email}>{u.email}</span>
                      </div>
                    </div>
                  </div>
                  {/* Crachá informa; o botão ao lado age. Antes o próprio crachá
                      era clicável, e ninguém adivinha isso olhando. */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setUsuarioParaEditar(u)}
                      title={`Editar ${u.name || u.email}`}
                      aria-label={`Editar ${u.name || u.email}`}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <span
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${u.isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                    >
                      {u.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        u.isActive ? setUsuarioParaDesativar(u) : reativar.mutate(u.id)
                      }
                      disabled={reativar.isPending && reativar.variables === u.id}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors disabled:opacity-50 ${u.isActive
                        ? 'border-white/10 text-zinc-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10'
                        : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                        }`}
                    >
                      {reativar.isPending && reativar.variables === u.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : u.isActive ? (
                        <PowerOff className="w-3 h-3" />
                      ) : (
                        <RotateCcw className="w-3 h-3" />
                      )}
                      {u.isActive ? 'Desativar' : 'Reativar'}
                    </button>
                  </div>
                </div>

                <div className="space-y-4 flex-1">
                  {/* Esta aba mistura designers e clientes, então o papel deixa
                      de ser dado pela aba e precisa aparecer no card. */}
                  {naAbaDeInativos && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-zinc-400 group-hover:text-white/80 transition-colors">
                        {u.role === 'DESIGNER' ? 'Designer' : u.role === 'CLIENT' ? 'Cliente' : 'Admin'}
                      </span>
                      {/* Sem isto, quem caiu na cascata da organização parece um
                          desligamento que ninguém se lembra de ter feito. */}
                      {u.deactivationCause === 'ORGANIZATION' && (
                        <span className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-400">
                          Caiu junto com a organização
                        </span>
                      )}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-zinc-500 group-hover:text-white/80 uppercase tracking-widest flex items-center gap-1.5 transition-colors">
                        <Building className="w-3 h-3" />
                        Alocações ({u.organizations.length})
                      </span>
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setIsLinkModalOpen(true);
                        }}
                        className="p-1.5 bg-brand-gradient rounded-lg text-white shadow-[0_0_10px_oklch(var(--primary)/0.3)] transition-colors"
                        title="Vincular a nova organização"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {u.organizations.length > 0 ? (
                        u.organizations.map((org) => (
                          <div
                            key={org.organization.id}
                            className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] text-zinc-400 flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-500/50" />
                            {org.organization.name}
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-zinc-600 italic">Nenhuma organização vinculada</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-auto border-t border-white/5 flex gap-2">
                  {/* Actions would go here (edit, deactivate, etc) */}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredUsers?.length === 0 && (
        <div className="py-20 text-center text-zinc-600">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>
            {naAbaDeInativos
              // Vazio aqui significa que ninguém está sem acesso — é bom.
              ? 'Ninguém está desativado. Toda a equipe tem acesso.'
              : 'Nenhum usuário encontrado para esta categoria.'}
          </p>
        </div>
      )}

      {/* Modals */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        // "Desativados" não é um papel: criar a partir dali cai no padrão.
        defaultRole={naAbaDeInativos ? 'DESIGNER' : activeTab}
      />

      {selectedUser && (
        <LinkOrganizationModal
          isOpen={isLinkModalOpen}
          onClose={() => {
            setIsLinkModalOpen(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
        />
      )}

      <EditUserModal
        isOpen={!!usuarioParaEditar}
        onClose={() => setUsuarioParaEditar(undefined)}
        user={usuarioParaEditar}
      />

      <ConfirmDialog
        isOpen={!!usuarioParaDesativar}
        onClose={() => !desativar.isPending && setUsuarioParaDesativar(null)}
        onConfirm={() => usuarioParaDesativar && desativar.mutate(usuarioParaDesativar.id)}
        title="Desativar usuário?"
        description={
          <>
            <strong className="text-zinc-300">
              {usuarioParaDesativar?.name || usuarioParaDesativar?.email}
            </strong>{' '}
            perde o acesso imediatamente, mas nada é apagado: aprovações, comentários e artes
            enviadas por ele continuam no histórico. Dá para reativar a qualquer momento.
          </>
        }
        confirmLabel="Desativar"
        confirmingLabel="Desativando..."
        isConfirming={desativar.isPending}
      />
    </div>
  );
}
