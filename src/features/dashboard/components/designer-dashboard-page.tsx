import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Clock, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/stores/use-auth-store';
import { GlassCard } from '@/shared/components/glass-card';
import dashboardService, { type DesignerPostCategory } from '../api/dashboard-service';
import { OrganizationFilter } from './organization-filter';
import { PostDrilldownModal } from './post-drilldown-modal';
import { StatCard } from './stat-card';

export function DesignerDashboardPage() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const [organizationId, setOrganizationId] = useState<string | undefined>();
  const [categoria, setCategoria] = useState<DesignerPostCategory | null>(null);
  const [recarregando, setRecarregando] = useState(false);

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['designer-dashboard', userId, 'overview', organizationId],
    queryFn: () => dashboardService.getDesignerOverview(organizationId),
    enabled: Boolean(userId),
  });

  const recarregar = async () => {
    setRecarregando(true);
    try {
      await queryClient.refetchQueries({ queryKey: ['designer-dashboard', userId] });
    } finally {
      setRecarregando(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Designer</h1>
          <p className="mt-1 text-zinc-400">Carregando sua fila de produção...</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <GlassCard key={index} className="h-40 animate-pulse bg-white/5 p-8"><div /></GlassCard>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Designer</h1>
          <p className="mt-1 text-zinc-400">
            Acompanhe o que precisa de arte, revisão ou já recebeu aprovação
            {dataUpdatedAt > 0 && (
              <span className="text-zinc-600">
                {' · '}atualizado às{' '}
                {new Date(dataUpdatedAt).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </p>
        </div>

        <div className="flex w-full items-center gap-3 sm:w-auto">
          <OrganizationFilter value={organizationId} onChange={setOrganizationId} />
          <button
            type="button"
            onClick={() => void recarregar()}
            disabled={recarregando}
            title="Recarregar dados"
            aria-label="Recarregar dados"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95 disabled:cursor-wait disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${recarregando ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <section aria-label="Resumo da produção" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Pedidos de Ajuste"
          value={data?.alterationRequested ?? 0}
          icon={Clock}
          colorClass="bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-orange-600/5 border-amber-400/35"
          textColorClass="text-amber-300"
          size="xl"
          className="min-h-48 shadow-[0_0_32px_rgba(245,158,11,0.10)] sm:col-span-2 xl:col-span-2"
          onClick={() => setCategoria('ALTERATION_REQUESTED')}
        />
        <StatCard
          title="Pendentes sem arte"
          value={data?.pendingWithoutArt ?? 0}
          icon={AlertCircle}
          colorClass="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20"
          textColorClass="text-blue-400"
          onClick={() => setCategoria('PENDING_WITHOUT_ART')}
        />
        <StatCard
          title="Pendentes com Arte"
          value={data?.pendingWithArt ?? 0}
          icon={ImageIcon}
          colorClass="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20"
          textColorClass="text-cyan-400"
          onClick={() => setCategoria('PENDING_WITH_ART')}
        />
        <StatCard
          title="Artes aprovadas"
          value={data?.approved ?? 0}
          icon={CheckCircle2}
          colorClass="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20"
          textColorClass="text-emerald-400"
          onClick={() => setCategoria('APPROVED')}
        />
      </section>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-5 py-4 text-sm text-zinc-500">
        Cada indicador considera somente os posts atribuídos a você. Clique em um card para abrir a lista e acessar o post diretamente.
      </div>

      <PostDrilldownModal
        status={null}
        designerCategory={categoria}
        organizationId={organizationId}
        onClose={() => setCategoria(null)}
      />
    </div>
  );
}
