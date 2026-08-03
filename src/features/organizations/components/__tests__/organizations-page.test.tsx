import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import OrganizationsPage from '../organizations-page';
import { organizationsService } from '../../api/organizations-service';
import type { Organization } from '../../types';

vi.mock('../../api/organizations-service', () => ({
  organizationsService: {
    getAll: vi.fn(),
    deactivate: vi.fn(),
    reactivate: vi.fn(),
  },
}));

vi.mock('@/features/auth/api/auth-service', () => ({
  authService: { selectOrganization: vi.fn().mockResolvedValue({}) },
}));

vi.mock('@/stores/use-auth-store', () => ({
  useAuthStore: () => ({ user: { id: 'u1', role: 'ADMIN' }, setCurrentOrganization: vi.fn() }),
}));

vi.mock('@/stores/use-toast-store', () => ({ useToastStore: () => ({ addToast: vi.fn() }) }));

const servico = vi.mocked(organizationsService);

function org(overrides: Partial<Organization> = {}): Organization {
  return {
    id: 'org-1',
    name: 'Radiogenesis',
    slug: 'radiogenesis',
    isActive: true,
    logoUrl: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    instagram: null,
    ...overrides,
  };
}

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <OrganizationsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('OrganizationsPage', () => {
  beforeEach(() => {
    // Limpar no início, e não só no `afterEach` global: uma invalidação disparada
    // no teste anterior (reativar refaz a busca) pode cair depois que ele acabou
    // e contaminar a contagem de chamadas deste aqui.
    vi.clearAllMocks();
    servico.getAll.mockResolvedValue([org()]);
  });

  describe('situação do Instagram no card', () => {
    it('avisa quando a organização nunca conectou', async () => {
      montar();

      expect(await screen.findByText(/instagram não conectado/i)).toBeInTheDocument();
    });

    it('mostra o @usuário quando está conectada', async () => {
      // O @ do Instagram não é o slug da organização: o card mostra os dois, e
      // usar o mesmo texto nos dois lugares esconderia uma troca entre eles.
      servico.getAll.mockResolvedValue([
        org({ instagram: { status: 'CONNECTED', username: 'radiogenesis.oficial' } }),
      ]);
      montar();

      expect(await screen.findByText('@radiogenesis.oficial')).toBeInTheDocument();
    });

    it('destaca quando a Meta recusou a credencial', async () => {
      // Este é o estado que exige ação: a organização existe, está ativa, e
      // mesmo assim nenhum post dela vai ao ar.
      servico.getAll.mockResolvedValue([
        org({ instagram: { status: 'REVOKED', username: 'radiogenesis' } }),
      ]);
      montar();

      expect(await screen.findByText(/credencial recusada/i)).toBeInTheDocument();
    });

    it('leva para a tela de conexão daquela organização', async () => {
      servico.getAll.mockResolvedValue([org({ id: 'org-42' })]);
      montar();

      const atalho = await screen.findByRole('link', { name: /instagram não conectado/i });

      expect(atalho).toHaveAttribute('href', '/organizations/org-42/instagram');
    });
  });

  describe('organização desativada', () => {
    beforeEach(() => servico.getAll.mockResolvedValue([org({ isActive: false })]));

    it('continua na lista, marcada como desativada', async () => {
      // Regressão: ela sumia da listagem e o endpoint de reativar existia sem
      // nenhum caminho até ele pela interface.
      montar();

      expect(await screen.findByText(/desativada/i)).toBeInTheDocument();
      expect(screen.getByText('Radiogenesis')).toBeInTheDocument();
    });

    it('oferece Reativar no lugar de Desativar', async () => {
      montar();

      expect(await screen.findByRole('button', { name: /reativar/i })).toBeInTheDocument();
      expect(screen.queryByTitle(/desativar organização/i)).not.toBeInTheDocument();
    });

    it('não deixa entrar numa organização fora do ar', async () => {
      montar();
      await screen.findByText(/desativada/i);

      expect(screen.getByText(/fora do ar/i)).toBeInTheDocument();
      expect(screen.queryByText(/entrar na organização/i)).not.toBeInTheDocument();
    });

    it('chama reactivate ao clicar', async () => {
      servico.reactivate.mockResolvedValue(undefined);
      montar();

      await userEvent.click(await screen.findByRole('button', { name: /reativar/i }));

      await waitFor(() => expect(servico.reactivate).toHaveBeenCalled());
      expect(servico.reactivate.mock.calls[0][0]).toBe('org-1');
    });
  });

  it('pede as inativas à API — sem isso a lista de administração fica incompleta', async () => {
    montar();

    await waitFor(() => expect(servico.getAll).toHaveBeenCalled());
    expect(servico.getAll.mock.calls[0][0]).toBe(true);
  });

  it('desativar passa por confirmação antes de derrubar a organização', async () => {
    montar();
    await screen.findByText('Radiogenesis');

    await userEvent.click(screen.getByTitle(/desativar organização/i));

    const dialogo = await screen.findByText(/desativar organização\?/i);
    expect(dialogo).toBeInTheDocument();
    expect(servico.deactivate).not.toHaveBeenCalled();
  });

  it('avisa que quem só trabalhava nela sai junto', async () => {
    // A cascata é a parte que surpreende, e ela é irreversível para quem estiver
    // logado: o aviso precisa vir antes do clique, não no toast depois.
    montar();
    await screen.findByText('Radiogenesis');

    await userEvent.click(screen.getByTitle(/desativar organização/i));
    await screen.findByText(/desativar organização\?/i);

    expect(screen.getByText(/somente nesta organização/i)).toBeInTheDocument();
    expect(screen.getByText(/também.*desativado/i)).toBeInTheDocument();
  });
});
