import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { shuffle } from 'lodash';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { parseChat } from '@gitroom/nestjs-libraries/openai/parse-chat';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-proj-',
});

const PicturePrompt = z.object({
  prompt: z.string(),
});

const VoicePrompt = z.object({
  voice: z.string(),
});

@Injectable()
export class OpenaiService {
  // openai-node 6.x: chat.completions.parse() rejects `response_format`
  // ("Unknown parameter") because it routes to the Responses API. Use .create()
  // with the same zodResponseFormat() body — the server still enforces the JSON
  // schema (strict) — and JSON.parse the content ourselves, preserving the
  // { choices: [{ message: { parsed } }] } shape so call sites stay unchanged.
  private parseChat(body: any) {
    return parseChat(openai, body);
  }

  async transcribeAudioToSrt(audioFilePath: string, language?: string): Promise<string> {
    const info = await stat(audioFilePath);
    if (info.size > 25 * 1024 * 1024) {
      throw new Error('Audio file exceeds Whisper 25MB limit — trim before transcribing');
    }
    const result = await openai.audio.transcriptions.create({
      file: createReadStream(audioFilePath),
      model: 'whisper-1',
      response_format: 'srt',
      language,
    });
    return typeof result === 'string' ? result : '';
  }

  async generateImage(
    prompt: string,
    _isUrl: boolean,
    isVertical = false
  ): Promise<string | undefined> {
    // Model MUST be 'gpt-image-1' — our account does not have access to
    // 'chatgpt-image-latest' (that's ChatGPT's internal model, not an API
    // image model here), and 'dall-e-3' is retired. An upstream sync keeps
    // re-clobbering this line; if image generation 502s after a merge, check
    // here first. gpt-image-1 returns b64 only and rejects response_format.
    const generate = (
      await openai.images.generate({
        prompt,
        model: 'gpt-image-1',
        size: isVertical ? '1024x1536' : '1024x1024',
        // 'medium' is ~4x cheaper than gpt-image-1's default ('high'/'auto') with
        // quality good enough for social graphics — keeps AI-image unit cost sane.
        quality: 'medium',
      })
    ).data?.[0];

    const b64 = generate?.b64_json;
    return b64 ? `data:image/png;base64,${b64}` : undefined;
  }

  async generatePromptForPicture(prompt: string) {
    return (
      (
        await this.parseChat({
          model: 'gpt-4.1',
          messages: [
            {
              role: 'system',
              content: `You are an assistant that take a description and style and generate a prompt that will be used later to generate images, make it a very long and descriptive explanation, and write a lot of things for the renderer like, if it${"'"}s realistic describe the camera`,
            },
            {
              role: 'user',
              content: `prompt: ${prompt}`,
            },
          ],
          response_format: zodResponseFormat(PicturePrompt, 'picturePrompt'),
        })
      ).choices[0].message.parsed?.prompt || ''
    );
  }

  async generateVoiceFromText(prompt: string) {
    return (
      (
        await this.parseChat({
          model: 'gpt-4.1',
          messages: [
            {
              role: 'system',
              content: `You are an assistant that takes a social media post and convert it to a normal human voice, to be later added to a character, when a person talk they don\'t use "-", and sometimes they add pause with "..." to make it sounds more natural, make sure you use a lot of pauses and make it sound like a real person`,
            },
            {
              role: 'user',
              content: `prompt: ${prompt}`,
            },
          ],
          response_format: zodResponseFormat(VoicePrompt, 'voice'),
        })
      ).choices[0].message.parsed?.voice || ''
    );
  }

