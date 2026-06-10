import { ContinueIntegration } from '@gitroom/frontend/components/launches/continue.integration';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Page(
  props: {
    params: Promise<{
      provider: string;
    }>;
    searchParams: Promise<any>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const {
    provider
  } = params;

  // Google *login* shares this redirect URI with the YouTube channel flow.
  // The auth flow stamps its CSRF state with an `auth-` prefix (channel
  // states are uuids) — route it to register/login instead of channel-connect.
  if (
    typeof searchParams?.state === 'string' &&
    searchParams.state.startsWith('auth-') &&
    searchParams?.code
  ) {
    redirect(
      `/auth/register?provider=google&code=${encodeURIComponent(
        searchParams.code
      )}&state=${encodeURIComponent(searchParams.state)}`
    );
  }

  const get = (await cookies()).get('auth');
  return <ContinueIntegration searchParams={searchParams} provider={provider} logged={!!get?.name} />;
}
