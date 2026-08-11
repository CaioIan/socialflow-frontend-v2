import { useQuery } from '@tanstack/react-query';
import { GlassCard } from '@/shared/components/glass-card';
import { muralService } from '../api/mural-service';
import { MuralCarousel } from './mural-carousel';

/**
 * O mural como tela própria, para cliente e designer.
 *
 * O que chega aqui já vem recortado pelo servidor: avisos globais mais os da
 * organização em uso. Esta tela não filtra nada.
 */
export default function MuralPage() {
  const { data: itens = [], isLoading } = useQuery({
    queryKey: ['mural'],
    queryFn: muralService.listar,
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <GlassCard className="p-6 sm:p-8 lg:p-10">
        <MuralCarousel itens={itens} isLoading={isLoading} />
      </GlassCard>
    </div>
  );
}
