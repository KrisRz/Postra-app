export const dynamic = 'force-dynamic';
import { StudioComponent } from '@gitroom/frontend/components/studio/studio.component';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Postra Studio',
  description: '',
};

export default async function Index() {
  return <StudioComponent />;
}
