'use client';

import { FC, MutableRefObject, useCallback, useEffect, useState } from 'react';
import * as fabric from 'fabric';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

interface LayersPanelProps {
  canvas: MutableRefObject<fabric.Canvas | null>;
}

interface LayerEntry {
  obj: fabric.FabricObject;
  type: string;
  label: string;
  visible: boolean;
  locked: boolean;
  active: boolean;
}

const truncate = (s: string, max = 24): string =>
  s.length <= max ? s : `${s.slice(0, max - 1)}…`;

const objectLabel = (
  obj: fabric.FabricObject,
  t: (k: string, fb: string) => string
): { type: string; label: string; icon: string } => {
  if (obj instanceof fabric.Textbox || obj instanceof fabric.IText) {
    const text = (obj as fabric.Textbox).text || '';
    return {
      type: 'text',
      label: text ? truncate(text) : t('layer_text', 'Tekst'),
      icon: 'T',
    };
  }
  if (obj instanceof fabric.FabricImage) {
    return { type: 'image', label: t('layer_image', 'Obraz'), icon: '🖼' };
  }
  if (obj instanceof fabric.Group) {
    return { type: 'group', label: t('layer_group', 'Grupa'), icon: '◇' };
  }
  if (obj instanceof fabric.Rect) {
    return { type: 'rect', label: t('layer_rect', 'Prostokąt'), icon: '▭' };
  }
  if (obj instanceof fabric.Circle) {
    return { type: 'circle', label: t('layer_circle', 'Koło'), icon: '●' };
  }
  if (obj instanceof fabric.Line) {
    return { type: 'line', label: t('layer_line', 'Linia'), icon: '─' };
  }
  if (obj instanceof fabric.Path) {
    return { type: 'path', label: t('layer_path', 'Ścieżka'), icon: '✎' };
  }
  return { type: 'object', label: t('layer_object', 'Obiekt'), icon: '◻' };
};

export const LayersPanel: FC<LayersPanelProps> = ({ canvas }) => {
  const t = useT();
  const [, forceUpdate] = useState(0);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const refresh = () => forceUpdate((n) => n + 1);
    const events = [
      'object:added',
      'object:removed',
      'object:modified',
      'selection:created',
      'selection:updated',
      'selection:cleared',
    ] as const;
    events.forEach((e) => c.on(e, refresh));
    return () => events.forEach((e) => c.off(e, refresh));
  }, [canvas]);

  const c = canvas.current;
  const objects = c ? c.getObjects() : [];
  const activeIds = c
    ? new Set(c.getActiveObjects().map((o) => (o as unknown as { __id?: string }).__id))
    : new Set();

  const layers: LayerEntry[] = objects
    .map((obj) => {
      const meta = objectLabel(obj, t);
      return {
        obj,
        type: meta.type,
        label: `${meta.icon}  ${meta.label}`,
        visible: obj.visible !== false,
        locked: !obj.selectable || !obj.evented,
        active: activeIds.has((obj as unknown as { __id?: string }).__id),
      };
    })
    .reverse();

  const handleSelect = useCallback(
    (entry: LayerEntry) => {
      if (!c || entry.locked) return;
      c.setActiveObject(entry.obj);
      c.renderAll();
      forceUpdate((n) => n + 1);
    },
    [c]
  );

  const handleToggleVisibility = useCallback(
    (entry: LayerEntry, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!c) return;
      entry.obj.set({ visible: !entry.visible });
      c.discardActiveObject();
      c.renderAll();
      forceUpdate((n) => n + 1);
    },
    [c]
  );

  const handleToggleLock = useCallback(
    (entry: LayerEntry, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!c) return;
      const willLock = !entry.locked;
      entry.obj.set({
        selectable: !willLock,
        evented: !willLock,
        hasControls: !willLock,
      });
      if (willLock) c.discardActiveObject();
      c.renderAll();
      forceUpdate((n) => n + 1);
    },
    [c]
  );

  const handleDelete = useCallback(
    (entry: LayerEntry, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!c) return;
      c.remove(entry.obj);
      c.discardActiveObject();
      c.renderAll();
      forceUpdate((n) => n + 1);
    },
    [c]
  );

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (targetIndex: number) => {
      if (!c || dragIndex === null || dragIndex === targetIndex) {
        setDragIndex(null);
        return;
      }
      const reversedObjects = layers.map((l) => l.obj);
      const moved = reversedObjects[dragIndex];
      const remaining = reversedObjects.filter((_, i) => i !== dragIndex);
      remaining.splice(targetIndex, 0, moved);
      const newOrder = remaining.reverse();
      newOrder.forEach((obj, idx) => c.moveObjectTo(obj, idx));
      c.renderAll();
      setDragIndex(null);
      forceUpdate((n) => n + 1);
    },
    [c, dragIndex, layers]
  );

  if (layers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-[11px] text-textColor/50 text-center">
        {t('layers_empty', 'Brak warstw. Dodaj tekst, kształt lub obraz.')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 min-h-0 flex-1 overflow-y-auto pr-1">
      {layers.map((entry, index) => (
        <div
          key={index}
          draggable={!entry.locked}
          onDragStart={() => handleDragStart(index)}
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(index)}
          onClick={() => handleSelect(entry)}
          className={clsx(
            'group flex items-center gap-1 px-2 py-1.5 rounded text-xs cursor-pointer transition-colors',
            entry.active
              ? 'bg-forth text-white'
              : 'bg-newColColor/40 text-textColor hover:bg-newColColor',
            !entry.visible && 'opacity-50',
            dragIndex === index && 'opacity-40'
          )}
        >
          <span className="flex-1 truncate" title={entry.label}>
            {entry.label}
          </span>
          <button
            onClick={(e) => handleToggleVisibility(entry, e)}
            className="opacity-60 hover:opacity-100 px-1"
            title={
              entry.visible
                ? t('layer_hide', 'Ukryj')
                : t('layer_show', 'Pokaż')
            }
          >
            {entry.visible ? '👁' : '🚫'}
          </button>
          <button
            onClick={(e) => handleToggleLock(entry, e)}
            className="opacity-60 hover:opacity-100 px-1"
            title={
              entry.locked
                ? t('layer_unlock', 'Odblokuj')
                : t('layer_lock', 'Zablokuj')
            }
          >
            {entry.locked ? '🔒' : '🔓'}
          </button>
          <button
            onClick={(e) => handleDelete(entry, e)}
            className="opacity-0 group-hover:opacity-60 hover:!opacity-100 px-1 text-red-300"
            title={t('layer_delete', 'Usuń')}
          >
            🗑
          </button>
        </div>
      ))}
      <p className="text-[10px] text-textColor/40 leading-snug mt-2">
        {t('layers_hint', 'Przeciągnij warstwę aby zmienić kolejność.')}
      </p>
    </div>
  );
};
