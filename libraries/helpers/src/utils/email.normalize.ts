const GMAIL_LIKE_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
]);

const DOT_INSENSITIVE_DOMAINS = new Set([
  ...GMAIL_LIKE_DOMAINS,
]);

export function normalizeEmail(email: string): string {
  const lower = email.toLowerCase().trim();
  const [local, domain] = lower.split('@');
  if (!local || !domain) return lower;

  let normalized = local.split('+')[0];

  if (DOT_INSENSITIVE_DOMAINS.has(domain)) {
    normalized = normalized.replace(/\./g, '');
  }

  const canonicalDomain = domain === 'googlemail.com' ? 'gmail.com' : domain;

  return `${normalized}@${canonicalDomain}`;
}
