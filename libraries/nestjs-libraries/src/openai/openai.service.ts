import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { shuffle } from 'lodash';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';

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
  private async parseChat(
    body: any
  ): Promise<{
    choices: Array<{ message: { parsed: any; content: string | null } }>;
  }> {
    const completion = (await openai.chat.completions.create(body)) as unknown as {
      choices: Array<{ message: { content: string | null } }>;
    };
    return {
      choices: completion.choices.map((c) => {
        const content = c.message?.content ?? null;
        let parsed: any = null;
        if (content) {
          try {
            parsed = JSON.parse(content);
          } catch {
            parsed = null;
          }
        }
        return { message: { parsed, content } };
      }),
    };
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

  async generateImage(prompt: string, isUrl: boolean, isVertical = false) {
    const generate = (
      await openai.images.generate({
        prompt,
        response_format: isUrl ? 'url' : 'b64_json',
        model: 'dall-e-3',
        ...(isVertical ? { size: '1024x1792' } : {}),
      })
    ).data[0];

    return isUrl ? generate.url : generate.b64_json;
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
          'DALL-E 3 prompt for the background image. Describe a visually appealing scene with empty space (left, center, or bottom-third) for text overlay. Always end with: "dark gradient overlay at the bottom for text readability, modern minimalist composition, no text in image".'
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
- imagePrompt: rich visual description for DALL-E 3 background. Leave space for text. End with "dark gradient overlay at the bottom for text readability, modern minimalist composition, no text in image".
- colors: high-contrast, accessible (WCAG AA min)
- layout: pick the best layout for the content

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
    });

    const CarouselSchema = z.object({
      imagePrompt: z
        .string()
        .describe(
          'ONE shared DALL-E 3 background prompt for all slides. Visually appealing scene with empty space for text overlay. End with: "dark gradient overlay at the bottom for text readability, modern minimalist composition, no text in image".'
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

    for (let i = 0; i < 3; i++) {
      try {
        const parsed = (
          await this.parseChat({
            model: 'gpt-4.1',
            messages: [
              {
                role: 'system',
                content: `You are an expert social media graphic designer creating a carousel post for ${platform}.

LANGUAGE: Detect the language of the user's prompt. Generate ALL text fields (headline, subtext, cta) in that SAME language. If Polish prompt → Polish text. Never mix languages within one carousel.

NARRATIVE:
- Slide 1: hook — catchy headline that stops the scroll
- Middle slides: one body point each, building the argument
- Last slide: clear CTA (call-to-action)

PER-SLIDE RULES:
- headline: short, impactful, max ~5 words
- subtext: supporting detail, 1 sentence
- cta: short call-to-action ("Sprawdź", "Kup teraz", "Zobacz więcej" or English equivalent). On non-final slides this can be a transition like "Dalej →" / "Następny slajd".
- layout: pick the best layout for the content (vary across slides for visual rhythm — don't use the same layout for all)

SHARED:
- imagePrompt: one background that works visually behind every slide. Leave space for text overlay.
- colors: high-contrast, accessible (WCAG AA min). Same palette across all slides for brand consistency.

${brandHint}`,
              },
              { role: 'user', content: prompt },
            ],
            response_format: zodResponseFormat(CarouselSchema, 'carousel'),
          })
        ).choices[0].message.parsed;

        if (parsed) return parsed;
      } catch (err) {
        console.log('generatePostCarousel attempt failed:', err);
      }
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
