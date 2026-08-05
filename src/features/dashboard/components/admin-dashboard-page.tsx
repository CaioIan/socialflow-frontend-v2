import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, AlertCircle, AlertTriangle, Clock, CheckCircle2, Image as ImageIcon, RefreshCw, Send, Users, Palette, FolderKanban } from 'lucide-react';
import dashboardService, { type PostStatus, type PeriodDays } from '../api/dashboard-service';
import { GlassCard } from '@/shared/components/glass-card';
import { StatCard } from './stat-card';
import { PostsStatusDonutChart } from './posts-status-donut-chart';
import { PostsTimelineChart } from './posts-timeline-chart';
import { PeriodFilter } from './period-filter';
import { OrganizationFilter } from './organization-filter';
import { PostDrilldownModal } from './post-drilldown-modal';
import { InstagramPendenciasAlert } from './instagram-pendencias-alert';

export function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const [organizationId, setOrganizationId] = useState<string | undefined>(undefined);
  const [periodDays, setPeriodDays] = useState<PeriodDays>(30);
  const [recarregando, setRecarregando] = useState(false);
  const [drilldownStatus, setDrilldownStatus] = useState<PostStatus | null>(null);
  // `undefined` = sem recorte; true/false separam os PENDING com e sem arte.
  const [drilldownComArte, setDrilldownComArte] = useState<boolean | undefined>(undefined);

  const abrirDrilldown = (status: PostStatus, comArte?: boolean) => {
    setDrilldownComArte(comArte);
    setDrilldownStatus(status);
  };

  const { data: overview, isLoading: isLoadingOverview, dataUpdatedAt } = useQuery({
    queryKey: ['dashboard-overview', organizationId],
    queryFn: () => dashboardService.getOverview(organizationId),
  });

  const { data: timeline = [], isLoading: isLoadingTimeline } = useQuery({
    queryKey: ['dashboard-timeline', organizationId, periodDays],
    queryFn: () => dashboardService.getPostsTimeline(periodDays, organizationId),
  });

  /**
   * Refaz todas as buscas que estão em tela.
   *
   * `type: 'active'` em vez de uma lista de chaves: o que o dashboard mostra
   * hoje são cinco consultas espalhadas por quatro componentes, e uma lista
   * escrita à mão silenciosamente deixaria de fora o próximo card que alguém
   * acrescentar. Aqui "recarregar o dashboard" é literalmente refazer o que
   * está montado — o mesmo que o F5 fazia, sem perder filtro nem rolagem.
   */
  const recarregar = async () => {
    setRecarregando(true);
    try {
      await queryClient.refetchQueries({ type: 'active' });
    } finally {
      setRecarregando(false);
    }
  };

  if (isLoadingOverview) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Administrativo</h1>
          <p className="text-zinc-400 mt-1">Carregando dados...</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <GlassCard key={i} className="p-8 h-40 animate-pulse bg-white/5"><div /></GlassCard>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassCard className="p-8 h-72 animate-pulse bg-white/5"><div /></GlassCard>
          <GlassCard className="p-8 h-72 animate-pulse bg-white/5"><div /></GlassCard>
        </div>
      </div>
    );
  }

  const posts = overview?.posts ?? {
    PENDING: 0,
    ALTERATION_REQUESTED: 0,
    APPROVED: 0,
    PUBLISHED: 0,
    FAILED: 0,
  };

  // Os PENDING são duas filas distintas: uma espera o designer enviar a arte, a
  // outra espera o cliente aprovar. No banco o status é o mesmo — a diferença é
  // ter versão atual ou não.
  const pendentesComImagem = overview?.pendingWithArt ?? 0;
  const pendentesSemImagem = Math.max(posts.PENDING - pendentesComImagem, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Administrativo</h1>
          {/* A hora do último dado é o que dá sentido ao botão: sem ela, não há
              como saber se vale a pena apertá-lo. */}
          <p className="text-zinc-400 mt-1">
            Visão geral do sistema
            {dataUpdatedAt > 0 && (
              <span className="text-zinc-600">
                {' · '}
                atualizado às{' '}
                {new Date(dataUpdatedAt).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <OrganizationFilter value={organizationId} onChange={setOrganizationId} />
          <button
            type="button"
            onClick={recarregar}
            disabled={recarregando}
            title="Recarregar dados"
            aria-label="Recarregar dados"
            className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-wait"
          >
            <RefreshCw className={`w-4 h-4 ${recarregando ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Antes das métricas: é a única coisa aqui que exige ação imediata. */}
      <InstagramPendenciasAlert />

      {/* Posts por status — clicáveis, abrem o drill-down */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Posts Pendentes"
          value={pendentesSemImagem}
          icon={AlertCircle}
          colorClass="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20"
          textColorClass="text-blue-400"
          onClick={() => abrirDrilldown('PENDING', false)}
        />
        <StatCard
          title="Pendentes com Imagem"
          value={pendentesComImagem}
          icon={ImageIcon}
          colorClass="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20"
          textColorClass="text-cyan-400"
          onClick={() => abrirDrilldown('PENDING', true)}
        />
        <StatCard
          title="Solicitação de Ajuste"
          value={posts.ALTERATION_REQUESTED}
          icon={Clock}
          colorClass="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20"
          textColorClass="text-amber-400"
          onClick={() => abrirDrilldown('ALTERATION_REQUESTED')}
        />
        <StatCard
          title="Posts Aprovados"
          value={posts.APPROVED}
          icon={CheckCircle2}
          colorClass="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20"
          textColorClass="text-emerald-400"
          onClick={() => abrirDrilldown('APPROVED')}
        />
        <StatCard
          title="Posts Publicados"
          value={posts.PUBLISHED}
          icon={Send}
          colorClass="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border-violet-500/20"
          textColorClass="text-violet-400"
          onClick={() => abrirDrilldown('PUBLISHED')}
        />
        <StatCard
          title="Falha ao Publicar"
          value={posts.FAILED}
          icon={AlertTriangle}
          colorClass="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20"
          textColorClass="text-red-400"
          onClick={() => abrirDrilldown('FAILED')}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PostsStatusDonutChart posts={posts} onSliceClick={setDrilldownStatus} />
        <div className="space-y-3">
          <div className="flex justify-end">
            <PeriodFilter value={periodDays} onChange={setPeriodDays} />
          </div>
          <PostsTimelineChart data={timeline} isLoading={isLoadingTimeline} />
        </div>
      </div>

      {/* Contagens gerais */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard
          size="sm"
          title="Organizações"
          value={overview?.totalOrganizations ?? 0}
          icon={Building2}
          colorClass="bg-white/[0.02] border-white/10"
          textColorClass="text-zinc-300"
        />
        <StatCard
          size="sm"
          title="Campanhas"
          value={overview?.totalCampaigns ?? 0}
          icon={FolderKanban}
          colorClass="bg-white/[0.02] border-white/10"
          textColorClass="text-zinc-300"
        />
        <StatCard
          size="sm"
          title="Usuários"
          value={overview?.totalUsers ?? 0}
          icon={Users}
          colorClass="bg-white/[0.02] border-white/10"
          textColorClass="text-zinc-300"
        />
        <StatCard
          size="sm"
          title="Designers"
          value={overview?.totalDesigners ?? 0}
          icon={Palette}
          colorClass="bg-white/[0.02] border-white/10"
          textColorClass="text-zinc-300"
        />
        <StatCard
          size="sm"
          title="Clientes"
          value={overview?.totalClients ?? 0}
          icon={Users}
          colorClass="bg-white/[0.02] border-white/10"
          textColorClass="text-zinc-300"
        />
      </div>

      <PostDrilldownModal
        status={drilldownStatus}
        organizationId={organizationId}
        comArte={drilldownComArte}
        onClose={() => {
          setDrilldownStatus(null);
          setDrilldownComArte(undefined);
        }}
      />
    </div>
  );
}
