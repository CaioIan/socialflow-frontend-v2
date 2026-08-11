import ReactMarkdown from 'react-markdown';
import type { MuralItem } from '../api/mural-service';

/**
 * Um item do mural, no tamanho canônico.
 *
 * Imagem e card dividem a mesma moldura 16:9 (`aspect-video`). Se cada um
 * tivesse a própria forma, o mural pularia de altura a cada seta clicada — e o
 * carrossel ficaria tremendo em vez de deslizar.
 */
export function MuralItemCard({ item }: { item: MuralItem }) {
  if (item.type === 'IMAGE') {
    return (
      <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black/20 border border-white/10">
        <img
          src={item.imageUrl ?? ''}
          alt=""
          // `object-cover`: a imagem chega recortada em 16:9, mas se um dia
          // entrar alguma fora da proporção ela preenche em vez de distorcer.
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className="w-full aspect-video rounded-2xl overflow-hidden border border-white/10 p-6 sm:p-8 flex items-center"
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
      <div className="w-full max-h-full overflow-y-auto no-scrollbar prose-mural">
        <ReactMarkdown
          components={{
            // Sem `remark-gfm` e sem `rehype-raw`: o react-markdown já ignora
            // HTML solto por padrão, e não habilitá-lo é o que impede alguém de
            // injetar script num aviso que o cliente vai abrir.
            h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
            h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
            h3: ({ children }) => <h3 className="text-base font-bold mb-1.5">{children}</h3>,
            p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
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
    </div>
  );
}
