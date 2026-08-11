import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Megaphone } from 'lucide-react';
import type { MuralItem } from '../api/mural-service';
import { MuralItemCard } from './mural-item-card';

/**
 * O mural: título à esquerda, avisos à direita.
 *
 * Sem moldura própria — o mural é solto na página. Uma caixa em volta o
 * transformaria em "mais um bloco do painel"; sem ela, ele é o painel.
 *
 * O carrossel **não avança sozinho**, por decisão de produto. Aviso que troca
 * enquanto a pessoa lê é aviso que não foi lido — quem avança é quem está lendo.
 */
export function MuralCarousel({
  itens,
  isLoading,
  showOrganizationBadge = false,
}: {
  itens: MuralItem[];
  isLoading?: boolean;
  showOrganizationBadge?: boolean;
}) {
  const trilhoRef = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState(0);

  const temMaisDeUm = itens.length > 1;

  /**
   * Descobre o aviso visível pelo que está mais perto do centro.
   *
   * Dividir `scrollLeft` pela largura seria mais curto, mas quebra assim que a
   * largura muda entre breakpoints — e ela muda, porque a sobra lateral é maior
   * no desktop que no celular.
   */
  const aoRolar = () => {
    const trilho = trilhoRef.current;
    if (!trilho) return;

    const centro = trilho.scrollLeft + trilho.clientWidth / 2;
    let maisProximo = 0;
    let menorDistancia = Infinity;

    Array.from(trilho.children).forEach((filho, i) => {
      const el = filho as HTMLElement;
      const distancia = Math.abs(el.offsetLeft + el.offsetWidth / 2 - centro);
      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        maisProximo = i;
      }
    });

    setAtual(maisProximo);
  };

  const irPara = (indice: number) => {
    const alvo = Math.max(0, Math.min(indice, itens.length - 1));
    const slide = trilhoRef.current?.children[alvo] as HTMLElement | undefined;
    slide?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] gap-6 lg:gap-12 items-start">
      <header className="lg:pt-1">
        <h2 className="text-2xl lg:text-[1.75rem] font-bold text-white leading-tight flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-3">
            <Megaphone className="w-6 h-6 text-primary shrink-0" />
            Mural de avisos
          </span>
          {itens.length > 0 && (
            // Contador colado no título, não solto embaixo: ali ele é parte do
            // título e diz de cara quantos avisos existem.
            <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-primary text-white text-xs font-bold">
              {itens.length}
            </span>
          )}
        </h2>
        <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
          Novidades do SocialFlow e das organizações que você acompanha.
        </p>
      </header>

      <div className="min-w-0">
        {isLoading ? (
          <div className="w-full aspect-video rounded-2xl bg-white/5 animate-pulse" />
        ) : itens.length === 0 ? (
          <div className="w-full aspect-video rounded-2xl border-2 border-dashed border-white/5 bg-white/[0.01] flex flex-col items-center justify-center text-center px-6">
            <Megaphone className="w-10 h-10 text-zinc-700 mb-3" />
            <p className="text-zinc-500 font-medium">Nenhum aviso no momento</p>
            <p className="text-zinc-600 text-sm mt-1">
              Quando houver novidade, ela aparece aqui.
            </p>
          </div>
        ) : (
          <>
            {/*
              Cada aviso é mais estreito que a coluna e o trilho tem folga à
              direita: sobra um pedaço do próximo, que é o único aviso de que
              existe mais de um antes de a pessoa arrastar. Com um item só a
              folga sai, senão o aviso único ficaria desalinhado à toa.

              `snap-start` e não `snap-center`: centrado, o último item não
              alcança o próprio ponto de parada e o carrossel volta sozinho.
            */}
            <div
              ref={trilhoRef}
              onScroll={aoRolar}
              className={`flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-4 ${
                temMaisDeUm ? 'pr-12 lg:pr-40' : ''
              }`}
            >
              {itens.map((item) => (
                <div
                  key={item.id}
                  // O padding do trilho já reserva 3rem/10rem para a espiada do
                  // próximo aviso. `w-full` aqui ocupa a área útil restante;
                  // descontar o padding de novo deixaria o card estreito demais.
                  className="w-full shrink-0 snap-start"
                >
                  <MuralItemCard
                    item={item}
                    showOrganizationBadge={showOrganizationBadge}
                  />
                </div>
              ))}
            </div>

            {temMaisDeUm && (
              // Controles juntos, no canto inferior direito: seta, bolinhas e
              // seta formam um só grupo em vez de três elementos espalhados.
              <div className="flex items-center justify-end gap-3 mt-5">
                <div className="flex items-center gap-1.5">
                  {itens.map((item, i) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => irPara(i)}
                      aria-label={`Ver aviso ${i + 1} de ${itens.length}`}
                      aria-current={i === atual}
                      className="py-2 flex items-center"
                    >
                      {/* O ativo vira uma barrinha em vez de um ponto maior:
                          lê-se como "você está aqui" sem depender só de cor. */}
                      <span
                        className={`h-1.5 rounded-full block transition-all ${
                          i === atual ? 'w-6 bg-primary' : 'w-1.5 bg-white/20'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <Seta
                    lado="esquerda"
                    onClick={() => irPara(atual - 1)}
                    desabilitada={atual === 0}
                  />
                  <Seta
                    lado="direita"
                    onClick={() => irPara(atual + 1)}
                    desabilitada={atual === itens.length - 1}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function Seta({
  lado,
  onClick,
  desabilitada,
}: {
  lado: 'esquerda' | 'direita';
  onClick: () => void;
  desabilitada: boolean;
}) {
  const Icone = lado === 'esquerda' ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitada}
      aria-label={lado === 'esquerda' ? 'Aviso anterior' : 'Próximo aviso'}
      // Desabilitado fica apagado, não some: sumir mudaria a posição da seta
      // ao lado a cada avanço, e o alvo do clique escaparia do dedo.
      className="w-9 h-9 rounded-full border border-white/10 text-zinc-400
        flex items-center justify-center transition-all
        hover:bg-white/5 hover:text-white hover:border-white/25 active:scale-90
        disabled:opacity-25 disabled:pointer-events-none"
    >
      <Icone className="w-4 h-4" />
    </button>
  );
}
