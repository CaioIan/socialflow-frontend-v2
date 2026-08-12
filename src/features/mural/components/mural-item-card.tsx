import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowRight, Building2, Download, Maximize2, Share2 } from 'lucide-react';
import { Modal } from '@/shared/components/modal';
import { useToastStore } from '@/stores/use-toast-store';
import {
  ehIos,
  estaEmModoAplicativo,
  MENSAGEM_INSTALACAO_INICIADA,
  observarInstalacao,
  solicitarInstalacao,
} from '@/shared/lib/pwa-install';
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
  const [instrucaoDeInstalacaoAberta, setInstrucaoDeInstalacaoAberta] = useState(false);
  const [instalado, setInstalado] = useState(estaEmModoAplicativo());
  const inicioDoToque = useRef<{ x: number; y: number } | null>(null);
  const arrastou = useRef(false);
  const { addToast } = useToastStore();
  const showScopeBadge = showOrganizationBadge || item.organizationId === null;
  const showMoreEnabled = item.showMoreEnabled === true;
  const showInstallButton = item.installButtonEnabled === true && !instalado;
  const showCardActions = showMoreEnabled || showInstallButton;
  const dataDePublicacao = formatarDataDePublicacao(item.createdAt);

  useEffect(() => {
    return observarInstalacao(() => setInstalado(estaEmModoAplicativo()));
  }, []);

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

  const instalarSocialFlow = async () => {
    const resultado = await solicitarInstalacao();

    if (resultado === 'accepted') {
      addToast(MENSAGEM_INSTALACAO_INICIADA, 'info');
      return;
    }

    if (resultado === 'unavailable') {
      setInstrucaoDeInstalacaoAberta(true);
    }
  };

  return (
    <>
      <div
        role={showMoreEnabled ? undefined : 'button'}
        tabIndex={showMoreEnabled ? undefined : 0}
        aria-label={showMoreEnabled ? undefined : 'Abrir aviso completo'}
        onClick={showMoreEnabled ? undefined : abrirDetalhe}
        onKeyDown={(event) => {
          if (showMoreEnabled) return;
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
        className={`relative flex aspect-[3/2] w-full items-start overflow-hidden rounded-2xl border border-white/10 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:aspect-video sm:p-8 ${
          showMoreEnabled ? '' : 'cursor-pointer'
        }`}
        style={{
          backgroundColor: item.backgroundColor ?? '#18181b',
          color: item.textColor ?? '#ffffff',
        }}
      >
        <div
          className={`h-full w-full overflow-hidden ${
            showCardActions || showScopeBadge ? 'pb-12 sm:pb-14' : ''
          }`}
        >
          <MuralBadges item={item} />
          <MuralMarkdown markdown={item.markdown ?? ''} modo="resumo" />
        </div>
        {!showMoreEnabled && (
          <span className="sr-only">Toque para ler todas as informações do aviso.</span>
        )}

        {showCardActions ? (
          <div className="absolute inset-x-2 bottom-2 z-10 flex min-w-0 items-center justify-between gap-2 sm:inset-x-3 sm:bottom-3">
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
              {showInstallButton && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void instalarSocialFlow();
                  }}
                  aria-label="Instalar SocialFlow"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-gradient px-3 py-2 text-[11px] font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
                >
                  <Download aria-hidden="true" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="sm:hidden">Instalar</span>
                  <span className="hidden sm:inline">Instalar SocialFlow</span>
                </button>
              )}

              {showMoreEnabled && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    abrirDetalhe();
                  }}
                  aria-label="Ver mais sobre este aviso"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
                  style={{
                    backgroundColor: item.showMoreBackgroundColor ?? '#ffffff',
                    color: item.showMoreTextColor ?? '#18181b',
                  }}
                >
                  <span>Ver mais</span>
                  <ArrowRight
                    aria-hidden="true"
                    className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                    style={{ color: item.showMoreIconColor ?? '#18181b' }}
                  />
                </button>
              )}
            </div>
            {showScopeBadge && (
              <span className="min-w-0">
                <MuralScopeBadge item={item} inline />
              </span>
            )}
          </div>
        ) : (
          showScopeBadge && <MuralScopeBadge item={item} />
        )}
      </div>

      <Modal
        isOpen={detalheAberto}
        onClose={() => setDetalheAberto(false)}
        title="Aviso do mural"
        className="max-w-2xl"
      >
        <div
          className="min-w-0 max-w-full rounded-2xl border border-white/10 p-5 sm:p-8"
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

      <Modal
        isOpen={instrucaoDeInstalacaoAberta}
        onClose={() => setInstrucaoDeInstalacaoAberta(false)}
        title="Instale o SocialFlow"
      >
        <div className="space-y-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-lg">
            {ehIos() ? <Share2 className="h-5 w-5" /> : <Download className="h-5 w-5" />}
          </div>
          <div className="space-y-2 text-sm leading-relaxed text-zinc-300">
            <p>
              {ehIos()
                ? 'No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.'
                : 'Abra o menu do navegador e escolha “Instalar aplicativo” ou “Adicionar à tela inicial”.'}
            </p>
            <p className="text-xs text-zinc-500">
              Depois, abra o SocialFlow pelo novo ícone criado no dispositivo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setInstrucaoDeInstalacaoAberta(false)}
            className="w-full rounded-xl bg-brand-gradient px-4 py-3 text-sm font-bold text-white transition-transform active:scale-[0.98]"
          >
            Entendi
          </button>
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
              : 'px-2.5 py-1 text-[11px] sm:px-3 sm:py-1.5 sm:text-sm'
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
    <div
      data-mural-markdown={modo}
      className="min-w-0 max-w-full break-words [overflow-wrap:anywhere]"
    >
      <ReactMarkdown
        components={{
        // Sem `remark-gfm` e sem `rehype-raw`: o react-markdown já ignora HTML
        // solto por padrão, impedindo script dentro de um aviso.
        h1: ({ children }) => (
          <h1
            className={
              completo
                ? 'mb-3 text-xl font-bold sm:text-2xl'
                : 'mb-1.5 line-clamp-2 text-[17px] font-bold leading-snug sm:mb-2 sm:line-clamp-none sm:text-2xl'
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
                : 'mb-1.5 line-clamp-2 text-base font-bold leading-snug sm:mb-2 sm:line-clamp-none sm:text-xl'
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
                : 'mb-1 line-clamp-2 text-[15px] font-bold leading-snug sm:mb-1.5 sm:line-clamp-none sm:text-base'
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
                : 'mb-1.5 line-clamp-3 text-xs leading-[1.5] last:mb-0 sm:mb-2 sm:line-clamp-none sm:text-base sm:leading-relaxed'
            }
          >
            {children}
          </p>
        ),
        ul: ({ children }) => (
          <ul
            className={`mb-2 list-disc space-y-1 pl-4 ${
              completo ? 'text-sm sm:text-base' : 'text-xs sm:text-base'
            }`}
          >
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol
            className={`mb-2 list-decimal space-y-1 pl-4 ${
              completo ? 'text-sm sm:text-base' : 'text-xs sm:text-base'
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
                className="break-words underline underline-offset-2 [overflow-wrap:anywhere]"
              >
                {children}
              </a>
            ) : (
              <span className="break-words underline underline-offset-2 [overflow-wrap:anywhere]">
                {children}
              </span>
            ),
          code: ({ children }) => (
            <code className="whitespace-pre-wrap break-words rounded bg-black/20 px-1.5 py-0.5 text-[0.9em] [overflow-wrap:anywhere]">
              {children}
            </code>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
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
      } items-center gap-1.5 rounded-md border border-white/15 bg-black/70 py-1 pl-1 pr-2.5 text-[11px] font-semibold text-white shadow-lg backdrop-blur-md sm:gap-2 sm:py-1.5 sm:pl-1.5 sm:pr-3 sm:text-xs`}
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
