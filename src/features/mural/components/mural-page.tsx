import { MuralFeed } from './mural-feed';

/**
 * O mural como tela própria para todos os papéis autenticados.
 *
 * O que chega aqui já vem recortado pelo servidor: avisos globais mais os das
 * organizações autorizadas. Esta tela não filtra nada.
 */
export default function MuralPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <MuralFeed />
    </div>
  );
}
