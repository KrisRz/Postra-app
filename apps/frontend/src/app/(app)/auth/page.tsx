export const dynamic = 'force-dynamic';
import { ComingSoon } from '@gitroom/frontend/components/auth/coming-soon';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postra' : 'Gitroom'} — Już wkrótce`,
  description:
    'Postra — wszystkie social media w jednym miejscu. Aplikacja w fazie końcowych testów.',
};
export default async function Auth() {
  return <ComingSoon />;
}
