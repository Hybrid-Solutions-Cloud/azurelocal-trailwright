import { describe, expect, it } from 'vitest';
import { efficiency } from '../src/storage/capacity';

describe('dual parity efficiency (Learn fault tolerance summary)', () => {
  it('is 50% for 4 to 6 servers and 66.7% for 7 and 8', () => {
    expect(efficiency('parity', 4)).toBe(0.5);
    expect(efficiency('parity', 6)).toBe(0.5);
    expect(efficiency('parity', 7)).toBeCloseTo(0.667, 3);
    expect(efficiency('parity', 8)).toBeCloseTo(0.667, 3);
  });
  it('all-flash reaches 75% at 9 servers and 80% at 16', () => {
    expect(efficiency('parity', 9)).toBe(0.75);
    expect(efficiency('parity', 15)).toBe(0.75);
    expect(efficiency('parity', 16)).toBe(0.8);
  });
  it('hybrid stays at 66.7% to 11 servers and is 72.7% from 12 to 16', () => {
    expect(efficiency('parity', 11, true)).toBeCloseTo(0.667, 3);
    expect(efficiency('parity', 12, true)).toBeCloseTo(0.727, 3);
    expect(efficiency('parity', 16, true)).toBeCloseTo(0.727, 3);
  });
});
