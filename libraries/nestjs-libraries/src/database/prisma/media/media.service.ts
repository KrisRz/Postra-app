import { HttpException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { MediaRepository } from '@gitroom/nestjs-libraries/database/prisma/media/media.repository';
import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { Organization } from '@prisma/client';
import { SaveMediaInformationDto } from '@gitroom/nestjs-libraries/dtos/media/save.media.information.dto';
import { VideoManager } from '@gitroom/nestjs-libraries/videos/video.manager';
import { VideoDto } from '@gitroom/nestjs-libraries/dtos/videos/video.dto';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { GeneratePostDesignDto } from '@gitroom/nestjs-libraries/dtos/media/generate.post.design.dto';
import { GeneratePostCarouselDto } from '@gitroom/nestjs-libraries/dtos/media/generate.post.carousel.dto';
import { BrandKitService } from '@gitroom/nestjs-libraries/database/prisma/brand-kit/brand-kit.service';
import { PostsRepository } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.repository';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import {
  StudioAiService,
  BrandVoiceResult,
  VariantsResult,
  rankBySimilarity,
} from '@gitroom/nestjs-libraries/studio/studio-ai.service';
import {
  StudioPatch,
  StudioPlatformKey,
  StudioSpec,
} from '@gitroom/nestjs-libraries/studio/studio-spec';
import {
  BrandVoiceCheckDto,
  DecomposeImageDto,
  GenerateVariantsDto,
  RefineDesignDto,
  TemplateSearchDto,
} from '@gitroom/nestjs-libraries/studio/studio.dto';
import {
  AuthorizationActions,
  Sections,
  SubscriptionException,
} from '@gitroom/backend/services/auth/permissions/permission.exception.class';

const POST_DESIGN_BG_CACHE_TTL = 60 * 60 * 24 * 7; // 7 days
const TEMPLATE_EMBED_CACHE_TTL = 60 * 60 * 24 * 30; // 30 days
const RECENT_POSTS_FOR_VOICE = 5;

@Injectable()
export class MediaService {
  private storage = UploadFactory.createStorage();

  constructor(
    private _mediaRepository: MediaRepository,
    private _openAi: OpenaiService,
    private _subscriptionService: SubscriptionService,
    private _videoManager: VideoManager,
    private _brandKitService: BrandKitService,
    private _studioAi: StudioAiService,
    private _postsRepository: PostsRepository
  ) {}

  async deleteMedia(org: string, id: string) {
    return this._mediaRepository.deleteMedia(org, id);
  }

  getMediaById(id: string) {
    return this._mediaRepository.getMediaById(id);
  }

  async generateImage(
    prompt: string,
    org: Organization,
    generatePromptFirst?: boolean
  ) {
    const generating = await this._subscriptionService.useCredit(
      org,
      'ai_images',
      async () => {
        if (generatePromptFirst) {
          prompt = await this._openAi.generatePromptForPicture(prompt);
          console.log('Prompt:', prompt);
        }
        const dataUrl = await this._openAi.generateImage(
          prompt,
          !!generatePromptFirst
        );
        // gpt-image-1 returns a base64 data: URL — persist it to storage and
        // return the hosted URL (callers expect a real URL, not raw base64).
        return dataUrl ? await this.storage.uploadSimple(dataUrl) : dataUrl;
      }
    );

    return generating;
  }

