import { Autopost } from '@gitroom/frontend/components/autopost/autopost';
export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postra' : 'Gitroom'} Auto Post`,
  description: '',
};

export default async function Index() {
  return (
    <div className="flex flex-1 flex-col p-[24px]">
      <Autopost />
    </div>
  );
}
