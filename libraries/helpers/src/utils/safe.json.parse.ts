// JSON.parse over data we don't fully control (cookies, DB-stored blobs,
// integration settings) has white-screened the app before — one corrupted
// value crashes the whole component tree. Prefer a fallback over a throw.
export function safeJsonParse<T>(
  value: string | null | undefined,
  fallback: T
): T {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
