import { useQuery } from '@tanstack/react-query';
import { organizationsService } from '@/features/organizations/api/organizations-service';

interface OrganizationFilterProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

export function OrganizationFilter({ value, onChange }: OrganizationFilterProps) {
  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    // Envolvido numa arrow: passar a função direto faria o React Query mandar
    // o contexto da query como primeiro argumento, que agora é `incluirInativas`.
    queryFn: () => organizationsService.getAll(),
  });

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      // `min-w-0 flex-1` só importa no celular: o select se dimensiona pelo nome
      // de empresa mais longo e, agora que divide a linha com o botão de
      // recarregar, sem isso ele empurraria o botão para fora da tela.
      className="min-w-0 flex-1 sm:flex-none bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
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
