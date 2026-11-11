import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, createElement, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import ReviewPromptCard from './ReviewPromptCard';
import SponsorMilestoneCard from './SponsorMilestoneCard';
import { ISSUES_URL } from '@/entrypoints/utils/reviewPrompt';

// Tells React these renders run inside act(), so state updates flush synchronously.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

function render(element: ReactElement): void {
  act(() => root.render(element));
}

function buttonNamed(name: string): HTMLButtonElement {
  const match = [...host.querySelectorAll('button')].find((b) => b.textContent?.trim() === name);
  if (!match) throw new Error(`No button named "${name}"`);
  return match;
}

function card(): HTMLElement {
  return host.querySelector<HTMLElement>('[role="region"]')!;
}

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('ReviewPromptCard', () => {
  it('asks about the extension by the name shown in the popup header', () => {
    render(createElement(ReviewPromptCard, { onRate: vi.fn(), onDismiss: vi.fn() }));

    expect(card().getAttribute('aria-label')).toBe('Rate this extension');
    expect(card().querySelector('h2')?.textContent).toBe('Enjoying Search automatic rewards?');
  });

  it('rates from the primary button', () => {
    const onRate = vi.fn();
    render(createElement(ReviewPromptCard, { onRate, onDismiss: vi.fn() }));

    act(() => buttonNamed('Rate it').click());

    expect(onRate).toHaveBeenCalledOnce();
  });

  it('dismisses from a visible "Not now" button beside the rate button', () => {
    const onDismiss = vi.fn();
    render(createElement(ReviewPromptCard, { onRate: vi.fn(), onDismiss }));

    const buttons = [...host.querySelectorAll('button')].map((b) => b.textContent?.trim());
    expect(buttons).toEqual(['Rate it', 'Not now']);

    act(() => buttonNamed('Not now').click());

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('links problem reports to GitHub issues in a new tab', () => {
    render(createElement(ReviewPromptCard, { onRate: vi.fn(), onDismiss: vi.fn() }));

    const link = host.querySelector('a')!;
    expect(link.textContent).toBe('Not working? Report it');
    expect(link.getAttribute('href')).toBe(ISSUES_URL);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });
});

describe('SponsorMilestoneCard', () => {
  it('thanks the user with their run count, highlighted', () => {
    render(createElement(SponsorMilestoneCard, { completedRuns: 30, onSponsor: vi.fn(), onDismiss: vi.fn() }));

    expect(card().getAttribute('aria-label')).toBe('Support this extension');
    const title = card().querySelector('h2')!;
    expect(title.textContent).toBe('30 search runs done for you');
    expect(title.querySelector('strong')?.textContent).toBe('30');
  });

  it('says why sponsoring matters', () => {
    render(createElement(SponsorMilestoneCard, { completedRuns: 30, onSponsor: vi.fn(), onDismiss: vi.fn() }));

    expect(card().querySelector('p')?.textContent).toBe('Free and built in my spare time. Sponsoring keeps it working when Bing changes.');
  });

  it('shows a decorative heart badge hidden from screen readers', () => {
    render(createElement(SponsorMilestoneCard, { completedRuns: 30, onSponsor: vi.fn(), onDismiss: vi.fn() }));

    const badge = card().querySelector('.prompt-card-badge')!;
    expect(badge.getAttribute('aria-hidden')).toBe('true');
  });

  it('sponsors from the primary button', () => {
    const onSponsor = vi.fn();
    render(createElement(SponsorMilestoneCard, { completedRuns: 30, onSponsor, onDismiss: vi.fn() }));

    act(() => buttonNamed('Sponsor from $2').click());

    expect(onSponsor).toHaveBeenCalledOnce();
  });

  it('dismisses from a visible "Not now" button after the sponsor button', () => {
    const onDismiss = vi.fn();
    render(createElement(SponsorMilestoneCard, { completedRuns: 30, onSponsor: vi.fn(), onDismiss }));

    const buttons = [...host.querySelectorAll('button')].map((b) => b.textContent?.trim());
    expect(buttons).toEqual(['Sponsor from $2', 'Not now']);

    act(() => buttonNamed('Not now').click());

    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
