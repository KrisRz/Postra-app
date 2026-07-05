export const dynamic = 'force-dynamic';

import { AdminDashboardsComponent } from '@gitroom/frontend/components/admin/admin-dashboards.component';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postra' : 'Gitroom'} Admin Dashboards`,
  description: '',
};

export default async function Page() {
  return (
    <div className="bg-transparent flex-1 flex-col flex p-[20px] gap-[12px]">
      <AdminDashboardsComponent />
    </div>
  );
}
