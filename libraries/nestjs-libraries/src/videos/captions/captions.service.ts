import { Injectable, HttpException } from '@nestjs/common';
import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFile, unlink, readFile } from 'fs/promises';
import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';

const runFfmpeg = (args: string[]): Promise<void> =>
  new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: 'pipe' });
    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-500)}`));
    });
  });

@Injectable()
export class CaptionsService {
  private storage = UploadFactory.createStorage();

  constructor(private _openai: OpenaiService) {}

  async generateSrtFromVideoUrl(videoUrl: string, language?: string): Promise<string> {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const inputPath = join(tmpdir(), `cap-in-${id}.mp4`);
    const audioPath = join(tmpdir(), `cap-audio-${id}.mp3`);

    try {
      const res = await fetch(videoUrl);
      if (!res.ok) {
        throw new HttpException(`Failed to download source video (${res.status})`, 502);
      }
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(inputPath, buf);

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

      return await this._openai.transcribeAudioToSrt(audioPath, language);
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
      const res = await fetch(videoUrl);
      if (!res.ok) {
        throw new HttpException(`Failed to download source video (${res.status})`, 502);
      }
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(inputPath, buf);
      await writeFile(srtPath, srt, 'utf8');

      await runFfmpeg([
        '-y',
        '-i',
        inputPath,
        '-vf',
        `subtitles=${srtPath}:force_style='Fontsize=22,Outline=2,OutlineColour=&H00000000,BorderStyle=1'`,
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
