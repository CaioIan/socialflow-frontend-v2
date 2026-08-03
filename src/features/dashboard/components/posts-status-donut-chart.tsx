import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { GlassCard } from '@/shared/components/glass-card';
import type { PostStatus } from '../api/dashboard-service';

interface PostsStatusDonutChartProps {
  posts: Record<PostStatus, number>;
  onSliceClick: (status: PostStatus) => void;
}

const STATUS_CONFIG: Record<PostStatus, { label: string; color: string }> = {
  PENDING: { label: 'Pendentes', color: '#60a5fa' },
  ALTERATION_REQUESTED: { label: 'Solicitação de Ajuste', color: '#fbbf24' },
  APPROVED: { label: 'Aprovados', color: '#34d399' },
  PUBLISHED: { label: 'Publicados', color: '#a78bfa' },
  FAILED: { label: 'Falha ao publicar', color: '#f87171' },
};

export function PostsStatusDonutChart({ posts, onSliceClick }: PostsStatusDonutChartProps) {
  const data = (Object.keys(STATUS_CONFIG) as PostStatus[]).map((status) => ({
    status,
    name: STATUS_CONFIG[status].label,
    value: posts[status] ?? 0,
    color: STATUS_CONFIG[status].color,
  }));

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <GlassCard className="p-6">
      <h3 className="text-sm font-bold text-zinc-300 mb-4">Posts por Status</h3>
      {total === 0 ? (
        <div className="h-64 flex items-center justify-center text-zinc-600 text-sm">
          Nenhum post registrado ainda.
        </div>
      ) : (
        <>
          {/* Legend própria — o <Legend> nativo do Recharts dentro do PieChart
              mexe no cálculo de espaço do próprio Pie e acaba encolhendo/deslocando
              o donut de forma imprevisível; controlar isso fora do chart evita o bug. */}
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={2}
                isAnimationActive={false}
                cursor="pointer"
                onClick={(entry) => onSliceClick((entry as unknown as { status: PostStatus }).status)}
              >
                {data.map((entry) => (
                  <Cell key={entry.status} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                itemStyle={{ color: '#e4e4e7' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-4">
            {data.map((entry) => (
              <button
                key={entry.status}
                onClick={() => onSliceClick(entry.status)}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}
              </button>
            ))}
          </div>
        </>
      )}
    </GlassCard>
  );
}
