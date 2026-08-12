import { Loader2 } from 'lucide-react';

interface ToggleSwitchProps {
  checked: boolean;
  disabled?: boolean;
  loading?: boolean;
  ariaLabel: string;
  onClick: () => void;
}

/**
 * Interruptor compartilhado das preferências de notificação.
 *
 * A bolinha precisa de `left-0`: sem uma âncora horizontal, o navegador parte
 * da posição estática do span e o `translate-x-6` empurra o círculo para fora
 * do trilho — exatamente o defeito que aparecia no perfil.
 */
export function ToggleSwitch({
  checked,
  disabled = false,
  loading = false,
  ariaLabel,
  onClick,
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-primary' : 'bg-white/10'
      }`}
    >
      <span
        data-testid="toggle-switch-thumb"
        className={`absolute left-0 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      >
        {loading && <Loader2 className="h-3 w-3 animate-spin text-zinc-700" />}
      </span>
    </button>
  );
}
