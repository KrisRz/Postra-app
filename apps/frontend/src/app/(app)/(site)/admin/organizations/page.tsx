export const dynamic = 'force-dynamic';

import { AdminOrganizationsComponent } from '@gitroom/frontend/components/admin/admin-organizations.component';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postra' : 'Gitroom'} Admin Organizations`,
  description: '',
};

export default async function Page() {
  return (
    <div className="bg-transparent flex-1 flex-col flex p-[20px] gap-[12px]">
      <AdminOrganizationsComponent />
    </div>
  );
}
