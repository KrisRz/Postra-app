import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { parseChat } from '@gitroom/nestjs-libraries/openai/parse-chat';

import {
  StudioBrandRef,
  StudioLayer,
  StudioPatch,
  StudioPatchOp,
  StudioPlatformKey,
  StudioSpec,
  applyPatch,
  nextStudioId,
  validatePatchAgainstSpec,
} from './studio-spec';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-proj-',
});

const PLATFORM_SIZES: Record<StudioPlatformKey, { width: number; height: number }> = {
  'instagram-feed': { width: 1080, height: 1350 },
  'instagram-square': { width: 1080, height: 1080 },
  'instagram-story': { width: 1080, height: 1920 },
  facebook: { width: 1200, height: 630 },
  linkedin: { width: 1200, height: 627 },
  tiktok: { width: 1080, height: 1920 },
  x: { width: 1200, height: 675 },
  custom: { width: 1080, height: 1080 },
};

const ORIGIN = z.enum(['left', 'center', 'right', 'top', 'bottom']);

// OpenAI strict structured outputs require EVERY field to be required, so an
// optional field MUST also be `.nullable()` (the API rejects bare `.optional()`
// at zodResponseFormat conversion → 500 on refine/variants/decompose). Keep
// `.optional().nullable()` on all non-mandatory layer fields.
const TextLayerSchema = z.object({
  id: z.string(),
  kind: z.literal('text'),
  slot: z.string().optional().nullable(),
  x: z.number(),
  y: z.number(),
  originX: ORIGIN,
  originY: ORIGIN,
  width: z.number().optional().nullable(),
  height: z.number().optional().nullable(),
  text: z.string(),
  fontFamily: z.string(),
  fontSize: z.number(),
  fontWeight: z.union([z.string(), z.number()]).optional().nullable(),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).optional().nullable(),
  color: z.string(),
  lineHeight: z.number().optional().nullable(),
  charSpacing: z.number().optional().nullable(),
});

const ShapeLayerSchema = z.object({
  id: z.string(),
  kind: z.enum(['rect', 'circle', 'triangle', 'polygon', 'path', 'line']),
  slot: z.string().optional().nullable(),
  x: z.number(),
  y: z.number(),
  originX: ORIGIN,
  originY: ORIGIN,
  width: z.number().optional().nullable(),
  height: z.number().optional().nullable(),
  fill: z.string().optional().nullable(),
  stroke: z.string().optional().nullable(),
  strokeWidth: z.number().optional().nullable(),
  rx: z.number().optional().nullable(),
  ry: z.number().optional().nullable(),
  radius: z.number().optional().nullable(),
  path: z.string().optional().nullable(),
});

const ImageLayerSchema = z.object({
  id: z.string(),
  kind: z.literal('image'),
  slot: z.string().optional().nullable(),
  x: z.number(),
  y: z.number(),
  originX: ORIGIN,
  originY: ORIGIN,
  width: z.number().optional().nullable(),
  height: z.number().optional().nullable(),
  src: z.string(),
});

const LayerSchema = z.discriminatedUnion('kind', [
  TextLayerSchema,
  ShapeLayerSchema,
  ImageLayerSchema,
]);

// Concrete updatable-fields schema. OpenAI strict structured outputs reject
// z.record (dynamic keys → no fixed `properties`/`additionalProperties:false`),
// which 400'd the whole refine call. List the layer fields the model may patch;
// all optional().nullable() per the strict "every field required" rule. Null
// values are skipped when applied (applyUpdateToFabric ignores null/undefined).
const PatchPropsSchema = z.object({
  text: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  fill: z.string().optional().nullable(),
  stroke: z.string().optional().nullable(),
  strokeWidth: z.number().optional().nullable(),
  fontFamily: z.string().optional().nullable(),
  fontSize: z.number().optional().nullable(),
  fontWeight: z.union([z.string(), z.number()]).optional().nullable(),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).optional().nullable(),
  x: z.number().optional().nullable(),
  y: z.number().optional().nullable(),
  width: z.number().optional().nullable(),
  height: z.number().optional().nullable(),
  rotation: z.number().optional().nullable(),
  opacity: z.number().optional().nullable(),
  radius: z.number().optional().nullable(),
  rx: z.number().optional().nullable(),
  ry: z.number().optional().nullable(),
  lineHeight: z.number().optional().nullable(),
  charSpacing: z.number().optional().nullable(),
});

const PatchOpSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('add'), layer: LayerSchema }),
  z.object({
    op: z.literal('update'),
    id: z.string(),
    props: PatchPropsSchema,
  }),
  z.object({ op: z.literal('delete'), id: z.string() }),
  z.object({ op: z.literal('reorder'), ids: z.array(z.string()) }),
]);

const RefinePatchSchema = z.object({
  ops: z.array(PatchOpSchema).max(20),
  explanation: z.string().max(200),
});

