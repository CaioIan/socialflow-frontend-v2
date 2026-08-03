import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, AlertCircle, AlertTriangle, Clock, CheckCircle2, Image as ImageIcon, Send, Users, Palette, FolderKanban } from 'lucide-react';
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
  const [organizationId, setOrganizationId] = useState<string | undefined>(undefined);
  const [periodDays, setPeriodDays] = useState<PeriodDays>(30);
  const [drilldownStatus, setDrilldownStatus] = useState<PostStatus | null>(null);
  // `undefined` = sem recorte; true/false separam os PENDING com e sem arte.
  const [drilldownComArte, setDrilldownComArte] = useState<boolean | undefined>(undefined);

  const abrirDrilldown = (status: PostStatus, comArte?: boolean) => {
    setDrilldownComArte(comArte);
    setDrilldownStatus(status);
  };

  const { data: overview, isLoading: isLoadingOverview } = useQuery({
    queryKey: ['dashboard-overview', organizationId],
    queryFn: () => dashboardService.getOverview(organizationId),
  });

  const { data: timeline = [], isLoading: isLoadingTimeline } = useQuery({
    queryKey: ['dashboard-timeline', organizationId, periodDays],
    queryFn: () => dashboardService.getPostsTimeline(periodDays, organizationId),
  });

  if (isLoadingOverview) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Administrativo</h1>
          <p className="text-zinc-400 mt-1">Carregando dados...</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
          <p className="text-zinc-400 mt-1">Visão geral do sistema</p>
        </div>
        <OrganizationFilter value={organizationId} onChange={setOrganizationId} />
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
        <StatCard
          title="Pendentes com Imagem"
          value={pendentesComImagem}
          icon={ImageIcon}
          colorClass="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20"
          textColorClass="text-cyan-400"
          onClick={() => abrirDrilldown('PENDING', true)}
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
