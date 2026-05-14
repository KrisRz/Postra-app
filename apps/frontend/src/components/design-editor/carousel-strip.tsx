'use client';

import { FC, useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { useCarouselStore, CarouselSlide } from './carousel.store';
import { useEditorStore } from './editor.store';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

const THUMB_W = 80;
const THUMB_H = 100;

const SlideThumb: FC<{ slide: CarouselSlide; sourceWidth: number; sourceHeight: number }> = ({
  slide,
  sourceWidth,
  sourceHeight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!slide.canvasJson || !canvasRef.current) {
      setDataUrl(null);
      return;
    }
    const c = new fabric.StaticCanvas(canvasRef.current, {
      width: THUMB_W,
      height: THUMB_H,
      backgroundColor: '#1a1a2e',
    });
    const scale = Math.min(THUMB_W / sourceWidth, THUMB_H / sourceHeight);
    c.setZoom(scale);
    c.loadFromJSON(slide.canvasJson)
      .then(() => {
        c.renderAll();
        setDataUrl(c.toDataURL({ format: 'png', quality: 0.6, multiplier: 1 }));
      })
      .finally(() => {
        c.dispose();
      });
  }, [slide.canvasJson, sourceWidth, sourceHeight]);

  return (
    <div className="w-[80px] h-[100px] bg-newBgColorInner rounded overflow-hidden flex items-center justify-center">
      {dataUrl ? (
        <img src={dataUrl} alt="" className="w-full h-full object-contain" />
      ) : (
        <canvas ref={canvasRef} width={THUMB_W} height={THUMB_H} />
      )}
    </div>
  );
};

interface CarouselStripProps {
  fabricRef: React.RefObject<fabric.Canvas | null>;
}

export const CarouselStrip: FC<CarouselStripProps> = ({ fabricRef }) => {
  const t = useT();
  const platform = useEditorStore((s) => s.platform);
  const {
    isCarouselMode,
    slides,
    currentSlideIndex,
    enterCarouselMode,
    exitCarouselMode,
    addSlide,
    duplicateSlide,
    deleteSlide,
    reorderSlides,
    requestSlideSwitch,
    applyLayoutToAll,
  } = useCarouselStore();

  const [dragIndex, setDragIndex] = useState<number | null>(null);

  if (!isCarouselMode) {
    return (
      <div className="border-t border-newBorder px-4 py-2 flex items-center justify-between bg-newBgColor">
        <div className="text-xs text-textColor opacity-70">
          {t('carousel_hint', '🎴 Twórz wieloplanszowy post (Instagram / LinkedIn carousel — do 10 slajdów)')}
        </div>
        <button
          onClick={() => {
            const json = fabricRef.current ? JSON.stringify(fabricRef.current.toJSON()) : null;
            enterCarouselMode(json);
          }}
          className="px-3 py-1 text-xs rounded bg-newColColor text-textColor hover:bg-forth transition-colors"
          title={t('carousel_enter_hint', 'Włącz tryb carousel — obecny canvas stanie się Slajdem 1')}
        >
          🎴 {t('carousel_enter', 'Tryb carousel')}
        </button>
      </div>
    );
  }

  const onDragStart = (i: number) => setDragIndex(i);
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (i: number) => {
    if (dragIndex === null || dragIndex === i) return;
    reorderSlides(dragIndex, i);
    setDragIndex(null);
  };

  const handleApplyLayoutToAll = () => {
    if (!fabricRef.current) return;
    const json = JSON.stringify(fabricRef.current.toJSON());
    applyLayoutToAll(json);
  };

  return (
    <div className="border-t border-newBorder bg-newBgColor">
      <div className="px-4 py-2 flex items-center justify-between">
        <div className="text-xs text-textColor">
          🎴 {t('carousel_label', 'Carousel')} —{' '}
          <span className="opacity-70">
            {t('carousel_slide_count', 'Slajd {current} z {total}')
              .replace('{current}', String(currentSlideIndex + 1))
              .replace('{total}', String(slides.length))}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => addSlide(null)}
            disabled={slides.length >= 10}
            className="px-2 py-1 text-xs rounded bg-newColColor text-textColor hover:bg-forth disabled:opacity-30 transition-colors"
            title={t('carousel_add_hint', 'Dodaj pusty slajd (max 10)')}
          >
            + {t('carousel_add', 'Slajd')}
          </button>
          <button
            onClick={() => duplicateSlide(currentSlideIndex)}
            disabled={slides.length >= 10}
            className="px-2 py-1 text-xs rounded bg-newColColor text-textColor hover:bg-forth disabled:opacity-30 transition-colors"
            title={t('carousel_duplicate_hint', 'Skopiuj bieżący slajd')}
          >
            ⎘ {t('carousel_duplicate', 'Duplikuj')}
          </button>
          <button
            onClick={handleApplyLayoutToAll}
            className="px-2 py-1 text-xs rounded bg-newColColor text-textColor hover:bg-forth transition-colors"
            title={t('carousel_apply_all_hint', 'Skopiuj layout bieżącego slajdu na wszystkie (zachowuje brand consistency)')}
          >
            ⎘⎘ {t('carousel_apply_all', 'Zastosuj layout')}
          </button>
          <button
            onClick={exitCarouselMode}
            className="px-2 py-1 text-xs rounded bg-newColColor text-textColor hover:bg-red-500 hover:text-white transition-colors"
            title={t('carousel_exit_hint', 'Wyjdź z trybu carousel (slajdy zostaną utracone)')}
          >
            ✕ {t('carousel_exit', 'Wyjdź')}
          </button>
        </div>
      </div>
      <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
        {slides.map((slide, i) => {
          const isActive = i === currentSlideIndex;
          return (
            <div
              key={slide.id}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(i)}
              onClick={() => requestSlideSwitch(i)}
              className={`relative flex-shrink-0 cursor-pointer rounded transition-all ${
                isActive
                  ? 'ring-2 ring-newAccent shadow-lg'
                  : 'ring-1 ring-newBorder opacity-70 hover:opacity-100'
              }`}
              title={t('carousel_switch_to', 'Przejdź do Slajdu {n}').replace('{n}', String(i + 1))}
            >
              <SlideThumb
                slide={slide}
                sourceWidth={platform.width}
                sourceHeight={platform.height}
              />
              <div className="absolute top-0 left-0 bg-black/70 text-white text-[10px] px-1 rounded-br">
                {i + 1}
              </div>
              {slides.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSlide(i);
                  }}
                  className="absolute top-0 right-0 bg-black/70 text-white text-[10px] w-4 h-4 rounded-bl hover:bg-red-500 flex items-center justify-center"
                  title={t('carousel_delete_slide', 'Usuń ten slajd')}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
