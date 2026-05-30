export const dynamic = 'force-dynamic';

import { AdminHealthComponent } from '@gitroom/frontend/components/admin/admin-health.component';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Admin System Health`,
  description: '',
};

export default async function Page() {
  return (
    <div className="bg-newBgColorInner flex-1 flex-col flex p-[20px] gap-[12px]">
      <AdminHealthComponent />
    </div>
  );
}
