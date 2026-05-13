import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { authService } from '../api/auth-service';
import { loginSchema, type LoginFormData } from '../schemas/login-schema';
import { useAuthStore } from '@/stores/use-auth-store';
import { useToastStore } from '@/stores/use-toast-store';
import { GlassCard } from '@/shared/components/glass-card';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { addToast } = useToastStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      setAuth(data.user, data.organizations);
      addToast('Login realizado com sucesso!', 'success');
      const from = (location.state as any)?.from?.pathname || '/organizations';
      navigate(from, { replace: true });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Credenciais inválidas ou erro no servidor.';
      addToast(message, 'error');
    },
  });

  const onSubmit = (data: LoginFormData) => {
    // Validação manual simples já que não temos o resolver instalado
    const result = loginSchema.safeParse(data);
    if (!result.success) return;

    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#0a0a0a]">
      {/* Background Decorativo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/10 blur-[120px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-8">
          <img src="/logo/socialflow-wordmark.png" alt="SocialFlow" className="h-18 w-80 mx-auto mb-6" />
        </div>

        <GlassCard className="!p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400 ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="exemplo@socialflow.com.br"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
              </div>
              {errors.email && <p className="text-xs text-red-500 ml-1">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400 ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  {...register('password')}
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
              </div>
              {errors.password && <p className="text-xs text-red-500 ml-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-brand-gradient hover:opacity-90 font-bold py-3 rounded-xl shadow-[0_0_20px_oklch(var(--primary)/0.3)] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar na Plataforma'
              )}
            </button>
          </form>
        </GlassCard>

        <p className="text-center mt-8 text-zinc-600 text-sm">
          Problemas com o acesso? <a href="#" className="text-primary hover:underline">Fale com o Admin</a>
        </p>
      </motion.div>
    </div>
  );
}
