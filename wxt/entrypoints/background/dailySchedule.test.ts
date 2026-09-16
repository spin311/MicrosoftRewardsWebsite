// @vitest-environment node
// Background scheduling needs no DOM; node avoids the esbuild/jsdom clash that
// WXT's `#imports` transform triggers (same reason as searchRunner.test.ts).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import {
  handleDailyCheckAlarm,
  handleInstallOrUpdate,
  handleStartup,
  runRewards,
  scheduleDailyCheckAlarm,
} from './dailySchedule';
import { getStorageItem, setStorageItems } from '@/entrypoints/hooks/useStorage';
import { StorageValues } from '@/entrypoints/enums/storageValues';

const DASHBOARD_URL = 'https://rewards.bing.com/dashboard';

function trackCreatedTabs(): string[] {
  const urls: string[] = [];
  vi.spyOn(fakeBrowser.tabs, 'create').mockImplementation(async (info: any) => {
    urls.push(String(info.url));
    return { id: urls.length } as any;
  });
  return urls;
}

// The daily-set run is deliberately fire-and-forget, so it is still mid-flight
// when runRewards resolves; let its pending work settle before asserting on tabs.
async function flushPendingWork(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
}

async function seed(values: Record<string, unknown>): Promise<void> {
  await setStorageItems(
    { active: true, autoDaily: true, searches: 5, timeout: 60, closeTime: 5, ...values },
    StorageValues.SYNC
  );
}

describe('runRewards', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
    // The daily-set flow arms long safety timers that nothing in these tests
    // waits on; fake timers keep them from holding the run open.
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  // Regression: runRewards used to `await openDailyRewards()`, whose load promise
  // only resolved on the dashboard tab reporting "complete". A dashboard closed by
  // the user, removed by our own safety timer, or lost to a torn-down MV3 service
  // worker left that promise pending forever, so startSearches was never reached
  // and not a single search ran all day.
  it('starts the searches even when the dashboard never reports "complete"', async () => {
    const urls = trackCreatedTabs();
    await seed({});

    await runRewards();
    await flushPendingWork();

    expect(urls).toContain(DASHBOARD_URL);
    expect(urls.some((url) => url.startsWith('https://www.bing.com/search?q='))).toBe(true);
    expect(await getStorageItem<boolean>('isSearching', StorageValues.SYNC)).toBe(true);
  });

  it('opens no dashboard when "Daily set" is off, but still searches', async () => {
    const urls = trackCreatedTabs();
    await seed({ autoDaily: false });

    await runRewards();
    await flushPendingWork();

    expect(urls).not.toContain(DASHBOARD_URL);
    expect(urls.some((url) => url.startsWith('https://www.bing.com/search?q='))).toBe(true);
  });

  it('runs no searches when "Daily searches" is off, but still opens the dashboard', async () => {
    const urls = trackCreatedTabs();
    await seed({ active: false });

    await runRewards();
    await flushPendingWork();

    expect(urls).toEqual([DASHBOARD_URL]);
    expect(await getStorageItem<boolean>('isSearching', StorageValues.SYNC)).not.toBe(true);
  });

  // "Claim points" is the second job on the same dashboard tab, so it has to be
  // able to open that tab on its own — a user who only wants their points
  // claimed should not have to enable the daily set to get it.
  it('opens the dashboard for "Claim points" alone', async () => {
    const urls = trackCreatedTabs();
    await seed({ active: false, autoDaily: false, claimPoints: true });

    await runRewards();
    await flushPendingWork();

    expect(urls).toEqual([DASHBOARD_URL]);
  });

  // One tab covers both jobs: two would fight over the foreground, and the SPA
  // only renders while visible.
  it('opens a single dashboard when both dashboard jobs are on', async () => {
    const urls = trackCreatedTabs();
    await seed({ active: false, autoDaily: true, claimPoints: true });

    await runRewards();
    await flushPendingWork();

    expect(urls).toEqual([DASHBOARD_URL]);
  });

  it('opens nothing when every toggle is off', async () => {
    const urls = trackCreatedTabs();
    await seed({ active: false, autoDaily: false, claimPoints: false });

    await runRewards();
    await flushPendingWork();

    expect(urls).toEqual([]);
  });
});

