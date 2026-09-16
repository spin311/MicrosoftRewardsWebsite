import { browser } from 'wxt/browser';
import { getRndInteger } from '@/entrypoints/utils/helpers';
import { trackTab, untrackTab } from './tabCleanup';

// Safety cap: close the dashboard tab even if the content script never reports
// done (page failed to render the daily sets, message dropped, etc.).
const DAILY_TAB_MAX_LIFETIME_MS = 90000;
// A daily-set search tab is closed a random few seconds after it finishes
// loading (so the search registers before we close it).
const DAILY_LINK_MIN_LINGER_MS = 2000;
const DAILY_LINK_MAX_LINGER_MS = 5000;
// Fallback: close a daily-set tab this long after it opened even if it never
// reports "complete".
const DAILY_LINK_HARD_CLOSE_MS = 20000;
// Give up waiting on the dashboard to load rather than leaving the promise
// pending forever when the tab is closed (by the user or by `finish`) or the
// load event never arrives.
const DASHBOARD_LOAD_TIMEOUT_MS = 30000;

export interface DashboardJobs {
    doDailySet: boolean;
    doClaim: boolean;
}

// Opens the rewards dashboard and tells the content script which of its jobs to
// run: clicking the daily-set cards (that click is what credits the points) and
// pressing "Ready to claim". The dashboard is opened ACTIVE: browsers pause
// rendering/timers in hidden tabs, so the SPA won't render its daily-set grid or
// its claim flyout — nor keep the click loop running — unless the tab is
// visible. We restore the user's previous tab when done. Each daily-set click
// opens a search in its own tab (auto-closed shortly after it loads); if such a
// tab grabs focus we snap it back to the dashboard so it stays rendered.
export async function openDailyRewards(jobs: DashboardJobs): Promise<void> {
    const previousActiveTabId = await getActiveTabId();

    const tab = await browser.tabs.create({ url: 'https://rewards.bing.com/dashboard', active: true });
    const dashboardId = tab.id!;
    // The `finish` timer below is the precise close; this is the backstop for
    // when the service worker is torn down before it ever fires.
    await trackTab(dashboardId, DAILY_TAB_MAX_LIFETIME_MS);

    function onCreated(created: { id?: number; openerTabId?: number }): void {
        if (created.openerTabId !== dashboardId || created.id == null) return;
        // Keep the dashboard foregrounded so it stays rendered and keeps
        // clicking; the search tab still loads in the background and credits.
        browser.tabs.update(dashboardId, { active: true }).catch(() => {});
        closeDailyTabAfterLoad(created.id);
    }
    browser.tabs.onCreated.addListener(onCreated);

    let done = false;
    function finish(): void {
        if (done) return;
        done = true;
        browser.runtime.onMessage.removeListener(doneListener);
        browser.tabs.onCreated.removeListener(onCreated);
        browser.tabs.remove(dashboardId).catch(() => {});
        void untrackTab(dashboardId);
        if (previousActiveTabId != null) {
            browser.tabs.update(previousActiveTabId, { active: true }).catch(() => {});
        }
    }

    function doneListener(message: { action?: string }, sender: { tab?: { id?: number } }): void {
        if (message.action === 'dashboardDone' && sender.tab?.id === dashboardId) finish();
    }
    browser.runtime.onMessage.addListener(doneListener);
    setTimeout(finish, DAILY_TAB_MAX_LIFETIME_MS);

    await new Promise<void>((resolve) => {
        let isSettled = false;
        function settle(): void {
            if (isSettled) return;
            isSettled = true;
            browser.tabs.onUpdated.removeListener(loadListener);
            clearTimeout(giveUpTimer);
            resolve();
        }
        function loadListener(updatedId: number, changeInfo: { status?: string }): void {
            if (updatedId !== dashboardId || changeInfo.status !== 'complete') return;
            browser.tabs.onUpdated.removeListener(loadListener);
            setTimeout(() => {
                browser.tabs
                    .sendMessage(dashboardId, { action: 'runDashboard', ...jobs })
                    .catch(() => {});
                settle();
            }, 300);
        }
        browser.tabs.onUpdated.addListener(loadListener);
        const giveUpTimer = setTimeout(settle, DASHBOARD_LOAD_TIMEOUT_MS);
    });
}

async function getActiveTabId(): Promise<number | undefined> {
    try {
        const tabs = await browser.tabs.query({ active: true, lastFocusedWindow: true });
        return tabs[0]?.id;
    } catch {
        return undefined;
    }
}

// Close a daily-set search tab a random few seconds after it finishes loading,
// with a hard cap in case it never reports "complete".
function closeDailyTabAfterLoad(tabId: number): void {
    void trackTab(tabId, DAILY_LINK_HARD_CLOSE_MS);
    let closed = false;
    function close(): void {
        if (closed) return;
        closed = true;
        browser.tabs.onUpdated.removeListener(loadListener);
        browser.tabs.get(tabId).then(() => browser.tabs.remove(tabId)).catch(() => {});
        void untrackTab(tabId);
    }
    function loadListener(updatedId: number, changeInfo: { status?: string }): void {
        if (updatedId === tabId && changeInfo.status === 'complete') {
            browser.tabs.onUpdated.removeListener(loadListener);
            setTimeout(close, getRndInteger(DAILY_LINK_MIN_LINGER_MS, DAILY_LINK_MAX_LINGER_MS));
        }
    }
    browser.tabs.onUpdated.addListener(loadListener);
    setTimeout(close, DAILY_LINK_HARD_CLOSE_MS);
}
