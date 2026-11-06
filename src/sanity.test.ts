import { describe, expect, it } from 'vitest';

describe('toolchain sanity', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });

  it('has DOM globals from jsdom', () => {
    const el = document.createElement('div');
    el.textContent = 'ok';
    expect(el.textContent).toBe('ok');
  });
});
