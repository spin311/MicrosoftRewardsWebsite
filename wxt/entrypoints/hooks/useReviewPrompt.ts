import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { getStorageItem, setStorageItem } from '@/entrypoints/hooks/useStorage';
import {
    COMPLETED_RUNS_KEY,
    REVIEW_PROMPT_KEY,
    getReviewUrl,
    parseReviewAnswer,
    shouldShowReviewPrompt,
    type ReviewAnswer,
} from '@/entrypoints/utils/reviewPrompt';

// Reads once on popup open (nothing shows until both values are loaded, so the
// card never flashes), and persists the single answer on click.
export function useReviewPrompt() {
    const [isLoaded, setIsLoaded] = useState(false);
    const [completedRuns, setCompletedRuns] = useState<number | null>(null);
    const [answer, setAnswer] = useState<ReviewAnswer | null>(null);
    const reviewUrl = getReviewUrl({ isFirefox: import.meta.env.FIREFOX, extensionId: browser.runtime?.id });

    useEffect(() => {
        void Promise.all([
            getStorageItem<number>(COMPLETED_RUNS_KEY),
            getStorageItem<unknown>(REVIEW_PROMPT_KEY),
        ]).then(([runs, stored]) => {
            setCompletedRuns(runs);
            setAnswer(parseReviewAnswer(stored));
            setIsLoaded(true);
        });
    }, []);

    function answerPrompt(value: ReviewAnswer): void {
        setAnswer(value);
        void setStorageItem(REVIEW_PROMPT_KEY, value);
    }

    const isVisible = isLoaded && shouldShowReviewPrompt({ completedRuns, answer, hasReviewUrl: reviewUrl !== null });

    function rate(): void {
        if (reviewUrl) void browser.tabs.create({ url: reviewUrl });
        answerPrompt('rated');
    }

    return { isVisible, rate, dismiss: () => answerPrompt('dismissed') };
}
