import * as fabric from 'fabric';

/**
 * One undo step for one user action.
 *
 * History is driven by canvas events, and Fabric's bulk operations are not
 * atomic: `loadFromJSON` clears and re-adds, and a template's `apply()` adds
 * objects one at a time, so every object fired its own `object:added`. A
 * template landed as a dozen entries and an AI carousel — five slides, each a
 * full rebuild — pushed past the 30-entry cap and evicted the state the user
 * actually wanted back, while four places in the UI promised "undo with
 * Ctrl+Z".
 *
 * Wrap those mutations in `withHistoryPaused` and they commit as a single
 * step: events are ignored while the work runs, then one `object:modified` is
 * fired to record the result. That is the same commit signal the filter and
 * property panels already use.
 */

/** Marker read by the editor's history listener; per-canvas, not global. */
const PAUSED_KEY = '__postraHistoryPaused';

type PausableCanvas = fabric.Canvas & { [PAUSED_KEY]?: boolean };

/** True while a bulk mutation is running and history should ignore events. */
export function isHistoryPaused(canvas: fabric.Canvas): boolean {
  return !!(canvas as PausableCanvas)[PAUSED_KEY];
}

/**
 * Run a bulk canvas mutation, recording it as exactly one undo step.
 *
 * The commit fires even when `fn` throws, so a half-applied template is still
 * reachable with Ctrl+Z rather than being stranded outside the history.
 */
export async function withHistoryPaused<T>(
  canvas: fabric.Canvas,
  fn: () => T | Promise<T>
): Promise<T> {
  const target = canvas as PausableCanvas;
  // Nested calls (a template that loads JSON, say) must not un-pause early.
  const alreadyPaused = !!target[PAUSED_KEY];
  target[PAUSED_KEY] = true;
  try {
    return await fn();
  } finally {
    if (!alreadyPaused) {
      target[PAUSED_KEY] = false;
      canvas.fire('object:modified' as unknown as keyof fabric.CanvasEvents);
    }
  }
}
