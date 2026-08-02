import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CampaignsPage from '../campaigns-page';
import { campaignsService, type Campaign } from '../../api/campaigns-service';

vi.mock('../../api/campaigns-service', () => ({
  campaignsService: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), deleteCampaign: vi.fn() },
}));

vi.mock('@/features/organizations/api/organizations-service', () => ({
  organizationsService: { getById: vi.fn().mockResolvedValue({ id: 'org-1', name: 'Radiogenesis' }) },
}));

vi.mock('@/shared/hooks/use-organization-access', () => ({
  useOrganizationAccess: () => ({ hasAccess: true, isLoading: false, isSyncing: false }),
}));

vi.mock('@/stores/use-auth-store', () => ({
  useAuthStore: () => ({ user: { id: 'u1', role: 'ADMIN' } }),
}));

vi.mock('@/stores/use-toast-store', () => ({ useToastStore: () => ({ addToast: vi.fn() }) }));

vi.mock('../create-campaign-modal', () => ({ CreateCampaignModal: () => null }));

const servico = vi.mocked(campaignsService);

function campanha(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'camp-1',
    organizationId: 'org-1',
    title: 'Campanha Julho',
    referenceYear: 2026,
    referenceMonth: 7,
    postsCount: 12,
    createdAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/organizations/org-1/campaigns']}>
        <Routes>
          <Route path="/organizations/:id/campaigns" element={<CampaignsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/**
 * Excluir campanha é a única ação da aplicação que apaga dados de verdade —
 * leva junto todos os posts, artes, versões e comentários, sem desativação
 * intermediária e sem volta. Os testes abaixo existem para que a trava não
 * afrouxe sem alguém perceber.
 */
describe('CampaignsPage — exclusão', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servico.getAll.mockResolvedValue([campanha()]);
  });

  async function abrirModal() {
    montar();
    await screen.findByText('Campanha Julho');
    await userEvent.click(screen.getByRole('button', { name: /excluir campanha/i }));
    await screen.findByText(/excluir campanha permanentemente\?/i);
  }

  it('não expõe nenhuma forma de desativar campanha', async () => {
    // A decisão foi remover o meio-termo: campanha não tem estado inativo.
    montar();
    await screen.findByText('Campanha Julho');

    expect(screen.queryByText(/desativar/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/arquivad/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^ativa$/i)).not.toBeInTheDocument();
  });

  it('diz quantos posts vão junto antes de qualquer clique', async () => {
    await abrirModal();

    expect(screen.getByText(/todos os 12 posts/i)).toBeInTheDocument();
    expect(screen.getByText(/não pode ser desfeita/i)).toBeInTheDocument();
  });

  it('nasce bloqueada e não chama a API', async () => {
    await abrirModal();

    expect(screen.getByRole('button', { name: /excluir permanentemente/i })).toBeDisabled();
    expect(servico.deleteCampaign).not.toHaveBeenCalled();
  });

  it('só libera com o nome exato da campanha', async () => {
    await abrirModal();

    const campo = screen.getByLabelText(/para confirmar/i);
    const botao = screen.getByRole('button', { name: /excluir permanentemente/i });

    await userEvent.type(campo, 'Campanha');
    expect(botao).toBeDisabled();

    await userEvent.type(campo, ' Julho');
    expect(botao).toBeEnabled();
  });

  it('exclui a campanha certa depois de liberada', async () => {
    servico.deleteCampaign.mockResolvedValue(undefined);
    await abrirModal();

    await userEvent.type(screen.getByLabelText(/para confirmar/i), 'Campanha Julho');
    await userEvent.click(screen.getByRole('button', { name: /excluir permanentemente/i }));

    await waitFor(() => expect(servico.deleteCampaign).toHaveBeenCalled());
    expect(servico.deleteCampaign.mock.calls[0][0]).toBe('camp-1');
  });

  it('a trava acompanha a campanha escolhida, não a primeira da lista', async () => {
    // Se o texto exigido ficasse preso na campanha anterior, o admin liberaria o
    // botão digitando o nome errado e apagaria a campanha errada.
    servico.getAll.mockResolvedValue([
      campanha(),
      campanha({ id: 'camp-2', title: 'Campanha Agosto', postsCount: 3 }),
    ]);
    montar();
    await screen.findByText('Campanha Agosto');

    const excluir = screen.getAllByRole('button', { name: /excluir campanha/i });
    await userEvent.click(excluir[1]);
    await screen.findByText(/excluir campanha permanentemente\?/i);

    await userEvent.type(screen.getByLabelText(/para confirmar/i), 'Campanha Julho');

    expect(screen.getByRole('button', { name: /excluir permanentemente/i })).toBeDisabled();
  });
});
