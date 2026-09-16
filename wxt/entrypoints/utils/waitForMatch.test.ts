import { describe, it, expect, vi } from 'vitest';
import { waitForMatch } from './waitForMatch';

function freshRoot(): HTMLElement {
    const root = document.createElement('div');
    document.body.append(root);
    return root;
}

describe('waitForMatch', () => {
    it('resolves without waiting when the match is already there', async () => {
        const root = freshRoot();
        root.innerHTML = '<span id="target"></span>';

        const found = await waitForMatch(() => root.querySelector('#target'), 1000, root);

        expect((found as HTMLElement)?.id).toBe('target');
    });

    it('resolves as soon as the match is added later', async () => {
        const root = freshRoot();
        const pending = waitForMatch(() => root.querySelector('#target'), 1000, root);

        root.innerHTML = '<span id="target"></span>';

        expect(((await pending) as HTMLElement)?.id).toBe('target');
    });

    it('sees a match added deep inside an existing subtree', async () => {
        const root = freshRoot();
        root.innerHTML = '<div><section></section></div>';
        const pending = waitForMatch(() => root.querySelector('#target'), 1000, root);

        root.querySelector('section')!.innerHTML = '<span id="target"></span>';

        expect(((await pending) as HTMLElement)?.id).toBe('target');
    });

    it('resolves null when the match never appears, instead of hanging', async () => {
        const root = freshRoot();

        expect(await waitForMatch(() => root.querySelector('#target'), 20, root)).toBeNull();
    });

    it('treats an empty result as "not yet" so callers can wait on a collection', async () => {
        const root = freshRoot();
        const probe = () => {
            const found = [...root.querySelectorAll('a')];
            return found.length > 0 ? found : null;
        };
        const pending = waitForMatch(probe, 1000, root);

        root.innerHTML = '<a></a><a></a>';

        expect((await pending) as unknown[]).toHaveLength(2);
    });

    it('stops probing once it has resolved', async () => {
        const root = freshRoot();
        root.innerHTML = '<span id="target"></span>';
        const probe = vi.fn(() => root.querySelector('#target'));

        await waitForMatch(probe, 1000, root);
        const callsAtResolve = probe.mock.calls.length;
        root.append(document.createElement('span'));
        await new Promise((r) => setTimeout(r, 20));

        expect(probe.mock.calls.length).toBe(callsAtResolve);
    });

    it('resolves null when there is no root to observe', async () => {
        expect(await waitForMatch(() => null, 1000, null)).toBeNull();
    });
});
