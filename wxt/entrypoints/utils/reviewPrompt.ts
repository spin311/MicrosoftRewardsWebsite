// Decision logic for the popup's one-time review card. Kept free of browser APIs
// so it can be unit-tested; the component feeds it storage values.

export type ReviewAnswer = 'rated' | 'dismissed';

// Storage key (local area) holding the user's one-time answer.
export const REVIEW_PROMPT_KEY = 'reviewPrompt';
// Storage key (local area) counting daily search runs that finished on their own.
export const COMPLETED_RUNS_KEY = 'completedRuns';

// Five finished runs: enough that the extension has proven itself, early enough
// that a casual user still sees the ask.
export const REVIEW_PROMPT_THRESHOLD = 5;

export const CHROME_EXTENSION_ID = 'ocmmbfdhomnkljmjkmafegefcgcfkefo';
export const ISSUES_URL = 'https://github.com/spin311/MicrosoftRewardsWebsite/issues/new';

const FIREFOX_REVIEW_URL = 'https://addons.mozilla.org/firefox/addon/microsoft-automatic-rewards/reviews/';
const CHROME_REVIEW_URL = `https://chromewebstore.google.com/detail/microsoft-automatic-rewar/${CHROME_EXTENSION_ID}/reviews`;

// The review page of the store this copy came from, or null when it did not come
// from a store we can link to (an unpacked or sideloaded Chromium build has a
// different id, and a review request there would point at the wrong listing).
export function getReviewUrl({ isFirefox, extensionId }: { isFirefox: boolean; extensionId: string | undefined }): string | null {
    if (isFirefox) return FIREFOX_REVIEW_URL;
    return extensionId === CHROME_EXTENSION_ID ? CHROME_REVIEW_URL : null;
}

export function parseReviewAnswer(value: unknown): ReviewAnswer | null {
    return value === 'rated' || value === 'dismissed' ? value : null;
}

export function shouldShowReviewPrompt({ completedRuns, answer, hasReviewUrl }: {
    completedRuns: number | null | undefined;
    answer: ReviewAnswer | null;
    hasReviewUrl: boolean;
}): boolean {
    if (!hasReviewUrl || answer !== null) return false;
    return Number.isFinite(completedRuns) && (completedRuns as number) >= REVIEW_PROMPT_THRESHOLD;
}