const SpecSchema = z.object({
  background: z.string(),
  layers: z.array(LayerSchema).max(40),
});

const VariantsSchema = z.object({
  variants: z
    .array(
      z.object({
        label: z.string().max(40),
        spec: SpecSchema,
      })
    )
    .length(3),
});

const VoiceCheckSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string().max(280),
  tags: z.array(z.string()).max(4),
});

export interface BrandVoiceInput {
  caption: string;
  recentPosts: string[];
  brand?: StudioBrandRef;
}

export interface BrandVoiceResult {
  score: number;
  feedback: string;
  tags: string[];
}

export interface VariantsResult {
  variants: { label: string; spec: StudioSpec }[];
}

export interface SemanticTemplate {
  id: string;
  text: string;
}

export interface SemanticSearchResult {
  id: string;
  score: number;
}

const MODEL_GPT = 'gpt-4.1';
const MODEL_VISION = 'gpt-4o';
const MODEL_EMBED = 'text-embedding-3-small';

@Injectable()
export class StudioAiService {
  /**
   * Patch an existing spec instead of replacing it. AI returns a small ops
   * list (add / update / delete / reorder) which we validate against the
   * current spec before applying — that rejects hallucinated layer ids.
   */
  async refineSpec(
    spec: StudioSpec,
    instruction: string,
    screenshotDataUrl?: string
  ): Promise<{ patch: StudioPatch; nextSpec: StudioSpec; explanation: string }> {
    const system = `You edit social-media post designs by emitting JSON patch ops on a StudioSpec.

Rules:
- Only emit ops that reference layer ids that already exist in the spec (for update/delete).
- New layers (op:add) need a fresh id starting with "ai_".
- Preserve user intent. If they ask "shorter headline", only update the text layer's text.
- Keep all coordinates inside canvas bounds (0..width / 0..height).
- Use the brand colors in the spec when changing fills or text colors.
- Reply in the same language as the instruction (Polish or English).`;

    const userText = [
      `Canvas: ${spec.width}x${spec.height} (${spec.platform}).`,
      `Brand: ${JSON.stringify(spec.brand ?? null)}.`,
      `Spec layers:`,
      JSON.stringify(spec.layers, null, 0),
      ``,
      `Instruction: ${instruction}`,
    ].join('\n');

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: system },
    ];
    if (screenshotDataUrl) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: userText },
          { type: 'image_url', image_url: { url: screenshotDataUrl } },
        ],
      });
    } else {
      messages.push({ role: 'user', content: userText });
    }

    const parsed = (
      await parseChat(openai, {
        model: screenshotDataUrl ? MODEL_VISION : MODEL_GPT,
        messages,
        response_format: zodResponseFormat(RefinePatchSchema, 'refinePatch'),
      })
    ).choices[0].message.parsed;

    if (!parsed) throw new Error('AI returned no patch');

    const patch: StudioPatch = { base: spec.layers.length, ops: parsed.ops as StudioPatchOp[] };
    const validation = validatePatchAgainstSpec(spec, patch);
    if (validation.ok === false) {
      throw new Error(`Patch rejected: ${validation.reason}`);
    }

    return { patch, nextSpec: applyPatch(spec, patch), explanation: parsed.explanation };
  }

  /**
   * Three layout variants from one structured-output call. Each variant
   * shares the same brand + background image (DALL-E call happens upstream
   * in MediaService and is reused), only the text and arrangement differ.
   */
  async generateVariants(
    prompt: string,
    platform: StudioPlatformKey,
    brand?: StudioBrandRef
  ): Promise<VariantsResult> {
    const size = PLATFORM_SIZES[platform];
    const system = `You design 3 distinct layout variants for a single social media post idea.

Each variant has the same brand colors but different headline phrasing, layout, and font weight emphasis. Variants must feel meaningfully different — not just nudges of the same layout.

Output rules:
- Canvas is ${size.width}x${size.height}.
- Each layer needs a unique id within its spec (no cross-variant collisions OK).
- Text layers use the brand font family.
- Keep total layers per variant <= 8.
- Match the user's language (Polish → Polish copy, English → English).`;

    const userText = [
      `Idea: ${prompt}`,
      `Brand: ${JSON.stringify(brand ?? null)}.`,
      `Return 3 variants labelled e.g. "Bold", "Editorial", "Playful" in the user's language.`,
    ].join('\n');

    const parsed = (
      await parseChat(openai, {
        model: MODEL_GPT,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userText },
        ],
        response_format: zodResponseFormat(VariantsSchema, 'variants'),
      })
    ).choices[0].message.parsed;

    if (!parsed) throw new Error('AI returned no variants');

    const variants = parsed.variants.map(
      (v: { label: string; spec: { background: string; layers: unknown[] } }) => ({
        label: v.label,
        spec: {
          version: 1 as const,
          platform,
          width: size.width,
          height: size.height,
          background: v.spec.background,
          brand,
          layers: v.spec.layers.map(toStudioLayer) as StudioLayer[],
        },
      })
    );

    return { variants };
  }

  /**
   * Score a caption against the user's recent posts + brand tone. Used in
   * the composer as a soft signal (ribbon). Cheap: text-only GPT-4.1 call.
   */
  async checkBrandVoice(input: BrandVoiceInput): Promise<BrandVoiceResult> {
    const samples = input.recentPosts.slice(0, 5).filter(Boolean);
    const tone = input.brand?.tone || 'professional';

    const system = `You evaluate whether a draft social media caption matches the author's existing brand voice.

Score 0-100 where:
- 100: perfectly matches tone, vocabulary, and energy of recent posts
- 60-80: mostly on brand, minor adjustments would help
- 30-60: some clashes (wrong register, formality, emoji density)
- 0-30: completely off-brand

Reply in the language of the draft.
Return concise feedback (2 short sentences, actionable). Tags = up to 4 short labels (e.g. "too formal", "missing CTA").`;

    const userText = [
      `Brand tone declared: ${tone}.`,
      samples.length
        ? `Recent posts (newest first):\n${samples.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
        : 'No recent posts available — rely on declared tone.',
      ``,
      `Draft caption:\n${input.caption}`,
    ].join('\n');

    const parsed = (
      await parseChat(openai, {
        model: MODEL_GPT,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userText },
        ],
        response_format: zodResponseFormat(VoiceCheckSchema, 'voiceCheck'),
      })
    ).choices[0].message.parsed;

    if (!parsed) throw new Error('AI returned no voice check');
    return {
      score: parsed.score,
      feedback: parsed.feedback,
      tags: parsed.tags ?? [],
    };
  }

  /**
   * Decompose an uploaded image into editable Fabric layers. GPT-4o vision
   * estimates bounding boxes + text content. We deliberately keep the
   * uploaded image as a single background layer (raster, not vectorised).
   */
  async decomposeImage(
    imageDataUrl: string,
    platform: StudioPlatformKey,
    brand?: StudioBrandRef
  ): Promise<StudioSpec> {
    const size = PLATFORM_SIZES[platform];

    const DecomposeSchema = z.object({
      background: z.string().describe('hex color of the dominant background'),
      hasBackgroundImage: z.boolean(),
      layers: z.array(LayerSchema).max(12),
    });

    const system = `You extract editable text and shape layers from a flat social media graphic.

Rules:
- Output canvas is ${size.width}x${size.height}. Scale layer coords into that range.
- Detect text blocks. For each: estimate fontSize relative to width (~width * 0.04 to 0.12), pick "fontFamily" from {"Geist","Inter","Bebas Neue","Playfair Display"} based on visual style.
- Detect simple shape elements (badges, dividers). Skip complex illustrations.
- If background is a photo, set hasBackgroundImage=true and pick a fallback bg hex from the image's dominant edge color.
- Reply in the language of any visible text. Layer ids start with "ext_".`;

    const parsed = (
      await parseChat(openai, {
        model: MODEL_VISION,
        messages: [
          { role: 'system', content: system },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Decompose this image.' },
              { type: 'image_url', image_url: { url: imageDataUrl } },
            ],
          },
        ],
        response_format: zodResponseFormat(DecomposeSchema, 'decompose'),
      })
    ).choices[0].message.parsed;

    if (!parsed) throw new Error('AI returned no decomposition');

    const layers: StudioLayer[] = parsed.layers.map(toStudioLayer) as StudioLayer[];

    if (parsed.hasBackgroundImage) {
      layers.unshift({
        id: nextStudioId('bg'),
        kind: 'image',
        x: size.width / 2,
        y: size.height / 2,
        originX: 'center',
        originY: 'center',
        width: size.width,
        height: size.height,
        src: imageDataUrl,
      });
    }

    return {
      version: 1,
      platform,
      width: size.width,
      height: size.height,
      background: parsed.background,
      brand,
      layers,
    };
  }

  async embedText(text: string): Promise<number[]> {
    const trimmed = text.trim().slice(0, 8000);
    const res = await openai.embeddings.create({
      model: MODEL_EMBED,
      input: trimmed,
    });
    return res.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!texts.length) return [];
    const res = await openai.embeddings.create({
      model: MODEL_EMBED,
      input: texts.map((t) => t.trim().slice(0, 8000)),
    });
    return res.data.map((d) => d.embedding);
  }
}

const toStudioLayer = (layer: unknown): StudioLayer => {
  return layer as StudioLayer;
};

export const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
};

export const rankBySimilarity = (
  queryEmbedding: number[],
  candidates: { id: string; embedding: number[] }[]
): SemanticSearchResult[] => {
  return candidates
    .map((c) => ({ id: c.id, score: cosineSimilarity(queryEmbedding, c.embedding) }))
    .sort((a, b) => b.score - a.score);
};
