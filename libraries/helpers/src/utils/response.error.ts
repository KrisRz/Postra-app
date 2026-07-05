/**
 * Extract a human-readable error message from a failed fetch Response.
 * Prefers a NestJS-style `{ message }` body (string or string[]), falls back
 * to raw text, and never throws. Use it to surface backend errors in toasts
 * instead of showing a false success.
 */
export const readResponseError = async (response: Response): Promise<string> => {
  try {
    const body = await response.clone().json();
    if (typeof body?.message === 'string') return body.message;
    if (Array.isArray(body?.message)) return body.message.join(', ');
  } catch {
    /* not JSON — fall through to text */
  }
  try {
    return await response.text();
  } catch {
    return '';
  }
};