  async generatePostDesign(org: Organization, dto: GeneratePostDesignDto) {
    const total = await this._subscriptionService.checkCredits(org);
    if (process.env.STRIPE_PUBLISHABLE_KEY && total.credits <= 0) {
      throw new HttpException(
        'No image generation credits remaining for this billing cycle',
        402
      );
    }

    const brandKit =
      dto.brandKit ?? (await this._brandKitService.getNormalized(org.id)) ?? undefined;

    const spec = await this._openAi.generatePostDesign(
      dto.prompt,
      dto.platform,
      brandKit
    );

    const cacheKey = `bg:${createHash('md5')
      .update(spec.imagePrompt.trim().toLowerCase())
      .digest('hex')}`;

    let backgroundUrl = await ioRedis.get(cacheKey);
    let cacheHit = !!backgroundUrl;

    if (!backgroundUrl) {
      backgroundUrl = await this._subscriptionService.useCredit(
        org,
        'ai_images',
        async () => {
          const dalleUrl = await this._openAi.generateImage(
            spec.imagePrompt,
            true
          );
          if (!dalleUrl) {
            throw new HttpException('DALL-E generation failed', 502);
          }
          return await this.storage.uploadSimple(dalleUrl);
        }
      );

      await ioRedis.set(cacheKey, backgroundUrl, 'EX', POST_DESIGN_BG_CACHE_TTL);
    }

    return {
      ...spec,
      backgroundUrl,
      cacheHit,
      brandKit: brandKit ? { logoPath: brandKit.logoPath ?? null } : null,
    };
  }

  async generatePostCarousel(org: Organization, dto: GeneratePostCarouselDto) {
    const total = await this._subscriptionService.checkCredits(org);
    if (process.env.STRIPE_PUBLISHABLE_KEY && total.credits <= 0) {
      throw new HttpException(
        'No image generation credits remaining for this billing cycle',
        402
      );
    }

    const brandKit =
      dto.brandKit ?? (await this._brandKitService.getNormalized(org.id)) ?? undefined;

    const carousel = await this._openAi.generatePostCarousel(
      dto.prompt,
      dto.platform,
      dto.slidesCount,
      brandKit
    );

    const cacheKey = `bg:${createHash('md5')
      .update(carousel.imagePrompt.trim().toLowerCase())
      .digest('hex')}`;

    let backgroundUrl = await ioRedis.get(cacheKey);
    let cacheHit = !!backgroundUrl;

    if (!backgroundUrl) {
      backgroundUrl = await this._subscriptionService.useCredit(
        org,
        'ai_images',
        async () => {
          const dalleUrl = await this._openAi.generateImage(
            carousel.imagePrompt,
            true
          );
          if (!dalleUrl) {
            throw new HttpException('DALL-E generation failed', 502);
          }
          return await this.storage.uploadSimple(dalleUrl);
        }
      );

      await ioRedis.set(cacheKey, backgroundUrl, 'EX', POST_DESIGN_BG_CACHE_TTL);
    }

    return {
      slides: carousel.slides.map((s) => ({
        ...s,
        imagePrompt: carousel.imagePrompt,
        colors: carousel.colors,
        backgroundUrl,
        cacheHit,
        brandKit: brandKit ? { logoPath: brandKit.logoPath ?? null } : null,
      })),
    };
  }

  async saveCanvasJson(org: string, id: string, canvasJson: string) {
    return this._mediaRepository.saveCanvasJson(org, id, canvasJson);
  }

  getMediaForEdit(org: string, id: string) {
    return this._mediaRepository.getMediaByIdForOrg(org, id);
  }

