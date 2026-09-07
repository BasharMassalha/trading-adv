import { AppShell } from "@/components/layout/app-shell";
import { getSession } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  return (
    <AppShell isGuest={session?.isGuest === true}>{children}</AppShell>
  );
}
