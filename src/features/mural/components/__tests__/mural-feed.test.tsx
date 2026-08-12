import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/use-auth-store';
import type { MuralItem } from '../../api/mural-service';
import { muralService } from '../../api/mural-service';
import { MuralFeed } from '../mural-feed';

vi.mock('../../api/mural-service', () => ({
  muralService: { listar: vi.fn() },
}));

const avisoDirecionado: MuralItem = {
  id: 'aviso-client',
  type: 'CARD',
  organizationId: 'org-1',
  organizationName: 'Radiogenesis',
  organizationLogoUrl: 'https://cdn.example.com/radiogenesis.png',
  imageUrl: null,
  markdown: 'Cronograma atualizado',
  backgroundColor: '#18181b',
  textColor: '#ffffff',
  badges: [],
  createdAt: '2026-08-11T10:00:00.000Z',
};

describe('MuralFeed', () => {
  afterEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, organizations: [] });
  });

  it('mostra a organização do aviso para CLIENT mesmo sem organizações no estado persistido', () => {
    useAuthStore.setState({
      user: {
        id: 'client-1',
        email: 'client@socialflow.test',
        name: 'Cliente',
        role: 'CLIENT',
        isActive: true,
      },
      organizations: [],
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    queryClient.setQueryData(['mural', 'client-1'], [avisoDirecionado]);

    render(
      <QueryClientProvider client={queryClient}>
        <MuralFeed />
      </QueryClientProvider>,
    );

    const badge = screen.getByLabelText('Aviso da organização Radiogenesis');
    expect(badge).toBeInTheDocument();
    expect(screen.getByText('Radiogenesis')).toBeInTheDocument();
    expect(badge.querySelector('img')).toHaveAttribute(
      'src',
      'https://cdn.example.com/radiogenesis.png',
    );
  });

  it('não reaproveita avisos guardados para outra conta', async () => {
    useAuthStore.setState({
      user: {
        id: 'client-tech',
        email: 'tech@socialflow.test',
        name: 'Cliente Tech',
        role: 'CLIENT',
        isActive: true,
      },
      organizations: [],
    });
    vi.mocked(muralService.listar).mockResolvedValue([]);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(['mural', 'admin-1'], [avisoDirecionado]);

    render(
      <QueryClientProvider client={queryClient}>
        <MuralFeed />
      </QueryClientProvider>,
    );

    expect(screen.queryByText('Cronograma atualizado')).not.toBeInTheDocument();
    await waitFor(() => expect(muralService.listar).toHaveBeenCalledOnce());
  });
});
