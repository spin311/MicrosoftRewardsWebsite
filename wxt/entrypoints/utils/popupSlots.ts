import type { PromptCard } from './sponsorPrompt';

export interface PopupSlotInputs {
    isRunStateLoaded: boolean;
    isSearching: boolean;
    // A run was in flight at some point while this popup has been open.
    wasSearchingThisPopup: boolean;
    completedSearches: number;
    isPromptLoaded: boolean;
    dueCard: PromptCard | null;
}

export interface PopupSlots {
    // The search progress panel under the run button.
    showRunPanel: boolean;
    // What goes below the settings: a prompt card, the promo tiles, or nothing
    // yet ('loading').
    lower: PromptCard | 'tiles' | 'loading';
    // The Help/Contact/GitHub/Donate links. The sponsor card is the donate ask
    // itself and, with the short-gap warning, would overflow 600px beside them.
    showFooter: boolean;
}

// Decides the popup's two optional areas. The run panel and a prompt card
// together overflow Chrome's 600px popup, so they never show at once: a run in
// flight keeps its panel (to the end, if it finishes while the popup is open)
// and the card waits for a later popup, while a run that had already finished
// gives way to a due card. Nothing shows until both states have loaded, so
// neither area flashes in and then disappears.
export function choosePopupSlots({
    isRunStateLoaded,
    isSearching,
    wasSearchingThisPopup,
    completedSearches,
    isPromptLoaded,
    dueCard,
}: PopupSlotInputs): PopupSlots {
    if (!isRunStateLoaded || !isPromptLoaded) return { showRunPanel: false, lower: 'loading', showFooter: false };
    if (isSearching || wasSearchingThisPopup) return { showRunPanel: true, lower: 'tiles', showFooter: true };
    if (dueCard) return { showRunPanel: false, lower: dueCard, showFooter: dueCard !== 'sponsor' };
    // A zero count means nothing has run, and showing 0/5 would read as stalled.
    return { showRunPanel: completedSearches > 0, lower: 'tiles', showFooter: true };
}
