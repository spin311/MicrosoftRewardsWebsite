import { browser } from 'wxt/browser';
import type englishMessages from '@/public/_locales/en/messages.json';

// Every user-visible string lives in public/_locales/<locale>/messages.json and
// is read through the browser's own i18n, which falls back to English (the
// manifest's default_locale) for any language without a translation.

// Names come from the English catalogue, so a typo or a removed message is a
// compile error rather than a blank label. A type-only import: the catalogue
// itself is not bundled.
export type MessageKey = keyof typeof englishMessages;

// A counted message's name without its _one/_other suffix.
export type PluralMessageKey = {
    [K in MessageKey]: K extends `${infer Name}_other` ? (`${Name}_one` extends MessageKey ? Name : never) : never;
}[MessageKey];

export function uiLocale(): string {
    return browser.i18n.getUILanguage();
}

export function t(key: MessageKey, substitutions?: string | string[]): string {
    return browser.i18n.getMessage(key, substitutions);
}

// The _one or _other form of a message, chosen for `count` by the browser's UI
// language. The count itself is the substitution unless others are given.
export function tPlural(key: PluralMessageKey, count: number, substitutions: string[] = [String(count)]): string {
    const form = new Intl.PluralRules(uiLocale()).select(count) === 'one' ? 'one' : 'other';
    return t(`${key}_${form}`, substitutions);
}
