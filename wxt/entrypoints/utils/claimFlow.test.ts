import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { claimPoints } from './claimFlow';

const CLAIM_ICON = 'https://bing.com/th?id=OMR.Icons.CoinsTransparent.svg&amp;pid=Rewards';

// Stands in for the dashboard: a "Ready to claim" card that, like the real SPA,
// renders the flyout only in response to being clicked.
function dashboard({ dialog }: { dialog?: () => string } = {}): HTMLElement {
    const root = document.createElement('div');
    document.body.append(root);
    root.innerHTML = `
      <div class="grid">
        <button type="button" id="card">
          <p>Ready to claim</p>
          <img alt="Ready to claim" src="${CLAIM_ICON}">
          <p>130</p>
        </button>
      </div>`;
    if (dialog) {
        root.querySelector('#card')!.addEventListener('click', () => {
            root.insertAdjacentHTML('beforeend', dialog());
        });
    }
    return root;
}

function dialogHtml({ isDisabled = false } = {}): string {
    return `
      <section role="dialog">
        <button type="button" slot="close" id="close"></button>
        <button type="button" id="claim">
          <img alt="Points" src="${CLAIM_ICON}">
          <div${isDisabled ? ' data-disabled="true"' : ''}><span>Claim points</span></div>
        </button>
      </section>`;
}

// Delegated so it also captures the flyout, which does not exist yet when the
// run starts, and so the recording cannot miss a click by being attached late.
function recordClicks(root: HTMLElement): string[] {
    const clicked: string[] = [];
    root.addEventListener('click', (event) => {
        const target = (event.target as HTMLElement).closest('[id]');
        if (target) clicked.push(target.id);
    });
    return clicked;
}

describe('claimPoints', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    // The whole sequence in one assertion: press the card, press claim in the
    // flyout it opens, dismiss the flyout. `card` appearing exactly once is the
    // guard on scoping the second search to the dialog — the card stays in the
    // DOM behind the flyout carrying the same icon, so an unscoped search would
    // find the trigger again and press it a second time.
    it('presses the card, then claim in the flyout, then dismisses it', async () => {
        const root = dashboard({ dialog: () => dialogHtml() });
        const clicked = recordClicks(root);

        const outcome = await runToCompletion(claimPoints(root));

        expect(outcome).toBe('claimed');
        expect(clicked).toEqual(['card', 'claim', 'close']);
    });

    // The points were already claimed today. Pressing anyway is the one outcome
    // worth being careful about, since it acts on a live account.
    it('does not press claim when the flyout reports nothing pending', async () => {
        const root = dashboard({ dialog: () => dialogHtml({ isDisabled: true }) });
        const clicked = recordClicks(root);

        const outcome = await runToCompletion(claimPoints(root));

        expect(outcome).toBe('nothingToClaim');
        expect(clicked).toEqual(['card', 'close']);
    });

    it('gives up rather than hanging when the dashboard has no claim card', async () => {
        const root = document.createElement('div');
        document.body.append(root);
        root.innerHTML = '<div class="grid"><a href="/redeem">Redeem</a></div>';
        const clicked = recordClicks(root);

        const outcome = await runToCompletion(claimPoints(root));

        expect(outcome).toBe('noCard');
        expect(clicked).toEqual([]);
    });

    it('gives up rather than hanging when the flyout never opens', async () => {
        const root = dashboard();
        const clicked = recordClicks(root);

        const outcome = await runToCompletion(claimPoints(root));

        expect(outcome).toBe('noDialog');
        expect(clicked).toEqual(['card']);
    });

    it('reports a claim even when the flyout closes itself, with nothing left to dismiss', async () => {
        const root = dashboard({ dialog: () => dialogHtml() });
        root.addEventListener('click', (event) => {
            if ((event.target as HTMLElement).closest('#claim')) {
                root.querySelector('[role="dialog"]')!.remove();
            }
        });
        const clicked = recordClicks(root);

        const outcome = await runToCompletion(claimPoints(root));

        expect(outcome).toBe('claimed');
        expect(clicked).toEqual(['card', 'claim']);
    });
});

// Long enough to run past every timeout and settle delay in the flow.
async function runToCompletion<T>(pending: Promise<T>): Promise<T> {
    await vi.advanceTimersByTimeAsync(60000);
    return pending;
}
