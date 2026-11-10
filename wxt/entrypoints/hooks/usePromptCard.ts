import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { getStorageItem, setStorageItem } from '@/entrypoints/hooks/useStorage';
import {
    COMPLETED_RUNS_KEY,
    REVIEW_PROMPT_KEY,
    getReviewUrl,
    parseReviewAnswer,
    saveThenOpen,
    type ReviewAnswer,
} from '@/entrypoints/utils/reviewPrompt';
import {
    REVIEW_ANSWERED_AT_KEY,
    SPONSOR_MILESTONE_URL,
    SPONSOR_PROMPT_KEY,
    parseSponsorAnswer,
    pickPromptCard,
    type PromptCard,
    type SponsorAnswer,
} from '@/entrypoints/utils/sponsorPrompt';

// Reads storage once on popup open and decides which single card to show (if
// any); nothing renders until then, so neither a card nor the promo tiles it
// replaces flash in first. Answers persist before any tab opens, since the popup can
// close the moment it does.
export function usePromptCard() {
    const [isLoaded, setIsLoaded] = useState(false);
    const [card, setCard] = useState<PromptCard | null>(null);
    const [completedRuns, setCompletedRuns] = useState(0);
    const reviewUrl = getReviewUrl({ isFirefox: import.meta.env.FIREFOX, extensionId: browser.runtime?.id });

    useEffect(() => {
        void Promise.all([
            getStorageItem<number>(COMPLETED_RUNS_KEY),
            getStorageItem<unknown>(REVIEW_PROMPT_KEY),
            getStorageItem<number>(REVIEW_ANSWERED_AT_KEY),
            getStorageItem<unknown>(SPONSOR_PROMPT_KEY),
        ]).then(([runs, review, reviewAt, sponsor]) => {
            setCompletedRuns(runs ?? 0);
            setCard(pickPromptCard({
                completedRuns: runs,
                reviewAnswer: parseReviewAnswer(review),
                reviewAnsweredAt: reviewAt,
                sponsorAnswer: parseSponsorAnswer(sponsor),
                hasReviewUrl: reviewUrl !== null,
                now: Date.now(),
            }));
            setIsLoaded(true);
        });
    }, []);

    async function saveReviewAnswer(value: ReviewAnswer): Promise<void> {
        await setStorageItem(REVIEW_PROMPT_KEY, value);
        await setStorageItem(REVIEW_ANSWERED_AT_KEY, Date.now());
    }

    async function saveSponsorAnswer(value: SponsorAnswer): Promise<void> {
        await setStorageItem(SPONSOR_PROMPT_KEY, value);
    }

    async function rate(): Promise<void> {
        if (!reviewUrl) return;
        setCard(null);
        await saveThenOpen(() => saveReviewAnswer('rated'), () => browser.tabs.create({ url: reviewUrl }));
    }

    async function sponsor(): Promise<void> {
        setCard(null);
        await saveThenOpen(() => saveSponsorAnswer('clicked'), () => browser.tabs.create({ url: SPONSOR_MILESTONE_URL }));
    }

    function dismiss(): void {
        const answering = card;
        setCard(null);
        if (answering === 'review') void saveReviewAnswer('dismissed');
        if (answering === 'sponsor') void saveSponsorAnswer('dismissed');
    }

    return { isLoaded, card, completedRuns, rate, sponsor, dismiss };
}