describe('handleStartup', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  // The automatic daily run is the path users actually hit, so the "Daily set"
  // toggle has to be honoured there too, not just on the popup's button.
  it('opens no dashboard on the automatic daily run when "Daily set" is off', async () => {
    const urls = trackCreatedTabs();
    await seed({ active: true, autoDaily: false });

    await handleStartup();
    await flushPendingWork();

    expect(urls).not.toContain(DASHBOARD_URL);
    expect(urls.some((url) => url.startsWith('https://www.bing.com/search?q='))).toBe(true);
  });

  it('opens the dashboard on the automatic daily run when "Daily set" is on', async () => {
    const urls = trackCreatedTabs();
    await seed({ active: false, autoDaily: true });

    await handleStartup();
    await flushPendingWork();

    expect(urls).toEqual([DASHBOARD_URL]);
  });

  it('drops a tab registry left over from the previous session', async () => {
    // Both toggles off, so no run starts and re-registers tabs of its own.
    await seed({ active: false, autoDaily: false });
    await setStorageItems({ trackedTabs: { 7: 1 } }, StorageValues.LOCAL);

    await handleStartup();

    expect(await getStorageItem('trackedTabs', StorageValues.LOCAL)).toEqual({});
  });

  // The once-per-day gate used to only get re-checked on the next browser
  // restart; arming this alarm on startup is what lets it fire again on its own.
  it('arms the daily-check alarm when a daily feature is enabled', async () => {
    trackCreatedTabs();
    await seed({});

    await handleStartup();

    expect(await fakeBrowser.alarms.get('dailyCheck')).toBeDefined();
  });

  it('does not arm the daily-check alarm when every daily feature is off', async () => {
    trackCreatedTabs();
    await seed({ active: false, autoDaily: false });

    await handleStartup();

    expect(await fakeBrowser.alarms.get('dailyCheck')).toBeUndefined();
  });
});

describe('handleInstallOrUpdate', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  // "Open first result" navigates the search tab off the Bing results page, which
  // risks the search not being credited, so a fresh install must start with it off.
  it('seeds a new install with "open first result" disabled', async () => {
    trackCreatedTabs();
    // Not implemented by the fake browser, and irrelevant to what this asserts.
    vi.spyOn(fakeBrowser.runtime, 'setUninstallURL').mockResolvedValue(undefined);

    await handleInstallOrUpdate({ reason: 'install' });

    expect(await getStorageItem<boolean>('openFirstResult', StorageValues.SYNC)).toBe(false);
  });

  // Claiming clicks through a real transaction on the account, so it is opt-in:
  // a fresh install must not start out pressing it.
  it('seeds a new install with "claim points" disabled', async () => {
    trackCreatedTabs();
    vi.spyOn(fakeBrowser.runtime, 'setUninstallURL').mockResolvedValue(undefined);

    await handleInstallOrUpdate({ reason: 'install' });

    expect(await getStorageItem<boolean>('claimPoints', StorageValues.SYNC)).toBe(false);
  });
});

describe('scheduleDailyCheckAlarm', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
  });

  it('arms the alarm while a daily feature is enabled', async () => {
    await seed({});

    await scheduleDailyCheckAlarm();

    expect(await fakeBrowser.alarms.get('dailyCheck')).toBeDefined();
  });

  // "Claim points" alone (no daily set, no daily searches) still needs the
  // once-per-day gate to run, so it has to arm the alarm on its own too.
  it('arms the alarm when only "Claim points" is enabled', async () => {
    await seed({ active: false, autoDaily: false, claimPoints: true });

    await scheduleDailyCheckAlarm();

    expect(await fakeBrowser.alarms.get('dailyCheck')).toBeDefined();
  });

  // Regression: an alarm left armed from before the user disabled every daily
  // feature would keep waking the worker every few hours for nothing.
  it('clears an existing alarm once every daily feature is off', async () => {
    await seed({ active: false, autoDaily: false, claimPoints: false });
    fakeBrowser.alarms.create('dailyCheck', { periodInMinutes: 360 });

    await scheduleDailyCheckAlarm();

    expect(await fakeBrowser.alarms.get('dailyCheck')).toBeUndefined();
  });
});

describe('handleDailyCheckAlarm', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('ignores alarms it does not own', async () => {
    const urls = trackCreatedTabs();
    await seed({ lastOpened: 'not a real date' });

    await handleDailyCheckAlarm({ name: 'someOtherAlarm' });
    await flushPendingWork();

    expect(urls).toEqual([]);
  });

  // This is the case a browser session that spans midnight without a restart
  // used to miss entirely: nothing but a restart ever re-ran checkLastOpened.
  it('runs the daily tasks once the date has rolled over since the last run', async () => {
    const urls = trackCreatedTabs();
    await seed({ lastOpened: new Date(0).toLocaleDateString() });

    await handleDailyCheckAlarm({ name: 'dailyCheck' });
    await flushPendingWork();

    expect(urls).toContain(DASHBOARD_URL);
    expect(await getStorageItem<string>('lastOpened', StorageValues.SYNC)).toBe(new Date().toLocaleDateString());
  });

  it('does nothing when today has already run', async () => {
    const urls = trackCreatedTabs();
    await seed({ lastOpened: new Date().toLocaleDateString() });

    await handleDailyCheckAlarm({ name: 'dailyCheck' });
    await flushPendingWork();

    expect(urls).toEqual([]);
  });
});
