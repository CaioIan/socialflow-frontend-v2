import ReactMarkdown from 'react-markdown';
import { Building2 } from 'lucide-react';
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
  const showScopeBadge = showOrganizationBadge || item.organizationId === null;

  if (item.type === 'IMAGE') {
    return (
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/20 border border-white/10">
        <img
          src={item.imageUrl ?? ''}
          alt=""
          // `object-cover`: a imagem chega recortada em 16:9, mas se um dia
          // entrar alguma fora da proporção ela preenche em vez de distorcer.
          className="w-full h-full object-cover"
        />
        {showScopeBadge && <MuralScopeBadge item={item} />}
      </div>
    );
  }

  return (
    <div
      className="relative flex aspect-video w-full items-start overflow-hidden rounded-2xl border border-white/10 p-5 sm:p-8"
      style={{
        backgroundColor: item.backgroundColor ?? '#18181b',
        color: item.textColor ?? '#ffffff',
      }}
    >
      {/*
        `overflow-y-auto` como rede: o backend limita o aviso a 1200 caracteres
        justamente para caber, mas fonte grande do sistema ou tela muito estreita
        ainda podem estourar — melhor rolar do que cortar o texto no meio.
      */}
      <div
        className={`no-scrollbar max-h-full w-full overflow-y-auto prose-mural ${
          showScopeBadge ? 'pb-10 sm:pb-12' : ''
        }`}
      >
        {(item.badges?.length ?? 0) > 0 && (
          <div
            className="mb-3 flex flex-wrap items-center gap-2 sm:mb-4"
            aria-label="Marcações do aviso"
          >
            {item.badges.map((badge, index) => (
              <span
                key={`${badge.label}-${index}`}
                className="inline-flex max-w-full items-center rounded-[4px] px-3 py-1.5 text-xs font-semibold leading-none sm:text-sm"
                style={{
                  backgroundColor: badge.backgroundColor,
                  color: badge.textColor,
                }}
              >
                <span className="truncate">{badge.label}</span>
              </span>
            ))}
          </div>
        )}
        <ReactMarkdown
          components={{
            // Sem `remark-gfm` e sem `rehype-raw`: o react-markdown já ignora
            // HTML solto por padrão, e não habilitá-lo é o que impede alguém de
            // injetar script num aviso que o cliente vai abrir.
            h1: ({ children }) => <h1 className="text-lg sm:text-2xl font-bold mb-2">{children}</h1>,
            h2: ({ children }) => <h2 className="text-base sm:text-xl font-bold mb-2">{children}</h2>,
            h3: ({ children }) => <h3 className="text-sm sm:text-base font-bold mb-1.5">{children}</h3>,
            p: ({ children }) => <p className="text-sm sm:text-base mb-2 last:mb-0 leading-relaxed">{children}</p>,
            ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
            strong: ({ children }) => <strong className="font-bold">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                // `noopener` impede que a página aberta manipule a nossa pelo
                // `window.opener`; `noreferrer` não vaza de onde o clique veio.
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                {children}
              </a>
            ),
            code: ({ children }) => (
              <code className="px-1.5 py-0.5 rounded bg-black/20 text-[0.9em]">{children}</code>
            ),
          }}
        >
          {item.markdown ?? ''}
        </ReactMarkdown>
      </div>
      {showScopeBadge && <MuralScopeBadge item={item} />}
    </div>
  );
}

/**
 * Origem do aviso. A foto transforma a badge em reconhecimento, não apenas em
 * metadado; o global usa a própria marca do SocialFlow pelo mesmo motivo.
 */
function MuralScopeBadge({ item }: { item: MuralItem }) {
  const isGlobal = item.organizationId === null;

  return (
    <span
      className="absolute bottom-2 right-2 z-10 inline-flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-md border border-white/15 bg-black/70 py-1 pl-1 pr-2.5 text-[10px] font-semibold text-white shadow-lg backdrop-blur-md sm:bottom-3 sm:right-3 sm:max-w-[calc(100%-1.5rem)] sm:gap-2 sm:py-1.5 sm:pl-1.5 sm:pr-3 sm:text-xs"
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
      </span>
    </span>
  );
}
