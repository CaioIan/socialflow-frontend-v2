import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function GlassCard({ children, className, onClick }: GlassCardProps) {
  return (
    <div className={cn('glass-card p-4 sm:p-6', className)} onClick={onClick}>
      {children}
    </div>
  );
}
