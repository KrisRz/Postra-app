import { Injectable } from '@nestjs/common';
import { AutopostRepository } from '@gitroom/nestjs-libraries/database/prisma/autopost/autopost.repository';
import { AutopostDto } from '@gitroom/nestjs-libraries/dtos/autopost/autopost.dto';
import dayjs from 'dayjs';
import { END, START, StateGraph } from '@langchain/langgraph';
import { AutoPost, Integration } from '@prisma/client';
import { BaseMessage } from '@langchain/core/messages';
import striptags from 'striptags';
import { ChatOpenAI, DallEAPIWrapper } from '@langchain/openai';
import { JSDOM } from 'jsdom';
import { z } from 'zod';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import Parser from 'rss-parser';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { parseDataUrl } from '@gitroom/nestjs-libraries/upload/data.url';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import sharp from 'sharp';
import { TemporalService } from 'nestjs-temporal-core';
import { TypedSearchAttributes } from '@temporalio/common';
import {
  organizationId,
} from '@gitroom/nestjs-libraries/temporal/temporal.search.attribute';
const parser = new Parser();

interface PlatformContent {
  linkedin: string;
  twitter: string;
  instagram: string;
  facebook: string;
  generic: string;
}

interface WorkflowChannelsState {
  messages: BaseMessage[];
  integrations: Integration[];
  body: AutoPost;
  description: string;
  platformContent?: PlatformContent;
  image: string;
  id: string;
  load: {
    date: string;
    url: string;
    description: string;
  };
}

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-proj-',
  // gpt-4.1-mini: ~5x cheaper than gpt-4.1 with negligible quality drop for
  // short social captions generated from an article (no complex reasoning).
  model: 'gpt-4.1-mini',
  temperature: 0.7,
});

const dalle = new DallEAPIWrapper({
  apiKey: process.env.OPENAI_API_KEY || 'sk-proj-',
  model: 'chatgpt-image-latest',
});

// Reuse the same storage backend as the rest of the app (local / cloudflare / s3).
const storage = UploadFactory.createStorage();

const generatePlatformContent = z.object({
  linkedin: z
    .string()
    .describe('LinkedIn post: professional tone, 150-200 words, line breaks between paragraphs, end with engaging question'),
  twitter: z
    .string()
    .describe('X/Twitter post: max 250 chars, punchy hook, include 1-2 hashtags at end'),
  instagram: z
    .string()
    .describe('Instagram caption: scroll-stopping first line, 2-3 paragraphs, CTA, then 5 relevant hashtags after line break'),
  facebook: z
    .string()
    .describe('Facebook post: casual friendly tone, 2-3 sentences, CTA to read full article'),
  generic: z
    .string()
    .describe('Generic social post: engaging, 1-2 sentences, universal'),
});

const dallePrompt = z.object({
  generatedTextToBeSentToDallE: z
    .string()
    .describe('Generated prompt from description to be sent to DallE'),
});

@Injectable()
export class AutopostService {
  constructor(
    private _autopostsRepository: AutopostRepository,
    private _temporalService: TemporalService,
    private _integrationService: IntegrationService,
    private _postsService: PostsService,
    private _notificationService: NotificationService
  ) {}

  // Autopost produces text + (optional) image. Skip platforms that can't accept
  // that shape so we never schedule a post doomed to fail at publish time.
  static readonly VIDEO_ONLY_PROVIDERS = new Set(['tiktok', 'youtube']);
  static readonly IMAGE_REQUIRED_PROVIDERS = new Set([
    'instagram',
    'instagram-standalone',
    'pinterest',
  ]);

  // Cap items processed per hourly run so a feed that publishes a burst (or a
  // first sync without syncLast) can't flood every connected channel at once.
  static readonly MAX_ITEMS_PER_RUN = 5;

  async stopAll(org: string) {
    const getAll = (await this.getAutoposts(org)).filter((f) => f.active);
    for (const autopost of getAll) {
      await this.changeActive(org, autopost.id, false);
    }
  }

  getAutoposts(orgId: string) {
    return this._autopostsRepository.getAutoposts(orgId);
  }

  getTotal(orgId: string) {
    return this._autopostsRepository.getTotal(orgId);
  }

