import { describe, it, expect } from 'vitest';
import { REVIEW_TO_SPONSOR_GAP_MS, SPONSOR_MILESTONE_RUNS, parseSponsorAnswer, pickPromptCard, type PromptInputs } from './sponsorPrompt';

const NOW = 1_800_000_000_000;
const answeredLongAgo = NOW - REVIEW_TO_SPONSOR_GAP_MS - 1;

const base: PromptInputs = {
    completedRuns: SPONSOR_MILESTONE_RUNS,
    reviewAnswer: 'rated',
    reviewAnsweredAt: answeredLongAgo,
    sponsorAnswer: null,
    hasReviewUrl: true,
    now: NOW,
};

describe('pickPromptCard', () => {
    it('shows the sponsor card at 30 runs once the review was answered 7+ days ago', () => {
        expect(pickPromptCard(base)).toBe('sponsor');
    });

    it('shows it exactly at the 7-day boundary', () => {
        expect(pickPromptCard({ ...base, reviewAnsweredAt: NOW - REVIEW_TO_SPONSOR_GAP_MS })).toBe('sponsor');
    });

    it('waits when the review was answered less than 7 days ago', () => {
        expect(pickPromptCard({ ...base, reviewAnsweredAt: NOW - REVIEW_TO_SPONSOR_GAP_MS + 1 })).toBeNull();
    });

    it('works for a dismissed review as well as a rated one', () => {
        expect(pickPromptCard({ ...base, reviewAnswer: 'dismissed' })).toBe('sponsor');
    });

    it('stays hidden below 30 runs', () => {
        expect(pickPromptCard({ ...base, completedRuns: SPONSOR_MILESTONE_RUNS - 1 })).toBeNull();
    });

    it('stays hidden forever once answered', () => {
        expect(pickPromptCard({ ...base, sponsorAnswer: 'clicked' })).toBeNull();
        expect(pickPromptCard({ ...base, sponsorAnswer: 'dismissed' })).toBeNull();
    });

    it('stays hidden when the review was answered but its timestamp is missing', () => {
        expect(pickPromptCard({ ...base, reviewAnsweredAt: null })).toBeNull();
    });

    it('skips the review gap when the review card does not apply (unknown id)', () => {
        const input = { ...base, hasReviewUrl: false, reviewAnswer: null, reviewAnsweredAt: null };
        expect(pickPromptCard(input)).toBe('sponsor');
        expect(pickPromptCard({ ...input, completedRuns: 29 })).toBeNull();
    });

    it('shows the review card, never the sponsor card, while the review is unanswered', () => {
        const input = { ...base, reviewAnswer: null, reviewAnsweredAt: null, completedRuns: 100 };
        expect(pickPromptCard(input)).toBe('review');
    });

    it('treats a missing counter as zero', () => {
        expect(pickPromptCard({ ...base, completedRuns: undefined })).toBeNull();
    });
});

describe('parseSponsorAnswer', () => {
    it('accepts only the two stored answers', () => {
        expect(parseSponsorAnswer('clicked')).toBe('clicked');
        expect(parseSponsorAnswer('dismissed')).toBe('dismissed');
        expect(parseSponsorAnswer('rated')).toBeNull();
        expect(parseSponsorAnswer(null)).toBeNull();
    });
});
