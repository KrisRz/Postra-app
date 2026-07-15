import { HelpComponent } from '@gitroom/frontend/components/help/help.component';
export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postra' : 'Gitroom'} Help`,
  description: '',
};
export default async function Index() {
  return <HelpComponent />;
}
