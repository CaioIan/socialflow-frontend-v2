import { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Building2, Maximize2 } from 'lucide-react';
import { Modal } from '@/shared/components/modal';
import type { MuralItem } from '../api/mural-service';

/**
 * Um item do mural, no tamanho canônico.
 *
 * Imagem e card dividem a mesma moldura 16:9 (`aspect-video`). Se cada um
 * tivesse a própria forma, o mural pularia de altura a cada seta clicada — e o
 * carrossel ficaria tremendo em vez de deslizar.
 */
export function MuralItemCard({
  item,
  showOrganizationBadge = false,
}: {
  item: MuralItem;
  showOrganizationBadge?: boolean;
}) {
  const [imagemAberta, setImagemAberta] = useState(false);
  const [detalheAberto, setDetalheAberto] = useState(false);
  const inicioDoToque = useRef<{ x: number; y: number } | null>(null);
  const arrastou = useRef(false);
  const showScopeBadge = showOrganizationBadge || item.organizationId === null;
  const dataDePublicacao = formatarDataDePublicacao(item.createdAt);

  if (item.type === 'IMAGE') {
    return (
      <>
        <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl border border-white/10 bg-black/20 sm:aspect-video">
          <button
            type="button"
            onClick={() => setImagemAberta(true)}
            aria-label="Ampliar imagem do aviso"
            className="group h-full w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          >
            <img
              src={item.imageUrl ?? ''}
              alt=""
              // `object-cover`: a imagem chega recortada em 16:9, mas se um dia
              // entrar alguma fora da proporção ela preenche em vez de distorcer.
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.015]"
            />
            <span className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-black/60 text-white opacity-80 shadow-lg backdrop-blur-md transition-opacity group-hover:opacity-100">
              <Maximize2 className="h-4 w-4" />
            </span>
          </button>
          {showScopeBadge && <MuralScopeBadge item={item} />}
        </div>

        <Modal
          isOpen={imagemAberta}
          onClose={() => setImagemAberta(false)}
          title="Imagem do mural"
          className="max-w-5xl"
        >
          <div className="flex max-h-[calc(100dvh-10rem)] items-center justify-center overflow-hidden rounded-2xl bg-black/40">
            <img
              src={item.imageUrl ?? ''}
              alt={
                item.organizationName
                  ? `Imagem do aviso da organização ${item.organizationName}`
                  : 'Imagem de aviso global do SocialFlow'
              }
              className="max-h-[calc(100dvh-10rem)] w-full object-contain"
            />
          </div>
        </Modal>
      </>
    );
  }

  const abrirDetalhe = () => {
    if (arrastou.current) {
      arrastou.current = false;
      return;
    }
    setDetalheAberto(true);
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label="Abrir aviso completo"
        onClick={abrirDetalhe}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setDetalheAberto(true);
          }
        }}
        onPointerDown={(event) => {
          inicioDoToque.current = { x: event.clientX, y: event.clientY };
          arrastou.current = false;
        }}
        onPointerMove={(event) => {
          const inicio = inicioDoToque.current;
          if (!inicio) return;
          if (Math.abs(event.clientX - inicio.x) > 8 || Math.abs(event.clientY - inicio.y) > 8) {
            arrastou.current = true;
          }
        }}
        onPointerCancel={() => {
          inicioDoToque.current = null;
          arrastou.current = false;
        }}
        className="relative flex aspect-[3/2] w-full cursor-pointer items-start overflow-hidden rounded-2xl border border-white/10 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:aspect-video sm:p-8"
        style={{
          backgroundColor: item.backgroundColor ?? '#18181b',
          color: item.textColor ?? '#ffffff',
        }}
      >
        <div className={`h-full w-full overflow-hidden ${showScopeBadge ? 'pb-9 sm:pb-12' : ''}`}>
          <MuralBadges item={item} />
          <MuralMarkdown markdown={item.markdown ?? ''} modo="resumo" />
        </div>
        <span className="sr-only">Toque para ler todas as informações do aviso.</span>
        {showScopeBadge && <MuralScopeBadge item={item} />}
      </div>

      <Modal
        isOpen={detalheAberto}
        onClose={() => setDetalheAberto(false)}
        title="Aviso do mural"
        className="max-w-2xl"
      >
        <div
          className="rounded-2xl border border-white/10 p-5 sm:p-8"
          style={{
            backgroundColor: item.backgroundColor ?? '#18181b',
            color: item.textColor ?? '#ffffff',
          }}
        >
          <MuralBadges item={item} completo />
          <MuralMarkdown markdown={item.markdown ?? ''} modo="completo" />
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <MuralScopeBadge item={item} inline />
          {dataDePublicacao && (
            <time className="text-[11px] text-zinc-500" dateTime={item.createdAt}>
              Publicado em {dataDePublicacao}
            </time>
          )}
        </div>
      </Modal>
    </>
  );
}

function formatarDataDePublicacao(valor: string): string | null {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return null;

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(data);
}

