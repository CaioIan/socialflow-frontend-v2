import { LayoutDashboard, Building2, Users, LogOut, X, AlertTriangle, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/use-auth-store';
import { authService } from '@/features/auth/api/auth-service';
import { useState, useEffect } from 'react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ isOpen, onClose, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const { user, logout, currentOrganizationId } = useAuthStore();
  const [isMobile, setIsMobile] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const role = user?.role?.toUpperCase() || '';

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: 'Dashboard Administrativo',
      href: '/dashboard',
      roles: ['ADMIN'],
    },
    {
      icon: Building2,
      label: 'Minha Organização',
      href: currentOrganizationId ? `/organizations/${currentOrganizationId}/campaigns` : '/organizations',
      roles: ['CLIENT'],
    },
    { icon: Building2, label: 'Organizações', href: '/organizations', roles: ['ADMIN', 'DESIGNER'] },
    { icon: Users, label: 'Equipe', href: '/team', roles: ['ADMIN'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(role));

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      logout();
      setIsLogoutModalOpen(false);
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

        {/* Nav */}
        <nav className={cn("flex-1 space-y-1", collapsed ? "px-2" : "px-4")}>
          {filteredItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
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
        </nav>

        {/* Footer: logout */}
        <div className={cn("p-4 border-t border-white/5", collapsed ? "px-2" : "px-6")}>
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
