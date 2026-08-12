import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MuralCarousel } from '../mural-carousel';
import type { MuralItem } from '../../api/mural-service';

function aviso(id: string, titulo: string): MuralItem {
  return {
    id,
    type: 'CARD',
    organizationId: null,
    organizationName: null,
    organizationLogoUrl: null,
    imageUrl: null,
    markdown: `## ${titulo}`,
    backgroundColor: '#f4f4f5',
    textColor: '#18181b',
    showMoreEnabled: false,
    showMoreBackgroundColor: '#ffffff',
    showMoreTextColor: '#18181b',
    showMoreIconColor: '#18181b',
    installButtonEnabled: false,
    designersOnly: false,
    badges: [],
    createdAt: '2026-08-11T10:00:00.000Z',
  };
}

describe('MuralCarousel', () => {
  it('mantém o card compacto e deixa o próximo aviso parcialmente visível', () => {
    render(
      <MuralCarousel
        itens={[aviso('1', 'Aprovação pendente'), aviso('2', 'Campanha atualizada')]}
        viewerName="Caio Ian"
      />,
    );

    expect(screen.getByRole('heading', { name: 'Mural de Avisos' })).toHaveClass('text-base');
    const saudacao = screen.getByRole('heading', { name: /Caio!/ });
    expect(saudacao).toHaveClass('whitespace-nowrap');
    expect(saudacao.getAttribute('style')).toContain('8vw');
    expect(screen.getByText('Entenda o mural')).toBeInTheDocument();

    const primeiroSlide = screen.getByText('Aprovação pendente').closest('[data-mural-slide]');
    expect(primeiroSlide).toHaveClass('w-[90%]', 'sm:w-[29.5rem]');
    expect(primeiroSlide).not.toHaveClass('w-full');
    expect(primeiroSlide).not.toHaveClass('snap-start');
    expect(primeiroSlide?.parentElement).not.toHaveClass('snap-x', 'snap-mandatory');
  });

  it('abre a explicação do mural', async () => {
    const user = userEvent.setup();
    render(<MuralCarousel itens={[aviso('1', 'Aprovação pendente')]} viewerName="Caio" />);

    await user.click(screen.getByRole('button', { name: 'Entenda o mural' }));

    expect(screen.getByRole('heading', { name: 'Entenda o mural' })).toBeInTheDocument();
    expect(screen.getByText('Avisos globais')).toBeInTheDocument();
    expect(screen.getByText('Avisos da organização')).toBeInTheDocument();
    expect(screen.getByText('Navegação manual')).toBeInTheDocument();
  });

  it('atualiza o indicador ativo quando o usuário desliza o trilho', () => {
    render(
      <MuralCarousel
        itens={[aviso('1', 'Aprovação pendente'), aviso('2', 'Campanha atualizada')]}
        viewerName="Caio"
      />,
    );

    const primeiroSlide = screen.getByText('Aprovação pendente').closest('[data-mural-slide]') as HTMLElement;
    const segundoSlide = screen.getByText('Campanha atualizada').closest('[data-mural-slide]') as HTMLElement;
    const trilho = primeiroSlide.parentElement as HTMLElement;

    vi.spyOn(trilho, 'getBoundingClientRect').mockReturnValue(retangulo(0, 300));
    vi.spyOn(primeiroSlide, 'getBoundingClientRect').mockReturnValue(retangulo(-280, 264));
    vi.spyOn(segundoSlide, 'getBoundingClientRect').mockReturnValue(retangulo(16, 264));

    fireEvent.scroll(trilho);

    expect(screen.getByRole('button', { name: 'Ver aviso 2 de 2' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });
});

function retangulo(left: number, width: number): DOMRect {
  return {
    left,
    width,
    right: left + width,
    top: 0,
    bottom: 0,
    height: 0,
    x: left,
    y: 0,
    toJSON: () => ({}),
  };
}
