import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ativarPush,
  buscarChavePublicaPush,
  navegadorSuportaPush,
  obterInscricaoPush,
} from '@/shared/lib/push-notifications';
import { PushNotificationControl } from '../push-notification-control';

vi.mock('@/shared/lib/pwa-install', () => ({
  ehIos: vi.fn(() => false),
  estaEmModoAplicativo: vi.fn(() => false),
  observarInstalacao: vi.fn(() => vi.fn()),
  obterPromptDeInstalacao: vi.fn(() => null),
  solicitarInstalacao: vi.fn(),
}));

vi.mock('@/shared/lib/push-notifications', () => ({
  ativarPush: vi.fn(),
  buscarChavePublicaPush: vi.fn(),
  navegadorSuportaPush: vi.fn(),
  obterInscricaoPush: vi.fn(),
  removerPushNesteDispositivo: vi.fn(),
}));

vi.mock('@/stores/use-toast-store', () => ({
  useToastStore: () => ({ addToast: vi.fn() }),
}));

describe('PushNotificationControl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('Notification', { permission: 'default' });
    vi.mocked(navegadorSuportaPush).mockReturnValue(true);
    vi.mocked(buscarChavePublicaPush).mockResolvedValue('chave-publica');
    vi.mocked(obterInscricaoPush).mockResolvedValue(null);
    vi.mocked(ativarPush).mockResolvedValue({} as PushSubscription);
  });

  it('explica a permissão antes de abrir a solicitação nativa', async () => {
    render(<PushNotificationControl />);

    const switchPush = await screen.findByRole('switch', {
      name: 'Receber avisos push neste dispositivo',
    });
    await waitFor(() => expect(switchPush).toBeEnabled());
    vi.mocked(ativarPush).mockClear();

    fireEvent.click(switchPush);

    expect(screen.getByText('Permita as notificações')).toBeInTheDocument();
    expect(screen.getByText('Permitir')).toBeInTheDocument();
    expect(ativarPush).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Continuar e permitir' }));

    await waitFor(() => expect(ativarPush).toHaveBeenCalledWith('chave-publica'));
  });
});
