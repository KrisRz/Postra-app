import { Injectable, HttpException } from '@nestjs/common';
import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFile, unlink, readFile } from 'fs/promises';
import { createWriteStream } from 'fs';
import { Readable, Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import pLimit from 'p-limit';
import { fetch } from 'undici';
import { ssrfSafeDispatcher } from '@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher';

// ffmpeg transcodes run inside the HTTP request on a small box — serialize
// them per process (pm2 runs 3 workers) so concurrent requests can't
// saturate CPU/RAM, and kill anything that runs away.
const ffmpegLimit = pLimit(1);
const FFMPEG_TIMEOUT_MS = 5 * 60 * 1000;

// Both entry points take a media id and fetch whatever it points at. The
// browser editor keeps clips under 200 MB, but the library can hold a 4 GB
// multipart upload and these endpoints are reachable with any id the org owns,
// so cap what we are willing to pull onto a 4 GiB box.
const MAX_SOURCE_BYTES = 250 * 1024 * 1024;

const runFfmpeg = (args: string[]): Promise<void> =>
  ffmpegLimit(
    () =>
      new Promise<void>((resolve, reject) => {
        const proc = spawn('ffmpeg', args, { stdio: 'pipe' });
        let stderr = '';
        const timeout = setTimeout(() => {
          proc.kill('SIGKILL');
          reject(new Error(`ffmpeg timed out after ${FFMPEG_TIMEOUT_MS}ms`));
        }, FFMPEG_TIMEOUT_MS);
        proc.stderr.on('data', (chunk) => {
          stderr += chunk.toString();
        });
        proc.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
        proc.on('close', (code) => {
          clearTimeout(timeout);
          if (code === 0) resolve();
          else reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-500)}`));
        });
      })
  );

@Injectable()
export class CaptionsService {
  private storage = UploadFactory.createStorage();

  constructor(private _openai: OpenaiService) {}

  /**
   * Stream the source clip to disk, refusing anything over the cap.
   *
   * Reading it into a Buffer first (what this used to do) put the whole file
   * in the heap before it ever reached ffmpeg — two of those in flight is
   * enough to take the box down. Content-Length is checked first as a cheap
   * rejection, then the byte count is enforced as it arrives, because the
   * header is advisory.
   */
  private async downloadSource(videoUrl: string, destPath: string): Promise<void> {
    const res = await fetch(videoUrl, {
      signal: AbortSignal.timeout(60_000),
      // @ts-ignore — undici option, not in lib.dom fetch types
      dispatcher: ssrfSafeDispatcher,
    });
    if (!res.ok) {
      throw new HttpException(`Failed to download source video (${res.status})`, 502);
    }
    if (Number(res.headers.get('content-length') || 0) > MAX_SOURCE_BYTES) {
      throw new HttpException('Source video is too large to process', 413);
    }
    if (!res.body) {
      throw new HttpException('Source video returned no content', 502);
    }

    let seen = 0;
    const cap = new Transform({
      transform(chunk, _enc, done) {
        seen += chunk.length;
        if (seen > MAX_SOURCE_BYTES) {
          done(new HttpException('Source video is too large to process', 413));
          return;
        }
        done(null, chunk);
      },
    });

    await pipeline(
      Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]),
      cap,
      createWriteStream(destPath)
    );
  }

  async generateSrtFromVideoUrl(videoUrl: string, language?: string, orgId?: string): Promise<string> {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const inputPath = join(tmpdir(), `cap-in-${id}.mp4`);
    const audioPath = join(tmpdir(), `cap-audio-${id}.mp3`);

    try {
      await this.downloadSource(videoUrl, inputPath);

      await runFfmpeg([
        '-y',
        '-i',
        inputPath,
        '-vn',
        '-acodec',
        'libmp3lame',
        '-ar',
        '16000',
        '-ac',
        '1',
        '-b:a',
        '64k',
        audioPath,
      ]);

      return await this._openai.transcribeAudioToSrt(audioPath, language, orgId);
    } finally {
      await unlink(inputPath).catch(() => {});
      await unlink(audioPath).catch(() => {});
    }
  }

  async burnCaptionsIntoVideo(videoUrl: string, srt: string): Promise<{ path: string }> {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const inputPath = join(tmpdir(), `burn-in-${id}.mp4`);
    const srtPath = join(tmpdir(), `burn-${id}.srt`);
    const outputPath = join(tmpdir(), `burn-out-${id}.mp4`);

    try {
      await this.downloadSource(videoUrl, inputPath);
      await writeFile(srtPath, srt, 'utf8');

      await runFfmpeg([
        '-y',
        '-i',
        inputPath,
        '-vf',
        `subtitles=${srtPath}:force_style='Fontsize=22,Outline=2,OutlineColour=&H00000000,BorderStyle=1'`,
        // Burning subtitles re-encodes the video anyway, so pin the output to
        // what every platform and browser can play: 8-bit 4:2:0 (a 10-bit HEVC
        // source would otherwise yield yuv420p10, which Instagram and Safari
        // refuse), with the moov atom up front so it streams while loading.
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        '-c:a',
        'copy',
        '-preset',
        'fast',
        outputPath,
      ]);

      const outBuf = await readFile(outputPath);
      const fakeFile = {
        buffer: outBuf,
        originalname: `captioned-${id}.mp4`,
        mimetype: 'video/mp4',
        size: outBuf.length,
      } as unknown as Express.Multer.File;
      const result = await this.storage.uploadFile(fakeFile);
      return { path: result.path };
    } finally {
      await unlink(inputPath).catch(() => {});
      await unlink(srtPath).catch(() => {});
      await unlink(outputPath).catch(() => {});
    }
  }
}
