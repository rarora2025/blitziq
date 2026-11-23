import { HostApp } from "@/components/host/HostApp";

export const metadata = { title: "Host · blitz." };

export default async function Host({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <HostApp code={code.toUpperCase()} />;
}
