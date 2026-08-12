import { GlassCard } from '@/shared/components/glass-card';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  textColorClass: string;
  onClick?: () => void;
  size?: 'xl' | 'lg' | 'sm';
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  colorClass,
  textColorClass,
  onClick,
  size = 'lg',
  className = '',
}: StatCardProps) {
  const isExtraLarge = size === 'xl';
  const isLarge = size === 'lg';

  return (
    <GlassCard
      className={`flex flex-col items-center justify-center transition-all ${colorClass} ${
        isExtraLarge ? 'p-7 sm:p-8' : isLarge ? 'p-6' : 'p-4'
      } ${
        onClick ? 'cursor-pointer hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]' : ''
      } ${className}`}
      onClick={onClick}
    >
      <Icon
        className={`${
          isExtraLarge ? 'mb-4 h-10 w-10' : isLarge ? 'mb-3 h-8 w-8' : 'mb-2 h-5 w-5'
        } ${textColorClass}`}
      />
      <p
        className={`font-medium text-zinc-300 text-center ${
          isExtraLarge ? 'text-base sm:text-lg' : isLarge ? 'text-sm' : 'text-xs'
        }`}
      >
        {title}
      </p>
      <p
        className={`font-bold mt-2 ${textColorClass} ${
          isExtraLarge ? 'text-5xl sm:text-6xl' : isLarge ? 'text-4xl' : 'text-2xl'
        }`}
      >
        {value}
      </p>
    </GlassCard>
  );
}
