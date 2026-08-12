import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MuralItemCard } from '../mural-item-card';
import type { MuralItem } from '../../api/mural-service';
import {
  MENSAGEM_INSTALACAO_INICIADA,
  solicitarInstalacao,
} from '@/shared/lib/pwa-install';

const toast = vi.hoisted(() => ({ addToast: vi.fn() }));

vi.mock('@/shared/lib/pwa-install', () => ({
  ehIos: vi.fn(() => false),
  estaEmModoAplicativo: vi.fn(() => false),
  MENSAGEM_INSTALACAO_INICIADA:
    'Instalação iniciada. Aguarde o dispositivo concluir a instalação do SocialFlow.',
  observarInstalacao: vi.fn(() => vi.fn()),
  solicitarInstalacao: vi.fn(),
}));

vi.mock('@/stores/use-toast-store', () => ({
  useToastStore: () => toast,
}));

function aviso(overrides: Partial<MuralItem> = {}): MuralItem {
  return {
    id: 'aviso-1',
    type: 'CARD',
    organizationId: 'org-1',
    organizationName: 'Radiogenesis',
    organizationLogoUrl: 'https://cdn.example.com/radiogenesis.png',
    imageUrl: null,
    markdown: 'Aviso importante',
    backgroundColor: '#18181b',
    textColor: '#ffffff',
    showMoreEnabled: false,
    showMoreBackgroundColor: '#ffffff',
    showMoreTextColor: '#18181b',
    showMoreIconColor: '#18181b',
    installButtonEnabled: false,
    designersOnly: false,
    badges: [],
    createdAt: '2026-08-11T10:00:00.000Z',
    ...overrides,
  };
}

