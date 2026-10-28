import { describe, expect, it } from 'vitest';
import { LANDING_KEY, LANDING_STRINGS, landingSeen } from '../../../src/landing/landing.js';

describe('opening page', () => {
  it('is shown until the session marks it seen, and treats blocked storage as unseen', () => {
    expect(landingSeen({ getItem: () => null })).toBe(false);
    expect(landingSeen({ getItem: (key) => (key === LANDING_KEY ? 'seen' : null) })).toBe(true);
    expect(landingSeen({ getItem() { throw new Error('blocked'); } })).toBe(false);
  });

  it('has the same copy in Hebrew and English, including the slogan and the not-manufacturable note', () => {
    for (const strings of Object.values(LANDING_STRINGS)) {
      expect(strings.slogan.join('').length).toBeGreaterThan(10);
      expect(strings.steps).toHaveLength(3);
      expect(strings.footnote).toBeTruthy();
    }
    expect(LANDING_STRINGS.he.slogan.join('')).toBe('סוף סוף מישהו שמסדר לך את הארון.');
    expect(LANDING_STRINGS.en.footnote).toMatch(/not manufacturing drawings/);
  });
});
