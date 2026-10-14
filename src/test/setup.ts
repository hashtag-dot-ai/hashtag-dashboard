import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './server';

// Node 25+ ships its own global localStorage, which shadows jsdom's and is
// unusable without --localstorage-file. Use jsdom's instead.
if (typeof globalThis.localStorage?.setItem !== 'function') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: (globalThis as unknown as { jsdom: { window: Window } }).jsdom.window.localStorage,
    configurable: true,
  });
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
