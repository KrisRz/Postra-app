export const dynamic = 'force-dynamic';

import { AdminUsersComponent } from '@gitroom/frontend/components/admin/admin-users.component';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Admin Users`,
  description: '',
};

export default async function Page() {
  return (
    <div className="bg-transparent flex-1 flex-col flex p-[20px] gap-[12px]">
      <AdminUsersComponent />
    </div>
  );
}
