import { describe, expect, it } from 'vitest';
import { parseHash, toHash } from './router';

describe('parseHash', () => {
  it('maps empty hash to home', () => {
    expect(parseHash('')).toEqual({ kind: 'home' });
    expect(parseHash('#')).toEqual({ kind: 'home' });
    expect(parseHash('#home')).toEqual({ kind: 'home' });
  });

  it('parses the simple routes', () => {
    expect(parseHash('#setup')).toEqual({ kind: 'setup' });
    expect(parseHash('#history')).toEqual({ kind: 'history' });
    expect(parseHash('#settings')).toEqual({ kind: 'settings' });
    expect(parseHash('#cycle-complete')).toEqual({ kind: 'cycle-complete' });
  });

  it('parses session routes and decodes the id', () => {
    expect(parseHash('#session/abc-123')).toEqual({ kind: 'session', id: 'abc-123' });
    expect(parseHash('#session/some%2Fid')).toEqual({ kind: 'session', id: 'some/id' });
  });

  it('unknown routes fall back to home', () => {
    expect(parseHash('#nope')).toEqual({ kind: 'home' });
  });
});

describe('toHash round-trip', () => {
  it('round-trips every route kind', () => {
    const routes = [
      { kind: 'home' },
      { kind: 'setup' },
      { kind: 'history' },
      { kind: 'settings' },
      { kind: 'cycle-complete' },
      { kind: 'session', id: 'uuid-xyz' },
      { kind: 'session', id: 'slash/id' },
    ] as const;
    for (const r of routes) {
      expect(parseHash(toHash(r))).toEqual(r);
    }
  });
});
