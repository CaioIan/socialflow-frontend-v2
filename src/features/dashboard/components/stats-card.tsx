import type { LucideIcon } from 'lucide-react';
import { GlassCard } from '@/shared/components/glass-card';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: 'primary' | 'emerald' | 'amber' | 'red';
}

const colorStyles = {
  primary: 'text-primary',
  emerald: 'text-emerald-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
};

export function StatsCard({ title, value, icon: Icon, color = 'primary' }: StatsCardProps) {
  return (
    <GlassCard className="!p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{title}</p>
          <p className="mt-3 text-4xl font-bold text-white">{value}</p>
        </div>
        <div className={`rounded-lg p-3 bg-white/5 ${colorStyles[color]}`}>
          <Icon size={28} />
        </div>
      </div>
    </GlassCard>
  );
}
