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
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
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
  model: 'gpt-4.1',
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
    private _postsService: PostsService
  ) {}

  // Autopost produces text + (optional) image. Skip platforms that can't accept
  // that shape so we never schedule a post doomed to fail at publish time.
  static readonly VIDEO_ONLY_PROVIDERS = new Set(['tiktok', 'youtube']);
  static readonly IMAGE_REQUIRED_PROVIDERS = new Set([
    'instagram',
    'instagram-standalone',
    'pinterest',
  ]);

  async stopAll(org: string) {
    const getAll = (await this.getAutoposts(org)).filter((f) => f.active);
    for (const autopost of getAll) {
      await this.changeActive(org, autopost.id, false);
    }
  }

  getAutoposts(orgId: string) {
    return this._autopostsRepository.getAutoposts(orgId);
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
      try {
        return this._temporalService.client
          .getRawClient()
          ?.workflow.start('autoPostWorkflow', {
            workflowId: `autopost-${id}`,
            taskQueue: 'main',
            args: [{ id, immediately: true }],
            typedSearchAttributes: new TypedSearchAttributes([
              {
                key: organizationId,
                value: orgId,
              },
            ]),
          });
      } catch (err) {}
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
      ? `- Ton wypowiedzi: ${state.body.tone}`
      : '- Ton: profesjonalny ale przystępny';

    const structuredOutput = model.withStructuredOutput(generatePlatformContent);
    const platformContent = await ChatPromptTemplate.fromTemplate(
      `
        Jesteś asystentem social media. Na podstawie artykułu generujesz posty dostosowane do każdej platformy.
        
        Zasady:
        - Pisz w tym samym języku co artykuł (jeśli artykuł po polsku — posty po polsku, jeśli po angielsku — po angielsku)
        ${toneInstruction}
        - LinkedIn: profesjonalny ton, 150-200 słów, krótkie akapity z line breaks (\\n\\n), zakończ angażującym pytaniem
        - X/Twitter: max 250 znaków, chwytliwy hook, 1-2 hashtagi na końcu
        - Instagram: scroll-stopping pierwszy wiersz, 2-3 akapity wartości, CTA, potem \\n\\n i 5 hashtagów
        - Facebook: swobodny przyjazny ton, 2-3 zdania, CTA do przeczytania artykułu
        - Generic: uniwersalny, 1-2 zdania, angażujący
        - Używaj emoji tam gdzie pasują
        - NIE dodawaj linku do artykułu — link zostanie dołączony automatycznie
        
        Artykuł:
        {content}
      `
    )
      .pipe(structuredOutput)
      .invoke({
        content: description,
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
      return await storage.uploadSimple(urlOrData);
    } catch {
      return '';
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
      type: useSlot ? 'draft' : 'now',
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

    const load = await this.loadXML(getPost.url);
    if (!load.success || load.url === getPost.lastUrl) {
      return;
    }

    // First run with "sync last": remember the current latest item as already
    // seen, so enabling an autopost doesn't immediately republish an old article.
    if (!getPost.lastUrl && getPost.syncLast) {
      await this._autopostsRepository.updateUrl(id, load.url);
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

    const state = AutopostService.state();
    const workflow = state
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
      .addEdge('update-url', END);

    const app = workflow.compile();
    await app.invoke({
      messages: [],
      id,
      body: getPost,
      load,
      integrations: integrationsToSend,
    });
  }
}
