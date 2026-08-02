import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PostsPage from '../posts-page';
import { postsService, type Post } from '../../api/posts-service';

vi.mock('../../api/posts-service', () => ({
  postsService: { getByCampaign: vi.fn() },
}));

vi.mock('@/features/campaigns/api/campaigns-service', () => ({
  campaignsService: {
    getAll: vi.fn().mockResolvedValue([{ id: 'camp-1', title: 'Campanha Julho' }]),
  },
}));

vi.mock('@/shared/hooks/use-organization-access', () => ({
  useOrganizationAccess: () => ({ hasAccess: true, isLoading: false }),
}));

vi.mock('@/stores/use-auth-store', () => ({
  useAuthStore: () => ({ user: { id: 'u1', role: 'ADMIN' } }),
}));

vi.mock('@/stores/use-toast-store', () => ({ useToastStore: () => ({ addToast: vi.fn() }) }));

// Modais e menu fazem as próprias buscas e mutações; nenhum teste aqui os abre.
vi.mock('../create-post-modal', () => ({ CreatePostModal: () => null }));
vi.mock('../import-posts-modal', () => ({ ImportPostsModal: () => null }));
vi.mock('../edit-post-modal', () => ({ EditPostModal: () => null }));
vi.mock('../delete-post-modal', () => ({ DeletePostModal: () => null }));
vi.mock('../upload-version-modal', () => ({ UploadVersionModal: () => null }));
vi.mock('../post-actions-menu', () => ({ PostActionsMenu: () => null }));

const servico = vi.mocked(postsService);

function post(overrides: Partial<Post> = {}): Post {
  return {
    id: 'post-1',
    campaignId: 'camp-1',
    organizationId: 'org-1',
    status: 'PENDING',
    briefing: 'Briefing do post',
    captionFixed: 'Legenda fixa do post',
    scheduledFor: '2026-08-10T15:00:00.000Z',
    createdAt: '2026-08-01T00:00:00.000Z',
    publicationLog: null,
    ...overrides,
  } as Post;
}

const FALHA = {
  outcome: 'FAILED' as const,
  attempts: 2,
  lastError: 'A Meta recusou esta credencial: Session has expired',
  permalink: null,
  publishedAt: null,
};

const SUCESSO = {
  outcome: 'PUBLISHED' as const,
  attempts: 1,
  lastError: null,
  permalink: 'https://www.instagram.com/p/ABC123/',
  publishedAt: '2026-08-10T15:01:00.000Z',
};

/** O card inteiro é um link para o post; é por ele que se confirma presença na aba. */
function cardDoPost(postId: string) {
  return document.querySelector(`a[href$="/posts/${postId}"]`);
}

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/organizations/org-1/campaigns/camp-1/posts']}>
        <Routes>
          <Route path="/organizations/:orgId/campaigns/:id/posts" element={<PostsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/**
 * A publicação é automática: ninguém fica olhando o cron. Estes testes cobrem os
 * dois únicos pontos em que a tela conta o que aconteceu depois do horário
 * agendado — a aba de falhas e o link do post publicado.
 */
describe('PostsPage — resultado da publicação', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servico.getByCampaign.mockResolvedValue([post()]);
  });

  it('post publicado sai de Aprovados e vai para Publicados', async () => {
    // Deixá-lo em Aprovados faria parecer que ainda vai ao ar.
    servico.getByCampaign.mockResolvedValue([
      post({ id: 'post-pub', status: 'PUBLISHED', publicationLog: SUCESSO }),
    ]);
    montar();

    const aprovados = await screen.findByRole('button', { name: /aprovados/i });
    const publicados = screen.getByRole('button', { name: /publicados/i });

    // O contador é um `span` próprio dentro da aba; o texto da aba inteira sai
    // colado ("Publicados1") e não serve para conferir o número.
    expect(within(aprovados).getByText('0')).toBeInTheDocument();
    expect(within(publicados).getByText('1')).toBeInTheDocument();
  });

  it('mostra o link do Instagram no post publicado', async () => {
    servico.getByCampaign.mockResolvedValue([
      post({ id: 'post-pub', status: 'PUBLISHED', publicationLog: SUCESSO }),
    ]);
    montar();

    await userEvent.click(await screen.findByRole('button', { name: /publicados/i }));
    await screen.findByText(/ver no instagram/i);

    // Buscar pelo href: o card inteiro também é um link e o nome acessível dele
    // engloba o texto deste, então por papel/nome os dois casam.
    const link = document.querySelector('a[href^="https://www.instagram.com"]')!;
    expect(link).toHaveAttribute('href', 'https://www.instagram.com/p/ABC123/');
    // Sem `noopener` a aba aberta ganha acesso à janela do SocialFlow.
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('post publicado sem permalink não quebra o card', async () => {
    // A Meta publica e ainda assim pode não devolver o permalink; o post está no
    // ar de qualquer jeito e a tela não pode sumir por causa disso.
    servico.getByCampaign.mockResolvedValue([
      post({ id: 'post-pub', status: 'PUBLISHED', publicationLog: { ...SUCESSO, permalink: null } }),
    ]);
    montar();

    await userEvent.click(await screen.findByRole('button', { name: /publicados/i }));

    expect(await screen.findByText('Publicado')).toBeInTheDocument();
    expect(cardDoPost('post-pub')).toBeInTheDocument();
    expect(screen.queryByText(/ver no instagram/i)).not.toBeInTheDocument();
  });

  describe('falha na publicação', () => {
    beforeEach(() =>
      servico.getByCampaign.mockResolvedValue([
        post({ id: 'post-falho', status: 'FAILED', publicationLog: FALHA }),
      ]),
    );

    it('tem aba própria — é o único estado que exige alguém agir', async () => {
      montar();

      const aba = await screen.findByRole('button', { name: /falhas/i });

      expect(within(aba).getByText('1')).toBeInTheDocument();
    });

    it('mostra o erro da Meta, que é o que diz o que corrigir', async () => {
      montar();

      await userEvent.click(await screen.findByRole('button', { name: /falhas/i }));

      expect(await screen.findByText(/session has expired/i)).toBeInTheDocument();
    });

    it('diz o que fazer para o post voltar à fila', async () => {
      montar();

      await userEvent.click(await screen.findByRole('button', { name: /falhas/i }));

      expect(await screen.findByText(/reenvie a arte/i)).toBeInTheDocument();
    });

    it('não some da tela quando a Meta não deu motivo', async () => {
      // `lastError` nulo já aconteceu em falha de rede. Sem o post na aba, o
      // operador nunca saberia que ele não foi ao ar.
      servico.getByCampaign.mockResolvedValue([
        post({ id: 'post-falho', status: 'FAILED', publicationLog: { ...FALHA, lastError: null } }),
      ]);
      montar();

      await userEvent.click(await screen.findByRole('button', { name: /falhas/i }));

      expect(await screen.findByText(/falha ao publicar/i)).toBeInTheDocument();
      expect(cardDoPost('post-falho')).toBeInTheDocument();
    });
  });
});
