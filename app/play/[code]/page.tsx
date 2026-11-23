import { PlayerApp } from "@/components/player/PlayerApp";

export default async function Play({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <PlayerApp code={code.toUpperCase()} />;
}