  async createAutopost(orgId: string, body: AutopostDto, id?: string) {
    const data = await this._autopostsRepository.createAutopost(
      orgId,
      body,
      id
    );

    await this.processCron(body.active, orgId, data.id);

    return data;
  }

  async changeActive(orgId: string, id: string, active: boolean) {
    const data = await this._autopostsRepository.changeActive(
      orgId,
      id,
      active
    );
    await this.processCron(active, orgId, id);
    return data;
  }

  async processCron(active: boolean, orgId: string, id: string) {
    if (active) {
      // TERMINATE_EXISTING makes (re)activation idempotent: starting with an
      // already-running workflowId replaces it instead of throwing
      // WorkflowExecutionAlreadyStarted. Without it, a swallowed throw would
      // fall through to terminateWorkflow below and silently kill the live
      // autopost on every edit / repeat toggle.
      try {
        return await this._temporalService.client
          .getRawClient()
          ?.workflow.start('autoPostWorkflow', {
            workflowId: `autopost-${id}`,
            taskQueue: 'main',
            workflowIdConflictPolicy: 'TERMINATE_EXISTING',
            args: [{ id, immediately: true }],
            typedSearchAttributes: new TypedSearchAttributes([
              {
                key: organizationId,
                value: orgId,
              },
            ]),
          });
      } catch (err) {
        return false;
      }
    }

    try {
      return await this._temporalService.terminateWorkflow(`autopost-${id}`);
    } catch (err) {
      return false;
    }
  }

  async deleteAutopost(orgId: string, id: string) {
    const data = await this._autopostsRepository.deleteAutopost(orgId, id);
    await this.processCron(false, orgId, id);
    return data;
  }

  async loadXML(url: string) {
    try {
      const { items } = await parser.parseURL(url);
      if (!items?.length) {
        return { success: false };
      }

      // Most feeds carry pubDate → pick the newest by date. Feeds without any
      // valid pubDate are virtually always newest-first, so fall back to items[0]
      // instead of the 100-years-ago seed (which has no link → garbage post).
      const hasDates = items.some(
        (i: any) => i.pubDate && dayjs(i.pubDate).isValid()
      );
      const findLast = hasDates
        ? items.reduce(
            (all: any, current: any) =>
              dayjs(current.pubDate).isAfter(all.pubDate) ? current : all,
            { pubDate: dayjs().subtract(100, 'years') }
          )
        : items[0];

      if (!findLast?.link) {
        return { success: false };
      }

      return {
        success: true,
        date: findLast.pubDate,
        url: findLast.link,
        description: striptags(
          findLast?.['content:encoded'] ||
            findLast?.content ||
            findLast?.description ||
            ''
        )
          .replace(/\n/g, ' ')
          .trim(),
      };
    } catch (err) {
      /** sent **/
    }

    return { success: false };
  }

  private itemToLoad(item: any) {
    return {
      date: item.pubDate,
      url: item.link,
      description: striptags(
        item?.['content:encoded'] || item?.content || item?.description || ''
      )
        .replace(/\n/g, ' ')
        .trim(),
    };
  }

  // Return loads for every feed item newer than lastUrl, oldest-first and
  // capped, so a burst of new articles isn't collapsed into a single post.
  // If lastUrl rolled off the feed we only take the newest item (never the
  // whole backlog).
  async loadNewLoads(
    url: string,
    lastUrl: string,
    max = AutopostService.MAX_ITEMS_PER_RUN
  ) {
    try {
      const { items } = await parser.parseURL(url);
      const valid = (items || []).filter((i: any) => i?.link);
      if (!valid.length) {
        return [];
      }

      const hasDates = valid.some(
        (i: any) => i.pubDate && dayjs(i.pubDate).isValid()
      );
      const ordered = hasDates
        ? [...valid].sort(
            (a: any, b: any) =>
              dayjs(b.pubDate).valueOf() - dayjs(a.pubDate).valueOf()
          )
        : valid;

      const idx = ordered.findIndex((i: any) => i.link === lastUrl);
      const fresh = idx === -1 ? ordered.slice(0, 1) : ordered.slice(0, idx);

      return fresh
        .slice(0, max)
        .reverse()
        .map((i: any) => this.itemToLoad(i));
    } catch (err) {
      return [];
    }
  }

