// @vitest-environment node
// Background search runner needs no DOM; node avoids the esbuild/jsdom clash
// that WXT's `#imports` transform triggers (same reason as useStorage.test.ts).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import { handleAlarmStep, startSearches, stopSearches } from './searchRunner';
import { getStorageItem, setStorageItems } from '@/entrypoints/hooks/useStorage';
import { StorageValues } from '@/entrypoints/enums/storageValues';

const ALARM = { name: 'openTabAlarm' };

async function seed(values: Record<string, unknown>): Promise<void> {
  await setStorageItems(
    { active: true, searches: 5, timeout: 60, closeTime: 5, openFirstResult: false, ...values },
    StorageValues.SYNC
  );
}

describe('searchRunner', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
  });

  describe('startSearches', () => {
    it('opens the first tab and records progress as 1', async () => {
      const create = vi.spyOn(fakeBrowser.tabs, 'create');
      await seed({});

      await startSearches(60, 5, 5);

      expect(create).toHaveBeenCalledTimes(1);
      expect(await getStorageItem<number>('currentSearch', StorageValues.SYNC)).toBe(1);
      expect(await getStorageItem<boolean>('isSearching', StorageValues.SYNC)).toBe(true);
    });
  });

  describe('handleAlarmStep', () => {
    it('ignores alarms it does not own', async () => {
      const create = vi.spyOn(fakeBrowser.tabs, 'create');
      await seed({ currentSearch: 1 });

      await handleAlarmStep({ name: 'someOtherAlarm' });

      expect(create).not.toHaveBeenCalled();
    });

    it('opens the next tab and advances the recorded progress', async () => {
      const create = vi.spyOn(fakeBrowser.tabs, 'create');
      await seed({ currentSearch: 1, isSearching: true });

      await handleAlarmStep(ALARM);

      expect(create).toHaveBeenCalledTimes(1);
      expect(await getStorageItem<number>('currentSearch', StorageValues.SYNC)).toBe(2);
      expect(await getStorageItem<boolean>('isSearching', StorageValues.SYNC)).toBe(true);
    });

    it('records the final search before ending the run', async () => {
      // Regression: the last step used to end the run without storing the count,
      // so the popup froze at 4/5 even though 5 searches had run.
      await seed({ currentSearch: 4, isSearching: true });

      await handleAlarmStep(ALARM);

      expect(await getStorageItem<number>('currentSearch', StorageValues.SYNC)).toBe(5);
      expect(await getStorageItem<boolean>('isSearching', StorageValues.SYNC)).toBe(false);
    });

    it('opens no more tabs once every search has run', async () => {
      const create = vi.spyOn(fakeBrowser.tabs, 'create');
      await seed({ currentSearch: 5, isSearching: true });

      await handleAlarmStep(ALARM);

      expect(create).not.toHaveBeenCalled();
      expect(await getStorageItem<boolean>('isSearching', StorageValues.SYNC)).toBe(false);
    });

    it('stops instead of searching when "Daily searches" is turned off', async () => {
      // Regression: an alarm scheduled while the toggle was on kept opening Bing
      // tabs after the user unchecked it (alarms survive a browser restart), so
      // a daily-set-only setup still made searches.
      const create = vi.spyOn(fakeBrowser.tabs, 'create');
      await seed({ active: false, currentSearch: 1, isSearching: true });

      await handleAlarmStep(ALARM);

      expect(create).not.toHaveBeenCalled();
      expect(await getStorageItem<boolean>('isSearching', StorageValues.SYNC)).toBe(false);
      expect(await fakeBrowser.alarms.getAll()).toEqual([]);
    });
  });

  describe('stopSearches', () => {
    it('clears the running flag and any pending alarm', async () => {
      await seed({ isSearching: true });
      fakeBrowser.alarms.create('openTabAlarm', { delayInMinutes: 1 });

      await stopSearches();

      expect(await getStorageItem<boolean>('isSearching', StorageValues.SYNC)).toBe(false);
      expect(await fakeBrowser.alarms.get('openTabAlarm')).toBeUndefined();
    });

    // Regression: this used to clearAll(), which also wiped the tab-cleanup
    // sweep and left every tab the run had opened on screen for good.
    it('leaves the tab-cleanup alarm running', async () => {
      await seed({ isSearching: true });
      fakeBrowser.alarms.create('closeStaleTabs', { periodInMinutes: 1 });

      await stopSearches();

      expect(await fakeBrowser.alarms.get('closeStaleTabs')).toBeDefined();
    });
  });

  describe('scheduling the next step', () => {
    // Regression: every gap was scheduled as an alarm, and Chrome rounds any
    // alarm under 30s up to 30s — so a user asking for 5s waited 30s.
    it('runs a sub-30s gap from an in-worker timer', async () => {
      vi.useFakeTimers();
      try {
        const create = vi.spyOn(fakeBrowser.tabs, 'create');
        await seed({ currentSearch: 1, isSearching: true, timeout: 5 });

        await handleAlarmStep(ALARM);
        expect(create).toHaveBeenCalledTimes(1);

        // base 5s ±20% → the next search is due within 6s.
        await vi.advanceTimersByTimeAsync(6_000);

        expect(create).toHaveBeenCalledTimes(2);
        expect(await getStorageItem<number>('currentSearch', StorageValues.SYNC)).toBe(3);
      } finally {
        vi.useRealTimers();
      }
    });

    // The timer above dies with the service worker, so an alarm is armed at the
    // 30s platform minimum to resume the run rather than let it stall.
    it('still arms a backstop alarm for a sub-30s gap', async () => {
      await seed({ currentSearch: 1, isSearching: true, timeout: 5 });

      const before = Date.now();
      await handleAlarmStep(ALARM);

      const alarm = await fakeBrowser.alarms.get('openTabAlarm');
      // Armed at the 30s platform minimum, not at the 5s the timer handles.
      expect(alarm?.scheduledTime ?? 0).toBeGreaterThanOrEqual(before + 30_000);
    });

    it('leaves a 30s-or-longer gap to the alarm alone', async () => {
      vi.useFakeTimers();
      try {
        const create = vi.spyOn(fakeBrowser.tabs, 'create');
        await seed({ currentSearch: 1, isSearching: true, timeout: 60 });

        await handleAlarmStep(ALARM);
        await vi.advanceTimersByTimeAsync(120_000);

        expect(create).toHaveBeenCalledTimes(1);
        expect(await fakeBrowser.alarms.get('openTabAlarm')).toBeDefined();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('search tab cleanup', () => {
    // A search tab's own close timer does not survive the service worker being
    // torn down, so every one is registered for the durable sweep as well.
    it('registers each search tab for the durable sweep', async () => {
      await seed({});

      await startSearches(60, 5, 5);

      const tracked = await getStorageItem<Record<string, number>>('trackedTabs', StorageValues.LOCAL);
      expect(Object.keys(tracked ?? {})).toHaveLength(1);
      expect(await fakeBrowser.alarms.get('closeStaleTabs')).toBeDefined();
    });
  });
});
