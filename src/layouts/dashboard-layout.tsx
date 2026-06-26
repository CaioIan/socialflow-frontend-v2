import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '@/shared/components/sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/use-auth-store';
import { OrganizationSelector } from '@/features/auth/components/organization-selector';
import { Menu } from 'lucide-react';

const COLLAPSED_KEY = 'sidebar-collapsed';

export function DashboardLayout() {
  const { currentOrganizationId, organizations, user } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem(COLLAPSED_KEY) === 'true'
  );
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  const location = useLocation();

  const userRole = user?.role?.toUpperCase();
  const isClient = userRole === 'CLIENT';
  const activeOrg = organizations.find(org => org.organizationId === currentOrganizationId);

  const handleToggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, String(next));
      return next;
    });
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/campaigns')) return 'Campanhas';
    if (path.includes('/posts')) return 'Cronograma';
    if (path.includes('/organizations')) return 'Organizações';
    if (path.includes('/team')) return 'Equipe';
    if (path === '/dashboard') {
      if (userRole === 'CLIENT') return 'Minhas Aprovações';
      if (userRole === 'DESIGNER') return 'Minha Pauta';
      return 'Dashboard Central';
    }
    return 'SocialFlow';
  };

  if (isClient && !currentOrganizationId) {
    return <OrganizationSelector />;
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Overlay para fechar menu mobile */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      <motion.main
        animate={{ marginLeft: isMobile ? 0 : (isCollapsed ? 64 : 256) }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="flex-1 min-h-screen flex flex-col w-full overflow-hidden"
      >
        <header className="h-20 border-b border-white/5 bg-black/10 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 overflow-hidden">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              title="Abrir Menu"
              aria-label="Abrir Menu"
              className="p-2 rounded-xl text-zinc-400 md:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="overflow-hidden">
              <h2 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 truncate">
                {activeOrg?.name ? `Organização: ${activeOrg.name}` : 'Painel Geral'}
              </h2>
              <h1 className="text-sm md:text-lg font-bold text-white flex items-center gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-brand-gradient shadow-[0_0_8px_oklch(var(--primary))] shrink-0" />
                <span className="truncate">{getPageTitle()}</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-sm font-medium text-white select-none truncate max-w-[200px]">
                {user?.name || 'Usuário'}
              </span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-tighter font-bold truncate max-w-[200px]">
                {user?.role || 'Usuário'}
              </span>
            </div>
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-brand-gradient border border-white/10 flex items-center justify-center text-white font-bold shadow-[0_0_15px_oklch(var(--primary)/0.3)]">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        <motion.div
          key={currentOrganizationId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="p-4 md:p-8 flex-1"
        >
          <Outlet />
        </motion.div>
      </motion.main>
    </div>
  );
}
