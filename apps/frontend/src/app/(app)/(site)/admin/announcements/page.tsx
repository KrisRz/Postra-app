export const dynamic = 'force-dynamic';

import { AdminAnnouncementsComponent } from '@gitroom/frontend/components/admin/admin-announcements.component';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Admin Announcements`,
  description: '',
};

export default async function Page() {
  return (
    <div className="bg-transparent flex-1 flex-col flex p-[20px] gap-[12px]">
      <AdminAnnouncementsComponent />
    </div>
  );
}
