import { readFileSync } from 'fs';
import { resolve } from 'path';
import axios from 'axios';

const ALLOWED_HOSTS = new Set([
  'cdn.postra.pl',
  'cdn-dev.postra.pl',
  'pbs.twimg.com',
  'video.twimg.com',
  'media.licdn.com',
  'scontent.xx.fbcdn.net',
  'platform-lookaside.fbsbx.com',
  'p16-sign-sg.tiktokcdn.com',
  'i.pinimg.com',
  'i.ytimg.com',
  'pixabay.com',
]);

const isAllowedUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    return (
      ALLOWED_HOSTS.has(parsed.hostname) ||
      parsed.hostname.endsWith('.twimg.com') ||
      parsed.hostname.endsWith('.licdn.com') ||
      parsed.hostname.endsWith('.fbcdn.net') ||
      parsed.hostname.endsWith('.fbsbx.com') ||
      parsed.hostname.endsWith('.cdninstagram.com') ||
      parsed.hostname.endsWith('.tiktokcdn.com') ||
      parsed.hostname.endsWith('.pinimg.com') ||
      parsed.hostname.endsWith('.ytimg.com') ||
      parsed.hostname.endsWith('.postra.pl')
    );
  } catch {
    return false;
  }
};

export const readOrFetch = async (path: string) => {
  if (path.startsWith('http')) {
    if (!isAllowedUrl(path)) {
      throw new Error(`readOrFetch: blocked request to untrusted URL`);
    }
    return (
      await axios({
        url: path,
        method: 'GET',
        responseType: 'arraybuffer',
        maxRedirects: 2,
        timeout: 30_000,
      })
    ).data;
  }

  const resolved = resolve(path);
  if (!resolved.startsWith('/uploads/') && !resolved.startsWith('/app/uploads/')) {
    throw new Error(`readOrFetch: blocked read outside /uploads/`);
  }
  return readFileSync(resolved);
};
