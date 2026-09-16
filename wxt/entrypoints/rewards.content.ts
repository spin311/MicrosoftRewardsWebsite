import { defineContentScript } from '#imports';
import { browser } from 'wxt/browser';
import { getRndInteger, wait } from '@/entrypoints/utils/helpers';
import { matchDailyAnchors } from '@/entrypoints/utils/dailyAnchors';
import { claimPoints } from '@/entrypoints/utils/claimFlow';
import { waitForMatch } from '@/entrypoints/utils/waitForMatch';
import { oncePerPageRun } from '@/entrypoints/utils/oncePerPageRun';

// The daily-set grid renders async. Bounded, like every wait here: a day with no
// set is an ordinary outcome, and an observer that is never disconnected keeps
// firing for the life of the page.
const DAILY_ANCHORS_TIMEOUT_MS = 20000;

interface DashboardRequest {
    action?: string;
    doDailySet?: boolean;
    doClaim?: boolean;
}

export default defineContentScript({
    matches: ['https://rewards.bing.com/*'],
    main() {
        if (!oncePerPageRun('_marContentScriptInjected')) return;
        browser.runtime.onMessage.addListener((request: DashboardRequest) => {
            if (request.action === 'runDashboard') void runDashboard(request);
        });
    },
});

// Daily sets first: completing them can turn fresh points into claimable ones,
// so claiming afterwards picks those up in the same visit. Either job may be off,
// and either may find nothing to do; `dashboardDone` is reported once both have
// had their turn, so the tab closes only after the last click.
async function runDashboard({ doDailySet, doClaim }: DashboardRequest): Promise<void> {
    if (doDailySet) await openDailySets();
    if (doClaim) await claimPoints();
    browser.runtime.sendMessage({ action: 'dashboardDone' }).catch(() => {});
}

async function openDailySets(): Promise<void> {
    const anchors = await waitForMatch(() => {
        const found = matchDailyAnchors(document);
        return found.length > 0 ? found : null;
    }, DAILY_ANCHORS_TIMEOUT_MS);
    if (!anchors) return;
    // Click each daily-set card so the dashboard's own handler registers the
    // activity — that click is what credits the points; opening the raw href
    // does not. Each click opens the search in a new tab, which the background
    // auto-closes.
    for (const anchor of anchors) {
        anchor.click();
        await wait(1000 + getRndInteger(0, 1000));
    }
}
