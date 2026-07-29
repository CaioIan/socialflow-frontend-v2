import { useQuery } from '@tanstack/react-query';
import { organizationsService } from '@/features/organizations/api/organizations-service';

interface OrganizationFilterProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

export function OrganizationFilter({ value, onChange }: OrganizationFilterProps) {
  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: organizationsService.getAll,
  });

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
    >
      <option value="">Todas as organizações</option>
      {organizations.map((org) => (
        <option key={org.id} value={org.id}>
          {org.name}
        </option>
      ))}
    </select>
  );
}
