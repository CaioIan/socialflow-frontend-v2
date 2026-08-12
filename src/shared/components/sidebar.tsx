import { LayoutDashboard, Building2, Home, Megaphone, Users, LogOut, X, AlertTriangle, PanelLeftClose, PanelLeftOpen, ChevronDown, Check, Download } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { UserAvatar } from '@/shared/components/user-avatar';
import { useProfile } from '@/features/profile/api/use-profile';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/use-auth-store';
import { authService } from '@/features/auth/api/auth-service';
import { desvincularPushAoSair } from '@/shared/lib/push-notifications';
import { useState, useEffect } from 'react';
import {
  MENSAGEM_INSTALACAO_INICIADA,
  observarInstalacao,
  obterPromptDeInstalacao,
  solicitarInstalacao,
} from '@/shared/lib/pwa-install';
import { useToastStore } from '@/stores/use-toast-store';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ isOpen, onClose, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const { user, logout, currentOrganizationId, setCurrentOrganization } = useAuthStore();
  const [isMobile, setIsMobile] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [podeInstalar, setPodeInstalar] = useState(Boolean(obterPromptDeInstalacao()));
  const { addToast } = useToastStore();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    return observarInstalacao(() => {
      setPodeInstalar(Boolean(obterPromptDeInstalacao()));
    });
  }, []);

  const navigate = useNavigate();
  const { data: perfil } = useProfile();
  const [seletorAberto, setSeletorAberto] = useState(false);

  const role = user?.role?.toUpperCase() || '';
  const organizacoes = perfil?.organizations ?? [];
  // O seletor só faz sentido para quem atende mais de uma empresa. O ADMIN tem
  // a tela de Organizações para isso e não entra aqui.
  const usaSeletor = (role === 'CLIENT' || role === 'DESIGNER') && organizacoes.length > 1;
  const organizacaoAtual = organizacoes.find((o) => o.organizationId === currentOrganizationId);

  const trocarOrganizacao = async (organizationId: string) => {
    if (organizationId === currentOrganizationId) {
      setSeletorAberto(false);
      return;
    }
    await authService.selectOrganization(organizationId);
    setCurrentOrganization(organizationId);
    setSeletorAberto(false);
    onClose?.();
    navigate(`/organizations/${organizationId}/campaigns`);
  };

  const menuItems = [
    {
      // Só para quem atende várias empresas: com o seletor no lugar de "Minha
      // Organização", esta entrada vira o caminho de volta para a lista.
      icon: Home,
      label: 'Início',
      href: '/organizations',
      roles: ['CLIENT'],
      apenasComSeletor: true,
    },
    {
      icon: Home,
      label: 'Início',
      href: '/organizations',
      roles: ['DESIGNER'],
    },
    {
      icon: Home,
      label: 'Início',
      href: '/organizations',
      roles: ['ADMIN'],
    },
    {
      icon: LayoutDashboard,
      label: 'Dashboard Administrativo',
      href: '/dashboard',
      roles: ['ADMIN'],
    },
    {
      icon: LayoutDashboard,
      label: 'Dashboard',
      href: '/dashboard/designer',
      roles: ['DESIGNER'],
    },
    {
      icon: Megaphone,
      label: 'Mural de Informações',
      href: '/mural',
      roles: ['CLIENT', 'DESIGNER'],
    },
    {
      icon: Megaphone,
      label: 'Gerenciar mural',
      href: '/mural/gerenciar',
      roles: ['ADMIN'],
    },
    {
      icon: Building2,
      label: 'Minha Organização',
      // Mesmo com um único vínculo, primeiro mostra a organização. Entrar nas
      // campanhas continua sendo uma escolha feita no card da listagem.
      href: '/organizations',
      roles: ['CLIENT'],
    },
    { icon: Users, label: 'Equipe', href: '/team', roles: ['ADMIN'] },
  ];

  const filteredItems = menuItems.filter((item) => {
    if (!item.roles.includes(role)) return false;
    // "Minha Organização" e "Início" são mutuamente exclusivos: um aponta para a
    // empresa em uso, o outro para a lista. Mostrar os dois juntos daria duas
    // entradas concorrentes para a mesma ideia.
    if (item.apenasComSeletor) return usaSeletor;
    return !(usaSeletor && item.label === 'Minha Organização');
  });

  const handleLogout = async () => {
    try {
      await desvincularPushAoSair().catch(() => undefined);
      await authService.logout();
    } finally {
      logout();
      setIsLogoutModalOpen(false);
    }
  };

  const instalarSocialFlow = async () => {
    const resultado = await solicitarInstalacao();
    setPodeInstalar(Boolean(obterPromptDeInstalacao()));

    if (resultado === 'accepted') {
      addToast(MENSAGEM_INSTALACAO_INICIADA, 'info');
    }
  };

  const collapsed = !isMobile && isCollapsed;

  return (
    <>
      <motion.aside
        initial={false}
        animate={{
          x: (isMobile && !isOpen) ? -256 : 0,
          width: collapsed ? 64 : 256,
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          "border-r border-white/5 bg-[#0d0d0d]/80 backdrop-blur-3xl flex flex-col h-screen fixed left-0 top-0 z-50",
          !isMobile ? "translate-x-0" : (isOpen ? "flex translate-x-0" : "hidden -translate-x-full")
        )}
      >
        {/* Header: logo + botões */}
        <div className={cn("p-4 flex items-center justify-between mb-4", collapsed ? "px-0 justify-center" : "px-6")}>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.img
                key="logo"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                src="/logo/socialflow-wordmark.png"
                alt="SocialFlow"
                className="h-10 overflow-hidden"
              />
            )}
          </AnimatePresence>

          <div className="flex items-center gap-1">
            {/* Botão fechar (mobile) */}
            <button
              title="Fechar"
              aria-label="Fechar"
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 md:hidden"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Botão colapsar (desktop) */}
            {!isMobile && (
              <button
                title={collapsed ? 'Expandir menu' : 'Minimizar menu'}
                aria-label={collapsed ? 'Expandir menu' : 'Minimizar menu'}
                onClick={onToggleCollapse}
                className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Troca rápida de organização — só para quem atende mais de uma. */}
        {usaSeletor && !collapsed && (
          <div className="px-4 mb-3">
            <button
              type="button"
              onClick={() => setSeletorAberto((v) => !v)}
              aria-expanded={seletorAberto}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-left"
            >
              <span className="w-6 h-6 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center shrink-0">
                {organizacaoAtual?.logoUrl ? (
                  <img src={organizacaoAtual.logoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                )}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[9px] uppercase tracking-wider text-zinc-600 font-bold">
                  Organização
                </span>
                <span className="block text-sm text-white truncate">
                  {organizacaoAtual?.name ?? 'Selecionar'}
                </span>
              </span>
              <ChevronDown
                className={cn('w-4 h-4 text-zinc-500 shrink-0 transition-transform', seletorAberto && 'rotate-180')}
              />
            </button>

            <AnimatePresence>
              {seletorAberto && (
                <motion.ul
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden mt-1 space-y-0.5"
                >
                  {organizacoes.map((org) => (
                    <li key={org.organizationId}>
                      <button
                        type="button"
                        onClick={() => trocarOrganizacao(org.organizationId)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                      >
                        <span className="w-5 h-5 rounded-md overflow-hidden bg-white/5 flex items-center justify-center shrink-0">
                          {org.logoUrl ? (
                            <img src={org.logoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Building2 className="w-3 h-3 text-zinc-500" />
                          )}
                        </span>
                        <span className="flex-1 text-sm text-zinc-300 truncate">{org.name}</span>
                        {org.organizationId === currentOrganizationId && (
                          <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Nav */}
        <nav className={cn("flex-1 space-y-1", collapsed ? "px-2" : "px-4")}>
          {filteredItems.map((item) => (
            <NavLink
              key={`${item.label}-${item.href}`}
              to={item.href}
              end={item.href === '/mural'}
              onClick={onClose}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) => cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative",
                collapsed && "justify-center px-0",
                isActive ? "text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
              )}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-white" : "group-hover:text-zinc-300")} />
                  <AnimatePresence mode="wait">
                    {!collapsed && (
                      <motion.span
                        key="label"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.15 }}
                        className="font-medium text-sm whitespace-nowrap overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="active-nav"
                      className="absolute inset-0 bg-brand-gradient rounded-xl shadow-[0_0_15px_oklch(var(--primary)/0.3)] -z-10"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}

          {podeInstalar && (
            <button
              type="button"
              onClick={() => void instalarSocialFlow()}
              title={collapsed ? 'Instalar SocialFlow' : undefined}
              className={cn(
                'group relative isolate flex w-full items-center gap-3 overflow-hidden rounded-xl border border-blue-500/35 bg-gradient-to-r from-[#1D4ED8]/15 to-[#7E22CE]/15 px-3 py-2.5 shadow-[0_0_22px_rgba(126,34,206,0.22)] transition-all duration-200 hover:border-violet-400/55 hover:from-[#1D4ED8]/25 hover:to-[#7E22CE]/25 hover:shadow-[0_0_30px_rgba(126,34,206,0.38)]',
                collapsed && 'justify-center px-0',
              )}
            >
              <svg aria-hidden="true" className="absolute h-0 w-0">
                <defs>
                  <linearGradient id="socialflow-install-gradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#1D4ED8" />
                    <stop offset="1" stopColor="#7E22CE" />
                  </linearGradient>
                </defs>
              </svg>
              <Download
                aria-hidden="true"
                stroke="url(#socialflow-install-gradient)"
                className="h-5 w-5 shrink-0 drop-shadow-[0_0_5px_rgba(126,34,206,0.85)] transition-transform group-hover:scale-110"
              />
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    key="install-label"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="text-brand-gradient overflow-hidden whitespace-nowrap text-sm font-extrabold drop-shadow-[0_0_8px_rgba(126,34,206,0.45)]"
                  >
                    Instalar SocialFlow
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )}
        </nav>

        {/* Footer: perfil + logout */}
        <div className={cn("p-4 border-t border-white/5 space-y-1", collapsed ? "px-2" : "px-6")}>
          <NavLink
            to="/perfil"
            onClick={onClose}
            title={collapsed ? 'Meu perfil' : undefined}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2 rounded-xl transition-colors w-full",
              collapsed && "justify-center px-0",
              isActive ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
          >
            <UserAvatar
              nome={perfil?.name ?? user?.name}
              email={perfil?.email}
              avatarUrl={perfil?.avatarUrl}
              organizacoes={perfil?.organizations}
              tamanho="sm"
            />
            {!collapsed && (
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium truncate">
                  {perfil?.name ?? user?.name ?? 'Meu perfil'}
                </span>
                <span className="block text-[10px] text-zinc-600 truncate">Ver perfil</span>
              </span>
            )}
          </NavLink>
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            title={collapsed ? 'Sair' : undefined}
            className={cn(
              "flex items-center gap-3 px-3 py-2 text-zinc-500 hover:text-red-400 transition-colors w-full group rounded-xl hover:bg-white/5",
              collapsed && "justify-center px-0"
            )}
          >
            <LogOut className="w-5 h-5 shrink-0 group-hover:rotate-12 transition-transform" />
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.span
                  key="logout-label"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="font-medium text-sm whitespace-nowrap overflow-hidden"
                >
                  Sair
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {isLogoutModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLogoutModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-white/10 p-6 rounded-[2.5rem] w-full max-w-sm relative z-10 shadow-2xl"
            >
              <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center mb-6 mx-auto">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white text-center mb-2 text-glow">Deseja sair?</h3>
              <p className="text-zinc-500 text-center text-sm mb-8">
                Você precisará fazer login novamente para acessar suas campanhas.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleLogout}
                  className="w-full py-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] active:scale-95"
                >
                  Confirmar Logout
                </button>
                <button
                  onClick={() => setIsLogoutModalOpen(false)}
                  className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all active:scale-95 border border-white/5"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
