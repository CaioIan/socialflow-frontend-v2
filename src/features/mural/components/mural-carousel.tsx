import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Megaphone } from 'lucide-react';
import type { MuralItem } from '../api/mural-service';
import { MuralItemCard } from './mural-item-card';

/**
 * O mural: título à esquerda, itens à direita.
 *
 * O carrossel **não avança sozinho**, por decisão de produto. Aviso que troca
 * enquanto a pessoa lê é aviso que não foi lido — quem avança é quem está
 * lendo, pela seta.
 */
export function MuralCarousel({
  itens,
  isLoading,
}: {
  itens: MuralItem[];
  isLoading?: boolean;
}) {
  const trilhoRef = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState(0);

  /**
   * Descobre o item visível pelo que está mais perto do centro.
   *
   * Dividir `scrollLeft` pela largura seria mais curto, mas quebra assim que a
   * largura muda entre breakpoints — e ela muda.
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
    <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] gap-6 lg:gap-10 items-start">
      <header className="lg:pt-2">
        <h2 className="text-2xl lg:text-3xl font-bold text-white leading-tight flex items-start gap-3">
          <Megaphone className="w-6 h-6 text-primary shrink-0 mt-1" />
          Mural de avisos e informações
        </h2>
        {itens.length > 1 && (
          <p className="text-sm text-zinc-500 mt-2">
            {atual + 1} de {itens.length}
          </p>
        )}
      </header>

      <div className="relative min-w-0">
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
            <div
              ref={trilhoRef}
              onScroll={aoRolar}
              className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-4"
            >
              {itens.map((item) => (
                <div key={item.id} className="w-full shrink-0 snap-start">
                  <MuralItemCard item={item} />
                </div>
              ))}
            </div>

            {itens.length > 1 && (
              <>
                {/* Setas por fora da imagem no desktop, sobrepostas no mobile:
                    numa tela estreita não sobra margem para tirá-las de cima. */}
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

                <div className="flex justify-center gap-2 mt-4">
                  {itens.map((item, i) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => irPara(i)}
                      aria-label={`Ver aviso ${i + 1} de ${itens.length}`}
                      aria-current={i === atual}
                      // Alvo de toque de 24px em volta de uma bolinha de 8px.
                      className="p-2 -m-1 flex items-center justify-center"
                    >
                      <span
                        className={`w-2 h-2 rounded-full block transition-all ${
                          i === atual
                            ? 'bg-primary shadow-[0_0_10px_oklch(var(--primary)/0.5)] scale-125'
                            : 'bg-white/20'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </>
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
      className={`absolute top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full
        bg-black/60 backdrop-blur-md border border-white/10 text-white
        flex items-center justify-center transition-all
        hover:bg-black/80 hover:border-white/25 active:scale-90
        disabled:opacity-0 disabled:pointer-events-none
        ${lado === 'esquerda' ? 'left-2 lg:-left-5' : 'right-2 lg:-right-5'}`}
    >
      <Icone className="w-5 h-5" />
    </button>
  );
}
