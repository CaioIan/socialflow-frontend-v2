import { useQuery } from '@tanstack/react-query';
import { Building2, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import dashboardService from '../api/dashboard-service';
import { GlassCard } from '@/shared/components/glass-card';

interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  textColorClass: string;
}

function MetricCard({ title, value, icon: Icon, colorClass, textColorClass }: MetricCardProps) {
  return (
    <GlassCard className={`p-6 flex flex-col items-center justify-center ${colorClass}`}>
      <Icon className={`w-8 h-8 ${textColorClass} mb-3`} />
      <p className="text-sm font-medium text-zinc-300 text-center">{title}</p>
      <p className={`text-4xl font-bold mt-3 ${textColorClass}`}>{value}</p>
    </GlassCard>
  );
}

export function AdminDashboardPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => dashboardService.getOverview(),
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Administrativo</h1>
          <p className="text-zinc-400 mt-1">Carregando dados...</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <GlassCard key={i} className="p-8 h-48 animate-pulse bg-white/5"><div /></GlassCard>
          ))}
        </div>
        <GlassCard className="p-8 h-48 animate-pulse bg-white/5"><div /></GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard Administrativo</h1>
        <p className="text-zinc-400 mt-1">Visão geral do sistema</p>
      </div>

      {/* Top Row: 3 Posts Status Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard
          title="Posts Pendentes"
          value={overview?.posts.PENDING ?? 0}
          icon={AlertCircle}
          colorClass="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20"
          textColorClass="text-blue-400"
        />

        <MetricCard
          title="Posts com Solicitação de Ajuste"
          value={overview?.posts.ALTERATION_REQUESTED ?? 0}
          icon={Clock}
          colorClass="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20"
          textColorClass="text-amber-400"
        />

        <MetricCard
          title="Posts Aprovados"
          value={overview?.posts.APPROVED ?? 0}
          icon={CheckCircle2}
          colorClass="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20"
          textColorClass="text-emerald-400"
        />
      </div>

      {/* Bottom: Total Organizations */}
      <GlassCard className="p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-400 mb-2">Total de Organizações</p>
            <p className="text-5xl font-bold text-white">{overview?.totalOrganizations ?? 0}</p>
          </div>
          <Building2 className="w-16 h-16 text-zinc-600 opacity-20" />
        </div>
      </GlassCard>
    </div>
  );
}
