import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import dashboardService from '../../api/dashboard-service';
import { DesignerDashboardPage } from '../designer-dashboard-page';

vi.mock('../../api/dashboard-service', () => ({
  default: {
    getDesignerOverview: vi.fn(),
    getDesignerPosts: vi.fn(),
  },
}));

vi.mock('@/features/organizations/api/organizations-service', () => ({
  organizationsService: { getAll: vi.fn().mockResolvedValue([]) },
}));

vi.mock('@/stores/use-auth-store', () => ({
  useAuthStore: (selector: (state: { user: { id: string } }) => unknown) =>
    selector({ user: { id: 'designer-1' } }),
}));

function montar() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <DesignerDashboardPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('DesignerDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dashboardService.getDesignerOverview).mockResolvedValue({
      pendingWithoutArt: 5,
      pendingWithArt: 3,
      alterationRequested: 2,
      approved: 8,
    });
    vi.mocked(dashboardService.getDesignerPosts).mockResolvedValue({
      items: [],
      total: 0,
    });
  });

  it('exibe somente as quatro filas da designer', async () => {
    montar();

    expect(await screen.findByRole('heading', { name: 'Dashboard Designer' })).toBeInTheDocument();
    expect(await screen.findByText('Pendentes sem arte')).toBeInTheDocument();
    expect(screen.getByText('Pendentes com Arte')).toBeInTheDocument();
    expect(screen.getByText('Pedidos de Ajuste')).toBeInTheDocument();
    expect(screen.getByText('Artes aprovadas')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.queryByText('Usuários')).not.toBeInTheDocument();

    const indicadores = within(
      screen.getByRole('region', { name: 'Resumo da produção' }),
    ).getAllByRole('button');
    expect(indicadores[0]).toHaveTextContent('Pedidos de Ajuste');
    expect(indicadores[0]).toHaveClass('sm:col-span-2', 'xl:col-span-2');
    expect(within(indicadores[0]).getByText('2')).toHaveClass('text-5xl');
  });

  it('abre a listagem da categoria clicada usando a rota da designer', async () => {
    montar();

    const titulo = await screen.findByText('Pedidos de Ajuste');
    fireEvent.click(titulo.closest('[role="button"]')!);

    await waitFor(() =>
      expect(dashboardService.getDesignerPosts).toHaveBeenCalledWith(
        'ALTERATION_REQUESTED',
        undefined,
        0,
        20,
      ),
    );
  });
});
