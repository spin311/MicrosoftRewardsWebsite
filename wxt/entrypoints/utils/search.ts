import { getRndInteger } from '@/entrypoints/utils/helpers';
import { SEARCH_LEAD_INS, SEARCH_TOPICS, SEARCH_TAILS } from '@/entrypoints/data/searchTerms';

const BING_SEARCH_URL = 'https://www.bing.com/search?q=';
const BING_SEARCH_PARAMS = '&qs=n&form=QBLH&sp=-1&pq=';

// parseInt(undefined)/parseInt('abc') is NaN, and `NaN ?? x` keeps NaN
// (?? only catches null/undefined). This guards that original bug.
export function toInt(value: unknown, fallback: number): number {
    const n = parseInt(String(value), 10);
    return Number.isNaN(n) ? fallback : n;
}

function pick<T>(arr: T[]): T {
    return arr[getRndInteger(0, arr.length - 1)];
}

// Build a natural-looking search query from real words — "<lead-in> <topic>",
// "<topic> <tail>", or "<lead-in> <topic> <tail>" — so it reads like a normal
// search ("best headphones", "gardening for beginners", "cheap laptops on sale")
// with no random-character prefix or gibberish.
//
// The three-part shape is favoured 6:1:1 because it is where nearly all of the
// pool lives (lead-ins x topics x tails), and a repeated query earns no points:
// weighting it this way puts the effective pool in the tens of thousands instead
// of the ~4.5k either two-part shape can reach on its own.
export function buildSearchQuery(): string {
    const topic = pick(SEARCH_TOPICS);
    switch (getRndInteger(0, 7)) {
        case 0:
            return `${pick(SEARCH_LEAD_INS)} ${topic}`;
        case 1:
            return `${topic} ${pick(SEARCH_TAILS)}`;
        default:
            return `${pick(SEARCH_LEAD_INS)} ${topic} ${pick(SEARCH_TAILS)}`;
    }
}

export function buildSearchUrl(query: string): string {
    return `${BING_SEARCH_URL}${encodeURIComponent(query)}${BING_SEARCH_PARAMS}`;
}

// Bounds on the symmetric random spread applied to the configured gap, so the
// time between searches varies instead of being near-fixed — it looks less
// robotic while still averaging exactly what the user asked for. Both bounds are
// fractions of that gap, so the spread always scales with it.
const MIN_JITTER_FRACTION = 0.2;
const MAX_JITTER_FRACTION = 0.5;

// The spread also stops short of pushing a gap below the recommended minimum, so
// a user who picks a safe 60s never gets a 15s gap. Below the recommendation the
// term goes negative and MIN_JITTER_FRACTION takes over, which is what keeps
// short gaps tight: someone who deliberately sets 5s wants about 5s, not
// anything between 2.5s and 7.5s.
export const RECOMMENDED_MIN_TIMEOUT_SECONDS = 30;

// Absolute floor: a zero-length gap would open every remaining tab at once.
// Gaps below the recommendation are otherwise honoured, even though Microsoft is
// less likely to credit them — the popup warns instead of overriding the choice.
const MIN_DELAY_SECONDS = 1;

// Grows smoothly with the configured gap: ±20% of it at the short end, ±50% once
// the gap is wide enough to afford that, and in between only as wide as keeps the
// low end at the recommendation. So 5s gives 4-6s, 30s gives 24-36s (the ±20%
// floor wins, since a fixed 30s would be the robotic case), 45s gives 30-60s and
// 60s gives 30-90s. The low end never falls as the setting rises.
export function jitterSpreadMs(baseMs: number): number {
    const headroom = baseMs - RECOMMENDED_MIN_TIMEOUT_SECONDS * 1000;
    return Math.round(
        Math.min(baseMs * MAX_JITTER_FRACTION, Math.max(baseMs * MIN_JITTER_FRACTION, headroom))
    );
}

export function nextDelayMs(timeoutSeconds: number, jitterMs?: number): number {
    const baseMs = Math.max(timeoutSeconds, MIN_DELAY_SECONDS) * 1000;
    const spread = jitterSpreadMs(baseMs);
    const jitter = jitterMs ?? getRndInteger(-spread, spread);
    return Math.max(baseMs + jitter, MIN_DELAY_SECONDS * 1000);
}

// True while another search tab should open. Opening exactly `searches` tabs
// (fixes the original off-by-one that opened searches + 1).
export function shouldOpenMore(opened: number, searches: number): boolean {
    return opened < searches;
}
