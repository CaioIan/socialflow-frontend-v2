import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import InstagramPage from '../instagram-page';
import { instagramService } from '../../api/instagram-service';

vi.mock('../../api/instagram-service', () => ({
  instagramService: { get: vi.fn(), connect: vi.fn(), verify: vi.fn(), disconnect: vi.fn() },
}));

vi.mock('@/features/organizations/api/organizations-service', () => ({
  organizationsService: { getById: vi.fn().mockResolvedValue({ id: 'org-1', name: 'Radiogenesis' }) },
}));

// O hook consulta o token e sincroniza a organização; nos testes ele só precisa
// liberar a tela.
vi.mock('@/shared/hooks/use-organization-access', () => ({
  useOrganizationAccess: () => ({ hasAccess: true, isLoading: false }),
}));

const toasts: Array<{ texto: string; tipo: string }> = [];
vi.mock('@/stores/use-toast-store', () => ({
  useToastStore: () => ({ addToast: (texto: string, tipo: string) => toasts.push({ texto, tipo }) }),
}));

const servico = vi.mocked(instagramService);

const CONTA_CONECTADA = {
  id: 'conta-1',
  organizationId: 'org-1',
  igUserId: '17841409016921092',
  username: 'radiogenesis',
  hasToken: true,
  tokenExpiresAt: null,
  status: 'CONNECTED' as const,
  lastVerifiedAt: '2026-08-01T12:00:00.000Z',
  lastError: null,
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T12:00:00.000Z',
};

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/organizations/org-1/instagram']}>
        <Routes>
          <Route path="/organizations/:id/instagram" element={<InstagramPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('InstagramPage', () => {
  beforeEach(() => {
    toasts.length = 0;
    servico.get.mockResolvedValue(null);
  });

  it('mostra o estado vazio quando não há conta', async () => {
    montar();

    expect(await screen.findByText(/nenhuma conta conectada/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /conectar conta/i })).toBeInTheDocument();
  });

  it('mantém o botão desabilitado enquanto faltar campo', async () => {
    montar();
    await screen.findByText(/nenhuma conta conectada/i);

    const botao = screen.getByRole('button', { name: /conectar conta/i });
    expect(botao).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/ig user id/i), '17841409016921092');
    expect(botao).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/token de acesso/i), 'EAAtokenDeTeste');
    expect(botao).toBeEnabled();
  });

  it('envia os dois campos ao conectar', async () => {
    servico.connect.mockResolvedValue({ ...CONTA_CONECTADA });
    montar();
    await screen.findByText(/nenhuma conta conectada/i);

    await userEvent.type(screen.getByLabelText(/ig user id/i), '17841409016921092');
    await userEvent.type(screen.getByLabelText(/token de acesso/i), 'EAAtokenDeTeste');
    await userEvent.click(screen.getByRole('button', { name: /conectar conta/i }));

    // Asserção no primeiro argumento, e não em `toHaveBeenCalledWith`: o React
    // Query passa um objeto de contexto como segundo argumento do mutationFn,
    // então comparar a chamada inteira falha por aridade.
    await waitFor(() => expect(servico.connect).toHaveBeenCalled());

    expect(servico.connect.mock.calls[0][0]).toEqual({
      igUserId: '17841409016921092',
      accessToken: 'EAAtokenDeTeste',
    });
  });

  it('mostra a mensagem da Meta quando ela recusa a credencial', async () => {
    // O erro da Meta é o que diz o que corrigir; engoli-lo deixaria o operador
    // sem saber por que não conectou.
    servico.connect.mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'A Meta recusou esta credencial: Malformed access token' } },
    });
    montar();
    await screen.findByText(/nenhuma conta conectada/i);

    await userEvent.type(screen.getByLabelText(/ig user id/i), '17841409016921092');
    await userEvent.type(screen.getByLabelText(/token de acesso/i), 'EAAinvalido');
    await userEvent.click(screen.getByRole('button', { name: /conectar conta/i }));

    await waitFor(() => expect(toasts.some((t) => t.tipo === 'error')).toBe(true));
  });

  describe('conta conectada', () => {
    beforeEach(() => servico.get.mockResolvedValue({ ...CONTA_CONECTADA }));

    it('exibe o @usuário e o IG User ID', async () => {
      montar();

      expect(await screen.findByText('@radiogenesis')).toBeInTheDocument();
      expect(screen.getByText(/17841409016921092/)).toBeInTheDocument();
    });

    it('nunca mostra o token na tela', async () => {
      // A API devolve só `hasToken`. Se algum dia o campo voltar na resposta,
      // este teste é o que impede ele de aparecer para o operador.
      montar();
      await screen.findByText('@radiogenesis');

      expect(document.body.textContent).not.toMatch(/EAA[A-Za-z0-9]{6,}/);
      expect(document.body.textContent).not.toMatch(/accessToken/i);
    });

    it('o formulário vira "Substituir credencial"', async () => {
      montar();

      expect(await screen.findByRole('button', { name: /substituir credencial/i })).toBeInTheDocument();
    });

    it('avisa quando a Meta recusou, mesmo com a checagem tendo funcionado', async () => {
      servico.get.mockResolvedValue({
        ...CONTA_CONECTADA,
        status: 'REVOKED',
        lastError: 'Error validating access token: Session has expired',
      });
      montar();

      expect(await screen.findByText(/credencial recusada/i)).toBeInTheDocument();
      expect(screen.getByText(/session has expired/i)).toBeInTheDocument();
      expect(screen.getByText(/publicação automática desta organização está parada/i)).toBeInTheDocument();
    });

    it('testar conexão avisa por toast de erro quando a Meta recusa', async () => {
      // O endpoint responde 200 mesmo recusando: a checagem rodou, o veredito é
      // que o token caiu. Sem olhar o `status`, a tela diria "tudo certo".
      servico.verify.mockResolvedValue({
        ...CONTA_CONECTADA,
        status: 'REVOKED',
        lastError: 'token expirado',
      });
      montar();
      await screen.findByText('@radiogenesis');

      await userEvent.click(screen.getByRole('button', { name: /testar conexão/i }));

      await waitFor(() => expect(toasts.some((t) => t.tipo === 'error')).toBe(true));
    });

    it('desconectar pede confirmação antes de apagar a credencial', async () => {
      montar();
      await screen.findByText('@radiogenesis');

      await userEvent.click(screen.getByRole('button', { name: /^desconectar$/i }));

      expect(await screen.findByText(/desconectar instagram/i)).toBeInTheDocument();
      expect(servico.disconnect).not.toHaveBeenCalled();
    });
  });
});
