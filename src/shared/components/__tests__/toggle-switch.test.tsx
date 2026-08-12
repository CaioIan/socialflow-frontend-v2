import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToggleSwitch } from '../toggle-switch';

describe('ToggleSwitch', () => {
  it('mantém a bolinha ancorada dentro do trilho quando está ligado', () => {
    render(
      <ToggleSwitch
        checked
        ariaLabel="Receber avisos"
        onClick={vi.fn()}
      />,
    );

    const thumb = screen.getByTestId('toggle-switch-thumb');
    expect(thumb).toHaveClass('left-0', 'translate-x-6');
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('executa a alteração ao ser tocado', () => {
    const onClick = vi.fn();
    render(
      <ToggleSwitch
        checked={false}
        ariaLabel="Receber avisos"
        onClick={onClick}
      />,
    );

    fireEvent.click(screen.getByRole('switch'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
