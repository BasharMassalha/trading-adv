import { AuthHomeLink } from "@/components/auth/auth-home-link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-gradient-to-b from-primary/10 via-transparent to-transparent" />

      <div className="relative z-10 w-full max-w-md">
        <AuthHomeLink />
        {children}
      </div>
    </div>
  );
}