describe('MuralItemCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(solicitarInstalacao).mockResolvedValue('dismissed');
  });

  it('identifica a organização com nome e logo quando há múltiplos escopos', () => {
    const { container } = render(<MuralItemCard item={aviso()} showOrganizationBadge />);

    const origem = screen.getByLabelText('Aviso da organização Radiogenesis');
    expect(origem).toBeInTheDocument();
    expect(origem).toHaveClass('bottom-2', 'right-2', 'rounded-md');
    expect(screen.getByText('Radiogenesis')).toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://cdn.example.com/radiogenesis.png',
    );
  });

  it('mantém a origem global visível e usa a marca do SocialFlow', () => {
    const { container } = render(
      <MuralItemCard
        item={aviso({
          organizationId: null,
          organizationName: null,
          organizationLogoUrl: null,
        })}
      />,
    );

    expect(screen.getByLabelText('Aviso global do SocialFlow')).toBeInTheDocument();
    expect(screen.getByText('SocialFlow · Global')).toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute('src', '/favicon.png');
  });

  it('indica quando o aviso está restrito a pessoas específicas', () => {
    render(
      <MuralItemCard
        item={aviso({ audienceCount: 1 })}
        showOrganizationBadge
      />,
    );

    expect(screen.getByText('Radiogenesis · 1 pessoa')).toBeInTheDocument();
  });

  it('não adiciona badge redundante para quem tem uma única organização', () => {
    render(<MuralItemCard item={aviso()} />);

    expect(screen.queryByLabelText(/aviso da organização/i)).not.toBeInTheDocument();
  });

  it('exibe as badges do conteúdo antes do texto e preserva as cores escolhidas', () => {
    render(
      <MuralItemCard
        item={aviso({
          badges: [
            { label: 'Aprovação pendente', backgroundColor: '#dc2626', textColor: '#ffffff' },
            { label: 'Publica hoje', backgroundColor: '#d4d4d8', textColor: '#18181b' },
          ],
        })}
      />,
    );

    const vermelha = screen.getByText('Aprovação pendente').parentElement;
    const cinza = screen.getByText('Publica hoje').parentElement;

    expect(vermelha).toHaveStyle({ backgroundColor: '#dc2626', color: '#ffffff' });
    expect(cinza).toHaveStyle({ backgroundColor: '#d4d4d8', color: '#18181b' });
    expect(vermelha).toHaveClass('rounded-[4px]', 'px-2.5', 'py-1', 'text-[11px]');
    expect(vermelha).toHaveClass('sm:text-xs');

    const marcacoes = screen.getByLabelText('Marcações do aviso');
    const texto = screen.getByText('Aviso importante');
    expect(texto).toHaveClass('text-xs', 'leading-[1.5]', 'sm:text-sm', 'sm:leading-[1.55]');
    expect(marcacoes.compareDocumentPosition(texto) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Abrir aviso completo' }).parentElement).toHaveClass(
      'items-start',
      'aspect-[3/2]',
    );
  });

  it('abre o aviso completo ao tocar no card de texto', async () => {
    const user = userEvent.setup();
    render(
      <MuralItemCard
        item={aviso({
          markdown:
            '# Ajuste aprovado\n\nA nova versão da arte já está disponível para revisão no SocialFlow.',
          badges: [
            { label: 'Aprovação', backgroundColor: '#dc2626', textColor: '#ffffff' },
          ],
        })}
        showOrganizationBadge
      />,
    );

    expect(screen.getByRole('heading', { name: 'Ajuste aprovado' })).toHaveClass(
      'text-[17px]',
      'sm:text-lg',
    );

    await user.click(screen.getByRole('button', { name: 'Abrir aviso completo' }));

    expect(screen.getByRole('heading', { name: 'Aviso do mural' })).toBeInTheDocument();
    expect(screen.getAllByText('Ajuste aprovado')).toHaveLength(2);
    expect(
      screen.getAllByText(
        'A nova versão da arte já está disponível para revisão no SocialFlow.',
      ),
    ).toHaveLength(2);
    expect(screen.getByText(/Publicado em/)).toBeInTheDocument();
  });

  it('mantém o card e o botão Ver mais abrindo o aviso completo', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <MuralItemCard
        item={aviso({
          markdown: 'Aviso curto',
          showMoreEnabled: true,
          showMoreBackgroundColor: '#7c3aed',
          showMoreTextColor: '#ffffff',
          showMoreIconColor: '#f59e0b',
        })}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Abrir aviso completo' }));

    expect(screen.getByRole('heading', { name: 'Aviso do mural' })).toBeInTheDocument();

    rerender(
      <MuralItemCard
        item={aviso({
          markdown: 'Aviso curto',
          showMoreEnabled: true,
          showMoreBackgroundColor: '#7c3aed',
          showMoreTextColor: '#ffffff',
          showMoreIconColor: '#f59e0b',
        })}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Fechar' }));

    const botao = screen.getByRole('button', { name: 'Ver mais sobre este aviso' });
    expect(botao).toHaveStyle({ backgroundColor: '#7c3aed', color: '#ffffff' });
    expect(botao.querySelector('svg')).toHaveStyle({ color: '#f59e0b' });

    await user.click(botao);

    expect(screen.getByRole('heading', { name: 'Aviso do mural' })).toBeInTheDocument();
    expect(screen.getAllByText('Aviso curto')).toHaveLength(2);
  });

  it('limita o resumo completo do card e exibe três pontos quando o conteúdo excede', async () => {
    const scrollHeight = vi
      .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
      .mockReturnValue(220);
    const clientHeight = vi
      .spyOn(HTMLElement.prototype, 'clientHeight', 'get')
      .mockReturnValue(100);

    try {
      render(
        <MuralItemCard
          item={aviso({
            markdown:
              '# Nova atualização: notificações\n\nAgora você pode receber avisos por **e-mail e push**.\n\n## Avisos por e-mail\n\nAbra o menu lateral para configurar.',
          })}
        />,
      );

      const resumo = document.querySelector('[data-mural-markdown="resumo"]');
      expect(resumo).toHaveClass('max-h-[6.5rem]', 'overflow-hidden');
      expect(resumo).not.toHaveClass('sm:max-h-[7.5rem]');
      expect(await screen.findByTestId('mural-summary-ellipsis')).toHaveTextContent('...');
    } finally {
      scrollHeight.mockRestore();
      clientHeight.mockRestore();
    }
  });

  it('instala o SocialFlow pelo botão fixo no gradiente da marca', async () => {
    vi.mocked(solicitarInstalacao).mockResolvedValue('accepted');
    const user = userEvent.setup();
    render(<MuralItemCard item={aviso({ installButtonEnabled: true })} />);

    const botao = screen.getByRole('button', { name: 'Instalar SocialFlow' });
    expect(botao).toHaveClass('bg-brand-gradient', 'text-white');

    await user.click(botao);

    expect(solicitarInstalacao).toHaveBeenCalledOnce();
    expect(toast.addToast).toHaveBeenCalledWith(MENSAGEM_INSTALACAO_INICIADA, 'info');
  });

  it('orienta a instalação manual quando o navegador não oferece o prompt nativo', async () => {
    vi.mocked(solicitarInstalacao).mockResolvedValue('unavailable');
    const user = userEvent.setup();
    render(<MuralItemCard item={aviso({ installButtonEnabled: true })} />);

    await user.click(screen.getByRole('button', { name: 'Instalar SocialFlow' }));

    expect(screen.getByRole('heading', { name: 'Instale o SocialFlow' })).toBeInTheDocument();
    expect(screen.getByText(/Instalar aplicativo/)).toBeInTheDocument();
  });

  it('quebra sequências longas e mantém scroll de contingência no modal', async () => {
    const user = userEvent.setup();
    const palavraSemEspacos = 'sfjaisldaksjldkjxoifejlksdlfksjldkiljsjifoelksdjlfjolejifsl'.repeat(4);
    render(<MuralItemCard item={aviso({ markdown: palavraSemEspacos })} />);

    await user.click(screen.getByRole('button', { name: 'Abrir aviso completo' }));

    const markdownCompleto = document.querySelector('[data-mural-markdown="completo"]');
    expect(markdownCompleto).toHaveClass(
      'min-w-0',
      'max-w-full',
      'break-words',
      '[overflow-wrap:anywhere]',
    );
    expect(screen.getByTestId('modal-scroll-area')).toHaveClass(
      'min-w-0',
      'overflow-auto',
      'overscroll-contain',
    );
  });

  it('abre a imagem do aviso em tamanho maior ao clicar', async () => {
    const user = userEvent.setup();
    render(
      <MuralItemCard
        item={aviso({
          type: 'IMAGE',
          imageUrl: 'https://cdn.example.com/aviso.png',
          markdown: null,
        })}
        showOrganizationBadge
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Ampliar imagem do aviso' }));

    expect(screen.getByRole('heading', { name: 'Imagem do mural' })).toBeInTheDocument();
    expect(screen.getByAltText('Imagem do aviso da organização Radiogenesis')).toHaveAttribute(
      'src',
      'https://cdn.example.com/aviso.png',
    );
  });
});
