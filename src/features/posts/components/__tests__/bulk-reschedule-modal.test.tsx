import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkRescheduleModal } from '../bulk-reschedule-modal';

function montar(props: Partial<React.ComponentProps<typeof BulkRescheduleModal>> = {}) {
  const onConfirm = vi.fn();
  const onClose = vi.fn();

  const utils = render(
    <BulkRescheduleModal
      isOpen
      onClose={onClose}
      onConfirm={onConfirm}
      quantidade={3}
      {...props}
    />,
  );

  return {
    ...utils,
    onConfirm,
    onClose,
    campo: () => screen.getByLabelText(/novo horário/i),
    botao: () => screen.getByRole('button', { name: /^alterar horário$/i }),
  };
}

describe('BulkRescheduleModal', () => {
  it('deixa claro que a data de cada post é preservada', () => {
    // É a diferença entre "todos passam a sair às 18h" e "todos saem juntos".
    montar();

    expect(screen.getByText(/a data de cada um é mantida/i)).toBeInTheDocument();
  });

  it('mostra quantos posts serão afetados', () => {
    montar({ quantidade: 7 });

    expect(screen.getByText(/7 posts/i)).toBeInTheDocument();
  });

  it('concorda no singular', () => {
    montar({ quantidade: 1 });

    expect(screen.getByText(/1 post$/i)).toBeInTheDocument();
    expect(screen.getByText(/passa a sair/i)).toBeInTheDocument();
  });

  it('nasce bloqueado, sem horário digitado', () => {
    const { botao } = montar();

    expect(botao()).toBeDisabled();
  });

  it('libera com um horário válido', async () => {
    const { botao, campo } = montar();

    await userEvent.type(campo(), '18:30');

    expect(botao()).toBeEnabled();
  });

  it('envia hora e minuto separados, como a API espera', async () => {
    const { botao, campo, onConfirm } = montar();

    await userEvent.type(campo(), '09:05');
    await userEvent.click(botao());

    expect(onConfirm).toHaveBeenCalledWith(9, 5);
  });

  it('meia-noite é horário válido', async () => {
    // `00:00` é falsy em várias checagens ingênuas; aqui precisa passar.
    const { botao, campo, onConfirm } = montar();

    await userEvent.type(campo(), '00:00');
    await userEvent.click(botao());

    expect(onConfirm).toHaveBeenCalledWith(0, 0);
  });

  it('não confirma enquanto está em andamento', async () => {
    // Em andamento o rótulo vira "Alterando..." e o botão trava — sem isso, um
    // duplo clique dispararia a alteração duas vezes.
    const { onConfirm } = montar({ isConfirming: true });

    const emAndamento = screen.getByRole('button', { name: /alterando/i });
    expect(emAndamento).toBeDisabled();

    await userEvent.click(emAndamento);

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('não deixa fechar no meio da alteração', async () => {
    const { onClose } = montar({ isConfirming: true });

    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(onClose).not.toHaveBeenCalled();
  });
});