function MuralBadges({ item, completo = false }: { item: MuralItem; completo?: boolean }) {
  if ((item.badges?.length ?? 0) === 0) return null;

  return (
    <div
      className={`flex flex-wrap items-center ${
        completo ? 'mb-4 gap-2' : 'mb-2 gap-1.5 sm:mb-4 sm:gap-2'
      }`}
      aria-label="Marcações do aviso"
    >
      {item.badges.map((badge, index) => (
        <span
          key={`${badge.label}-${index}`}
          className={`inline-flex max-w-full items-center rounded-[4px] font-semibold leading-none ${
            completo
              ? 'px-3 py-1.5 text-xs sm:text-sm'
              : 'px-2 py-1 text-[10px] sm:px-3 sm:py-1.5 sm:text-sm'
          }`}
          style={{
            backgroundColor: badge.backgroundColor,
            color: badge.textColor,
          }}
        >
          <span className="truncate">{badge.label}</span>
        </span>
      ))}
    </div>
  );
}

function MuralMarkdown({
  markdown,
  modo,
}: {
  markdown: string;
  modo: 'resumo' | 'completo';
}) {
  const completo = modo === 'completo';

  return (
    <ReactMarkdown
      components={{
        // Sem `remark-gfm` e sem `rehype-raw`: o react-markdown já ignora HTML
        // solto por padrão, impedindo script dentro de um aviso.
        h1: ({ children }) => (
          <h1
            className={
              completo
                ? 'mb-3 text-xl font-bold sm:text-2xl'
                : 'mb-1.5 line-clamp-2 text-[15px] font-bold leading-snug sm:mb-2 sm:line-clamp-none sm:text-2xl'
            }
          >
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2
            className={
              completo
                ? 'mb-3 text-lg font-bold sm:text-xl'
                : 'mb-1.5 line-clamp-2 text-sm font-bold leading-snug sm:mb-2 sm:line-clamp-none sm:text-xl'
            }
          >
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3
            className={
              completo
                ? 'mb-2 text-base font-bold'
                : 'mb-1 line-clamp-2 text-[13px] font-bold leading-snug sm:mb-1.5 sm:line-clamp-none sm:text-base'
            }
          >
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p
            className={
              completo
                ? 'mb-3 text-sm leading-relaxed last:mb-0 sm:text-base'
                : 'mb-1.5 line-clamp-3 text-[11px] leading-[1.45] last:mb-0 sm:mb-2 sm:line-clamp-none sm:text-base sm:leading-relaxed'
            }
          >
            {children}
          </p>
        ),
        ul: ({ children }) => (
          <ul
            className={`mb-2 list-disc space-y-1 pl-4 ${
              completo ? 'text-sm sm:text-base' : 'text-[11px] sm:text-base'
            }`}
          >
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol
            className={`mb-2 list-decimal space-y-1 pl-4 ${
              completo ? 'text-sm sm:text-base' : 'text-[11px] sm:text-base'
            }`}
          >
            {children}
          </ol>
        ),
        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        a: ({ href, children }) =>
          completo ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              {children}
            </a>
          ) : (
            <span className="underline underline-offset-2">{children}</span>
          ),
        code: ({ children }) => (
          <code className="rounded bg-black/20 px-1.5 py-0.5 text-[0.9em]">{children}</code>
        ),
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}

/**
 * Origem do aviso. A foto transforma a badge em reconhecimento, não apenas em
 * metadado; o global usa a própria marca do SocialFlow pelo mesmo motivo.
 */
function MuralScopeBadge({ item, inline = false }: { item: MuralItem; inline?: boolean }) {
  const isGlobal = item.organizationId === null;

  return (
    <span
      className={`${
        inline
          ? 'inline-flex max-w-full'
          : 'absolute bottom-2 right-2 z-10 inline-flex max-w-[calc(100%-1rem)] sm:bottom-3 sm:right-3 sm:max-w-[calc(100%-1.5rem)]'
      } items-center gap-1.5 rounded-md border border-white/15 bg-black/70 py-1 pl-1 pr-2.5 text-[10px] font-semibold text-white shadow-lg backdrop-blur-md sm:gap-2 sm:py-1.5 sm:pl-1.5 sm:pr-3 sm:text-xs`}
      aria-label={isGlobal ? 'Aviso global do SocialFlow' : `Aviso da organização ${item.organizationName}`}
    >
      <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
        {isGlobal ? (
          <img src="/favicon.png" alt="" className="w-full h-full object-cover" />
        ) : item.organizationLogoUrl ? (
          <img src={item.organizationLogoUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Building2 className="w-3.5 h-3.5 text-zinc-300" />
        )}
      </span>
      <span className="truncate">
        {isGlobal ? 'SocialFlow · Global' : item.organizationName ?? 'Organização'}
        {!isGlobal && (item.audienceCount ?? 0) > 0 && (
          <> · {item.audienceCount} {item.audienceCount === 1 ? 'pessoa' : 'pessoas'}</>
        )}
      </span>
    </span>
  );
}
