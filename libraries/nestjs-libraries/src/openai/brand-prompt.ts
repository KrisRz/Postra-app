/**
 * Single source of truth for turning an org's Brand Kit into prompt text.
 *
 * The brand voice/style used to be assembled inline in four different places
 * (the agent persona, the design generator, the image tool, the inline caption
 * editor) which meant they could drift. These helpers centralise it so every AI
 * surface speaks in the same brand voice and reflects the same palette.
 */

export interface BrandPromptKit {
  colors?: { primary?: string; secondary?: string; text?: string };
  font?: string;
  tone?: string;
}

/** Voice guidance for COPY — captions, inline edits, agent post text. */
export function buildBrandVoicePrompt(kit?: BrandPromptKit | null): string {
  if (!kit?.tone) return '';
  return `Brand tone of voice: ${kit.tone}. Write in that voice.`;
}

/** Visual direction for IMAGE generation — palette + tone. */
export function buildBrandImagePrompt(kit?: BrandPromptKit | null): string {
  const primary = kit?.colors?.primary;
  const secondary = kit?.colors?.secondary;
  const bits: string[] = [];
  if (primary || secondary) {
    bits.push(
      `build the palette around ${[primary, secondary]
        .filter(Boolean)
        .join(' and ')}`
    );
  }
  if (kit?.tone) bits.push(`keep it consistent with a ${kit.tone} brand`);
  return bits.length ? `Visual brand style: ${bits.join(', ')}.` : '';
}

/** Strict constraints for a full DESIGN spec — headline/colours/layout. */
export function buildBrandDesignPrompt(kit?: BrandPromptKit | null): string {
  if (!kit?.colors) return '';
  const c = kit.colors;
  return `BRAND CONSTRAINTS — respect strictly:
- Background color: ${c.secondary || 'designer choice'}
- Accent color: ${c.primary || 'designer choice'}
- Text color: ${c.text || '#ffffff'}
- Font family: ${kit.font || 'sans-serif'}
- Tone: ${kit.tone || 'professional'}`;
}

/**
 * Combined guidance for the conversational agent, which both writes copy and
 * generates visuals, so it needs voice + palette in one block.
 */
export function buildBrandAgentPrompt(kit?: BrandPromptKit | null): string {
  if (!kit) return '';
  return `
      Brand guidelines (apply these to everything you write and generate):
        - Tone of voice: ${kit.tone || 'not specified'}
        - Brand colors: primary ${kit.colors?.primary || '-'}, secondary ${
    kit.colors?.secondary || '-'
  }, text ${kit.colors?.text || '-'}
        - Brand font: ${kit.font || 'not specified'}
      Always write post copy in this tone of voice, and reflect these brand colors/style when you generate images or designs.
`;
}
