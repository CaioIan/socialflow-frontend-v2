import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { profileService } from '../../api/profile-service';
import ProfilePage from '../profile-page';

vi.mock('../../api/profile-service', () => ({
  profileService: {
    get: vi.fn(),
    definirNotificacoes: vi.fn(),
    uploadAvatar: vi.fn(),
    removeAvatar: vi.fn(),
  },
}));

vi.mock('@/stores/use-toast-store', () => ({
  useToastStore: () => ({ addToast: vi.fn() }),
}));

vi.mock('@/stores/use-auth-store', () => ({
  useAuthStore: () => ({ user: { id: 'user-1' }, setUser: vi.fn() }),
}));

vi.mock('../push-notification-control', () => ({ PushNotificationControl: () => null }));
vi.mock('../avatar-crop-modal', () => ({ AvatarCropModal: () => null }));

describe('avisos por e-mail no perfil', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(profileService.get).mockResolvedValue({
      id: 'user-1',
      name: 'Cliente',
      email: 'cliente@socialflow.test',
      role: 'CLIENT',
      avatarUrl: null,
      emailNotifications: true,
      createdAt: '',
      organizations: [],
    });
  });

  it('começa ligado e acompanha o toque imediatamente', async () => {
    let concluir!: () => void;
    vi.mocked(profileService.definirNotificacoes).mockImplementation(
      () => new Promise<void>((resolve) => { concluir = resolve; }),
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <ProfilePage />
      </QueryClientProvider>,
    );

    const switchEmail = await screen.findByRole('switch', {
      name: 'Receber avisos por e-mail',
    });
    expect(switchEmail).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(switchEmail);

    await waitFor(() => expect(switchEmail).toHaveAttribute('aria-checked', 'false'));
    expect(vi.mocked(profileService.definirNotificacoes).mock.calls[0][0]).toBe(false);
    concluir();
  });
});
