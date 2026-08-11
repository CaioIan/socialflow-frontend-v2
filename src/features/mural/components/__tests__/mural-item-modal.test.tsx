import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MuralItemModal } from '../mural-item-modal';
import { muralService } from '../../api/mural-service';
import { organizationsService } from '@/features/organizations/api/organizations-service';

vi.mock('../../api/mural-service', () => ({
  muralService: {
    criarCard: vi.fn(),
    criarImagem: vi.fn(),
  },
}));

vi.mock('@/features/organizations/api/organizations-service', () => ({
  organizationsService: { getAll: vi.fn() },
}));

vi.mock('@/stores/use-toast-store', () => ({
  useToastStore: () => ({ addToast: vi.fn() }),
}));

function montar(onClose = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    onClose,
    ...render(
      <QueryClientProvider client={client}>
        <MuralItemModal isOpen onClose={onClose} />
      </QueryClientProvider>,
    ),
  };
}

describe('MuralItemModal — badges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(organizationsService.getAll).mockResolvedValue([]);
    vi.mocked(muralService.criarCard).mockResolvedValue({} as never);
  });

  it('adiciona, colore, mostra na prévia e envia a badge', async () => {
    const user = userEvent.setup();
    montar();

    await user.click(screen.getByRole('button', { name: 'Adicionar badge' }));
    await user.type(screen.getByLabelText('Texto da badge 1'), 'Aprovação pendente');
    await user.click(screen.getByRole('button', { name: 'Usar badge cinza' }));
    await user.type(
      screen.getByPlaceholderText(/Nova pauta disponível/i),
      '## Conteúdo aguardando aprovação',
    );

    expect(screen.getByText('Aprovação pendente')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Publicar no mural' }));

    await waitFor(() => expect(muralService.criarCard).toHaveBeenCalled());
    expect(vi.mocked(muralService.criarCard).mock.calls[0][0]).toEqual(
      expect.objectContaining({
        badges: [
          {
            label: 'Aprovação pendente',
            backgroundColor: '#d4d4d8',
            textColor: '#18181b',
          },
        ],
      }),
    );
  });

  it('limita a criação a quatro badges', async () => {
    const user = userEvent.setup();
    montar();

    const adicionar = screen.getByRole('button', { name: 'Adicionar badge' });
    for (let i = 0; i < 4; i += 1) await user.click(adicionar);

    expect(adicionar).toBeDisabled();
    expect(screen.getAllByLabelText(/Texto da badge/)).toHaveLength(4);
  });
});
