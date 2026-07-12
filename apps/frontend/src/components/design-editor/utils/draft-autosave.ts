// Crash/refresh insurance for the design editor: the working canvas is
// snapshotted to localStorage so closing the modal, refreshing, or switching
// the Graphics/Video tab doesn't silently destroy the design. One draft per
// organization — a newer snapshot replaces the older one.

export interface StudioDraft {
  canvasJson: string;
  platformKey: string;
  savedAt: number;
}

const DRAFT_PREFIX = 'postra:studio-draft:';

// localStorage quota is ~5MB; a canvas JSON bigger than this (e.g. embedded
// data-URLs after background removal) would evict everything else, so skip it.
const MAX_DRAFT_BYTES = 3_500_000;

const key = (orgId: string) => `${DRAFT_PREFIX}${orgId || 'default'}`;

export const readDraft = (orgId: string): StudioDraft | null => {
  try {
    const raw = window.localStorage.getItem(key(orgId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StudioDraft;
    if (
      typeof parsed?.canvasJson !== 'string' ||
      !parsed.canvasJson ||
      typeof parsed?.platformKey !== 'string'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const writeDraft = (orgId: string, draft: StudioDraft): void => {
  if (draft.canvasJson.length > MAX_DRAFT_BYTES) return;
  try {
    window.localStorage.setItem(key(orgId), JSON.stringify(draft));
  } catch {
    // quota exceeded / private mode — autosave is best-effort
  }
};

export const clearDraft = (orgId: string): void => {
  try {
    window.localStorage.removeItem(key(orgId));
  } catch {
    // private mode — nothing to clear
  }
};
