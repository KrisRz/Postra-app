import { Metadata } from 'next';
import { randomUUID } from 'crypto';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Postra - Agent',
  description: '',
};

// A chat needs a real thread id in the URL from its first message, otherwise a
// refresh loses the conversation: the agent generates its own id internally,
// the URL stays on the "new" placeholder, and the history can only be found by
// hunting for the thread in the sidebar afterwards. Minting the id here makes
// /agents/<uuid> refreshable and shareable from the start. Nothing is persisted
// until the user actually sends a message, so an abandoned id costs nothing.
export const dynamic = 'force-dynamic';

export default async function Page() {
  return redirect(`/agents/${randomUUID()}`);
}
