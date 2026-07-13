import { Metadata } from 'next';
import { randomUUID } from 'crypto';
import { redirect } from 'next/navigation';
import { AgentChat } from '@gitroom/frontend/components/agents/agent.chat';

export const metadata: Metadata = {
  title: 'Postra - Agent',
  description: '',
};

export const dynamic = 'force-dynamic';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // /agents/new was the old placeholder route (see agents/page.tsx): a chat
  // started there never got its id into the URL, so refreshing it dropped the
  // conversation. Old links/bookmarks land on a real thread id instead.
  if (id === 'new') {
    return redirect(`/agents/${randomUUID()}`);
  }

  return <AgentChat />;
}
