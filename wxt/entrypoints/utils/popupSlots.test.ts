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
      .toEqual({ showRunPanel: false, lower: 'loading' });
  });

  it('shows nothing in either slot until the prompt state has loaded', () => {
    expect(choosePopupSlots({ ...LOADED, isPromptLoaded: false, completedSearches: 5 }))
      .toEqual({ showRunPanel: false, lower: 'loading' });
  });

  it('shows the promo tiles and no panel when nothing has run and no card is due', () => {
    expect(choosePopupSlots(LOADED)).toEqual({ showRunPanel: false, lower: 'tiles' });
  });

  it('shows a finished run\'s panel with the promo tiles when no card is due', () => {
    expect(choosePopupSlots({ ...LOADED, completedSearches: 5 }))
      .toEqual({ showRunPanel: true, lower: 'tiles' });
  });

  // Together they overflow Chrome's 600px popup.
  it('shows a due card instead of a finished run\'s panel', () => {
    expect(choosePopupSlots({ ...LOADED, completedSearches: 5, dueCard: 'review' }))
      .toEqual({ showRunPanel: false, lower: 'review' });
    expect(choosePopupSlots({ ...LOADED, completedSearches: 5, dueCard: 'sponsor' }))
      .toEqual({ showRunPanel: false, lower: 'sponsor' });
  });

  it('keeps a running run\'s panel and holds a due card back for a later popup', () => {
    expect(choosePopupSlots({ ...LOADED, isSearching: true, dueCard: 'review' }))
      .toEqual({ showRunPanel: true, lower: 'tiles' });
  });

  // Otherwise its result would vanish under the card the moment it finished.
  it('keeps the panel of a run that finished while the popup was open, and the card waits', () => {
    expect(choosePopupSlots({ ...LOADED, wasSearchingThisPopup: true, completedSearches: 5, dueCard: 'review' }))
      .toEqual({ showRunPanel: true, lower: 'tiles' });
  });
});
