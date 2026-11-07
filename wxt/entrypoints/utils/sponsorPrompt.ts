import { shouldShowReviewPrompt, type ReviewAnswer } from './reviewPrompt';

export type SponsorAnswer = 'clicked' | 'dismissed';
export type PromptCard = 'review' | 'sponsor';

export const SPONSOR_PROMPT_KEY = 'sponsorPrompt';
export const REVIEW_ANSWERED_AT_KEY = 'reviewPromptAnsweredAt';

// Sponsor ask comes only after the user has clearly got value from the tool.
export const SPONSOR_MILESTONE_RUNS = 30;
export const REVIEW_TO_SPONSOR_GAP_MS = 7 * 24 * 60 * 60 * 1000;

export const SPONSOR_MILESTONE_URL = 'https://github.com/sponsors/spin311?metadata_source=MicrosoftRewardsWebsite-milestone';

export function parseSponsorAnswer(value: unknown): SponsorAnswer | null {
    return value === 'clicked' || value === 'dismissed' ? value : null;
}

export interface PromptInputs {
    completedRuns: number | null | undefined;
    reviewAnswer: ReviewAnswer | null;
    reviewAnsweredAt: number | null | undefined;
    sponsorAnswer: SponsorAnswer | null;
    hasReviewUrl: boolean;
    now: number;
}

function isSponsorMilestoneDue(i: PromptInputs): boolean {
    if (i.sponsorAnswer !== null) return false;
    if (!Number.isFinite(i.completedRuns) || (i.completedRuns as number) < SPONSOR_MILESTONE_RUNS) return false;
    // No review card in this build: nothing to space the ask from.
    if (!i.hasReviewUrl) return true;
    if (i.reviewAnswer === null || !Number.isFinite(i.reviewAnsweredAt)) return false;
    return i.now - (i.reviewAnsweredAt as number) >= REVIEW_TO_SPONSOR_GAP_MS;
}

// Which single card (if any) the popup shows. The review card wins; the sponsor
// milestone can only be due once the review is answered or not applicable, so
// the two are never both eligible.
export function pickPromptCard(i: PromptInputs): PromptCard | null {
    if (shouldShowReviewPrompt({ completedRuns: i.completedRuns, answer: i.reviewAnswer, hasReviewUrl: i.hasReviewUrl })) {
        return 'review';
    }
    return isSponsorMilestoneDue(i) ? 'sponsor' : null;
}
