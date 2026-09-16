import { storage } from '#imports';
import { browser } from 'wxt/browser';
import { getStorageItems, setStorageItem, setStorageItems } from '@/entrypoints/hooks/useStorage';
import { StorageValues } from '@/entrypoints/enums/storageValues';
import { toInt } from '@/entrypoints/utils/search';
import { DEFAULTS } from '@/entrypoints/utils/settings';
import { setBadgeText } from '@/entrypoints/utils/browserAction';
import { openDailyRewards } from './dailyRewards';
import { startSearches, stopSearches } from './searchRunner';
import { clearTrackedTabs } from './tabCleanup';

const WEBSITE_URL = 'https://svitspindler.com/microsoft-automatic-rewards';

const DAILY_CHECK_ALARM = 'dailyCheck';
// onStartup only fires when the browser actually launches, so a long-lived
// session that never restarts across a day boundary used to miss the
// once-per-day gate below (checkLastOpened) entirely. This alarm re-runs that
// gate periodically so the day rollover is caught without needing a restart.
const DAILY_CHECK_PERIOD_MINUTES = 360;

// Runs whatever the user has enabled: the dashboard visit if "Daily set" or
// "Claim points" is on, and the Bing searches if "Daily searches" is on. Both
// the automatic daily trigger and the popup's "Get rewards" button call this, so
// the button respects the same toggles rather than forcing either run.
export async function runRewards(): Promise<void> {
    const s = await getStorageItems(
        ['searches', 'timeout', 'closeTime', 'active', 'autoDaily', 'claimPoints'],
        StorageValues.SYNC
    );
    const searchTimeout = toInt(s.timeout, DEFAULTS.timeout);
    const searches = toInt(s.searches, DEFAULTS.searches);
    const closeTime = toInt(s.closeTime, DEFAULTS.closeTime);
    const isDailySetEnabled = s.autoDaily ?? DEFAULTS.autoDaily;
    const isClaimEnabled = s.claimPoints ?? DEFAULTS.claimPoints;
    const isSearchesEnabled = s.active ?? DEFAULTS.active;

    // The dashboard visit is deliberately NOT awaited: the two runs are
    // independent. Awaiting it used to serialise the searches behind the
    // dashboard tab reporting "complete", so a dashboard closed by the user,
    // removed by our own safety timer, or lost to a torn-down service worker
    // meant not a single search ran that day. One tab covers both dashboard
    // jobs — two would fight over the foreground, and the SPA only renders while
    // it is visible.
    if (isDailySetEnabled || isClaimEnabled) {
        void openDailyRewards({
            doDailySet: isDailySetEnabled,
            doClaim: isClaimEnabled,
        }).catch(() => {});
    }
    if (isSearchesEnabled && searches > 0) {
        await startSearches(searchTimeout, searches, closeTime);
    }
}

export async function checkLastOpened(): Promise<void> {
    const today = new Date().toLocaleDateString();
    const s = await getStorageItems(['lastOpened'], StorageValues.SYNC);
    if (s.lastOpened !== today) {
        await runRewards();
        await setStorageItem('lastOpened', today, StorageValues.SYNC);
    }
}

export function isDailyCheckAlarm(name: string): boolean {
    return name === DAILY_CHECK_ALARM;
}

// Armed only while at least one daily feature is on, so a fully disabled
// extension is not woken every few hours for nothing — the same discipline
// tabCleanup uses for its sweep alarm.
export async function scheduleDailyCheckAlarm(): Promise<void> {
    const s = await getStorageItems(['active', 'autoDaily', 'claimPoints'], StorageValues.SYNC);
    const isEnabled =
        (s.active ?? DEFAULTS.active) ||
        (s.autoDaily ?? DEFAULTS.autoDaily) ||
        (s.claimPoints ?? DEFAULTS.claimPoints);
    if (isEnabled) {
        browser.alarms.create(DAILY_CHECK_ALARM, { periodInMinutes: DAILY_CHECK_PERIOD_MINUTES });
    } else {
        await browser.alarms.clear(DAILY_CHECK_ALARM);
    }
}

export async function handleDailyCheckAlarm(alarm: { name: string }): Promise<void> {
    if (alarm.name !== DAILY_CHECK_ALARM) return;
    await checkLastOpened();
}

// Re-arms (or disarms) the alarm the moment a relevant toggle changes, so
// turning a daily feature on/off takes effect immediately rather than waiting
// for the next restart — including a toggle synced in from another device.
export function watchDailyFeatureToggles(): void {
    storage.watch<boolean>('sync:active', () => void scheduleDailyCheckAlarm());
    storage.watch<boolean>('sync:autoDaily', () => void scheduleDailyCheckAlarm());
    storage.watch<boolean>('sync:claimPoints', () => void scheduleDailyCheckAlarm());
}

export async function handleInstallOrUpdate(details: { reason: string }): Promise<void> {
    if (details.reason === 'install') {
        await setStorageItems({
            active: DEFAULTS.active,
            autoDaily: DEFAULTS.autoDaily,
            accountLevel: DEFAULTS.accountLevel,
            timeout: DEFAULTS.timeout,
            searches: DEFAULTS.searches,
            closeTime: DEFAULTS.closeTime,
            openFirstResult: DEFAULTS.openFirstResult,
            claimPoints: DEFAULTS.claimPoints,
            isSearching: false,
            currentSearch: 0,
        }, StorageValues.SYNC);
        await browser.runtime.setUninstallURL(
            `https://svitspindler.com/uninstall?extension=${encodeURI('Microsoft Automatic Rewards')}`
        );
        setTimeout(() => { browser.tabs.create({ url: WEBSITE_URL, active: true }); }, 1000);
    } else if (details.reason === 'update') {
        setBadgeText('New');
    }
}

export async function handleStartup(): Promise<void> {
    // A search run never survives a browser restart, so clear its state *before*
    // today's run is considered: alarms outlive the session and would resume
    // opening Bing tabs on their own, and resetting the flag afterwards used to
    // clobber the `isSearching` that a fresh run had just set.
    await stopSearches();
    await setStorageItems({ currentSearch: 0 }, StorageValues.SYNC);
    // Tab ids do not survive a browser restart, so anything still registered for
    // cleanup points at tabs that no longer exist.
    await clearTrackedTabs();
    const s = await getStorageItems(['active', 'autoDaily', 'claimPoints'], StorageValues.SYNC);
    if (s.active || s.autoDaily || s.claimPoints) await checkLastOpened();
    await scheduleDailyCheckAlarm();
}
