/** Shared output formats for Postra Clip (slideshow, multi-format export). */
export interface VideoFormat {
  key: string;
  label: string;
  width: number;
  height: number;
}

export const VIDEO_FORMATS: VideoFormat[] = [
  { key: 'vertical-9-16', label: 'IG Reel / TikTok / Story (9:16)', width: 1080, height: 1920 },
  { key: 'square-1-1', label: 'IG Feed (1:1)', width: 1080, height: 1080 },
  { key: 'landscape-16-9', label: 'YouTube / X (16:9)', width: 1920, height: 1080 },
];
