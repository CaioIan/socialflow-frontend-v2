import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '@/api/axios';
import { instagramService } from '../instagram-service';

vi.mock('@/api/axios', () => ({
  default: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const mockado = vi.mocked(api);

describe('instagramService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('get', () => {
    it('devolve null quando a organização nunca conectou', async () => {
      // A API responde 200 com corpo vazio nesse caso — "não conectado" é um
      // estado normal da tela, não um erro. Sem o `|| null`, o corpo vazio
      // viraria string e a tela acharia que existe conta.
      mockado.get.mockResolvedValue({ data: '' });

      await expect(instagramService.get()).resolves.toBeNull();
    });

    it('devolve a conta quando existe', async () => {
      mockado.get.mockResolvedValue({
        data: { id: 'c1', username: 'radiogenesis', hasToken: true, status: 'CONNECTED' },
      });

      const conta = await instagramService.get();

      expect(conta).toMatchObject({ username: 'radiogenesis', status: 'CONNECTED' });
      expect(mockado.get).toHaveBeenCalledWith('/instagram');
    });
  });

  it('connect envia igUserId e token para PUT /instagram', async () => {
    mockado.put.mockResolvedValue({ data: { id: 'c1' } });

    await instagramService.connect({ igUserId: '17841409016921092', accessToken: 'EAAxyz' });

    expect(mockado.put).toHaveBeenCalledWith('/instagram', {
      igUserId: '17841409016921092',
      accessToken: 'EAAxyz',
    });
  });

  it('verify usa POST, não GET — a checagem grava o veredito', async () => {
    mockado.post.mockResolvedValue({ data: { status: 'REVOKED', lastError: 'token expirado' } });

    const resultado = await instagramService.verify();

    expect(mockado.post).toHaveBeenCalledWith('/instagram/verify');
    expect(resultado.status).toBe('REVOKED');
  });

  it('disconnect chama DELETE e não espera corpo', async () => {
    mockado.delete.mockResolvedValue({ status: 204 });

    await expect(instagramService.disconnect()).resolves.toBeUndefined();
    expect(mockado.delete).toHaveBeenCalledWith('/instagram');
  });
});