  async generatePosts(content: string) {
    const posts = (
      await Promise.all([
        openai.chat.completions.create({
          messages: [
            {
              role: 'assistant',
              content:
                'Generate a Twitter post from the content without emojis in the following JSON format: { "post": string } put it in an array with one element',
            },
            {
              role: 'user',
              content: content!,
            },
          ],
          n: 5,
          temperature: 1,
          model: 'gpt-4.1',
        }),
        openai.chat.completions.create({
          messages: [
            {
              role: 'assistant',
              content:
                'Generate a thread for social media in the following JSON format: Array<{ "post": string }> without emojis',
            },
            {
              role: 'user',
              content: content!,
            },
          ],
          n: 5,
          temperature: 1,
          model: 'gpt-4.1',
        }),
      ])
    ).flatMap((p) => p.choices);

    return shuffle(
      posts.map((choice) => {
        const { content } = choice.message;
        const start = content?.indexOf('[')!;
        const end = content?.lastIndexOf(']')!;
        try {
          return JSON.parse(
            '[' +
              content
                ?.slice(start + 1, end)
                .replace(/\n/g, ' ')
                .replace(/ {2,}/g, ' ') +
              ']'
          );
        } catch (e) {
          return [];
        }
      })
    );
  }
  async extractWebsiteText(content: string) {
    const websiteContent = await openai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content:
            'You take a full website text, and extract only the article content',
        },
        {
          role: 'user',
          content,
        },
      ],
      model: 'gpt-4.1',
    });

    const { content: articleContent } = websiteContent.choices[0].message;

    return this.generatePosts(articleContent!);
  }

  async separatePosts(content: string, len: number) {
    const SeparatePostsPrompt = z.object({
      posts: z.array(z.string()),
    });

    const SeparatePostPrompt = z.object({
      post: z.string().max(len),
    });

    const posts =
      (
        await this.parseChat({
          model: 'gpt-4.1',
          messages: [
            {
              role: 'system',
              content: `You are an assistant that take a social media post and break it to a thread, each post must be minimum ${
                len - 10
              } and maximum ${len} characters, keeping the exact wording and break lines, however make sure you split posts based on context`,
            },
            {
              role: 'user',
              content: content,
            },
          ],
          response_format: zodResponseFormat(
            SeparatePostsPrompt,
            'separatePosts'
          ),
        })
      ).choices[0].message.parsed?.posts || [];

    return {
      posts: await Promise.all(
        posts.map(async (post: any) => {
          if (post.length <= len) {
            return post;
          }

          let retries = 4;
          while (retries) {
            try {
              return (
                (
                  await this.parseChat({
                    model: 'gpt-4.1',
                    messages: [
                      {
                        role: 'system',
                        content: `You are an assistant that take a social media post and shrink it to be maximum ${len} characters, keeping the exact wording and break lines`,
                      },
                      {
                        role: 'user',
                        content: post,
                      },
                    ],
                    response_format: zodResponseFormat(
                      SeparatePostPrompt,
                      'separatePost'
                    ),
                  })
                ).choices[0].message.parsed?.post || ''
              );
            } catch (e) {
              retries--;
            }
          }

          return post;
        })
      ),
    };
  }

  async generatePostDesign(
    prompt: string,
    platform: string,
    brandKit?: {
      colors?: { primary?: string; secondary?: string; text?: string };
      font?: string;
      tone?: string;
    }
  ) {
    const PostDesignSchema = z.object({
      headline: z.string().max(60),
      subtext: z.string().max(120),
      cta: z.string().max(30),
      imagePrompt: z
        .string()
        .describe(
          'Prompt for the background image. Style: professional editorial photography or clean minimal art direction — realistic lighting, natural color grade, intentional composition. AVOID the obvious "AI render" look (over-saturated, plasticky 3D, surreal artifacts, warped details). Absolutely NO text, letters, words, logos or watermarks in the image. Leave empty space (left, center, or bottom-third) for text overlay. End with: "dark gradient overlay at the bottom for text readability".'
        ),
      colors: z.object({
        background: z.string().describe('hex color, e.g. #1a1a2e'),
        accent: z.string().describe('hex color for emphasis'),
        text: z.string().describe('hex color for primary text — must contrast strongly with background'),
      }),
      layout: z.enum([
        'centered-stack',
        'left-aligned',
        'bottom-stack',
        'top-banner',
      ]),
    });

    const brandHint = brandKit?.colors
      ? `BRAND CONSTRAINTS — respect strictly:
- Background color: ${brandKit.colors.secondary || 'designer choice'}
- Accent color: ${brandKit.colors.primary || 'designer choice'}
- Text color: ${brandKit.colors.text || '#ffffff'}
- Font family: ${brandKit.font || 'sans-serif'}
- Tone: ${brandKit.tone || 'professional'}`
      : '';

    for (let i = 0; i < 3; i++) {
      try {
        const parsed = (
          await this.parseChat({
            model: 'gpt-4.1',
            messages: [
              {
                role: 'system',
                content: `You are an expert social media graphic designer.
Generate a complete design specification for a ${platform} post.

LANGUAGE: Detect the language of the user's prompt. Generate ALL text fields (headline, subtext, cta) in that SAME language. If Polish prompt → Polish text. Never mix.

CONTENT RULES:
- headline: short, impactful, max ~5 words
- subtext: supporting detail, 1 sentence
- cta: short call-to-action (e.g. "Sprawdź", "Kup teraz", "Zobacz więcej", or English equivalent)
- imagePrompt: rich visual description for the background. Professional editorial/photographic style, NOT the obvious "AI render" look. No text/letters/logos in the image. Leave space for text. End with "dark gradient overlay at the bottom for text readability".
- colors: high-contrast, accessible (WCAG AA min)
- layout: pick the best layout for the content

COPY QUALITY — write like a senior brand copywriter, NOT like an AI:
- Concrete and specific to the user's prompt — no generic filler.
- Ban AI clichés: "Unlock", "Elevate", "Discover the power of", "Take it to the next level", "Game-changer", "In today's fast-paced world".
- No emoji unless the user explicitly asked. Every word earns its place.

${brandHint}`,
              },
              { role: 'user', content: prompt },
            ],
            response_format: zodResponseFormat(PostDesignSchema, 'postDesign'),
          })
        ).choices[0].message.parsed;

        if (parsed) return parsed;
      } catch (err) {
        console.log('generatePostDesign attempt failed:', err);
      }
    }

    throw new Error('Failed to generate post design after 3 attempts');
  }

  async generateCaption(
    topic: string,
    platform: string,
    brandKit?: {
      colors?: { primary?: string; secondary?: string; text?: string };
      font?: string;
      tone?: string;
    }
  ): Promise<string> {
    const CaptionSchema = z.object({ caption: z.string() });
    const toneHint = brandKit?.tone
      ? `Brand tone of voice: ${brandKit.tone}. Write the caption in that voice.`
      : '';

    const parsed = (
      await this.parseChat({
        model: 'gpt-4.1',
        messages: [
          {
            role: 'system',
            content: `You are a senior social media copywriter writing the caption for a ${platform} post.

LANGUAGE: detect the language of the topic and write the caption in that SAME language.

RULES:
- Write the POST caption (the body text), NOT the on-image graphic text. Open with a hook line, then 1-3 short sentences, end with a light call to action.
- Fit the platform: punchy for X/Instagram/Threads, a little more context for LinkedIn/Facebook.
- Sound like a person. Ban AI clichés ("Unlock", "Elevate", "Discover the power of", "Take it to the next level", "Game-changer", "In today's fast-paced world").
- No hashtags unless they genuinely help — at most 2-3, at the very end.
- No emoji unless they fit the brand tone.

${toneHint}`,
          },
          { role: 'user', content: topic },
        ],
        response_format: zodResponseFormat(CaptionSchema, 'caption'),
      })
    ).choices[0].message.parsed;

    return parsed?.caption?.trim() || topic;
  }

  async generatePostCarousel(
    prompt: string,
    platform: string,
    slidesCount: number,
    brandKit?: {
      colors?: { primary?: string; secondary?: string; text?: string };
      font?: string;
      tone?: string;
    }
  ) {
    const SlideSchema = z.object({
      headline: z.string().max(60),
      subtext: z.string().max(120),
      cta: z.string().max(30),
      layout: z.enum(['centered-stack', 'left-aligned', 'bottom-stack', 'top-banner']),
      imageVariation: z
        .string()
        .max(160)
        .describe(
          "How THIS slide's background varies from the shared theme — a different camera angle, framing, crop, distance, or focal element. MUST keep the SAME art direction, color palette, lighting and mood as the shared imagePrompt so the carousel reads as one cohesive post. Each slide's variation must be DISTINCT from the others. No text, letters, words, logos or watermarks."
        ),
    });

    const CarouselSchema = z.object({
      imagePrompt: z
        .string()
        .describe(
          'The SHARED base theme / art direction for the whole carousel — each slide renders a distinct variation of THIS theme (see slide.imageVariation), so describe the consistent style, palette, lighting and mood here, not one fixed scene. Style: professional editorial photography or clean minimal art direction — realistic lighting, natural color grade, intentional composition. AVOID the obvious "AI render" look (over-saturated, plasticky 3D, surreal artifacts, warped details). Absolutely NO text, letters, words, logos or watermarks in the image. Leave clear negative space for text overlay. End with: "dark gradient overlay at the bottom for text readability".'
        ),
      colors: z.object({
        background: z.string(),
        accent: z.string(),
        text: z.string(),
      }),
      slides: z
        .array(SlideSchema)
        .min(slidesCount)
        .max(slidesCount)
        .describe(
          `Exactly ${slidesCount} slides forming a coherent narrative. Slide 1 = hook, last slide = CTA, middle slides = body points (one idea per slide).`
        ),
    });

    const brandHint = brandKit?.colors
      ? `BRAND CONSTRAINTS — respect strictly:
- Background color: ${brandKit.colors.secondary || 'designer choice'}
- Accent color: ${brandKit.colors.primary || 'designer choice'}
- Text color: ${brandKit.colors.text || '#ffffff'}
- Font family: ${brandKit.font || 'sans-serif'}
- Tone: ${brandKit.tone || 'professional'}`
      : '';

    // OpenAI structured outputs ignore array min/max in strict mode, so the
    // model can return the wrong number of slides. Validate the count, prefer an
    // exact match, and normalize the best result so the user always gets exactly
    // what they asked for.
    const normalizeSlides = <T extends object>(slides: T[], n: number): T[] => {
      if (slides.length >= n) return slides.slice(0, n);
      const out = [...slides];
      while (out.length < n && slides.length) {
        out.push({ ...slides[slides.length - 1] });
      }
      return out;
    };

    let best: { imagePrompt: string; colors: any; slides: any[] } | null = null;

    for (let i = 0; i < 3; i++) {
      try {
        const parsed = (
          await this.parseChat({
            model: 'gpt-4.1',
            messages: [
              {
                role: 'system',
                content: `You are an expert social media graphic designer creating a carousel post for ${platform}.

SLIDE COUNT: The "slides" array MUST contain EXACTLY ${slidesCount} slides — not fewer, not more. This is a hard requirement.

LANGUAGE: Detect the language of the user's prompt. Generate ALL text fields (headline, subtext, cta) in that SAME language. If Polish prompt → Polish text. Never mix languages within one carousel.

NARRATIVE (adapt to ${slidesCount} slides):
- Slide 1: hook — catchy headline that stops the scroll
- Middle slides: one body point each, building the argument (skip if only 2 slides)
- Last slide: clear CTA (call-to-action)

COPY QUALITY — write like a senior brand copywriter, NOT like an AI:
- Concrete and specific to the user's prompt — no generic filler.
- Ban AI clichés: "Unlock", "Elevate", "Discover the power of", "Take it to the next level", "Game-changer", "In today's fast-paced world".
- No emoji unless the user explicitly asked. Every word earns its place.

PER-SLIDE RULES:
- headline: short, impactful, max ~5 words
- subtext: supporting detail, 1 sentence
- cta: short call-to-action ("Sprawdź", "Kup teraz", "Zobacz więcej" or English equivalent). On non-final slides this can be a transition like "Dalej →" / "Następny slajd".
- layout: pick the best layout for the content (vary across slides for visual rhythm — don't use the same layout for all)
- imageVariation: a DISTINCT variation of the shared theme for this slide's background — different angle, framing, crop, distance or focal element. Keep the SAME art direction, palette, lighting and mood as the shared imagePrompt. Must differ from every other slide's variation. No text/letters/logos.

SHARED:
- imagePrompt: the base theme / art direction every slide builds on (NOT one fixed scene — each slide varies it via imageVariation). Professional editorial/photographic style, NOT the obvious "AI render" look. No text/letters/logos in the image. Leave space for text overlay.
- colors: high-contrast, accessible (WCAG AA min). Same palette across all slides for brand consistency.

${brandHint}`,
              },
              {
                role: 'user',
                content: `${prompt}\n\n(Return EXACTLY ${slidesCount} slides in the "slides" array.)`,
              },
            ],
            response_format: zodResponseFormat(CarouselSchema, 'carousel'),
          })
        ).choices[0].message.parsed;

        if (parsed?.slides?.length) {
          // Exact match — return immediately.
          if (parsed.slides.length === slidesCount) return parsed;
          // Otherwise keep the first usable result as a fallback and retry.
          if (!best) best = parsed;
        }
      } catch (err) {
        console.log('generatePostCarousel attempt failed:', err);
      }
    }

    if (best) {
      return { ...best, slides: normalizeSlides(best.slides, slidesCount) };
    }

    throw new Error('Failed to generate carousel after 3 attempts');
  }

  async generateSlidesFromText(text: string) {
    for (let i = 0; i < 3; i++) {
      try {
        const message = `You are an assistant that takes a text and break it into slides, each slide should have an image prompt and voice text to be later used to generate a video and voice, image prompt should capture the essence of the slide and also have a back dark gradient on top, image prompt should not contain text in the picture, generate between 3-5 slides maximum`;
        const parse =
          (
            await this.parseChat({
              model: 'gpt-4.1',
              messages: [
                {
                  role: 'system',
                  content: message,
                },
                {
                  role: 'user',
                  content: text,
                },
              ],
              response_format: zodResponseFormat(
                z.object({
                  slides: z
                    .array(
                      z.object({
                        imagePrompt: z.string(),
                        voiceText: z.string(),
                      })
                    )
                    .describe('an array of slides'),
                }),
                'slides'
              ),
            })
          ).choices[0].message.parsed?.slides || [];

        return parse;
      } catch (err) {
        console.log(err);
      }
    }

    return [];
  }
}
