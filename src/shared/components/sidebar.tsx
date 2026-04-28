import { LayoutDashboard, Building2, Users, Settings, LogOut, Image, X, AlertTriangle } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/use-auth-store';
import { useState, useEffect } from 'react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuthStore();
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
      label: role === 'CLIENT' ? 'Minhas Aprovações' : role === 'DESIGNER' ? 'Minha Pauta' : 'Dashboard', 
      href: '/dashboard', 
      roles: ['ADMIN', 'DESIGNER', 'CLIENT'] 
    },
    { icon: Building2, label: 'Organizações', href: '/organizations', roles: ['ADMIN', 'DESIGNER'] },
    { icon: Users, label: 'Equipe', href: '/team', roles: ['ADMIN'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(role));

  const handleLogout = () => {
    logout();
    setIsLogoutModalOpen(false);
  };

  return (
    <>
      <motion.aside 
        initial={false}
        animate={{ 
          x: (isMobile && !isOpen) ? -256 : 0,
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          "w-64 border-r border-white/5 bg-[#0d0d0d]/80 backdrop-blur-3xl flex flex-col h-screen fixed left-0 top-0 z-50 transition-colors",
          !isMobile ? "translate-x-0" : (isOpen ? "flex translate-x-0" : "hidden -translate-x-full")
        )}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-[0_0_15px_oklch(var(--primary)/0.4)]">
                <span className="text-white font-bold text-xl leading-none">S</span>
              </div>
              <span className="font-bold text-xl tracking-tight text-glow">SocialFlow</span>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-1">
            {filteredItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={onClose}
                className={({ isActive }) => cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative",
                  isActive ? "text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                )}
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "group-hover:text-zinc-300")} />
                    <span className="font-medium text-sm">{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="active-nav"
                        className="absolute inset-0 bg-primary/10 rounded-xl border border-primary/20 -z-10"
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
        </div>

        <div className="mt-auto p-6 border-t border-white/5">
          <button 
            onClick={() => setIsLogoutModalOpen(true)}
            className="flex items-center gap-3 px-3 py-2 text-zinc-500 hover:text-red-400 transition-colors w-full group"
          >
            <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span className="font-medium text-sm">Sair</span>
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
