import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from '../../api/auth-service';
import type { User } from '../../types';
import LoginPage from '../login-page';

vi.mock('../../api/auth-service', () => ({
  authService: { login: vi.fn() },
}));

vi.mock('@/stores/use-toast-store', () => ({
  useToastStore: () => ({ addToast: vi.fn() }),
}));

describe('LoginPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each<User['role']>(['ADMIN', 'DESIGNER', 'CLIENT'])(
    'leva %s para a tela de início após um login comum',
    async (role) => {
      vi.mocked(authService.login).mockResolvedValue({
        user: {
          id: `user-${role.toLowerCase()}`,
          email: `${role.toLowerCase()}@socialflow.test`,
          name: 'Pessoa de teste',
          role,
          isActive: true,
        },
        organizations: [],
      });
      const user = userEvent.setup();
      const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/organizations" element={<div>Tela de início</div>} />
              <Route path="/mural" element={<div>Tela do mural</div>} />
              <Route path="/mural/gerenciar" element={<div>Gerenciar mural</div>} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );

      await user.type(screen.getByPlaceholderText('exemplo@socialflow.com.br'), 'teste@socialflow.test');
      await user.type(screen.getByPlaceholderText('••••••••'), 'senha123');
      await user.click(screen.getByRole('button', { name: 'Entrar na Plataforma' }));

      expect(await screen.findByText('Tela de início')).toBeInTheDocument();
      expect(screen.queryByText('Tela do mural')).not.toBeInTheDocument();
    },
  );
});
