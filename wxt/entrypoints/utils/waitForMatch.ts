// Waits for a DOM probe to find something, with a deadline. The rewards
// dashboard renders async, so content scripts have to wait for what they click —
// but every wait must be able to give up: "no daily set today" and "nothing to
// claim" are ordinary outcomes, not errors, and an observer that is never
// disconnected keeps firing for the life of the page.
export function waitForMatch<T>(
    probe: () => T | null,
    timeoutMs: number,
    observeRoot: Node | null = document.body,
): Promise<T | null> {
    return new Promise((resolve) => {
        // Probe once before observing: the match is often already rendered, and
        // a MutationObserver only reports changes made after it starts.
        const initial = probe();
        if (initial !== null) {
            resolve(initial);
            return;
        }
        if (!observeRoot) {
            resolve(null);
            return;
        }

        let isSettled = false;
        function settle(value: T | null): void {
            if (isSettled) return;
            isSettled = true;
            observer.disconnect();
            clearTimeout(giveUpTimer);
            resolve(value);
        }

        const observer = new MutationObserver(() => {
            const match = probe();
            if (match !== null) settle(match);
        });
        const giveUpTimer = setTimeout(() => settle(null), timeoutMs);
        observer.observe(observeRoot, { childList: true, subtree: true });
    });
}
