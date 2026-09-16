import { describe, it, expect } from 'vitest';
import { findClaimButton, findCloseButton, isClaimable } from './claimCard';

const CLAIM_ICON = 'https://bing.com/th?id=OMR.Icons.CoinsTransparent.svg&amp;pid=Rewards&amp;qlt=100&amp;r=0';
const POINTS_ICON = 'https://bing.com/th?id=OMR.Icons.Coins.svg&amp;pid=Rewards&amp;qlt=100&amp;r=0';

// The dashboard's summary grid, trimmed of Bing's hashed utility classes but
// keeping every attribute the matcher actually looks at. "Available points" is
// the near-miss that matters: same shape, one icon name apart.
function dashboardGrid(): HTMLElement {
    const root = document.createElement('div');
    root.innerHTML = `
      <div class="grid">
        <a href="/redeem" id="available">
          <img alt="Available points" src="${POINTS_ICON}" width="32" height="32">
          <p>2,691</p><p>Redeem</p>
        </a>
        <button type="button" aria-expanded="false" id="claimable">
          <p>Ready to claim</p>
          <img alt="Ready to claim" src="${CLAIM_ICON}" width="32" height="32">
          <p>130</p><p>Claim</p>
        </button>
      </div>`;
    return root;
}

// The flyout opened by the dashboard card. The visible "Claim points" label is a
// presentational div; the click target is the <button> wrapping the whole card.
function claimDialog({ isDisabled = false } = {}): HTMLElement {
    const root = document.createElement('div');
    root.innerHTML = `
      <section role="dialog" aria-labelledby="t" tabindex="-1">
        <h2 id="t">Claim points</h2>
        <button type="button" aria-label="Close" slot="close" id="close"></button>
        <button type="button" id="claim-action">
          <img alt="Points" src="${CLAIM_ICON}" width="40" height="40">
          <p>130</p><p>Pending</p>
          <div${isDisabled ? ' data-disabled="true"' : ''}><span>Claim points</span></div>
        </button>
        <a href="/earn"><span>Earn more points</span></a>
      </section>`;
    return root;
}

describe('findClaimButton', () => {
    it('finds the "Ready to claim" card and ignores the "Available points" card next to it', () => {
        const button = findClaimButton(dashboardGrid());

        expect(button?.id).toBe('claimable');
    });

    it('returns the button ancestor, not the icon or the "Claim points" label', () => {
        const button = findClaimButton(claimDialog());

        expect(button?.tagName).toBe('BUTTON');
        expect(button?.id).toBe('claim-action');
    });

    it('scopes to the dialog when the dashboard card is still in the document behind it', () => {
        const root = document.createElement('div');
        root.append(dashboardGrid(), claimDialog());
        const dialog = root.querySelector<HTMLElement>('[role="dialog"]')!;

        expect(findClaimButton(root)?.id).toBe('claimable');
        expect(findClaimButton(dialog)?.id).toBe('claim-action');
    });

    // `OMR.Icons.Coins.svg` is a prefix of `OMR.Icons.CoinsTransparent.svg`, so a
    // selector matching the shorter name would claim the wrong card. Today that
    // card is an <a>, which the button climb would reject anyway — render it as a
    // button so the assertion tests the icon name and nothing else.
    it('does not match the "Available points" card even when it is a button', () => {
        const root = document.createElement('div');
        root.innerHTML = `
          <div class="grid">
            <button type="button" id="available">
              <img alt="Available points" src="${POINTS_ICON}" width="32" height="32">
              <p>2,691</p><p>Redeem</p>
            </button>
          </div>`;

        expect(findClaimButton(root)).toBeNull();
    });

    it('returns null when nothing on the page carries the claim icon', () => {
        const root = document.createElement('div');
        root.innerHTML = `
          <div class="grid">
            <a href="/redeem"><img alt="Available points" src="${POINTS_ICON}"></a>
            <a href="/redeem">Redeem</a>
          </div>`;

        expect(findClaimButton(root)).toBeNull();
    });

    it('returns null when the claim icon is not inside a button', () => {
        const root = document.createElement('div');
        root.innerHTML = `<div><img alt="Points" src="${CLAIM_ICON}"></div>`;

        expect(findClaimButton(root)).toBeNull();
    });
});

describe('isClaimable', () => {
    it('accepts the button while points are still pending', () => {
        const button = findClaimButton(claimDialog())!;

        expect(isClaimable(button)).toBe(true);
    });

    it('rejects the button once the points have been claimed', () => {
        const button = findClaimButton(claimDialog({ isDisabled: true }))!;

        expect(isClaimable(button)).toBe(false);
    });

    it('rejects a button disabled on the element itself', () => {
        const button = findClaimButton(claimDialog())!;
        (button as HTMLButtonElement).disabled = true;

        expect(isClaimable(button)).toBe(false);
    });

    it('rejects a button marked data-disabled on the element itself', () => {
        const button = findClaimButton(claimDialog())!;
        button.setAttribute('data-disabled', 'true');

        expect(isClaimable(button)).toBe(false);
    });
});

describe('findCloseButton', () => {
    it('finds the dismiss control by its slot rather than its localised label', () => {
        const dialog = claimDialog().querySelector<HTMLElement>('[role="dialog"]')!;

        expect(findCloseButton(dialog)?.id).toBe('close');
    });

    it('returns null when the dialog has no dismiss control', () => {
        const root = document.createElement('div');
        root.innerHTML = `<section role="dialog"><h2>Claim points</h2></section>`;

        expect(findCloseButton(root)).toBeNull();
    });
});
