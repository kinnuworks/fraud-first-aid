import LandingPage from '@/components/LandingPage';
import { StatePreview } from '@/components/StatePreview';

export default async function Home({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state } = await searchParams;
  return state ? <StatePreview state={state} /> : <LandingPage />;
}
