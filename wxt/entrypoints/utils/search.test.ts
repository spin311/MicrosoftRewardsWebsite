import { describe, it, expect } from 'vitest';
import { toInt, buildSearchQuery, buildSearchUrl, nextDelayMs, jitterSpreadMs, shouldOpenMore } from './search';
import { SEARCH_LEAD_INS, SEARCH_TOPICS, SEARCH_TAILS } from '../data/searchTerms';

// Measures what the generator actually reaches, rather than trusting a formula
// over the word lists that could drift from the shapes it really emits.
function countDistinctQueries(samples: number): number {
  const seen = new Set<string>();
  for (let i = 0; i < samples; i++) seen.add(buildSearchQuery());
  return seen.size;
}

const VOCAB = new Set(
  [...SEARCH_LEAD_INS, ...SEARCH_TOPICS, ...SEARCH_TAILS].flatMap((phrase) => phrase.split(' '))
);

describe('toInt', () => {
  it('parses integer strings', () => {
    expect(toInt('5', 9)).toBe(5);
  });
  it('falls back on NaN / null / undefined (the parseInt ?? bug)', () => {
    expect(toInt('abc', 9)).toBe(9);
    expect(toInt(undefined, 9)).toBe(9);
    expect(toInt(null, 9)).toBe(9);
  });
  it('passes through numbers', () => {
    expect(toInt(7, 9)).toBe(7);
  });
});

describe('buildSearchQuery', () => {
  it('builds natural multi-word queries from real words, no random prefix', () => {
    for (let i = 0; i < 300; i++) {
      const q = buildSearchQuery();
      // Real words separated by single spaces, starting with a letter/digit —
      // never a lone random character or gibberish string.
      expect(q).toMatch(/^[a-z0-9]+( [a-z0-9]+)+$/);
      for (const token of q.split(' ')) {
        expect(VOCAB.has(token)).toBe(true);
      }
    }
  });

  it('varies between calls', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) seen.add(buildSearchQuery());
    expect(seen.size).toBeGreaterThan(20);
  });

  // Microsoft does not credit a query it has already seen today, so the pool has
  // to be large enough that a heavy day (90+ searches) rarely repeats itself.
  it('can build at least 10k distinct queries', () => {
    expect(countDistinctQueries(60_000)).toBeGreaterThanOrEqual(10_000);
  });

  it('rarely repeats a query across a heavy day of searches', () => {
    const daysWithRepeat = Array.from({ length: 2000 }, () => {
      const seen = new Set<string>();
      for (let i = 0; i < 90; i++) seen.add(buildSearchQuery());
      return seen.size < 90;
    }).filter(Boolean).length;
    expect(daysWithRepeat / 2000).toBeLessThan(0.1);
  });
});

describe('buildSearchUrl', () => {
  it('url-encodes the query into the Bing search URL', () => {
    expect(buildSearchUrl('best coffee')).toBe(
      'https://www.bing.com/search?q=best%20coffee&qs=n&form=QBLH&sp=-1&pq='
    );
  });
});

describe('nextDelayMs', () => {
  it('returns the base timeout when jitter is zero', () => {
    expect(nextDelayMs(60, 0)).toBe(60_000);
    expect(nextDelayMs(5, 0)).toBe(5_000);
  });

  it('floors at 1s so a gap is never zero-length', () => {
    expect(nextDelayMs(0, 0)).toBe(1_000);
    expect(nextDelayMs(1, -5_000)).toBe(1_000);
  });

  // Regression: a hard 30s floor used to swallow every setting below 20s
  // entirely — 5s, 10s and 20s all produced exactly 30s gaps.
  it('honours a sub-30s timeout instead of clamping it to 30s', () => {
    for (const timeout of [5, 10, 20]) {
      for (let i = 0; i < 200; i++) {
        expect(nextDelayMs(timeout)).toBeLessThan(30_000);
      }
    }
  });

  it('spreads short gaps proportionally tighter than long ones', () => {
    expect(jitterSpreadMs(5_000) / 5_000).toBeLessThan(jitterSpreadMs(120_000) / 120_000);
    expect(jitterSpreadMs(5_000)).toBe(1_000);      // ±20% of 5s
    expect(jitterSpreadMs(120_000)).toBe(60_000);   // ±50% of 120s
  });

  // A user who picks a safe 60s should not get a 15s gap, and the low end has to
  // grow with the setting — no step where a bigger number allows a shorter gap
  // (a hard 30s floor used to create exactly that kind of discontinuity).
  it('keeps the low end at the recommended minimum or 80% of the setting, and grows monotonically', () => {
    let previousLowEnd = 0;
    for (let timeout = 1; timeout <= 600; timeout++) {
      const base = timeout * 1000;
      const lowEnd = base - jitterSpreadMs(base);
      expect(lowEnd).toBeGreaterThanOrEqual(Math.min(base * 0.8, 30_000));
      expect(lowEnd).toBeGreaterThanOrEqual(previousLowEnd);
      previousLowEnd = lowEnd;
    }
  });

  // Once the setting has room for it, no gap dips under the recommendation.
  it('never dips below the recommended minimum for a setting of 40s or more', () => {
    for (const timeout of [40, 60, 120, 600]) {
      for (let i = 0; i < 300; i++) {
        expect(nextDelayMs(timeout)).toBeGreaterThanOrEqual(30_000);
      }
    }
  });

  it('keeps the spread proportional to the configured gap', () => {
    // base 5s at ±20% → [4s, 6s]; base 120s at ±50% → [60s, 180s]
    for (let i = 0; i < 500; i++) {
      const short = nextDelayMs(5);
      expect(short).toBeGreaterThanOrEqual(4_000);
      expect(short).toBeLessThanOrEqual(6_000);

      const long = nextDelayMs(120);
      expect(long).toBeGreaterThanOrEqual(60_000);
      expect(long).toBeLessThanOrEqual(180_000);
    }
  });

  it('varies between calls', () => {
    const values = new Set(Array.from({ length: 500 }, () => nextDelayMs(60)));
    expect(values.size).toBeGreaterThan(50);
  });

  it('keeps the configured timeout as the average', () => {
    for (const timeout of [5, 120]) {
      const mean = Array.from({ length: 20000 }, () => nextDelayMs(timeout)).reduce((a, b) => a + b, 0) / 20000;
      expect(mean / 1000).toBeCloseTo(timeout, 0);
    }
  });
});

describe('shouldOpenMore', () => {
  it('is true while fewer than `searches` tabs have opened', () => {
    expect(shouldOpenMore(1, 12)).toBe(true);
  });
  it('is false once `searches` tabs have opened (exact-count fix)', () => {
    expect(shouldOpenMore(12, 12)).toBe(false);
    expect(shouldOpenMore(1, 1)).toBe(false);
  });
});
