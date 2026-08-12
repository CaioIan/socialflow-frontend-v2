import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MuralItemModal } from '../mural-item-modal';
import { muralService } from '../../api/mural-service';
import { organizationsService } from '@/features/organizations/api/organizations-service';
import type { MuralItem } from '../../api/mural-service';

vi.mock('../../api/mural-service', () => ({
  muralService: {
    criarCard: vi.fn(),
    criarImagem: vi.fn(),
    atualizarCard: vi.fn(),
    atualizarImagem: vi.fn(),
    listarDestinatarios: vi.fn(),
  },
}));

vi.mock('@/features/organizations/api/organizations-service', () => ({
  organizationsService: { getAll: vi.fn() },
}));

vi.mock('@/stores/use-toast-store', () => ({
  useToastStore: () => ({ addToast: vi.fn() }),
}));

function montar(
  onClose = vi.fn(),
  item?: MuralItem & { audienceUserIds: string[] },
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    onClose,
    ...render(
      <QueryClientProvider client={client}>
        <MuralItemModal isOpen onClose={onClose} item={item} />
      </QueryClientProvider>,
    ),
  };
}

describe('MuralItemModal — badges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(organizationsService.getAll).mockResolvedValue([]);
    vi.mocked(muralService.listarDestinatarios).mockResolvedValue([]);
    vi.mocked(muralService.criarCard).mockResolvedValue({} as never);
    vi.mocked(muralService.atualizarCard).mockResolvedValue({} as never);
    vi.mocked(muralService.atualizarImagem).mockResolvedValue({} as never);
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

  it('envia somente os usuários selecionados da organização', async () => {
    vi.mocked(organizationsService.getAll).mockResolvedValue([
      {
        id: 'org-acme',
        name: 'ACME Corporation',
        slug: 'acme-corporation',
        isActive: true,
        logoUrl: null,
        createdAt: '',
        updatedAt: '',
        instagram: null,
      },
    ]);
    vi.mocked(muralService.listarDestinatarios).mockResolvedValue([
      {
        id: 'client-acme',
        email: 'acme@socialflow.test',
        name: 'Cliente ACME',
        role: 'CLIENT',
        avatarUrl: null,
      },
    ]);

    const user = userEvent.setup();
    montar();

    await screen.findByRole('option', { name: 'Somente ACME Corporation' });
    await user.selectOptions(
      screen.getByLabelText('Quem vê este aviso'),
      'org-acme',
    );
    await user.click(await screen.findByLabelText('Selecionar Cliente ACME'));

    expect(muralService.listarDestinatarios).toHaveBeenCalledWith('org-acme');

    await user.type(
      screen.getByPlaceholderText(/Nova pauta disponível/i),
      '## Aprovação disponível',
    );
    await user.click(screen.getByRole('button', { name: 'Publicar no mural' }));

    await waitFor(() =>
      expect(muralService.criarCard).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-acme',
          audienceUserIds: ['client-acme'],
        }),
      ),
    );
  });

  it('carrega os dados atuais e salva a edição de um card', async () => {
    const user = userEvent.setup();
    montar(vi.fn(), {
      id: 'item-1',
      type: 'CARD',
      organizationId: null,
      organizationName: null,
      organizationLogoUrl: null,
      audienceCount: 0,
      imageUrl: null,
      markdown: '## Aviso atual',
      backgroundColor: '#7c3aed',
      textColor: '#ffffff',
      showMoreEnabled: false,
      showMoreBackgroundColor: '#ffffff',
      showMoreTextColor: '#18181b',
      showMoreIconColor: '#18181b',
      badges: [],
      createdAt: '',
      audienceUserIds: [],
    });

    const campo = screen.getByDisplayValue('## Aviso atual');
    await user.clear(campo);
    await user.type(campo, '## Aviso revisado');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() =>
      expect(muralService.atualizarCard).toHaveBeenCalledWith(
        'item-1',
        expect.objectContaining({ markdown: '## Aviso revisado' }),
      ),
    );
    expect(muralService.criarCard).not.toHaveBeenCalled();
  });

  it('permite ativar e personalizar o botão Ver mais antes de publicar', async () => {
    const user = userEvent.setup();
    montar();

    await user.type(screen.getByPlaceholderText(/Nova pauta disponível/i), 'Aviso curto');
    await user.click(screen.getByRole('switch', { name: 'Exibir botão Ver mais' }));

    fireEvent.change(screen.getByLabelText('Cor do botão Ver mais'), {
      target: { value: '#7c3aed' },
    });
    fireEvent.change(screen.getByLabelText('Cor do texto Ver mais'), {
      target: { value: '#ffffff' },
    });
    fireEvent.change(screen.getByLabelText('Cor do ícone Ver mais'), {
      target: { value: '#f59e0b' },
    });

    const previa = screen.getByRole('button', { name: 'Ver mais sobre este aviso' });
    expect(previa).toHaveStyle({ backgroundColor: '#7c3aed', color: '#ffffff' });
    expect(previa.querySelector('svg')).toHaveStyle({ color: '#f59e0b' });

    await user.click(screen.getByRole('button', { name: 'Publicar no mural' }));

    await waitFor(() => expect(muralService.criarCard).toHaveBeenCalled());
    expect(vi.mocked(muralService.criarCard).mock.calls[0][0]).toEqual(
      expect.objectContaining({
        showMoreEnabled: true,
        showMoreBackgroundColor: '#7c3aed',
        showMoreTextColor: '#ffffff',
        showMoreIconColor: '#f59e0b',
      }),
    );
  });

  it('permite editar o destino de uma imagem sem obrigar a trocá-la', async () => {
    const user = userEvent.setup();
    montar(vi.fn(), {
      id: 'image-1',
      type: 'IMAGE',
      organizationId: null,
      organizationName: null,
      organizationLogoUrl: null,
      audienceCount: 0,
      imageUrl: 'https://cdn.test/mural.png',
      markdown: null,
      backgroundColor: null,
      textColor: null,
      showMoreEnabled: false,
      showMoreBackgroundColor: '#ffffff',
      showMoreTextColor: '#18181b',
      showMoreIconColor: '#18181b',
      badges: [],
      createdAt: '',
      audienceUserIds: [],
    });

    expect(screen.getByAltText('Imagem atual do aviso')).toHaveAttribute(
      'src',
      'https://cdn.test/mural.png',
    );
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() =>
      expect(muralService.atualizarImagem).toHaveBeenCalledWith(
        'image-1',
        null,
        null,
        [],
      ),
    );
  });
});
