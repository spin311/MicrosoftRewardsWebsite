// Footer cross-promotion for the developer's other extensions.

export interface CrossPromoLink {
    label: string;
    href: string;
}

const UTM = '?utm_source=MicrosoftRewardsWebsite-popup&utm_medium=cross-promo';

const STORE_URLS = {
    firefox: {
        games: 'https://addons.mozilla.org/firefox/addon/free-game-claime-steam-epic/',
        prolific: 'https://addons.mozilla.org/firefox/addon/prolific-studies-notifier/',
    },
    chromium: {
        games: 'https://chromewebstore.google.com/detail/free-game-claimer-for-ste/mndghaafpgiinfecbbbcppppiblmjepk',
        prolific: 'https://chromewebstore.google.com/detail/prolific-studies-notifier/mlicfddkgjkeajfgkihplfbgpmbonbao',
    },
} as const;

export function getCrossPromoLinks(isFirefox: boolean): CrossPromoLink[] {
    const urls = isFirefox ? STORE_URLS.firefox : STORE_URLS.chromium;
    return [
        { label: 'Free Game Claimer — free games from Epic, Steam, GOG & Prime', href: `${urls.games}${UTM}` },
        { label: 'Prolific Studies Notifier — alerts for paid studies', href: `${urls.prolific}${UTM}` },
    ];
}
