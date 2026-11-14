import { t } from './i18n';

// Cross-promotion of the developer's other extension (the popup's Free games
// tile): the store page for the browser this copy runs in, tagged with UTM.

export interface CrossPromoLink {
    label: string;
    href: string;
}

const UTM = '?utm_source=MicrosoftRewardsWebsite-popup&utm_medium=cross-promo';

// A brand name: it stays in English in every language.
const FREE_GAME_CLAIMER_NAME = 'Free Game Claimer';

const FREE_GAME_CLAIMER_URLS = {
    firefox: 'https://addons.mozilla.org/firefox/addon/free-game-claime-steam-epic/',
    chromium: 'https://chromewebstore.google.com/detail/free-game-claimer-for-ste/mndghaafpgiinfecbbbcppppiblmjepk',
} as const;

export function getCrossPromoLink(isFirefox: boolean): CrossPromoLink {
    const url = isFirefox ? FREE_GAME_CLAIMER_URLS.firefox : FREE_GAME_CLAIMER_URLS.chromium;
    return { label: t('crossPromoLabel', FREE_GAME_CLAIMER_NAME), href: `${url}${UTM}` };
}