  async importPixabayVideo(org: string, sourceUrl: string, sourceId?: number) {
    const res = await fetch(sourceUrl);
    if (!res.ok) {
      throw new HttpException(`Failed to fetch Pixabay video (${res.status})`, 502);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const fakeFile = {
      buffer,
      originalname: `pixabay-${sourceId ?? Date.now()}.mp4`,
      mimetype: 'video/mp4',
      size: buffer.length,
    } as unknown as Express.Multer.File;
    const uploaded = await this.storage.uploadFile(fakeFile);
    return this._mediaRepository.saveFile(
      org,
      uploaded.originalname,
      uploaded.path,
      `pixabay-${sourceId ?? 'unknown'}`
    );
  }

  saveFile(org: string, fileName: string, filePath: string, originalName?: string) {
    return this._mediaRepository.saveFile(org, fileName, filePath, originalName);
  }

  getMedia(org: string, page: number, search?: string) {
    return this._mediaRepository.getMedia(org, page, search);
  }

  saveMediaInformation(org: string, data: SaveMediaInformationDto) {
    return this._mediaRepository.saveMediaInformation(org, data);
  }

  getVideoOptions() {
    return this._videoManager.getAllVideos();
  }

  async generateVideoAllowed(org: Organization, type: string) {
    const video = this._videoManager.getVideoByName(type);
    if (!video) {
      throw new Error(`Video type ${type} not found`);
    }

    if (!video.trial && org.isTrailing) {
      throw new HttpException('This video is not available in trial mode', 406);
    }

    return true;
  }

  async generateVideo(org: Organization, body: VideoDto) {
    const totalCredits = await this._subscriptionService.checkCredits(
      org,
      'ai_videos'
    );

    if (totalCredits.credits <= 0) {
      throw new SubscriptionException({
        action: AuthorizationActions.Create,
        section: Sections.VIDEOS_PER_MONTH,
      });
    }

    const video = this._videoManager.getVideoByName(body.type);
    if (!video) {
      throw new Error(`Video type ${body.type} not found`);
    }

    if (!video.trial && org.isTrailing) {
      throw new HttpException('This video is not available in trial mode', 406);
    }

    console.log(body.customParams);
    await video.instance.processAndValidate(body.customParams);
    console.log('no err');

    return await this._subscriptionService.useCredit(
      org,
      'ai_videos',
      async () => {
        const loadedData = await video.instance.process(
          body.output,
          body.customParams
        );

        const file = await this.storage.uploadSimple(loadedData);
        return this.saveFile(org.id, file.split('/').pop(), file);
      }
    );
  }

  async videoFunction(identifier: string, functionName: string, body: any) {
    const video = this._videoManager.getVideoByName(identifier);
    if (!video) {
      throw new Error(`Video with identifier ${identifier} not found`);
    }

    // @ts-ignore
    const functionToCall = video.instance[functionName];
    if (
      typeof functionToCall !== 'function' ||
      this._videoManager.checkAvailableVideoFunction(functionToCall)
    ) {
      throw new HttpException(
        `Function ${functionName} not found on video instance`,
        400
      );
    }

    return functionToCall(body);
  }

  async refineDesign(org: Organization, body: RefineDesignDto) {
    await this.requireAiImageCredit(org);
    const spec = body.spec as StudioSpec;

    return this._subscriptionService.useCredit(org, 'ai_images', async () => {
      const result = await this._studioAi.refineSpec(
        spec,
        body.instruction,
        body.screenshot
      );
      return {
        patch: result.patch,
        nextSpec: result.nextSpec,
        explanation: result.explanation,
      };
    });
  }

  async generateVariants(
    org: Organization,
    body: GenerateVariantsDto
  ): Promise<VariantsResult & { backgroundUrl: string | null; cacheHit: boolean }> {
    await this.requireAiImageCredit(org);
    const brandKit = (await this._brandKitService.getNormalized(org.id)) ?? undefined;
    const brand = brandKit
      ? {
          primary: brandKit.colors.primary,
          secondary: brandKit.colors.secondary,
          text: brandKit.colors.text,
          fontFamily: brandKit.font,
          tone: brandKit.tone,
        }
      : undefined;

    return this._subscriptionService.useCredit(org, 'ai_images', async () => {
      const variants = await this._studioAi.generateVariants(
        body.prompt,
        body.platform as StudioPlatformKey,
        brand
      );

      const cacheKey = `bg:variants:${createHash('md5')
        .update(body.prompt.trim().toLowerCase())
        .digest('hex')}`;
      let backgroundUrl = await ioRedis.get(cacheKey);
      const cacheHit = !!backgroundUrl;

      if (!backgroundUrl) {
        try {
          const generated = await this._openAi.generateImage(
            `Social media background for: ${body.prompt}. Empty space for text overlay, dark gradient at bottom, modern minimal, no text in image.`,
            true
          );
          backgroundUrl = generated
            ? await this.storage.uploadSimple(generated)
            : null;
          if (backgroundUrl) {
            await ioRedis.set(cacheKey, backgroundUrl, 'EX', POST_DESIGN_BG_CACHE_TTL);
          }
        } catch (err) {
          console.warn('Variants background generation failed', err);
        }
      }

      return { ...variants, backgroundUrl: backgroundUrl ?? null, cacheHit };
    });
  }

  async checkBrandVoice(
    org: Organization,
    body: BrandVoiceCheckDto
  ): Promise<BrandVoiceResult> {
    await this.requireAiImageCredit(org);
    const brandKit = await this._brandKitService.getNormalized(org.id);
    const recentPosts = await this.getRecentPostBodies(org.id);

    return this._subscriptionService.useCredit(org, 'ai_images', () =>
      this._studioAi.checkBrandVoice({
        caption: body.caption,
        recentPosts,
        brand: brandKit
          ? {
              primary: brandKit.colors.primary,
              secondary: brandKit.colors.secondary,
              text: brandKit.colors.text,
              fontFamily: brandKit.font,
              tone: brandKit.tone,
            }
          : undefined,
      })
    );
  }

  async decomposeImage(
    org: Organization,
    body: DecomposeImageDto
  ): Promise<StudioSpec> {
    await this.requireAiImageCredit(org);
    const brandKit = (await this._brandKitService.getNormalized(org.id)) ?? undefined;
    const brand = brandKit
      ? {
          primary: brandKit.colors.primary,
          secondary: brandKit.colors.secondary,
          text: brandKit.colors.text,
          fontFamily: brandKit.font,
          tone: brandKit.tone,
        }
      : undefined;

    return this._subscriptionService.useCredit(org, 'ai_images', () =>
      this._studioAi.decomposeImage(
        body.imageDataUrl,
        body.platform as StudioPlatformKey,
        brand
      )
    );
  }

  /**
   * Embeddings cost ~$0.000003 per query — skip useCredit. Templates are
   * embedded once and cached in Redis so the cost per query is just one
   * query embedding.
   */
  async searchTemplates(
    body: TemplateSearchDto
  ): Promise<{ id: string; score: number }[]> {
    if (!body.templates.length) return [];

    const templateIds = body.templates
      .map((t) => t.id)
      .sort()
      .join('|');
    const corpusHash = createHash('md5').update(templateIds).digest('hex');
    const cacheKey = `studio:tpl-embeds:${corpusHash}`;

    let embeddings: { id: string; embedding: number[] }[] | null = null;
    const cached = await ioRedis.get(cacheKey);
    if (cached) {
      try {
        embeddings = JSON.parse(cached);
      } catch {
        embeddings = null;
      }
    }

    if (!embeddings) {
      const texts = body.templates.map((t) => t.text);
      const vectors = await this._studioAi.embedBatch(texts);
      embeddings = body.templates.map((t, i) => ({ id: t.id, embedding: vectors[i] }));
      await ioRedis.set(
        cacheKey,
        JSON.stringify(embeddings),
        'EX',
        TEMPLATE_EMBED_CACHE_TTL
      );
    }

    const queryEmbedding = await this._studioAi.embedText(body.query);
    return rankBySimilarity(queryEmbedding, embeddings);
  }

  saveDesignSpec(org: string, mediaId: string, spec: StudioSpec) {
    return this._mediaRepository.saveDesignSpec(org, mediaId, spec);
  }

  private async requireAiImageCredit(org: Organization): Promise<void> {
    if (!process.env.STRIPE_PUBLISHABLE_KEY) return;
    const total = await this._subscriptionService.checkCredits(org, 'ai_images');
    if (total.credits <= 0) {
      throw new HttpException(
        'No image generation credits remaining for this billing cycle',
        402
      );
    }
  }

  private getRecentPostBodies(orgId: string): Promise<string[]> {
    return this._postsRepository.getRecentPostBodies(orgId, RECENT_POSTS_FOR_VOICE);
  }
}
