import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TeamPage from '../team-page';
import { usersService, type UserWithOrgs } from '../../api/users-service';

vi.mock('../../api/users-service', () => ({
  usersService: {
    getAll: vi.fn(),
    create: vi.fn(),
    deactivate: vi.fn(),
    reactivate: vi.fn(),
    linkToOrganization: vi.fn(),
  },
}));

// Os dois modais fazem as próprias buscas; nenhum teste aqui os abre.
vi.mock('../create-user-modal', () => ({ CreateUserModal: () => null }));
vi.mock('../link-organization-modal', () => ({ LinkOrganizationModal: () => null }));

const toasts: Array<{ texto: string; tipo: string }> = [];
vi.mock('@/stores/use-toast-store', () => ({
  useToastStore: () => ({ addToast: (texto: string, tipo: string) => toasts.push({ texto, tipo }) }),
}));

const servico = vi.mocked(usersService);

function usuario(overrides: Partial<UserWithOrgs> = {}): UserWithOrgs {
  return {
    id: 'user-1',
    name: 'Ana Designer',
    email: 'ana@exemplo.com',
    role: 'DESIGNER',
    isActive: true,
    organizations: [],
    ...overrides,
  } as UserWithOrgs;
}

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <TeamPage />
    </QueryClientProvider>,
  );
}

describe('TeamPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toasts.length = 0;
    servico.getAll.mockResolvedValue([usuario()]);
  });

  describe('usuário ativo', () => {
    it('mostra o crachá Ativo ao lado do botão de desativar', async () => {
      montar();

      expect(await screen.findByText('Ativo')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /desativar/i })).toBeInTheDocument();
    });

    it('não desativa sem passar pela confirmação', async () => {
      montar();

      await userEvent.click(await screen.findByRole('button', { name: /desativar/i }));

      expect(await screen.findByText(/desativar usuário\?/i)).toBeInTheDocument();
      expect(servico.deactivate).not.toHaveBeenCalled();
    });

    it('diz que nada é apagado — o histórico assusta mais que o acesso', async () => {
      montar();

      await userEvent.click(await screen.findByRole('button', { name: /desativar/i }));
      await screen.findByText(/desativar usuário\?/i);

      expect(screen.getByText(/nada é apagado/i)).toBeInTheDocument();
    });

    it('chama deactivate com o id só depois de confirmar', async () => {
      servico.deactivate.mockResolvedValue(undefined);
      montar();

      await userEvent.click(await screen.findByRole('button', { name: /desativar/i }));
      const modal = await screen.findByText(/desativar usuário\?/i);
      expect(modal).toBeInTheDocument();

      // O botão do card e o do modal têm o mesmo rótulo; o do modal é o último.
      const confirmar = screen.getAllByRole('button', { name: /^desativar$/i }).at(-1)!;
      await userEvent.click(confirmar);

      await waitFor(() => expect(servico.deactivate).toHaveBeenCalled());
      expect(servico.deactivate.mock.calls[0][0]).toBe('user-1');
    });
  });

  describe('usuário inativo', () => {
    beforeEach(() => servico.getAll.mockResolvedValue([usuario({ isActive: false })]));

    /** Desativado não aparece mais nas abas de papel: mora na aba própria. */
    async function abrirDesativados() {
      await userEvent.click(await screen.findByRole('button', { name: /^desativados$/i }));
    }

    it('some das abas de papel — a lista do dia a dia é só de quem tem acesso', async () => {
      montar();

      expect(await screen.findByText(/nenhum usuário encontrado/i)).toBeInTheDocument();
      expect(screen.queryByText('Ana Designer')).not.toBeInTheDocument();
    });

    it('a aba de desativados pede todos os papéis, não só o da aba anterior', async () => {
      // Um cliente desligado não pode sumir só porque a aba aberta era Designers.
      montar();
      await abrirDesativados();

      await waitFor(() => expect(servico.getAll.mock.calls.at(-1)![0]).toBeUndefined());
    });

    it('mostra por que a pessoa caiu quando foi a organização que a derrubou', async () => {
      servico.getAll.mockResolvedValue([
        usuario({ isActive: false, deactivationCause: 'ORGANIZATION' }),
      ]);
      montar();
      await abrirDesativados();

      expect(await screen.findByText(/caiu junto com a organização/i)).toBeInTheDocument();
    });

    it('o crachá Inativo não é botão — quem age é o Reativar ao lado', async () => {
      // Regressão do relato: clicar no próprio crachá dava erro, porque ele
      // parecia clicável sem ser o controle de verdade.
      montar();
      await abrirDesativados();

      const cracha = await screen.findByText('Inativo');

      expect(cracha.tagName).toBe('SPAN');
      expect(cracha.closest('button')).toBeNull();
      expect(screen.getByRole('button', { name: /reativar/i })).toBeInTheDocument();
    });

    it('reativar não pede confirmação: é a ação que devolve acesso', async () => {
      servico.reactivate.mockResolvedValue(undefined);
      montar();
      await abrirDesativados();

      await userEvent.click(await screen.findByRole('button', { name: /reativar/i }));

      await waitFor(() => expect(servico.reactivate).toHaveBeenCalled());
      expect(servico.reactivate.mock.calls[0][0]).toBe('user-1');
    });

    it('mostra a mensagem da API quando a reativação é recusada', async () => {
      // A API recusa reativar quem caiu junto com a organização enquanto ela
      // continuar desativada. Engolir esse motivo deixaria o admin no escuro.
      servico.reactivate.mockRejectedValue({
        isAxiosError: true,
        response: { data: { message: 'Reative a organização antes de reativar este usuário.' } },
      });
      montar();
      await abrirDesativados();

      await userEvent.click(await screen.findByRole('button', { name: /reativar/i }));

      await waitFor(() => expect(toasts.some((t) => t.tipo === 'error')).toBe(true));
      expect(toasts.at(-1)!.texto).toMatch(/reative a organização antes/i);
    });
  });

  it('a aba escolhida é o que a API recebe', async () => {
    montar();

    // As abas só existem depois que a primeira busca responde: enquanto carrega,
    // a página inteira é substituída pelo estado de loading.
    await screen.findByText('Ana Designer');
    expect(servico.getAll.mock.calls[0][0]).toBe('DESIGNER');

    await userEvent.click(screen.getByRole('button', { name: /clientes/i }));

    await waitFor(() => expect(servico.getAll.mock.calls.at(-1)![0]).toBe('CLIENT'));
  });
});