  private async notifyFailure(getPost: AutoPost, err: any) {
    try {
      await this._notificationService.inAppNotification(
        getPost.organizationId,
        'Autopost failed',
        `Autopost "${getPost.title}" could not publish the latest item from ${
          getPost.url
        }: ${String(err?.message || err)}`,
        false,
        false,
        'fail'
      );
    } catch (e) {
      /** never let a failed notification mask the original error path **/
    }
  }

  static state = () =>
    new StateGraph<WorkflowChannelsState>({
      channels: {
        messages: {
          reducer: (currentState, updateValue) =>
            currentState.concat(updateValue),
          default: (): any[] => [],
        },
        body: null,
        description: null,
        platformContent: null,
        load: null,
        image: null,
        integrations: null,
        id: null,
      },
    });

  async loadUrl(url: string) {
    try {
      const loadDom = new JSDOM(await (await fetch(url)).text());
      loadDom.window.document
        .querySelectorAll('script')
        .forEach((s) => s.remove());
      loadDom.window.document
        .querySelectorAll('style')
        .forEach((s) => s.remove());
      // remove all html, script and styles
      return striptags(loadDom.window.document.body.innerHTML);
    } catch (err) {
      return '';
    }
  }

  async generateDescription(state: WorkflowChannelsState) {
    if (!state.body.generateContent) {
      return {
        ...state,
        description: state.body.content,
      };
    }

    const description =
      state.load.description || (await this.loadUrl(state.load.url));
    if (!description) {
      return {
        ...state,
        description: '',
      };
    }

    const toneInstruction = state.body.tone
      ? `- Tone of voice: ${state.body.tone}`
      : '- Tone: professional but approachable';

    // Extra brand/topic context from the user (e.g. "fitness brand, add one
    // actionable gym tip"). Layered ON TOP of the per-platform rules — it must
    // not override the hard platform constraints (language, length limits,
    // hashtag counts). Passed as a template variable (not string-interpolated)
    // so any { } the user types stays literal and never breaks the f-string.
    const extraInstructions = state.body.customInstructions?.trim()
      ? `Additional context from the user — weave it in where relevant, but ALWAYS keep the per-platform rules above (language, length limits, hashtag counts):\n        ${state.body.customInstructions.trim()}`
      : '';

    const structuredOutput = model.withStructuredOutput(generatePlatformContent);
    const platformContent = await ChatPromptTemplate.fromTemplate(
      `
        You are a social media assistant. Based on the article, generate posts tailored to each platform.

        Rules:
        - Write in the SAME language as the article (article in English -> posts in English; article in Polish -> posts in Polish, etc.)
        ${toneInstruction}
        - LinkedIn: professional tone, 150-200 words, short paragraphs with line breaks (\\n\\n), end with an engaging question
        - X/Twitter: max 250 characters, punchy hook, 1-2 hashtags at the end
        - Instagram: scroll-stopping first line, 2-3 value paragraphs, CTA, then \\n\\n and 5 hashtags
        - Facebook: casual friendly tone, 2-3 sentences, CTA to read the article
        - Generic: universal, 1-2 sentences, engaging
        - Use emoji where they fit
        - Do NOT add a link to the article — the link is appended automatically
        {extraInstructions}

        Article:
        {content}
      `
    )
      .pipe(structuredOutput)
      .invoke({
        content: description,
        extraInstructions,
      });

    return {
      ...state,
      description: platformContent.generic,
      platformContent,
    };
  }

