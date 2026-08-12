import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, CircleHelp, Megaphone } from 'lucide-react';
import { Modal } from '@/shared/components/modal';
import type { MuralItem } from '../api/mural-service';
import { MuralItemCard } from './mural-item-card';

/**
 * O mural: saudação à esquerda, título e avisos à direita.
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
  viewerName,
}: {
  itens: MuralItem[];
  isLoading?: boolean;
  showOrganizationBadge?: boolean;
  viewerName?: string;
}) {
  const trilhoRef = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState(0);
  const [explicacaoAberta, setExplicacaoAberta] = useState(false);

  const temMaisDeUm = itens.length > 1;
  const agora = new Date();
  const primeiroNome = viewerName?.trim().split(/\s+/)[0];
  const hora = agora.getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const textoDaSaudacao = `${saudacao}${primeiroNome ? `, ${primeiroNome}!` : '!'}`;
  // A unidade `cqw` mede a coluna da saudação, não a viewport inteira. Assim o
  // texto encolhe também no tablet, quando a sidebar deixa essa coluna estreita.
  const tamanhoPeloComprimento = 100 / (textoDaSaudacao.length * 0.58);
  const dataFormatada = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(agora);
  const dataComInicialMaiuscula =
    dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);

  /**
   * Descobre o aviso visível pelo que está mais perto do centro.
   *
   * A posição vem dos retângulos realmente visíveis. `offsetLeft` depende do
   * ancestral usado como referência e pode incluir a distância do mural até a
   * borda da página, fazendo o indicador errar durante o arraste.
   */
  const aoRolar = () => {
    const trilho = trilhoRef.current;
    if (!trilho) return;

    const retanguloDoTrilho = trilho.getBoundingClientRect();
    const centro = retanguloDoTrilho.left + retanguloDoTrilho.width / 2;
    let maisProximo = 0;
    let menorDistancia = Infinity;

    Array.from(trilho.children).forEach((filho, i) => {
      const el = filho as HTMLElement;
      const retanguloDoSlide = el.getBoundingClientRect();
      const centroDoSlide = retanguloDoSlide.left + retanguloDoSlide.width / 2;
      const distancia = Math.abs(centroDoSlide - centro);
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
    <>
      <section className="grid grid-cols-1 items-start gap-6 sm:gap-8 lg:grid-cols-[minmax(17rem,2fr)_minmax(0,3fr)] lg:gap-12 xl:grid-cols-[27rem_minmax(0,1fr)] xl:gap-16">
        <header className="[container-type:inline-size] lg:pt-[4.75rem]">
          <p className="mb-2 text-xs text-zinc-500 sm:mb-4 sm:text-base">
            {dataComInicialMaiuscula}
          </p>
          <h2
            className="whitespace-nowrap font-light leading-tight tracking-tight text-white"
            style={{
              fontSize: `clamp(1.35rem, min(8vw, ${tamanhoPeloComprimento.toFixed(2)}cqw), 3rem)`,
            }}
          >
            {textoDaSaudacao}
          </h2>
          <p className="mt-5 hidden max-w-md text-base leading-relaxed text-zinc-400 sm:block sm:text-lg">
            Acompanhe novidades, comunicados e avisos importantes em um só lugar.
          </p>
        </header>

        <div className="min-w-0">
          <div className="mb-4 flex items-center gap-2 border-b border-white/15 pb-2 sm:mb-6 sm:pb-3">
            <h3 className="text-lg font-bold text-white sm:text-[1.75rem]">
              Mural de Avisos
            </h3>
            {itens.length > 0 && (
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-2 text-xs font-bold text-white">
                {itens.length}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="aspect-video w-full rounded-2xl bg-white/5 animate-pulse sm:w-[29.5rem]" />
          ) : itens.length === 0 ? (
            <div className="flex aspect-video w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/5 bg-white/[0.01] px-6 text-center sm:w-[29.5rem]">
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

              Não há `scroll-snap`: no gesto livre, o trilho permanece exatamente
              no ponto em que a pessoa soltou. As setas continuam sendo atalhos.
            */}
              <div
                ref={trilhoRef}
                onScroll={aoRolar}
                className={`flex overflow-x-auto no-scrollbar gap-4 ${temMaisDeUm ? 'pr-[12%] sm:pr-48' : ''
                  }`}
              >
                {itens.map((item) => (
                  <div
                    key={item.id}
                    data-mural-slide
                    // 29,5rem reproduz o card compacto da referência. O trilho
                    // continua maior, então parte do próximo aviso fica visível.
                    className={`shrink-0 ${temMaisDeUm ? 'w-[88%] sm:w-[29.5rem]' : 'w-full sm:w-[29.5rem]'
                      }`}
                  >
                    <MuralItemCard
                      item={item}
                      showOrganizationBadge={showOrganizationBadge}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-3 flex min-h-9 items-center justify-between gap-4 px-2 sm:mt-5">
                <button
                  type="button"
                  onClick={() => setExplicacaoAberta(true)}
                  className="inline-flex items-center gap-2 rounded-md text-sm text-zinc-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-haspopup="dialog"
                >
                  <CircleHelp className="h-4 w-4" />
                  Entenda o mural
                </button>

                {temMaisDeUm && (
                  // Controles juntos, no canto inferior direito: seta, bolinhas e
                  // seta formam um só grupo em vez de três elementos espalhados.
                  <div className="flex shrink-0 items-center gap-3">
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
                            className={`h-1.5 rounded-full block transition-all ${i === atual ? 'w-6 bg-primary' : 'w-1.5 bg-white/20'
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
              </div>
            </>
          )}
        </div>
      </section>

      <Modal
        isOpen={explicacaoAberta}
        onClose={() => setExplicacaoAberta(false)}
        title="Entenda o mural"
      >
        <div className="space-y-5 text-sm leading-relaxed text-zinc-300">
          <p>
            O mural reúne comunicados importantes para você acompanhar, tanto sobre o SocialFlow como de organizações que você participa.
          </p>

          <ul className="space-y-3">
            <li className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <strong className="mb-1 block text-white">Avisos globais</strong>
              São novidades do SocialFlow e aparecem para todas as pessoas da plataforma.
            </li>
            <li className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <strong className="mb-1 block text-white">Avisos da organização</strong>
              A logo e o nome no card mostram a qual organização cada informação pertence.
            </li>
            <li className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <strong className="mb-1 block text-white">Navegação manual</strong>
              Use as setas, os indicadores ou deslize os cards. O mural não avança sozinho enquanto você lê.
            </li>
          </ul>
        </div>
      </Modal>
    </>
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
