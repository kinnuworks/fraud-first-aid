import LandingPage from '@/components/LandingPage';
import { StatePreview } from '@/components/StatePreview';

// ?state=result is the finished complaint (the design checks screenshot it by that name).
export default async function Home({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state } = await searchParams;
  return state ? <StatePreview state={state === 'result' ? 'complaint-done' : state} /> : <LandingPage />;
}
