'use client';

import { FC, MutableRefObject, useCallback, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { useEditorStore, EditorTool } from '../editor.store';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { AiGeneratePanel } from './ai-generate-panel';
import { BrandKitPanel } from './brand-kit-panel';
import { IconsPanel } from './icons-panel';
import clsx from 'clsx';

interface ToolbarProps {
  canvas: MutableRefObject<fabric.Canvas | null>;
}

const TOOLS: { key: EditorTool; icon: string; labelKey: string; fallback: string }[] = [
  { key: 'ai', icon: '✨', labelKey: 'tool_ai', fallback: 'AI Generate' },
  { key: 'brand', icon: '🎨', labelKey: 'tool_brand', fallback: 'Brand Kit' },
  { key: 'select', icon: '↖', labelKey: 'tool_select', fallback: 'Select' },
  { key: 'text', icon: 'T', labelKey: 'tool_text', fallback: 'Text' },
  { key: 'shapes', icon: '◻', labelKey: 'tool_shapes', fallback: 'Shapes' },
  { key: 'icons', icon: '🎯', labelKey: 'tool_icons', fallback: 'Ikony' },
  { key: 'images', icon: '🖼', labelKey: 'tool_images', fallback: 'Images' },
];

export const EditorToolbar: FC<ToolbarProps> = ({ canvas }) => {
  const { activeTool, setTool, bgColor, setBgColor } = useEditorStore();
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const addText = useCallback(() => {
    if (!canvas.current) return;
    const cx = canvas.current.getWidth() / canvas.current.getZoom() / 2;
    const cy = canvas.current.getHeight() / canvas.current.getZoom() / 2;
    const text = new fabric.Textbox('Your text here', {
      left: cx,
      top: cy,
      width: 300,
      fontSize: 48,
      fontFamily: 'Geist, sans-serif',
      fill: '#ffffff',
      textAlign: 'center',
      editable: true,
    });
    canvas.current.add(text);
    canvas.current.setActiveObject(text);
    canvas.current.renderAll();
  }, [canvas]);

  const addShape = useCallback(
    (type: 'rect' | 'circle' | 'line') => {
      if (!canvas.current) return;
      const cx = canvas.current.getWidth() / canvas.current.getZoom() / 2;
      const cy = canvas.current.getHeight() / canvas.current.getZoom() / 2;

      let obj: fabric.FabricObject;
      switch (type) {
        case 'rect':
          obj = new fabric.Rect({
            left: cx,
            top: cy,
            width: 150,
            height: 150,
            fill: '#e94560',
            rx: 8,
            ry: 8,
          });
          break;
        case 'circle':
          obj = new fabric.Circle({
            left: cx,
            top: cy,
            radius: 60,
            fill: '#0f3460',
          });
          break;
        case 'line':
          obj = new fabric.Line([cx - 100, cy, cx + 100, cy], {
            stroke: '#ffffff',
            strokeWidth: 3,
          });
          break;
      }
      canvas.current.add(obj!);
      canvas.current.setActiveObject(obj!);
      canvas.current.renderAll();
    },
    [canvas]
  );

  const addImage = useCallback(
    async (file: File) => {
      if (!canvas.current) return;
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/media/upload-simple', {
          method: 'POST',
          body: formData,
        });
        const { path } = await res.json();

        const imgEl = new Image();
        imgEl.crossOrigin = 'anonymous';
        imgEl.onload = () => {
          if (!canvas.current) return;
          const img = new fabric.FabricImage(imgEl);
          const canvasW = canvas.current.getWidth() / canvas.current.getZoom();
          const canvasH = canvas.current.getHeight() / canvas.current.getZoom();
          const scale = Math.min(canvasW / img.width!, canvasH / img.height!, 1);
          img.set({
            scaleX: scale,
            scaleY: scale,
            left: canvasW / 2,
            top: canvasH / 2,
            selectable: true,
            evented: true,
            hasControls: true,
            hasBorders: true,
          });
          canvas.current.add(img);
          canvas.current.setActiveObject(img);
          canvas.current.renderAll();
        };
        imgEl.onerror = () =>
          toaster.show(t('image_load_failed', 'Failed to load image'), 'warning');
        imgEl.src = path;
      } catch {
        toaster.show(t('upload_failed', 'Image upload failed'), 'warning');
      } finally {
        setUploading(false);
      }
    },
    [canvas, fetch, toaster, t]
  );

  const setBackground = useCallback(
    (color: string) => {
      if (!canvas.current) return;
      setBgColor(color);
      canvas.current.backgroundColor = color;
      canvas.current.renderAll();
    },
    [canvas, setBgColor]
  );

  const handleToolClick = useCallback(
    (tool: EditorTool) => {
      setTool(tool);
      if (tool === 'text') addText();
    },
    [setTool, addText]
  );

  return (
    <div className="w-[180px] border-r border-newBorder flex flex-col bg-newBgColorInner h-full min-h-0">
      <div className="flex flex-col gap-1 p-2 shrink-0">
        {TOOLS.map((tool) => (
          <button
            key={tool.key}
            onClick={() => handleToolClick(tool.key)}
            className={clsx(
              'flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors text-left',
              activeTool === tool.key
                ? 'bg-forth text-white'
                : 'text-textColor hover:bg-newColColor'
            )}
          >
            <span className="w-5 text-center text-sm">{tool.icon}</span>
            <span>{t(tool.labelKey, tool.fallback)}</span>
          </button>
        ))}
      </div>

      <div className="border-t border-newBorder p-3 flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto">
        {activeTool === 'ai' && <AiGeneratePanel canvas={canvas} />}

        {activeTool === 'brand' && <BrandKitPanel />}

        {activeTool === 'icons' && <IconsPanel canvas={canvas} />}

        {activeTool === 'shapes' && (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-textColor/60 uppercase tracking-wide">
              {t('add_shape', 'Add Shape')}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => addShape('rect')}
                className="w-8 h-8 rounded bg-newColColor hover:bg-forth flex items-center justify-center text-textColor transition-colors"
                title="Rectangle"
              >
                ▭
              </button>
              <button
                onClick={() => addShape('circle')}
                className="w-8 h-8 rounded bg-newColColor hover:bg-forth flex items-center justify-center text-textColor transition-colors"
                title="Circle"
              >
                ●
              </button>
              <button
                onClick={() => addShape('line')}
                className="w-8 h-8 rounded bg-newColColor hover:bg-forth flex items-center justify-center text-textColor transition-colors"
                title="Line"
              >
                ─
              </button>
            </div>
          </div>
        )}

        {activeTool === 'images' && (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-textColor/60 uppercase tracking-wide">
              {t('add_image', 'Add Image')}
            </span>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="text-xs px-3 py-2 rounded bg-newColColor hover:bg-forth text-textColor transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
              {uploading
                ? t('uploading', 'Uploading…')
                : t('upload_image', 'Upload Image')}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) addImage(file);
                e.target.value = '';
              }}
            />
          </div>
        )}

        {(activeTool === 'shapes' || activeTool === 'images') && (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-textColor/60 uppercase tracking-wide">
              {t('background', 'Background')}
            </span>
            <div className="flex gap-1 flex-wrap">
              {['#1a1a2e', '#16213e', '#0f3460', '#e94560', '#533483', '#ffffff', '#000000'].map(
                (color) => (
                  <button
                    key={color}
                    onClick={() => setBackground(color)}
                    className={clsx(
                      'w-6 h-6 rounded-full border-2 transition-transform hover:scale-110',
                      bgColor === color ? 'border-white scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: color }}
                  />
                )
              )}
            </div>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBackground(e.target.value)}
              className="w-full h-7 rounded cursor-pointer border-0 bg-transparent"
            />
          </div>
        )}
      </div>
    </div>
  );
};
