import { fakeBrowser } from 'wxt/testing';
import englishMessages from './public/_locales/en/messages.json';

// WXT's fake browser has no i18n: every call throws. This answers it from the
// English catalogue the way Chrome and Firefox do, so tests see the shipped
// English text. Plain functions rather than vi.spyOn: they survive both
// fakeBrowser.reset() and vi.restoreAllMocks(), and tests can still spy on them.

interface CatalogueEntry {
    message: string;
    placeholders?: Record<string, { content: string }>;
}

// Browsers match message and placeholder names case-insensitively.
const catalogue = new Map(
    Object.entries(englishMessages as Record<string, CatalogueEntry>).map(([name, entry]) => [
        name.toLowerCase(),
        {
            message: entry.message,
            placeholders: new Map(
                Object.entries(entry.placeholders ?? {}).map(([key, value]) => [key.toLowerCase(), value.content]),
            ),
        },
    ]),
);

// $name$ becomes its placeholder's content, then $1–$9 take the substitutions
// and $$ is a literal $. An unknown name gives '', as in the browsers.
function getMessage(messageName: string, substitutions?: string | Array<string | number>): string {
    const entry = catalogue.get(messageName.toLowerCase());
    if (!entry) return '';
    const values = substitutions === undefined ? [] : [substitutions].flat().map(String);
    const expanded = entry.message.replace(/\$([A-Za-z0-9_@]+)\$/g, (match, name: string) => {
        const content = entry.placeholders.get(name.toLowerCase());
        if (content === undefined) throw new Error(`Message "${messageName}" uses ${match}, which it does not define`);
        return content;
    });
    return expanded.replace(/\$(\$+|[1-9])/g, (_match, token: string) =>
        token.startsWith('$') ? token : (values[Number(token) - 1] ?? ''),
    );
}

Object.assign(fakeBrowser.i18n, {
    getMessage,
    getUILanguage: () => 'en-US',
});
