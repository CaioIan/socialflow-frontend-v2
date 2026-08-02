import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// O Testing Library não desmonta sozinho entre testes quando `globals: true`.
// Sem isto, o segundo teste enxerga o DOM do primeiro e as buscas por texto
// encontram dois elementos.
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// O jsdom não implementa nenhum dos dois, e o framer-motion e o Radix consultam
// ambos no primeiro render — sem o stub, qualquer componente animado explode.
globalThis.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
})) as unknown as typeof globalThis.matchMedia;

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
