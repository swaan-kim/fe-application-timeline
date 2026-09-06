import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.mock('virtual:application-content', async () => ({
  default: (await import('./fixtures/application')).testSnapshot,
}));
vi.mock('../content/application.config', async () => ({
  APPLICATION_CONFIG: (await import('./fixtures/application')).testConfig,
}));

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}
