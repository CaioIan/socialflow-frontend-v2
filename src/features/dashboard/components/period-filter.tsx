import type { PeriodDays } from '../api/dashboard-service';

interface PeriodFilterProps {
  value: PeriodDays;
  onChange: (value: PeriodDays) => void;
}

const OPTIONS: PeriodDays[] = [7, 30, 90];

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  return (
    <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
      {OPTIONS.map((days) => (
        <button
          key={days}
          onClick={() => onChange(days)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            value === days ? 'bg-brand-gradient text-white' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          {days}d
        </button>
      ))}
    </div>
  );
}
