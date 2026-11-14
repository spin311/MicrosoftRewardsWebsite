// The popup states the store images show: storage for each (on top of BASE) and the
// elements the callouts point at. The review and sponsor prompts are answered, so no
// card takes the promo tiles' place.
const BASE_SYNC = {
    active: true, autoDaily: true, claimPoints: false, accountLevel: "member", timeout: 60, searches: 5,
    closeTime: 5, openFirstResult: false, isSearching: false, currentSearch: 0,
};
const BASE_LOCAL = { completedRuns: 12, reviewPrompt: "rated", reviewPromptAnsweredAt: 1, sponsorPrompt: "dismissed" };

export const VIEWS = {
    "popup-main": {
        sync: {},
        targets: { button: "#button", tasks: 'section[aria-labelledby="tasks-title"] .row:nth-of-type(2)' },
    },
    "popup-progress": {
        sync: { isSearching: true, currentSearch: 3, searches: 5 },
        targets: { progress: ".progress-card", stop: "#button" },
    },
    "popup-settings": {
        sync: { accountLevel: "silver", searches: 10, timeout: 90, closeTime: 8 },
        targets: { searches: "#searches", timeout: "#timeout" },
    },
};

// storage.sync and storage.local for a view.
export function viewStorage(view) {
    return { sync: { ...BASE_SYNC, ...view.sync }, local: { ...BASE_LOCAL, ...(view.local ?? {}) } };
}
