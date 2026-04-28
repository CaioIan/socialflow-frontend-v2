import * as React from 'react';
import { useState } from 'react';
import { X, UserPlus, Loader2, Mail, Lock, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/shared/components/glass-card';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '../api/users-service';
import { useToastStore } from '@/stores/use-toast-store';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole: 'ADMIN' | 'DESIGNER' | 'CLIENT';
}

export function CreateUserModal({ isOpen, onClose, defaultRole }: CreateUserModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: defaultRole
  });

  const queryClient = useQueryClient();
  const { addToast } = useToastStore();

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => 
      usersService.create({
        name: data.name,
        email: data.email,
        passwordHash: data.password, // O backend vai fazer o hash
        role: data.role
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      addToast('Usuário criado com sucesso!', 'success');
      onClose();
      setFormData({ name: '', email: '', password: '', role: defaultRole });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erro ao criar usuário';
      addToast(message, 'error');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md z-10"
          >
            <GlassCard className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3 text-primary">
                  <UserPlus className="w-6 h-6" />
                  <h2 className="text-2xl font-bold text-white">Novo Usuário</h2>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none focus:border-primary/50"
                      placeholder="Ex: João Silva"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none focus:border-primary/50"
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Senha Temporária</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none focus:border-primary/50"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Papel (Role)</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 appearance-none cursor-pointer"
                  >
                    <option value="ADMIN" className="bg-zinc-900">Administrador</option>
                    <option value="DESIGNER" className="bg-zinc-900">Designer</option>
                    <option value="CLIENT" className="bg-zinc-900">Cliente</option>
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 px-4 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="flex-[2] py-3 px-4 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white shadow-lg transition-all flex justify-center items-center gap-2"
                  >
                    {createMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Criar Usuário'}
                  </button>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
