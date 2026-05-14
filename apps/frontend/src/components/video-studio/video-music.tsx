'use client';

import { FC, useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Button } from '@gitroom/react/form/button';

interface PixabayTrack {
  id: number;
  duration: number;
  audio: string;
  user: string;
  tags: string;
}

interface VideoMusicProps {
  selectedTrack: PixabayTrack | null;
  onSelect: (track: PixabayTrack | null) => void;
}

export const VideoMusic: FC<VideoMusicProps> = ({ selectedTrack, onSelect }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const [query, setQuery] = useState('upbeat corporate');
  const [hits, setHits] = useState<PixabayTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const [previewId, setPreviewId] = useState<number | null>(null);

  const handleSearch = useCallback(async () => {
    setIsSearching(true);
    try {
      const res = await fetch(
        `/media/pixabay-music?q=${encodeURIComponent(query)}`
      );
      if (!res.ok) {
        toaster.show(
          t('video_music_search_failed', 'Wyszukiwanie muzyki nie powiodło się.'),
          'warning'
        );
        return;
      }
      const data = await res.json();
      if (data?.note === 'PIXABAY_API_KEY not configured') {
        setNotConfigured(true);
        return;
      }
      setNotConfigured(false);
      setHits(Array.isArray(data?.hits) ? (data.hits as PixabayTrack[]) : []);
    } finally {
      setIsSearching(false);
    }
  }, [fetch, query, toaster, t]);

  if (notConfigured) {
    return (
      <div className="flex flex-col gap-3 p-4 text-center">
        <div className="text-sm text-textColor">
          ⚠️{' '}
          {t(
            'video_music_no_key',
            'Pixabay nie jest skonfigurowane. Admin musi dodać PIXABAY_API_KEY do SSM (klucz darmowy z pixabay.com/api/docs).'
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="text-xs text-textColor/80">
        {t(
          'video_music_explainer',
          'Wyszukaj royalty-free muzykę z Pixabay i dodaj jako ścieżkę audio do wideo.'
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={t('video_music_search_ph', 'np. upbeat corporate, chill lofi')}
          className="flex-1 text-xs px-2 py-1 rounded bg-newColColor border border-newBorder text-textColor focus:outline-none focus:border-forth"
        />
        <Button
          loading={isSearching}
          onClick={handleSearch}
          className="!h-[28px] !text-xs"
        >
          🔍 {t('video_music_search', 'Szukaj')}
        </Button>
      </div>
      {selectedTrack && (
        <div className="flex items-center justify-between p-2 rounded border-2 border-newAccent bg-newAccent/10">
          <div className="text-xs text-textColor">
            ✓ {t('video_music_selected', 'Wybrano')}: {selectedTrack.tags.split(',')[0]} ({Math.round(selectedTrack.duration)}s)
          </div>
          <button
            onClick={() => onSelect(null)}
            className="text-[10px] px-2 py-1 rounded bg-newColColor text-textColor hover:bg-red-500 hover:text-white transition-colors"
          >
            ✕ {t('video_music_remove', 'Usuń')}
          </button>
        </div>
      )}
      <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
        {hits.length === 0 && !isSearching && (
          <div className="text-xs text-textColor/40 text-center py-4">
            {t('video_music_no_results', 'Brak wyników. Wpisz frazę i naciśnij Szukaj.')}
          </div>
        )}
        {hits.map((track) => {
          const isSelected = selectedTrack?.id === track.id;
          return (
            <div
              key={track.id}
              className={`flex items-center gap-2 p-2 rounded border transition-colors ${
                isSelected
                  ? 'border-newAccent bg-newAccent/5'
                  : 'border-newBorder bg-newColColor hover:border-newAccent/60'
              }`}
            >
              <button
                onClick={() => setPreviewId(previewId === track.id ? null : track.id)}
                className="text-[10px] px-2 py-1 rounded bg-newBgColorInner text-textColor hover:bg-forth"
                title={t('video_music_preview', 'Posłuchaj')}
              >
                {previewId === track.id ? '⏸' : '▶'}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-textColor truncate">{track.tags}</div>
                <div className="text-[10px] text-textColor/50">
                  {track.user} · {Math.round(track.duration)}s
                </div>
              </div>
              {previewId === track.id && (
                <audio src={track.audio} autoPlay controls className="h-6 w-32" />
              )}
              <button
                onClick={() => onSelect(track)}
                className={`text-[10px] px-2 py-1 rounded transition-colors ${
                  isSelected
                    ? 'bg-newAccent text-white'
                    : 'bg-newBgColorInner text-textColor hover:bg-newAccent hover:text-white'
                }`}
              >
                {isSelected
                  ? '✓ ' + t('video_music_use', 'Wybrano')
                  : t('video_music_use', 'Wybierz')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export type { PixabayTrack };
