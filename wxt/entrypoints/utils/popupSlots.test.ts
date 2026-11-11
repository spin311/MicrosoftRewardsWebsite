// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { choosePopupSlots, type PopupSlotInputs } from './popupSlots';

const LOADED: PopupSlotInputs = {
  isRunStateLoaded: true,
  isSearching: false,
  wasSearchingThisPopup: false,
  completedSearches: 0,
  isPromptLoaded: true,
  dueCard: null,
};

describe('choosePopupSlots', () => {
  it('shows nothing in either slot until the run state has loaded', () => {
    expect(choosePopupSlots({ ...LOADED, isRunStateLoaded: false, dueCard: 'review' }))
      .toEqual({ showRunPanel: false, lower: 'loading', showFooter: false });
  });

  it('shows nothing in either slot until the prompt state has loaded', () => {
    expect(choosePopupSlots({ ...LOADED, isPromptLoaded: false, completedSearches: 5 }))
      .toEqual({ showRunPanel: false, lower: 'loading', showFooter: false });
  });

  it('shows the promo tiles and no panel when nothing has run and no card is due', () => {
    expect(choosePopupSlots(LOADED)).toEqual({ showRunPanel: false, lower: 'tiles', showFooter: true });
  });

  it('shows a finished run\'s panel with the promo tiles when no card is due', () => {
    expect(choosePopupSlots({ ...LOADED, completedSearches: 5 }))
      .toEqual({ showRunPanel: true, lower: 'tiles', showFooter: true });
  });

  // Together they overflow Chrome's 600px popup.
  it('shows a due card instead of a finished run\'s panel', () => {
    expect(choosePopupSlots({ ...LOADED, completedSearches: 5, dueCard: 'review' }))
      .toEqual({ showRunPanel: false, lower: 'review', showFooter: true });
    expect(choosePopupSlots({ ...LOADED, completedSearches: 5, dueCard: 'sponsor' }))
      .toEqual({ showRunPanel: false, lower: 'sponsor', showFooter: false });
  });

  it('keeps a running run\'s panel and holds a due card back for a later popup', () => {
    expect(choosePopupSlots({ ...LOADED, isSearching: true, dueCard: 'review' }))
      .toEqual({ showRunPanel: true, lower: 'tiles', showFooter: true });
  });

  // Otherwise its result would vanish under the card the moment it finished.
  it('keeps the panel of a run that finished while the popup was open, and the card waits', () => {
    expect(choosePopupSlots({ ...LOADED, wasSearchingThisPopup: true, completedSearches: 5, dueCard: 'review' }))
      .toEqual({ showRunPanel: true, lower: 'tiles', showFooter: true });
  });

  // The sponsor card is two lines taller than the review card; with the short-gap
  // warning as well it would push the popup to 616px. It is the donate ask itself,
  // so the footer's Donate link adds nothing while it shows.
  it('hides the footer while the sponsor card shows, and keeps it for the review card', () => {
    expect(choosePopupSlots({ ...LOADED, dueCard: 'sponsor' }).showFooter).toBe(false);
    expect(choosePopupSlots({ ...LOADED, dueCard: 'review' }).showFooter).toBe(true);
  });

  // Otherwise it would show while storage loads, then vanish if the sponsor card is due.
  it('holds the footer back until the prompt state has loaded', () => {
    expect(choosePopupSlots({ ...LOADED, isPromptLoaded: false }).showFooter).toBe(false);
  });

  it('keeps the footer when a run holds the sponsor card back', () => {
    expect(choosePopupSlots({ ...LOADED, isSearching: true, dueCard: 'sponsor' }).showFooter).toBe(true);
  });
});
