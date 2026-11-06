import { describe, expect, it } from 'vitest';
import { roundUpTo5 } from './rounding';

describe('roundUpTo5', () => {
  it('rounds up to the next multiple of 5', () => {
    expect(roundUpTo5(57.5)).toBe(60);
    expect(roundUpTo5(56)).toBe(60);
    expect(roundUpTo5(74.75)).toBe(75);
    expect(roundUpTo5(125.8)).toBe(130);
  });

  it('keeps exact multiples of 5 in place (floating-point tolerant)', () => {
    expect(roundUpTo5(155)).toBe(155);
    expect(roundUpTo5(238.5 * 0.65)).toBe(160); // 155.025 → 160
    expect(roundUpTo5(100)).toBe(100);
    expect(roundUpTo5(45)).toBe(45);
  });

  it('floors to 45 (the empty bar) for anything below', () => {
    expect(roundUpTo5(0)).toBe(45);
    expect(roundUpTo5(40)).toBe(45);
    expect(roundUpTo5(43.21)).toBe(45);
  });

  it('is idempotent on its own output', () => {
    const r = roundUpTo5(125.8);
    expect(roundUpTo5(r)).toBe(r);
  });
});
