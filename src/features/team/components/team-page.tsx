import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersService, type UserWithOrgs } from '../api/users-service';
import { GlassCard } from '../../../shared/components/glass-card';
import {
  Users,
  UserPlus,
  Search,
  Mail,
  Building,
  Plus,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreateUserModal } from './create-user-modal';
import { LinkOrganizationModal } from './link-organization-modal';

export default function TeamPage() {
  const [activeTab, setActiveTab] = useState<'DESIGNER' | 'CLIENT'>('DESIGNER');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithOrgs | null>(null);



  const { data: users, isLoading } = useQuery({
    queryKey: ['team', activeTab],
    queryFn: () => usersService.getAll(activeTab)
  });

  const filteredUsers = users?.filter(u =>
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
          className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_oklch(var(--primary)/0.2)]"
        >
          <UserPlus className="w-5 h-5" />
          Novo Usuário
        </button>
      </header>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 p-2 rounded-2xl border border-white/10 backdrop-blur-md">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('DESIGNER')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'DESIGNER'
              ? 'bg-primary text-white shadow-lg'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
          >
            Designers
          </button>
          <button
            onClick={() => setActiveTab('CLIENT')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'CLIENT'
              ? 'bg-primary text-white shadow-lg'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
          >
            Clientes (Contatos)
          </button>
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
              <GlassCard className="p-6 h-full flex flex-col group hover:border-primary/30 transition-all border-white/5">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-white/10 flex items-center justify-center text-primary text-xl font-bold">
                      {u.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg group-hover:text-primary transition-colors">
                        {u.name || 'Sem nome'}
                      </h3>
                      <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                        <Mail className="w-3 h-3" />
                        {u.email}
                      </div>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${u.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                    {u.isActive ? 'Ativo' : 'Inativo'}
                  </div>
                </div>

                <div className="space-y-4 flex-1">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Building className="w-3 h-3" />
                        Alocações ({u.organizations.length})
                      </span>
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setIsLinkModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-primary/10 rounded-lg text-primary transition-colors"
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
          <p>Nenhum usuário encontrado para esta categoria.</p>
        </div>
      )}

      {/* Modals */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        defaultRole={activeTab}
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
    </div>
  );
}