  private async extractOgImage(url: string): Promise<string | null> {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'PostraBot/1.0' },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return null;
      const html = await response.text();
      const ogMatch = html.match(
        /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i
      );
      if (ogMatch?.[1]) return ogMatch[1];
      const twitterMatch = html.match(
        /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i
      );
      return twitterMatch?.[1] || null;
    } catch {
      return null;
    }
  }

  async generatePicture(state: WorkflowChannelsState) {
    const ogImage = await this.extractOgImage(state.load.url);
    if (ogImage) {
      return { ...state, image: await this.persistImage(ogImage) };
    }

    const structuredOutput = model.withStructuredOutput(dallePrompt);
    const { generatedTextToBeSentToDallE } =
      await ChatPromptTemplate.fromTemplate(
        `
        You generate a DALL-E prompt for a social media post image.
        
        Rules:
        - Style: professional editorial photography, shot on Canon EOS R5, natural lighting
        - NO text, watermarks, logos, or UI elements in the image
        - NO obvious AI artifacts (extra fingers, distorted faces, floating objects)
        - Prefer: clean compositions, shallow depth of field, muted corporate color palette
        - If topic is abstract (software, data, AI) — use metaphorical real-world objects (desk setup, office, city, nature)
        - Aspect ratio: 16:9 landscape
        
        Article topic:
        {content}
      `
      )
        .pipe(structuredOutput)
        .invoke({
          content: state.load.description || state.description,
        });

    const image = await dalle.invoke(generatedTextToBeSentToDallE);

    return { ...state, image: await this.persistImage(image) };
  }

  // Persist an OG/AI image into our own storage. OG images hotlink a third-party
  // CDN and DALL-E URLs expire (~1h) — fatal once the post is a draft published
  // later. On failure, degrade to no image rather than storing a dead URL.
  private async persistImage(urlOrData: string): Promise<string> {
    if (!urlOrData) {
      return '';
    }
    try {
      const normalized = await this.toInstagramSafeAspect(urlOrData);
      return await storage.uploadSimple(normalized);
    } catch {
      return '';
    }
  }

  // Instagram rejects feed images outside 4:5 (0.8) .. 1.91:1 with
  // "Aspect ratio not supported". OG images are usually 1.91:1 but feeds also
  // ship 16:9 (1.78 — fine) and tall/banner crops that fail. We center-crop the
  // smallest amount to land inside the band so the post clears IG validation
  // while staying byte-identical for FB/X/LinkedIn (they accept the cropped one
  // too). On any failure we return the input untouched — never block the post.
  private async toInstagramSafeAspect(urlOrData: string): Promise<string> {
    const MIN = 0.8; // 4:5 portrait bound
    const MAX = 1.91; // 1.91:1 landscape bound
    // Crop targets sit just inside the bounds so rounding never pushes us back
    // over Meta's strict limit.
    const MIN_TARGET = 0.81;
    const MAX_TARGET = 1.9;

    try {
      let buf: Buffer;
      if (urlOrData.startsWith('data:')) {
        const parsed = parseDataUrl(urlOrData);
        if (!parsed) return urlOrData;
        buf = parsed.buffer;
      } else {
        const res = await fetch(urlOrData, {
          headers: { 'User-Agent': 'PostraBot/1.0' },
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) return urlOrData;
        buf = Buffer.from(await res.arrayBuffer());
      }

      const img = sharp(buf, { failOn: 'none' });
      const meta = await img.metadata();
      const w = meta.width || 0;
      const h = meta.height || 0;
      if (!w || !h) return urlOrData;

      const ratio = w / h;
      if (ratio >= MIN && ratio <= MAX) return urlOrData;

      let targetW = w;
      let targetH = h;
      if (ratio > MAX) {
        targetW = Math.round(h * MAX_TARGET); // too wide -> trim sides
      } else {
        targetH = Math.round(w / MIN_TARGET); // too tall -> trim top/bottom
      }

      const left = Math.max(0, Math.round((w - targetW) / 2));
      const top = Math.max(0, Math.round((h - targetH) / 2));
      const out = await img
        .extract({
          left,
          top,
          width: Math.min(targetW, w - left),
          height: Math.min(targetH, h - top),
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      return `data:image/jpeg;base64,${out.toString('base64')}`;
    } catch {
      return urlOrData;
    }
  }

  private getContentForProvider(
    providerIdentifier: string,
    state: WorkflowChannelsState
  ): string {
    if (!state.platformContent) {
      return state.description || '';
    }
    const providerMap: Record<string, keyof PlatformContent> = {
      linkedin: 'linkedin',
      'linkedin-page': 'linkedin',
      twitter: 'twitter',
      x: 'twitter',
      instagram: 'instagram',
      facebook: 'facebook',
      'facebook-page': 'facebook',
      threads: 'instagram',
      tiktok: 'generic',
      youtube: 'generic',
      pinterest: 'generic',
    };
    const key = providerMap[providerIdentifier] || 'generic';
    return state.platformContent[key] || state.description || '';
  }

  async schedulePost(state: WorkflowChannelsState) {
    // Image-required platforms (Instagram, Pinterest) can't publish a text-only
    // post; drop them when no image was produced rather than failing at publish.
    const integrations = state.image
      ? state.integrations
      : state.integrations.filter(
          (i) =>
            !AutopostService.IMAGE_REQUIRED_PROVIDERS.has(i.providerIdentifier)
        );
    if (integrations.length === 0) {
      return;
    }

    const orgId = integrations[0].organizationId;
    const useSlot = state.body.onSlot;
    const date = useSlot
      ? (await this._postsService.findFreeDateTime(orgId)) + 'Z'
      : new Date().toISOString();

    await this._postsService.createPost(orgId, {
      date,
      order: makeId(10),
      shortLink: false,
      // useSlot -> 'schedule' queues the post at the next free slot so it
      // actually auto-publishes (legacy 'draft' created a never-published draft
      // despite the "post on next available slot" label). !useSlot -> publish now.
      type: useSlot ? 'schedule' : 'now',
      tags: [],
      posts: integrations.map((i) => ({
        settings: {
          __type: i.providerIdentifier as any,
          title: '',
          tags: [],
          subreddit: [],
        },
        group: makeId(10),
        integration: { id: i.id },
        value: [
          {
            id: makeId(10),
            delay: 0,
            content:
              this.getContentForProvider(i.providerIdentifier, state) +
              '\n\n' +
              state.load.url,
            image: !state.image
              ? []
              : [
                  {
                    id: makeId(10),
                    name: makeId(10),
                    path: state.image,
                    organizationId: orgId,
                  },
                ],
          },
        ],
      })),
    }, 'AUTOPOST');
  }

  async updateUrl(state: WorkflowChannelsState) {
    await this._autopostsRepository.updateUrl(state.id, state.load.url);
  }

  async startAutopost(id: string) {
    const getPost = await this._autopostsRepository.getAutopost(id);
    if (!getPost || !getPost.active) {
      return;
    }

    let loads: { date: any; url: string; description: string }[];

    if (!getPost.lastUrl) {
      // First activation: consider only the newest item so we never replay the
      // whole feed history.
      const newest = await this.loadXML(getPost.url);
      if (!newest.success) {
        return;
      }
      // "sync last": remember the current latest item as already seen so
      // enabling an autopost doesn't immediately republish an old article.
      if (getPost.syncLast) {
        await this._autopostsRepository.updateUrl(id, newest.url);
        return;
      }
      loads = [
        {
          date: newest.date,
          url: newest.url,
          description: newest.description,
        },
      ];
    } else {
      loads = await this.loadNewLoads(getPost.url, getPost.lastUrl);
    }

    if (!loads.length) {
      return;
    }

    const integrations = await this._integrationService.getIntegrationsList(
      getPost.organizationId
    );

    const parseIntegrations = JSON.parse(getPost.integrations || '[]') || [];
    const neededIntegrations = integrations.filter((i) =>
      parseIntegrations.some((ii: any) => ii.id === i.id)
    );

    const selected =
      parseIntegrations.length === 0 ? integrations : neededIntegrations;

    const integrationsToSend = selected.filter(
      (i) => !AutopostService.VIDEO_ONLY_PROVIDERS.has(i.providerIdentifier)
    );
    if (integrationsToSend.length === 0) {
      return;
    }

    const app = AutopostService.state()
      .addNode('generate-description', this.generateDescription.bind(this))
      .addNode('generate-picture', this.generatePicture.bind(this))
      .addNode('schedule-post', this.schedulePost.bind(this))
      .addNode('update-url', this.updateUrl.bind(this))
      .addEdge(START, 'generate-description')
      .addConditionalEdges(
        'generate-description',
        (state: WorkflowChannelsState) => {
          if (!state.description) {
            return 'schedule-post';
          }
          if (state.body.addPicture) {
            return 'generate-picture';
          }
          return 'schedule-post';
        }
      )
      .addEdge('generate-picture', 'schedule-post')
      .addEdge('schedule-post', 'update-url')
      .addEdge('update-url', END)
      .compile();

    // Oldest-first so update-url advances lastUrl in order. Stop on the first
    // failure (and surface it) so lastUrl never skips past an unposted item —
    // the hourly run resumes from there next time.
    for (const load of loads) {
      try {
        await app.invoke({
          messages: [],
          id,
          body: getPost,
          load,
          integrations: integrationsToSend,
        });
      } catch (err) {
        await this.notifyFailure(getPost, err);
        break;
      }
    }
  }
}
