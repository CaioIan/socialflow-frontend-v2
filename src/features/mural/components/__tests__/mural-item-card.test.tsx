import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MuralItemCard } from '../mural-item-card';
import type { MuralItem } from '../../api/mural-service';

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
    badges: [],
    createdAt: '2026-08-11T10:00:00.000Z',
    ...overrides,
  };
}

describe('MuralItemCard', () => {
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
    expect(vermelha).toHaveClass('rounded-[4px]', 'px-3', 'py-1.5', 'text-xs');

    const marcacoes = screen.getByLabelText('Marcações do aviso');
    const texto = screen.getByText('Aviso importante');
    expect(marcacoes.compareDocumentPosition(texto) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(texto.closest('.aspect-video')).toHaveClass('items-start');
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
