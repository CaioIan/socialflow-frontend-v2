import type { SVGProps } from 'react';

/**
 * Glifo do Instagram, monocromático.
 *
 * O lucide-react removeu os ícones de marca na 1.0, e o projeto estava usando
 * `Camera` no lugar — que não comunica nada. Aqui o desenho é o mesmo traçado
 * geométrico do glifo oficial: quadrado arredondado, lente ao centro e o ponto
 * do flash no canto superior direito.
 *
 * Usa `currentColor` de propósito: acompanha a cor do texto ao redor, então
 * fica branco no tema escuro e preto num fundo claro, sem gradiente. É também
 * a forma que a Meta indica para uso monocromático em interfaces de integração.
 *
 * As props seguem as do lucide (`className`, `strokeWidth`) para poder ser
 * trocado por qualquer outro ícone sem mexer nas chamadas.
 */
export function InstagramIcon({
  strokeWidth = 2,
  ...props
}: SVGProps<SVGSVGElement> & { strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Instagram"
      {...props}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
