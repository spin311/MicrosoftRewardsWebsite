import { wait } from './helpers';
import { findClaimButton, findCloseButton, isClaimable } from './claimCard';
import { waitForMatch } from './waitForMatch';

// The dashboard renders async, so each step waits for what it clicks. Both waits
// are bounded: "nothing to claim" is an ordinary day, not a failure.
const CLAIM_CARD_TIMEOUT_MS = 15000;
const CLAIM_DIALOG_TIMEOUT_MS = 10000;
// Let the claim request land before dismissing the flyout that issued it.
const CLAIM_SETTLE_MS = 2000;

// Reported rather than logged, so the caller (and the tests) can tell a real
// claim from the several ways there is simply nothing to do.
export type ClaimOutcome = 'claimed' | 'nothingToClaim' | 'noCard' | 'noDialog';

// The dashboard's "Ready to claim" card is only a trigger: it opens a flyout
// whose own card carries the button that actually claims. So this is two clicks,
// and the flyout is what reveals whether anything was pending at all.
export async function claimPoints(root: ParentNode & Node = document): Promise<ClaimOutcome> {
    const card = await waitForMatch(() => findClaimButton(root), CLAIM_CARD_TIMEOUT_MS, root);
    if (!card) return 'noCard';
    card.click();

    const claimButton = await waitForMatch(() => findClaimButtonInDialog(root), CLAIM_DIALOG_TIMEOUT_MS, root);
    if (!claimButton) return 'noDialog';

    if (!isClaimable(claimButton)) {
        dismissDialog(claimButton, root);
        return 'nothingToClaim';
    }
    claimButton.click();
    await wait(CLAIM_SETTLE_MS);
    dismissDialog(claimButton, root);
    return 'claimed';
}

// Scoped to the flyout on purpose: the dashboard card is still in the DOM behind
// it and carries the same icon, so an unscoped search would find the trigger
// again and click it a second time.
function findClaimButtonInDialog(root: ParentNode): HTMLButtonElement | null {
    for (const dialog of root.querySelectorAll('[role="dialog"]')) {
        const button = findClaimButton(dialog);
        if (button) return button;
    }
    return null;
}

// Close the flyout so a dashboard the user had open themselves isn't left stuck
// behind it. If the flyout closed itself on claiming, the button is detached and
// there is nothing to dismiss.
function dismissDialog(withinDialog: HTMLElement, root: ParentNode & Node): void {
    if (!root.contains(withinDialog)) return;
    const dialog = withinDialog.closest('[role="dialog"]');
    if (dialog) findCloseButton(dialog)?.click();
}
