import OpenAI from 'openai';

/**
 * openai-node 6.x: `chat.completions.parse()` rejects `response_format`
 * ("Unknown parameter") because it routes to the Responses API. Use `.create()`
 * with the same `zodResponseFormat()` body — the server still enforces the JSON
 * schema (strict) — and JSON.parse the content ourselves, preserving the
 * `{ choices: [{ message: { parsed } }] }` shape so call sites stay unchanged.
 *
 * Shared by OpenaiService and StudioAiService so the fix lives in one place and
 * the two can't drift back to the broken `.parse()` call.
 */
export async function parseChat(
  openai: OpenAI,
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
