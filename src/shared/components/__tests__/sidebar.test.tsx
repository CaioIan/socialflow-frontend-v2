import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../sidebar';
import {
  MENSAGEM_INSTALACAO_INICIADA,
  obterPromptDeInstalacao,
  solicitarInstalacao,
} from '@/shared/lib/pwa-install';

const toast = vi.hoisted(() => ({ addToast: vi.fn() }));

const sessao = {
  user: { id: 'u1', role: 'CLIENT', name: 'João' },
  logout: vi.fn(),
  currentOrganizationId: 'org-1',
  setCurrentOrganization: vi.fn(),
};

vi.mock('@/stores/use-auth-store', () => ({
  useAuthStore: () => sessao,
}));

const perfil: { organizations: Array<{ organizationId: string; name: string; logoUrl: null }> } = {
  organizations: [],
};

vi.mock('@/features/profile/api/use-profile', () => ({
  useProfile: () => ({ data: perfil }),
}));

vi.mock('@/features/auth/api/auth-service', () => ({
  authService: { logout: vi.fn(), selectOrganization: vi.fn() },
}));

vi.mock('@/shared/components/user-avatar', () => ({
  UserAvatar: () => null,
}));

vi.mock('@/shared/lib/pwa-install', () => ({
  MENSAGEM_INSTALACAO_INICIADA:
    'Instalação iniciada. Aguarde o dispositivo concluir a instalação do SocialFlow.',
  observarInstalacao: vi.fn(() => vi.fn()),
  obterPromptDeInstalacao: vi.fn(() => null),
  solicitarInstalacao: vi.fn(),
}));

vi.mock('@/stores/use-toast-store', () => ({
  useToastStore: () => toast,
}));

function montar() {
  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>,
  );
}

function comOrganizacoes(quantas: number) {
  perfil.organizations = Array.from({ length: quantas }, (_, i) => ({
    organizationId: `org-${i + 1}`,
    name: `Empresa ${i + 1}`,
    logoUrl: null,
  }));
}

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessao.user.role = 'CLIENT';
    vi.mocked(obterPromptDeInstalacao).mockReturnValue(null);
  });

  describe('cliente com uma organização só', () => {
    beforeEach(() => comOrganizacoes(1));

    it('mostra "Minha Organização" apontando para a listagem', () => {
      montar();

      expect(screen.getByText('Minha Organização').closest('a')).toHaveAttribute(
        'href',
        '/organizations',
      );
      expect(screen.queryByText('Início')).not.toBeInTheDocument();
    });
  });

  describe('cliente em várias organizações', () => {
    beforeEach(() => comOrganizacoes(2));

    it('troca "Minha Organização" por "Início"', () => {
      // Regressão do relato: com o seletor no lugar de "Minha Organização",
      // sumia o caminho de volta para a lista completa.
      montar();

      expect(screen.getByText('Início')).toBeInTheDocument();
      expect(screen.queryByText('Minha Organização')).not.toBeInTheDocument();
      expect(within(screen.getByRole('navigation')).getAllByRole('link')[0]).toHaveTextContent(
        'Início',
      );
    });

    it('"Início" aponta para a lista de organizações', () => {
      montar();

      expect(screen.getByText('Início').closest('a')).toHaveAttribute('href', '/organizations');
    });
  });

  describe('designer em várias organizações', () => {
    beforeEach(() => {
      sessao.user.role = 'DESIGNER';
      comOrganizacoes(2);
    });

    it('também recebe o "Início" — o problema dele é o mesmo', () => {
      montar();

      expect(screen.getByText('Início')).toBeInTheDocument();
    });

    it('mantém o Início como primeira opção mesmo com uma organização só', () => {
      comOrganizacoes(1);
      montar();

      const links = within(screen.getByRole('navigation')).getAllByRole('link');
      expect(links[0]).toHaveTextContent('Início');
      expect(screen.queryByText('Minha Organização')).not.toBeInTheDocument();
    });

    it('ordena Início, Dashboard e mural e remove o complemento do dashboard', () => {
      montar();
      const links = within(screen.getByRole('navigation')).getAllByRole('link');

      expect(links[0]).toHaveTextContent('Início');
      expect(links[1]).toHaveTextContent('Dashboard');
      expect(links[2]).toHaveTextContent('Mural de Informações');
      expect(screen.queryByText('Dashboard da Designer')).not.toBeInTheDocument();
      expect(screen.queryByText('Minha Organização')).not.toBeInTheDocument();
    });
  });

  describe('instalação do aplicativo', () => {
    it('só mostra a ação quando o navegador oferece a instalação', () => {
      montar();
      expect(screen.queryByRole('button', { name: 'Instalar SocialFlow' })).not.toBeInTheDocument();

      vi.mocked(obterPromptDeInstalacao).mockReturnValue({} as never);
      montar();

      const botao = screen.getByRole('button', { name: 'Instalar SocialFlow' });
      expect(botao).toBeInTheDocument();
      expect(botao).toHaveClass('border-blue-500/35');
      expect(botao.querySelector('.text-brand-gradient')).toHaveTextContent('Instalar SocialFlow');
      expect(
        botao.querySelector('svg[stroke="url(#socialflow-install-gradient)"]'),
      ).toBeInTheDocument();
    });

    it('informa que a instalação começou sem afirmar que já terminou', async () => {
      vi.mocked(obterPromptDeInstalacao)
        .mockReturnValueOnce({} as never)
        .mockReturnValue(null);
      vi.mocked(solicitarInstalacao).mockResolvedValue('accepted');
      montar();

      fireEvent.click(screen.getByRole('button', { name: 'Instalar SocialFlow' }));

      await waitFor(() =>
        expect(toast.addToast).toHaveBeenCalledWith(MENSAGEM_INSTALACAO_INICIADA, 'info'),
      );
    });
  });

  describe('administrador', () => {
    beforeEach(() => {
      sessao.user.role = 'ADMIN';
      comOrganizacoes(2);
    });

    it('vê "Início" apontando para a listagem de organizações', () => {
      montar();

      expect(screen.getByText('Início').closest('a')).toHaveAttribute('href', '/organizations');
      expect(screen.queryByText('Organizações')).not.toBeInTheDocument();
    });

    it('mostra Início no topo e o dashboard logo abaixo', () => {
      montar();
      const links = within(screen.getByRole('navigation')).getAllByRole('link');

      expect(screen.queryByText('Mural de Informações')).not.toBeInTheDocument();
      expect(screen.getByText('Gerenciar mural').closest('a')).toHaveAttribute(
        'href',
        '/mural/gerenciar',
      );
      expect(links[0]).toHaveTextContent('Início');
      expect(links[1]).toHaveTextContent('Dashboard Administrativo');
    });
  });
});
