import { describe, it, expect } from 'vitest';
import { getCrossPromoLinks } from './crossPromo';

describe('getCrossPromoLinks', () => {
    it('links to the Firefox add-on pages on Firefox, tagged with utm params', () => {
        const [games, prolific] = getCrossPromoLinks(true);
        expect(games.href).toBe(
            'https://addons.mozilla.org/firefox/addon/free-game-claime-steam-epic/?utm_source=MicrosoftRewardsWebsite-popup&utm_medium=cross-promo'
        );
        expect(prolific.href).toBe(
            'https://addons.mozilla.org/firefox/addon/prolific-studies-notifier/?utm_source=MicrosoftRewardsWebsite-popup&utm_medium=cross-promo'
        );
    });

    it('links to the Chrome Web Store pages otherwise, tagged with utm params', () => {
        const [games, prolific] = getCrossPromoLinks(false);
        expect(games.href).toBe(
            'https://chromewebstore.google.com/detail/free-game-claimer-for-ste/mndghaafpgiinfecbbbcppppiblmjepk?utm_source=MicrosoftRewardsWebsite-popup&utm_medium=cross-promo'
        );
        expect(prolific.href).toBe(
            'https://chromewebstore.google.com/detail/prolific-studies-notifier/mlicfddkgjkeajfgkihplfbgpmbonbao?utm_source=MicrosoftRewardsWebsite-popup&utm_medium=cross-promo'
        );
    });

    it('keeps the purpose words in the labels', () => {
        const [games, prolific] = getCrossPromoLinks(false);
        expect(games.label).toBe('Free Game Claimer — free games from Epic, Steam, GOG & Prime');
        expect(prolific.label).toBe('Prolific Studies Notifier — alerts for paid studies');
    });
});
