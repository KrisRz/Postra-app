import * as fabric from 'fabric';
import {
  STUDIO_FABRIC_METADATA_KEYS,
  nextStudioId,
} from '@gitroom/nestjs-libraries/studio/studio-spec';

let installed = false;

/**
 * Teach Fabric to serialize Studio metadata (studioId, studioSlot, etc.) in
 * `toObject()` / `toJSON()` output. Without this, metadata round-trips
 * through `loadFromJSON` are dropped silently.
 *
 * Idempotent.
 */
export const installStudioFabricMetadata = (): void => {
  if (installed) return;
  installed = true;

  const originalToObject = fabric.FabricObject.prototype.toObject;
  fabric.FabricObject.prototype.toObject = function (
    extraKeys: string[] = []
  ): Record<string, unknown> {
    return originalToObject.call(this, [
      ...extraKeys,
      ...STUDIO_FABRIC_METADATA_KEYS,
    ]);
  };
};

/**
 * Attach a stable studioId to every object as soon as it joins the canvas.
 * Phase 2 AI Refine uses this id to target patches. Re-running on existing
 * objects is safe.
 */
export const wireStudioIds = (canvas: fabric.Canvas): void => {
  const ensureId = (obj: fabric.FabricObject) => {
    const o = obj as fabric.FabricObject & { studioId?: string };
    if (!o.studioId) o.studioId = nextStudioId();
  };
  canvas.getObjects().forEach(ensureId);
  canvas.on('object:added', (e) => {
    if (e.target) ensureId(e.target);
  });
};
