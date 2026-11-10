import { describe, it, expect } from 'vitest';
import { getCrossPromoLink } from './crossPromo';

describe('getCrossPromoLink', () => {
    it('links to the Free Game Claimer add-on page on Firefox, tagged with utm params', () => {
        expect(getCrossPromoLink(true).href).toBe(
            'https://addons.mozilla.org/firefox/addon/free-game-claime-steam-epic/?utm_source=MicrosoftRewardsWebsite-popup&utm_medium=cross-promo'
        );
    });

    it('links to the Free Game Claimer Chrome Web Store page otherwise, tagged with utm params', () => {
        expect(getCrossPromoLink(false).href).toBe(
            'https://chromewebstore.google.com/detail/free-game-claimer-for-ste/mndghaafpgiinfecbbbcppppiblmjepk?utm_source=MicrosoftRewardsWebsite-popup&utm_medium=cross-promo'
        );
    });

    it('keeps the purpose words in the label', () => {
        expect(getCrossPromoLink(false).label).toBe('Free Game Claimer — free games from Epic, Steam, GOG & Prime');
    });
});
