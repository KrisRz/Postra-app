'use client';

import { FC, MutableRefObject, useCallback, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { useEditorStore, EditorTool } from '../editor.store';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import clsx from 'clsx';

interface ToolbarProps {
  canvas: MutableRefObject<fabric.Canvas | null>;
}

const TOOLS: { key: EditorTool; icon: string; labelKey: string; fallback: string }[] = [
  { key: 'select', icon: '↖', labelKey: 'tool_select', fallback: 'Select' },
  { key: 'text', icon: 'T', labelKey: 'tool_text', fallback: 'Text' },
  { key: 'shapes', icon: '◻', labelKey: 'tool_shapes', fallback: 'Shapes' },
  { key: 'images', icon: '🖼', labelKey: 'tool_images', fallback: 'Images' },
];

export const EditorToolbar: FC<ToolbarProps> = ({ canvas }) => {
  const { activeTool, setTool } = useEditorStore();
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [bgColor, setBgColor] = useState('#1a1a2e');

  const addText = useCallback(() => {
    if (!canvas.current) return;
    const text = new fabric.Textbox('Your text here', {
      left: canvas.current.getWidth() / canvas.current.getZoom() / 2 - 150,
      top: canvas.current.getHeight() / canvas.current.getZoom() / 2 - 30,
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
            left: cx - 75,
            top: cy - 75,
            width: 150,
            height: 150,
            fill: '#e94560',
            rx: 8,
            ry: 8,
          });
          break;
        case 'circle':
          obj = new fabric.Circle({
            left: cx - 60,
            top: cy - 60,
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
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imgEl = new Image();
        imgEl.onload = () => {
          const img = new fabric.FabricImage(imgEl);
          const canvasW = canvas.current!.getWidth() / canvas.current!.getZoom();
          const canvasH = canvas.current!.getHeight() / canvas.current!.getZoom();
          const scale = Math.min(canvasW / img.width!, canvasH / img.height!, 1);
          img.set({
            scaleX: scale,
            scaleY: scale,
            left: (canvasW - img.width! * scale) / 2,
            top: (canvasH - img.height! * scale) / 2,
          });
          canvas.current!.add(img);
          canvas.current!.setActiveObject(img);
          canvas.current!.renderAll();
        };
        imgEl.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    },
    [canvas]
  );

  const setBackground = useCallback(
    (color: string) => {
      if (!canvas.current) return;
      setBgColor(color);
      canvas.current.backgroundColor = color;
      canvas.current.renderAll();
    },
    [canvas]
  );

  const handleToolClick = useCallback(
    (tool: EditorTool) => {
      setTool(tool);
      if (tool === 'text') addText();
    },
    [setTool, addText]
  );

  return (
    <div className="w-[180px] border-r border-newBorder flex flex-col bg-newBgColorInner">
      <div className="flex flex-col gap-1 p-2">
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

      <div className="border-t border-newBorder p-3 flex flex-col gap-3">
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
              className="text-xs px-3 py-2 rounded bg-newColColor hover:bg-forth text-textColor transition-colors"
            >
              {t('upload_image', 'Upload Image')}
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
      </div>
    </div>
  );
};
