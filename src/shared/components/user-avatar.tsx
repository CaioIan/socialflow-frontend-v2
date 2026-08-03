import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProfileOrganization } from '@/features/profile/api/profile-service';

interface Props {
  nome: string | null | undefined;
  email?: string;
  avatarUrl: string | null | undefined;
  /** Vínculos do usuário. A foto da empresa só entra quando há exatamente um. */
  organizacoes: ProfileOrganization[] | undefined;
  tamanho?: 'sm' | 'md';
  className?: string;
}

const MEDIDAS = {
  sm: { raiz: 'w-9 h-9', texto: 'text-sm', selo: 'w-4 h-4', icone: 'w-2 h-2' },
  md: { raiz: 'w-10 h-10', texto: 'text-base', selo: 'w-[18px] h-[18px]', icone: 'w-2.5 h-2.5' },
} as const;

/**
 * Avatar do usuário com a organização sobreposta num canto.
 *
 * O selo só aparece para quem pertence a **uma** organização. Com duas ou mais,
 * mostrar a foto de uma delas seria informação errada — o usuário não "é" de
 * nenhuma em particular, e qual apareceria dependeria da ordem da lista.
 */
export function UserAvatar({
  nome,
  email,
  avatarUrl,
  organizacoes,
  tamanho = 'md',
  className,
}: Props) {
  const m = MEDIDAS[tamanho];
  const inicial = (nome?.charAt(0) || email?.charAt(0) || 'U').toUpperCase();
  const organizacaoUnica = organizacoes?.length === 1 ? organizacoes[0] : undefined;

  return (
    <span className={cn('relative inline-flex shrink-0', m.raiz, className)}>
      <span
        className={cn(
          'w-full h-full rounded-full overflow-hidden bg-brand-gradient border border-white/10 flex items-center justify-center text-white font-bold shadow-[0_0_15px_oklch(var(--primary)/0.3)]',
          m.texto,
        )}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          inicial
        )}
      </span>

      {organizacaoUnica && (
        <span
          title={organizacaoUnica.name}
          className={cn(
            'absolute -bottom-0.5 -right-0.5 rounded-full overflow-hidden bg-zinc-900 border border-zinc-900 flex items-center justify-center',
            m.selo,
          )}
        >
          {organizacaoUnica.logoUrl ? (
            <img
              src={organizacaoUnica.logoUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="w-full h-full bg-white/10 flex items-center justify-center">
              <Building2 className={cn('text-zinc-400', m.icone)} />
            </span>
          )}
        </span>
      )}
    </span>
  );
}
