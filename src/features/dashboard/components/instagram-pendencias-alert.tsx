import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { InstagramIcon } from '@/shared/components/icons/instagram-icon';
import api from '@/api/axios';
import { GlassCard } from '@/shared/components/glass-card';

interface InstagramPendencia {
  organizationId: string;
  organizationName: string;
  motivo: 'SEM_CONTA' | 'REVOGADA';
}

/**
 * Avisa quais clientes estão com a publicação automática parada.
 *
 * Sem isso, uma conta desconectada só apareceria quando um post deixasse de
 * sair — e nesse ponto o horário combinado com o cliente já passou.
 */
export function InstagramPendenciasAlert() {
  const { data: pendencias = [] } = useQuery({
    queryKey: ['instagram-pendencias'],
    queryFn: async () => {
      const response = await api.get<InstagramPendencia[]>('/instagram/pendencias');
      return response.data;
    },
  });

  if (pendencias.length === 0) return null;

  return (
    <GlassCard className="p-5 border-amber-500/30 bg-amber-500/5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-3 flex-1">
          <div>
            <p className="font-bold text-amber-400">
              {pendencias.length === 1
                ? '1 organização não está publicando'
                : `${pendencias.length} organizações não estão publicando`}
            </p>
            <p className="text-sm text-zinc-400">
              Os posts continuam sendo aprovados, mas não vão ao ar até que o Instagram seja
              conectado.
            </p>
          </div>

          <ul className="flex flex-wrap gap-2">
            {pendencias.map((pendencia) => (
              <li key={pendencia.organizationId}>
                <Link
                  to={`/organizations/${pendencia.organizationId}/instagram`}
                  className="flex items-center gap-2 bg-black/20 hover:bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm transition-colors"
                >
                  <InstagramIcon className="w-4 h-4 text-zinc-400" />
                  <span className="text-zinc-200">{pendencia.organizationName}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      pendencia.motivo === 'REVOGADA'
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-zinc-500/20 text-zinc-300'
                    }`}
                  >
                    {pendencia.motivo === 'REVOGADA' ? 'credencial recusada' : 'sem conta'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </GlassCard>
  );
}
