'use client';

import { create } from 'zustand';

export interface CarouselSlide {
  id: string;
  canvasJson: string | null;
}

interface CarouselState {
  isCarouselMode: boolean;
  slides: CarouselSlide[];
  currentSlideIndex: number;
  pendingSlideSwitch: number | null;

  enterCarouselMode: (initialJson: string | null) => void;
  exitCarouselMode: () => void;

  addSlide: (json?: string | null) => void;
  duplicateSlide: (index: number) => void;
  deleteSlide: (index: number) => void;
  reorderSlides: (from: number, to: number) => void;

  requestSlideSwitch: (index: number) => void;
  commitSlideSwitch: (currentJson: string) => void;

  updateCurrentSlideJson: (json: string) => void;
  applyLayoutToAll: (canvasJson: string) => void;
  replaceAllSlides: (slides: CarouselSlide[]) => void;
}

const newSlideId = () =>
  `slide-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const useCarouselStore = create<CarouselState>((set, get) => ({
  isCarouselMode: false,
  slides: [],
  currentSlideIndex: 0,
  pendingSlideSwitch: null,

  enterCarouselMode: (initialJson) =>
    set({
      isCarouselMode: true,
      slides: [{ id: newSlideId(), canvasJson: initialJson }],
      currentSlideIndex: 0,
      pendingSlideSwitch: null,
    }),

  exitCarouselMode: () =>
    set({
      isCarouselMode: false,
      slides: [],
      currentSlideIndex: 0,
      pendingSlideSwitch: null,
    }),

  addSlide: (json = null) => {
    const { slides, currentSlideIndex } = get();
    const next = [...slides, { id: newSlideId(), canvasJson: json }];
    set({ slides: next, pendingSlideSwitch: next.length - 1 });
    void currentSlideIndex;
  },

  duplicateSlide: (index) => {
    const { slides } = get();
    const target = slides[index];
    if (!target) return;
    const dup: CarouselSlide = { id: newSlideId(), canvasJson: target.canvasJson };
    const next = [...slides.slice(0, index + 1), dup, ...slides.slice(index + 1)];
    set({ slides: next, pendingSlideSwitch: index + 1 });
  },

  deleteSlide: (index) => {
    const { slides, currentSlideIndex } = get();
    if (slides.length <= 1) return;
    const next = slides.filter((_, i) => i !== index);
    let newIndex = currentSlideIndex;
    if (index < currentSlideIndex) newIndex = currentSlideIndex - 1;
    else if (index === currentSlideIndex) newIndex = Math.min(currentSlideIndex, next.length - 1);
    set({ slides: next, currentSlideIndex: newIndex, pendingSlideSwitch: null });
  },

  reorderSlides: (from, to) => {
    const { slides, currentSlideIndex } = get();
    if (from === to || from < 0 || to < 0 || from >= slides.length || to >= slides.length) return;
    const next = [...slides];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    let newIndex = currentSlideIndex;
    if (currentSlideIndex === from) newIndex = to;
    else if (from < currentSlideIndex && to >= currentSlideIndex) newIndex = currentSlideIndex - 1;
    else if (from > currentSlideIndex && to <= currentSlideIndex) newIndex = currentSlideIndex + 1;
    set({ slides: next, currentSlideIndex: newIndex });
  },

  requestSlideSwitch: (index) => {
    const { slides, currentSlideIndex } = get();
    if (index < 0 || index >= slides.length || index === currentSlideIndex) return;
    set({ pendingSlideSwitch: index });
  },

  commitSlideSwitch: (currentJson) => {
    const { slides, currentSlideIndex, pendingSlideSwitch } = get();
    if (pendingSlideSwitch === null) return;
    const updated = slides.map((s, i) =>
      i === currentSlideIndex ? { ...s, canvasJson: currentJson } : s
    );
    set({
      slides: updated,
      currentSlideIndex: pendingSlideSwitch,
      pendingSlideSwitch: null,
    });
  },

  updateCurrentSlideJson: (json) => {
    const { slides, currentSlideIndex } = get();
    if (!slides[currentSlideIndex]) return;
    const updated = slides.map((s, i) =>
      i === currentSlideIndex ? { ...s, canvasJson: json } : s
    );
    set({ slides: updated });
  },

  applyLayoutToAll: (canvasJson) => {
    const { slides } = get();
    const updated = slides.map((s) => ({ ...s, canvasJson }));
    set({ slides: updated });
  },

  replaceAllSlides: (slides) => {
    if (!slides.length) return;
    set({ slides, currentSlideIndex: 0, pendingSlideSwitch: null, isCarouselMode: true });
  },
}));
