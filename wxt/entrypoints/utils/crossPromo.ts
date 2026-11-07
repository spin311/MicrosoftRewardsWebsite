// Footer cross-promotion for the developer's other extension.

export interface CrossPromoLink {
    label: string;
    href: string;
}

const UTM = '?utm_source=MicrosoftRewardsWebsite-popup&utm_medium=cross-promo';

const FREE_GAME_CLAIMER_URLS = {
    firefox: 'https://addons.mozilla.org/firefox/addon/free-game-claime-steam-epic/',
    chromium: 'https://chromewebstore.google.com/detail/free-game-claimer-for-ste/mndghaafpgiinfecbbbcppppiblmjepk',
} as const;

export function getCrossPromoLink(isFirefox: boolean): CrossPromoLink {
    const url = isFirefox ? FREE_GAME_CLAIMER_URLS.firefox : FREE_GAME_CLAIMER_URLS.chromium;
    return { label: 'Free Game Claimer — free games from Epic, Steam, GOG & Prime', href: `${url}${UTM}` };
}
