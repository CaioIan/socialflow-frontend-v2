import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { GlassCard } from '@/shared/components/glass-card';
import type { StatsTimelinePoint } from '../api/dashboard-service';

interface PostsTimelineChartProps {
  data: StatsTimelinePoint[];
  isLoading?: boolean;
}

function formatDay(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  return `${day}/${month}`;
}

export function PostsTimelineChart({ data, isLoading }: PostsTimelineChartProps) {
  const chartData = data.map((point) => ({ ...point, label: formatDay(point.date) }));
  const hasActivity = data.some((point) => point.created > 0 || point.approved > 0);

  return (
    <GlassCard className="p-6">
      <h3 className="text-sm font-bold text-zinc-300 mb-4">Posts Criados x Aprovados</h3>
      {isLoading ? (
        <div className="h-64 animate-pulse bg-white/5 rounded-xl" />
      ) : !hasActivity ? (
        <div className="h-64 flex items-center justify-center text-zinc-600 text-sm">
          Nenhuma atividade neste período.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ left: -20, right: 10, top: 10 }}>
            <defs>
              <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="label" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
              itemStyle={{ color: '#e4e4e7' }}
              labelStyle={{ color: '#a1a1aa' }}
            />
            <Legend formatter={(value) => <span className="text-zinc-400 text-xs">{value}</span>} />
            <Area type="monotone" dataKey="created" name="Criados" stroke="#818cf8" fill="url(#colorCreated)" strokeWidth={2} />
            <Area type="monotone" dataKey="approved" name="Aprovados" stroke="#34d399" fill="url(#colorApproved)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </GlassCard>
  );
}
