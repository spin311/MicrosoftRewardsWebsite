import { describe, it, expect } from 'vitest';
import {
    CHROME_EXTENSION_ID,
    REVIEW_PROMPT_THRESHOLD,
    getReviewUrl,
    parseReviewAnswer,
    saveThenOpen,
    shouldShowReviewPrompt,
} from './reviewPrompt';

describe('getReviewUrl', () => {
    it('returns the Firefox reviews page for the Firefox build', () => {
        expect(getReviewUrl({ isFirefox: true, extensionId: 'microsoft_automatic_rewards@example.com' })).toBe(
            'https://addons.mozilla.org/firefox/addon/microsoft-automatic-rewards/reviews/'
        );
    });

    it('returns the Chrome Web Store reviews page for the published Chromium id', () => {
        expect(getReviewUrl({ isFirefox: false, extensionId: CHROME_EXTENSION_ID })).toBe(
            'https://chromewebstore.google.com/detail/microsoft-automatic-rewar/ocmmbfdhomnkljmjkmafegefcgcfkefo/reviews'
        );
    });

    it('returns null for an unpacked or sideloaded Chromium copy', () => {
        expect(getReviewUrl({ isFirefox: false, extensionId: 'abcdefghijklmnopabcdefghijklmnop' })).toBeNull();
    });

    it('returns null when the extension id is unavailable', () => {
        expect(getReviewUrl({ isFirefox: false, extensionId: undefined })).toBeNull();
    });
});

describe('parseReviewAnswer', () => {
    it('accepts the two stored answers', () => {
        expect(parseReviewAnswer('rated')).toBe('rated');
        expect(parseReviewAnswer('dismissed')).toBe('dismissed');
    });

    it('treats anything else as unanswered', () => {
        expect(parseReviewAnswer(null)).toBeNull();
        expect(parseReviewAnswer(undefined)).toBeNull();
        expect(parseReviewAnswer('later')).toBeNull();
        expect(parseReviewAnswer(3)).toBeNull();
    });
});

describe('shouldShowReviewPrompt', () => {
    const base = { completedRuns: REVIEW_PROMPT_THRESHOLD, answer: null, hasReviewUrl: true };

    it('shows at the threshold when unanswered and a store page exists', () => {
        expect(shouldShowReviewPrompt(base)).toBe(true);
    });

    it('stays hidden below the threshold', () => {
        expect(shouldShowReviewPrompt({ ...base, completedRuns: REVIEW_PROMPT_THRESHOLD - 1 })).toBe(false);
    });

    it('stays hidden forever once rated or dismissed', () => {
        expect(shouldShowReviewPrompt({ ...base, answer: 'rated' })).toBe(false);
        expect(shouldShowReviewPrompt({ ...base, answer: 'dismissed' })).toBe(false);
    });

    it('stays hidden when there is no store page to send the user to', () => {
        expect(shouldShowReviewPrompt({ ...base, hasReviewUrl: false })).toBe(false);
    });

    it('treats a missing or corrupt counter as zero', () => {
        expect(shouldShowReviewPrompt({ ...base, completedRuns: undefined })).toBe(false);
        expect(shouldShowReviewPrompt({ ...base, completedRuns: Number.NaN })).toBe(false);
    });
});

describe('saveThenOpen', () => {
    it('finishes saving before it opens the tab', async () => {
        const calls: string[] = [];
        const save = async () => { await Promise.resolve(); calls.push('saved'); };
        const open = async () => { calls.push('opened'); };

        await saveThenOpen(save, open);

        expect(calls).toEqual(['saved', 'opened']);
    });
});
