import { describe, it, expect, afterEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import { t, tPlural, uiLocale } from './i18n';

// The shared test setup (vitest.setup.ts) answers browser.i18n from the English
// catalogue, resolved the way the browsers do, with an en-US UI language.
afterEach(() => {
  vi.restoreAllMocks();
});

describe('t', () => {
  it('returns the message for a plain key', () => {
    expect(t('getRewardsButton')).toBe('Get rewards');
  });

  it('fills in a substitution', () => {
    expect(t('searchGapWarning', '60')).toBe('Very short gaps may look automated. Try 60s.');
  });

  it('passes the key and substitutions to the browser unchanged', () => {
    const getMessage = vi.spyOn(fakeBrowser.i18n, 'getMessage');

    t('progressBarLabel_other', ['3', '5']);

    expect(getMessage).toHaveBeenCalledExactlyOnceWith('progressBarLabel_other', ['3', '5']);
  });
});

describe('tPlural', () => {
  it('uses the _one message for a count of one', () => {
    expect(tPlural('sponsorCardTitle', 1)).toBe('1 search run done for you');
  });

  it('uses the _other message for any other count', () => {
    expect(tPlural('sponsorCardTitle', 30)).toBe('30 search runs done for you');
    expect(tPlural('sponsorCardTitle', 0)).toBe('0 search runs done for you');
  });

  // A Russian UI with no Russian catalogue is served English text, and Russian
  // rules would call 31 "one". The form must follow the catalogue actually served.
  it('picks the form by the served catalogue language, not the browser UI language', () => {
    vi.spyOn(fakeBrowser.i18n, 'getUILanguage').mockReturnValue('ru');
    const getMessage = fakeBrowser.i18n.getMessage;
    vi.spyOn(fakeBrowser.i18n, 'getMessage').mockImplementation((name: string, substitutions?: string | string[]) =>
      name === 'localeTag' ? 'en' : getMessage(name, substitutions),
    );

    expect(tPlural('sponsorCardTitle', 31)).toBe('31 search runs done for you');
  });

  // French counts 0 as "one"; English doesn't.
  it('uses the served catalogue plural rules for other languages too', () => {
    const getMessage = fakeBrowser.i18n.getMessage;
    vi.spyOn(fakeBrowser.i18n, 'getMessage').mockImplementation((name: string, substitutions?: string | string[]) =>
      name === 'localeTag' ? 'fr' : getMessage(name, substitutions),
    );

    expect(tPlural('sponsorCardTitle', 0)).toBe('0 search run done for you');
  });

  it('uses given substitutions instead of the count', () => {
    expect(tPlural('progressBarLabel', 5, ['3', '5'])).toBe('3 of 5 daily searches done');
  });
});

describe('uiLocale', () => {
  it('is the browser UI language', () => {
    vi.spyOn(fakeBrowser.i18n, 'getUILanguage').mockReturnValue('de-AT');

    expect(uiLocale()).toBe('de-AT');
  });
});
