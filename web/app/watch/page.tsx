import { OperatorView, FamilyView } from '@/components/LiveView';

export default async function Watch({ searchParams }: { searchParams: Promise<{ session?: string; key?: string; as?: string }> }) {
  const { session = '', key = '', as } = await searchParams;
  return as === 'family' ? <FamilyView session={session} viewKey={key} /> : <OperatorView session={session} viewKey={key} />;
}
