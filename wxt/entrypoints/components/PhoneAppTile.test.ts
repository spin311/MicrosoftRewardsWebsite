import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import PhoneAppTile, { PHONE_APP_URL } from './PhoneAppTile';

// Tells React these renders run inside act(), so state updates flush synchronously.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

function tile(): HTMLButtonElement {
  return host.querySelector('button')!;
}

function panel(): HTMLElement {
  return host.querySelector<HTMLElement>('[role="group"]')!;
}

function isPanelShown(): boolean {
  return tile().getAttribute('aria-expanded') === 'true' && !panel().hidden;
}

function click(element: HTMLElement): void {
  act(() => element.click());
}

function pointerDownOn(target: EventTarget): void {
  act(() => target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
}

function pressEscape(): void {
  act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
}

describe('PhoneAppTile', () => {
  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root.render(createElement(PhoneAppTile)));
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it('starts as a closed tile', () => {
    expect(tile().textContent).toContain('Phone app');
    expect(isPanelShown()).toBe(false);
  });

  it('opens a QR code and a Google Play link when clicked', () => {
    click(tile());

    expect(isPanelShown()).toBe(true);
    expect(tile().getAttribute('aria-controls')).toBe(panel().id);
    expect(panel().querySelector('img')?.getAttribute('src')).toBe('/imgs/svgs/qr-code-app.svg');
    const link = panel().querySelector('a')!;
    expect(link.getAttribute('href')).toBe(PHONE_APP_URL);
    expect(link.getAttribute('target')).toBe('_blank');
  });

  // The referrer shows up in Play Console's acquisition reports.
  it('links the app\'s Play listing with the popup as referrer', () => {
    const url = new URL(PHONE_APP_URL);
    expect(url.host).toBe('play.google.com');
    expect(url.searchParams.get('id')).toBe('com.spin311.microsoft_automatic_rewards');
    expect(url.searchParams.get('referrer')).toBe('utm_source=extension&utm_medium=popup');
  });

  it('closes when the tile is clicked again', () => {
    click(tile());
    click(tile());

    expect(isPanelShown()).toBe(false);
  });

  it('closes on Escape and puts focus back on the tile', () => {
    click(tile());
    panel().querySelector('a')!.focus();

    pressEscape();

    expect(isPanelShown()).toBe(false);
    expect(document.activeElement).toBe(tile());
  });

  it('closes on a click outside it, but not on a click inside the panel', () => {
    click(tile());

    pointerDownOn(panel());
    expect(isPanelShown()).toBe(true);

    pointerDownOn(document.body);
    expect(isPanelShown()).toBe(false);
  });

  // A real click on the open tile is a pointerdown and then a click; the two must
  // not cancel out into "closed, then reopened".
  it('closes when the open tile itself is pressed', () => {
    click(tile());

    pointerDownOn(tile());
    click(tile());

    expect(isPanelShown()).toBe(false);
  });

  describe('with something focusable outside it', () => {
    let outside: HTMLInputElement;
    beforeEach(() => {
      outside = document.createElement('input');
      document.body.appendChild(outside);
    });
    afterEach(() => outside.remove());

    // Otherwise a keyboard user tabbing on leaves it floating over the settings.
    it('closes when keyboard focus moves out of it', () => {
      click(tile());
      act(() => panel().querySelector('a')!.focus());
      expect(isPanelShown()).toBe(true);

      act(() => outside.focus());

      expect(isPanelShown()).toBe(false);
    });

    it('leaves focus where it is on Escape while closed', () => {
      act(() => outside.focus());

      pressEscape();

      expect(document.activeElement).toBe(outside);
    });
  });
});
