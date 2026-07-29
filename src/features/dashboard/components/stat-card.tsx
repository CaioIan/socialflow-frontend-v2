import { GlassCard } from '@/shared/components/glass-card';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  textColorClass: string;
  onClick?: () => void;
  size?: 'lg' | 'sm';
}

export function StatCard({ title, value, icon: Icon, colorClass, textColorClass, onClick, size = 'lg' }: StatCardProps) {
  const isLarge = size === 'lg';

  return (
    <GlassCard
      className={`flex flex-col items-center justify-center transition-all ${colorClass} ${isLarge ? 'p-6' : 'p-4'} ${
        onClick ? 'cursor-pointer hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]' : ''
      }`}
      onClick={onClick}
    >
      <Icon className={`${isLarge ? 'w-8 h-8 mb-3' : 'w-5 h-5 mb-2'} ${textColorClass}`} />
      <p className={`font-medium text-zinc-300 text-center ${isLarge ? 'text-sm' : 'text-xs'}`}>{title}</p>
      <p className={`font-bold mt-2 ${textColorClass} ${isLarge ? 'text-4xl' : 'text-2xl'}`}>{value}</p>
    </GlassCard>
  );
}
