'use client';

import { FC, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { useEditorStore, PLATFORM_SIZES, PlatformSize } from './editor.store';
import { EditorToolbar } from './toolbar/editor-toolbar';
import { FormatBar } from './toolbar/format-bar';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Button } from '@gitroom/react/form/button';

const MultiFormatModal = lazy(() =>
  import('./multi-format-modal').then((m) => ({ default: m.MultiFormatModal }))
);

const HISTORY_EVENTS = ['object:modified', 'object:added', 'object:removed'] as const;

interface PostDesignEditorProps {
  setMedia: (params: { id: string; path: string }[]) => void;
  closeModal: () => void;
  width?: number;
  height?: number;
  mode?: 'composer' | 'studio';
}

const CANVAS_VIEWPORT_HEIGHT = 560;

const PostDesignEditor: FC<PostDesignEditorProps> = ({
  setMedia,
  closeModal,
  width,
  height,
  mode = 'composer',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const [exporting, setExporting] = useState(false);
  const [multiFormatOpen, setMultiFormatOpen] = useState(false);
  const fetch = useFetch();
  const toaster = useToaster();
  const t = useT();

  const { platform, setPlatform, pushHistory, setCanvasReady } =
    useEditorStore();
  const canUndo = useEditorStore((s) => s.historyIndex > 0);
  const canRedo = useEditorStore((s) => s.historyIndex < s.history.length - 1);

  const getScale = useCallback(
    (p: PlatformSize) => {
      const maxH = CANVAS_VIEWPORT_HEIGHT;
      const maxW = 700;
      return Math.min(maxW / p.width, maxH / p.height);
    },
    []
  );

  const isRestoringRef = useRef(false);
  const saveStateRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const p = width && height ? { key: 'custom', label: 'Custom', width, height } : platform;
    if (width && height) setPlatform(p);

    const scale = getScale(p);
    const c = new fabric.Canvas(canvasRef.current, {
      width: p.width * scale,
      height: p.height * scale,
      backgroundColor: '#1a1a2e',
      selection: true,
    });

    c.setZoom(scale);
    fabricRef.current = c;
    setCanvasReady(true);

    const saveState = () => {
      if (isRestoringRef.current) return;
      pushHistory(JSON.stringify(c.toJSON()));
    };
    saveStateRef.current = saveState;
    saveState();

    HISTORY_EVENTS.forEach((evt) => c.on(evt, saveState));

    return () => {
      HISTORY_EVENTS.forEach((evt) => c.off(evt, saveState));
      c.dispose();
      fabricRef.current = null;
      saveStateRef.current = null;
      setCanvasReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform.key]);

  const restoreState = useCallback((json: string | null) => {
    if (!json || !fabricRef.current || !saveStateRef.current) return;
    const c = fabricRef.current;
    const handler = saveStateRef.current;

    isRestoringRef.current = true;
    HISTORY_EVENTS.forEach((evt) => c.off(evt, handler));

    c.loadFromJSON(json)
      .then(() => {
        c.renderAll();
        useEditorStore.getState().setBgColor(c.backgroundColor as string || '#1a1a2e');
      })
      .finally(() => {
        isRestoringRef.current = false;
        HISTORY_EVENTS.forEach((evt) => c.on(evt, handler));
      });
  }, []);

  const handleUndo = useCallback(() => {
    restoreState(useEditorStore.getState().undo());
  }, [restoreState]);

  const handleRedo = useCallback(() => {
    restoreState(useEditorStore.getState().redo());
  }, [restoreState]);

  const handleExport = useCallback(async () => {
    if (!fabricRef.current) return;
    setExporting(true);

    try {
      const scale = 1 / fabricRef.current.getZoom();
      const dataUrl = fabricRef.current.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: scale,
      });

      const blob = await (await window.fetch(dataUrl)).blob();
      const formData = new FormData();
      formData.append('file', blob, 'design.png');

      const data = await (
        await fetch('/media/upload-simple', {
          method: 'POST',
          body: formData,
        })
      ).json();

      setMedia([{ id: data.id, path: data.path }]);
      closeModal();
    } catch (err) {
      toaster.show(t('export_failed', 'Export failed. Please try again.'), 'warning');
    } finally {
      setExporting(false);
    }
  }, [fetch, setMedia, closeModal, toaster, t]);

  const handleDownload = useCallback(() => {
    if (!fabricRef.current) return;
    const scale = 1 / fabricRef.current.getZoom();
    const dataUrl = fabricRef.current.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: scale,
    });
    const link = document.createElement('a');
    link.download = `postra-design-${Date.now()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleDelete = useCallback(() => {
    if (!fabricRef.current) return;
    const active = fabricRef.current.getActiveObjects();
    if (!active.length) {
      toaster.show(
        t('delete_no_selection', 'Najpierw zaznacz obiekt na canvas'),
        'warning'
      );
      return;
    }
    active.forEach((obj) => fabricRef.current!.remove(obj));
    fabricRef.current.discardActiveObject();
    fabricRef.current.renderAll();
  }, [toaster, t]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        handleDelete();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleDelete, handleUndo, handleRedo]);

  return (
    <div className="flex flex-col h-full min-h-[600px] bg-newBgColorInner rounded-lg overflow-hidden">
      <div className="flex flex-1 min-h-0">
        <EditorToolbar canvas={fabricRef} />

        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-newBorder">
            <div className="flex gap-2">
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className="h-8 px-3 text-sm rounded bg-newColColor text-textColor hover:bg-forth disabled:opacity-30 transition-colors"
                title={t('undo_tooltip', 'Cofnij (Ctrl+Z)')}
              >
                ↶
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                className="h-8 px-3 text-sm rounded bg-newColColor text-textColor hover:bg-forth disabled:opacity-30 transition-colors"
                title={t('redo_tooltip', 'Ponów (Ctrl+Shift+Z)')}
              >
                ↷
              </button>
              <button
                onClick={handleDelete}
                className="h-8 px-3 text-sm rounded bg-newColColor text-textColor hover:bg-red-500 hover:text-white transition-colors"
                title={t('delete_tooltip', 'Usuń zaznaczony obiekt (Delete)')}
              >
                🗑
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="px-3 py-1 text-xs rounded bg-newColColor text-textColor hover:bg-forth transition-colors"
                title={t('download_png_hint', 'Pobierz grafikę jako plik PNG')}
              >
                ⬇ {t('download_png', 'Pobierz PNG')}
              </button>
              <button
                onClick={() => setMultiFormatOpen(true)}
                className="px-3 py-1 text-xs rounded bg-newColColor text-textColor hover:bg-forth transition-colors"
                title={t('multi_format_hint', 'Wygeneruj 7 wariantów dla wszystkich platform')}
              >
                📐 {t('multi_format_button', 'Wszystkie formaty')}
              </button>
              {mode === 'composer' && (
                <Button
                  loading={exporting}
                  onClick={handleExport}
                  className="!h-[32px] !text-xs"
                >
                  {t('use_in_post', 'Use in Post')}
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center bg-black/30 overflow-hidden p-4">
            <div className="shadow-2xl rounded-sm">
              <canvas ref={canvasRef} />
            </div>
          </div>

          <FormatBar />
        </div>
      </div>

      {multiFormatOpen && (
        <Suspense fallback={null}>
          <MultiFormatModal
            canvasRef={fabricRef}
            srcWidth={platform.width}
            srcHeight={platform.height}
            mode={mode}
            setMedia={setMedia}
            onClose={() => setMultiFormatOpen(false)}
            closeParent={closeModal}
          />
        </Suspense>
      )}
    </div>
  );
};

export default PostDesignEditor;
export { PostDesignEditor };
