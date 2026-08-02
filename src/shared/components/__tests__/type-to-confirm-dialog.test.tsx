import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TypeToConfirmDialog } from '../type-to-confirm-dialog';

/**
 * Este modal é a única coisa entre um clique e a perda permanente de uma
 * campanha com todos os posts, artes e histórico dela. Os testes aqui existem
 * para que um refactor não afrouxe a trava sem alguém perceber.
 */
function montar(props: Partial<React.ComponentProps<typeof TypeToConfirmDialog>> = {}) {
  const onConfirm = vi.fn();
  const onClose = vi.fn();

  const utils = render(
    <TypeToConfirmDialog
      isOpen
      onClose={onClose}
      onConfirm={onConfirm}
      title="Excluir campanha permanentemente?"
      description="Isso não pode ser desfeito."
      confirmationText="Campanha Julho"
      confirmLabel="Excluir Permanentemente"
      {...props}
    />,
  );

  return {
    ...utils,
    onConfirm,
    onClose,
    botao: () => screen.getByRole('button', { name: /excluir permanentemente/i }),
    campo: () => screen.getByLabelText(/para confirmar/i),
  };
}

describe('TypeToConfirmDialog', () => {
  it('não renderiza nada quando fechado', () => {
    montar({ isOpen: false });

    expect(screen.queryByText(/excluir campanha/i)).not.toBeInTheDocument();
  });

  it('nasce com o botão bloqueado', () => {
    const { botao } = montar();

    expect(botao()).toBeDisabled();
  });

  it('mantém bloqueado com o nome incompleto', async () => {
    const { botao, campo } = montar();

    await userEvent.type(campo(), 'Campanha Jul');

    expect(botao()).toBeDisabled();
  });

  it('mantém bloqueado quando a caixa das letras não confere', async () => {
    // Exigir o nome exato é o ponto: "campanha julho" não é a mesma coisa.
    const { botao, campo } = montar();

    await userEvent.type(campo(), 'campanha julho');

    expect(botao()).toBeDisabled();
  });

  it('libera com o nome exato', async () => {
    const { botao, campo } = montar();

    await userEvent.type(campo(), 'Campanha Julho');

    expect(botao()).toBeEnabled();
  });

  it('tolera espaço sobrando nas pontas', async () => {
    const { botao, campo } = montar();

    await userEvent.type(campo(), '  Campanha Julho  ');

    expect(botao()).toBeEnabled();
  });

  it('só chama onConfirm depois de liberado', async () => {
    const { botao, campo, onConfirm } = montar();

    await userEvent.click(botao());
    expect(onConfirm).not.toHaveBeenCalled();

    await userEvent.type(campo(), 'Campanha Julho');
    await userEvent.click(botao());

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('confirma com Enter, mas só com o nome correto', async () => {
    const { campo, onConfirm } = montar();

    await userEvent.type(campo(), 'errado{Enter}');
    expect(onConfirm).not.toHaveBeenCalled();

    await userEvent.clear(campo());
    await userEvent.type(campo(), 'Campanha Julho{Enter}');
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('esquece o texto digitado ao trocar de alvo', async () => {
    // Regressão: reabrir para outra campanha herdando o texto anterior faria o
    // botão nascer liberado para excluir a coisa errada.
    const { campo, botao, rerender } = montar();

    await userEvent.type(campo(), 'Campanha Julho');
    expect(botao()).toBeEnabled();

    rerender(
      <TypeToConfirmDialog
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Excluir campanha permanentemente?"
        description="Isso não pode ser desfeito."
        confirmationText="Campanha Agosto"
        confirmLabel="Excluir Permanentemente"
      />,
    );

    expect(botao()).toBeDisabled();
    expect(screen.getByLabelText(/para confirmar/i)).toHaveValue('');
  });

  it('bloqueia o botão enquanto a exclusão está em andamento', async () => {
    const { campo, rerender } = montar();

    await userEvent.type(campo(), 'Campanha Julho');

    rerender(
      <TypeToConfirmDialog
        isOpen
        isConfirming
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Excluir campanha permanentemente?"
        description="Isso não pode ser desfeito."
        confirmationText="Campanha Julho"
        confirmLabel="Excluir Permanentemente"
        confirmingLabel="Excluindo..."
      />,
    );

    expect(screen.getByRole('button', { name: /excluindo/i })).toBeDisabled();
  });

  it('não deixa fechar no meio da exclusão', async () => {
    const onClose = vi.fn();

    render(
      <TypeToConfirmDialog
        isOpen
        isConfirming
        onClose={onClose}
        onConfirm={vi.fn()}
        title="Excluir campanha permanentemente?"
        description="Isso não pode ser desfeito."
        confirmationText="Campanha Julho"
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('mostra ao operador exatamente o que precisa digitar', () => {
    montar();

    expect(screen.getByText('Campanha Julho')).toBeInTheDocument();
  });
});
