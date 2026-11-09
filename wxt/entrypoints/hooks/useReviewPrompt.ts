import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { getStorageItem, setStorageItem } from '@/entrypoints/hooks/useStorage';
import {
    COMPLETED_RUNS_KEY,
    REVIEW_PROMPT_KEY,
    getReviewUrl,
    parseReviewAnswer,
    saveThenOpen,
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

    async function answerPrompt(value: ReviewAnswer): Promise<void> {
        setAnswer(value);
        await setStorageItem(REVIEW_PROMPT_KEY, value);
    }

    const isVisible = isLoaded && shouldShowReviewPrompt({ completedRuns, answer, hasReviewUrl: reviewUrl !== null });

    async function rate(): Promise<void> {
        if (!reviewUrl) return;
        setAnswer('rated');
        await saveThenOpen(
            () => setStorageItem(REVIEW_PROMPT_KEY, 'rated'),
            () => browser.tabs.create({ url: reviewUrl })
        );
    }

    return { isLoaded, isVisible, rate, dismiss: () => void answerPrompt('dismissed') };
}
