import { JoinFlow } from "@/components/JoinFlow";

export default async function Home({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  return <JoinFlow initialCode={code ?? ""} />;
}
