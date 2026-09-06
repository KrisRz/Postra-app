import { useCarouselStore } from './carousel.store';

/**
 * The slide list is the one piece of Studio state where an off-by-one silently
 * destroys work: the canvas holds the live design and the store decides which
 * slide it belongs to, so a wrong index writes one slide over another. Deleting
 * the active slide did exactly that.
 */

const reset = () => useCarouselStore.getState().exitCarouselMode();
const state = () => useCarouselStore.getState();

/** Enter carousel mode with `n` slides whose JSON is its own index. */
const seed = (n: number, activeIndex = 0) => {
  const store = useCarouselStore.getState();
  store.enterCarouselMode('slide-0');
  for (let i = 1; i < n; i += 1) store.addSlide(`slide-${i}`);
  // addSlide only *requests* a switch; the editor commits it. Do that here.
  useCarouselStore.setState({ currentSlideIndex: activeIndex, pendingSlideSwitch: null });
};

beforeEach(reset);
afterAll(reset);

describe('deleteSlide', () => {
  it('keeps the remaining slides in order', () => {
    seed(3, 0);
    state().deleteSlide(1);
    expect(state().slides.map((s) => s.canvasJson)).toEqual(['slide-0', 'slide-2']);
  });

  it('refuses to remove the last slide', () => {
    seed(1);
    state().deleteSlide(0);
    expect(state().slides).toHaveLength(1);
  });

  it('shifts the active index when an earlier slide goes', () => {
    seed(3, 2);
    state().deleteSlide(0);
    expect(state().currentSlideIndex).toBe(1);
    // The canvas still shows the same design, so nothing needs reloading.
    expect(state().pendingSlideSwitch).toBeNull();
    expect(state().discardLiveOnSwitch).toBe(false);
  });

  it('leaves the active index alone when a later slide goes', () => {
    seed(3, 0);
    state().deleteSlide(2);
    expect(state().currentSlideIndex).toBe(0);
    expect(state().pendingSlideSwitch).toBeNull();
  });

  it('asks the editor to load a new slide when the active one goes', () => {
    seed(3, 1);
    state().deleteSlide(1);
    expect(state().currentSlideIndex).toBe(1);
    expect(state().pendingSlideSwitch).toBe(1);
    expect(state().discardLiveOnSwitch).toBe(true);
  });

  it('clamps to the last slide when the active one was last', () => {
    seed(3, 2);
    state().deleteSlide(2);
    expect(state().currentSlideIndex).toBe(1);
    expect(state().pendingSlideSwitch).toBe(1);
  });

  it('does NOT write the deleted design over another slide', () => {
    // The regression, in the order it actually happened: delete the slide you
    // are editing, then click another thumbnail. The canvas still held the
    // deleted design, and because the store had already moved the index, that
    // design was saved on top of a slide the user never touched.
    seed(3, 1);
    state().deleteSlide(1);

    // The editor answers the pending switch: it discards the live canvas and
    // loads the new target (slide-2, now at index 1).
    expect(state().pendingSlideSwitch).toBe(1);
    state().commitSlideSwitch('the design that was just deleted');
    expect(state().slides.map((s) => s.canvasJson)).toEqual(['slide-0', 'slide-2']);

    // Now the user clicks the first thumbnail. The canvas holds slide-2 by
    // this point, so that is what should be saved — and into index 1.
    state().requestSlideSwitch(0);
    state().commitSlideSwitch('slide-2 as edited');
    expect(state().slides.map((s) => s.canvasJson)).toEqual([
      'slide-0',
      'slide-2 as edited',
    ]);
    expect(state().currentSlideIndex).toBe(0);
  });
});

describe('commitSlideSwitch', () => {
  it('saves the live canvas into the slide being left', () => {
    seed(2, 0);
    state().requestSlideSwitch(1);
    state().commitSlideSwitch('edited slide 0');
    expect(state().slides[0].canvasJson).toBe('edited slide 0');
    expect(state().currentSlideIndex).toBe(1);
    expect(state().pendingSlideSwitch).toBeNull();
  });

  it('does nothing without a pending switch', () => {
    seed(2, 0);
    state().commitSlideSwitch('stray commit');
    expect(state().slides[0].canvasJson).toBe('slide-0');
  });
});

describe('reorderSlides', () => {
  it('follows the slide the user is editing', () => {
    seed(3, 0);
    state().reorderSlides(0, 2);
    expect(state().slides.map((s) => s.canvasJson)).toEqual([
      'slide-1',
      'slide-2',
      'slide-0',
    ]);
    expect(state().currentSlideIndex).toBe(2);
  });

  it('shifts the active index when a slide moves across it', () => {
    seed(3, 1);
    state().reorderSlides(0, 2);
    expect(state().currentSlideIndex).toBe(0);
  });

  it('ignores out-of-range and no-op moves', () => {
    seed(2, 0);
    state().reorderSlides(0, 0);
    state().reorderSlides(-1, 1);
    state().reorderSlides(0, 5);
    expect(state().slides.map((s) => s.canvasJson)).toEqual(['slide-0', 'slide-1']);
  });
});

describe('duplicateSlide', () => {
  it('copies what is on the canvas, not the stale JSON on the slide', () => {
    // The active slide's stored JSON is only written on a switch, so without
    // the live canvas the copy came out as whatever the slide held before.
    seed(2, 0);
    state().duplicateSlide(0, 'what is on screen now');
    expect(state().slides.map((s) => s.canvasJson)).toEqual([
      'what is on screen now',
      'what is on screen now',
      'slide-1',
    ]);
  });

  it('copies stored JSON for a slide that is not being edited', () => {
    seed(2, 0);
    state().duplicateSlide(1, 'live canvas of slide 0');
    expect(state().slides.map((s) => s.canvasJson)).toEqual([
      'slide-0',
      'slide-1',
      'slide-1',
    ]);
  });
});
