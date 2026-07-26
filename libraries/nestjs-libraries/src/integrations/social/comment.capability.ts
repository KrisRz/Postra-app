import { Integration } from '@prisma/client';
import { safeJsonParse } from '@gitroom/helpers/utils/safe.json.parse';
import { SocialProvider } from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';

/**
 * Scopes the platform granted this token at connect time. Empty when the
 * channel was connected before we started recording them, or when the provider
 * can't report them — treated the same as "not granted", so a feature gated on
 * an optional scope stays off until the channel is reconnected.
 */
export const grantedScopesOf = (
  integration: Pick<Integration, 'grantedScopes'>
): string[] => {
  const parsed = safeJsonParse<string[]>(integration?.grantedScopes, []);
  return Array.isArray(parsed) ? parsed : [];
};

/**
 * Whether first comment works on this specific channel.
 *
 * Provider-wide capability alone isn't enough: Meta grants pages_manage_engagement
 * only to accounts holding a role in the app, so one Facebook Page can take
 * comments while the next one can't. The composer and the publish workflow must
 * agree on this, or the user writes comments that get dropped at publish.
 */
export const canPostComments = (
  provider: Pick<
    SocialProvider,
    'comment' | 'commentsDisabled' | 'commentScope'
  > | null,
  integration: Pick<Integration, 'grantedScopes'>
): boolean => {
  if (!provider?.comment || provider.commentsDisabled) {
    return false;
  }

  if (!provider.commentScope) {
    return true;
  }

  return grantedScopesOf(integration).includes(provider.commentScope);
};
