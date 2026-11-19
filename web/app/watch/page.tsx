import { OperatorView, FamilyView } from '@/components/LiveView';

export default async function Watch({ searchParams }: { searchParams: Promise<{ session?: string; key?: string; as?: string }> }) {
  const { session = '', key = '', as } = await searchParams;
  if (as === 'family' || as === 'phone') return <FamilyView session={session} viewKey={key} phone={as === 'phone'} />;
  return <OperatorView session={session} viewKey={key} />;
}
