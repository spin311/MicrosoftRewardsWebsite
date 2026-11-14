// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Guards the translations in public/_locales: every locale must offer exactly
// the English messages, with the same placeholders, within the stores' limits.
// A missing message would silently fall back to English; a dropped or renamed
// placeholder would lose a number or a name from the sentence.

const LOCALES_DIR = fileURLToPath(new URL('../../public/_locales/', import.meta.url));
// addons.mozilla.org rejects longer names; the Chrome Web Store, longer descriptions.
const NAME_MAX_LENGTH = 45;
const DESCRIPTION_MAX_LENGTH = 132;
// Chrome accepts only these characters in message names.
const MESSAGE_NAME = /^[A-Za-z0-9_]+$/;
const NAMED_PLACEHOLDER = /\$([A-Za-z0-9_@]+)\$/g;

interface Message {
  message: string;
  description?: string;
  placeholders?: Record<string, { content: string; example?: string }>;
}
type Catalogue = Record<string, Message>;

function readCatalogue(locale: string): Catalogue {
  return JSON.parse(readFileSync(`${LOCALES_DIR}${locale}/messages.json`, 'utf8')) as Catalogue;
}

// Browsers match placeholder names case-insensitively.
function placeholdersUsed(message: string): string[] {
  return [...message.matchAll(NAMED_PLACEHOLDER)].map((match) => match[1].toLowerCase()).sort();
}

function placeholdersDefined(entry: Message): Record<string, string> {
  return Object.fromEntries(
    Object.entries(entry.placeholders ?? {}).map(([name, placeholder]) => [name.toLowerCase(), placeholder.content]),
  );
}

// Folders only: macOS can leave a .DS_Store beside them.
const locales = readdirSync(LOCALES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
const english = readCatalogue('en');
const englishNames = Object.keys(english).sort();

describe('English catalogue', () => {
  it('names messages with letters, digits and underscores only', () => {
    expect(englishNames.filter((name) => !MESSAGE_NAME.test(name))).toEqual([]);
  });

  // Browsers look names up case-insensitively, so two such names collide.
  it('has no two names that differ only in case', () => {
    const lowerCase = englishNames.map((name) => name.toLowerCase());
    expect(new Set(lowerCase).size).toBe(lowerCase.length);
  });

  it('tells translators where every message appears', () => {
    expect(englishNames.filter((name) => !english[name].description?.trim())).toEqual([]);
  });
});

describe.each(locales)('%s catalogue', (locale) => {
  const catalogue = readCatalogue(locale);

  it('has exactly the English message names', () => {
    expect(Object.keys(catalogue).sort()).toEqual(englishNames);
  });

  it('uses the same placeholders as English in every message', () => {
    for (const name of englishNames) {
      const entry = catalogue[name];
      expect(placeholdersUsed(entry?.message ?? ''), name).toEqual(placeholdersUsed(english[name].message));
      expect(placeholdersDefined(entry ?? { message: '' }), name).toEqual(placeholdersDefined(english[name]));
    }
  });

  it('defines every placeholder its messages use', () => {
    for (const [name, entry] of Object.entries(catalogue)) {
      const defined = Object.keys(placeholdersDefined(entry));
      expect(placeholdersUsed(entry.message).filter((used) => !defined.includes(used)), name).toEqual([]);
    }
  });

  // A lone $ before a digit swallows text ("$2" becomes ""), so a dollar sign is written $$.
  it('writes every literal dollar sign as $$', () => {
    for (const [name, entry] of Object.entries(catalogue)) {
      const leftover = entry.message.replaceAll('$$', '').replace(NAMED_PLACEHOLDER, '');
      expect(leftover, name).not.toContain('$');
    }
  });

  it(`keeps extName within ${NAME_MAX_LENGTH} characters`, () => {
    expect(catalogue.extName.message.length).toBeLessThanOrEqual(NAME_MAX_LENGTH);
  });

  it(`keeps extDescription within ${DESCRIPTION_MAX_LENGTH} characters`, () => {
    expect(catalogue.extDescription.message.length).toBeLessThanOrEqual(DESCRIPTION_MAX_LENGTH);
  });
});
