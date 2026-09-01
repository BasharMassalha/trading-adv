import { AuthHomeLink } from "@/components/auth/auth-home-link";
import { BrandLockup } from "@/components/brand";

const PROOF = [
  "Filing-level evidence from SEC EDGAR",
  "13F consensus across tracked superinvestors",
  "Risk measured against the mandate you set",
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Marketing rail — desktop only, so the form owns small screens. */}
      <aside className="hidden w-[46%] max-w-[560px] flex-col justify-between bg-foreground p-12 lg:flex">
        <BrandLockup size="lg" />

        <div>
          <p className="max-w-[400px] text-[26px] font-semibold leading-tight tracking-tight text-background">
            Every holding, cross-examined against the record.
          </p>
          <ul className="mt-8 space-y-3">
            {PROOF.map((p) => (
              <li
                key={p}
                className="flex items-start gap-3 text-[13px] leading-relaxed text-faint"
              >
                <span className="mt-[7px] h-1 w-1 shrink-0 bg-faint" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[11.5px] text-faint">
          Analysis only. Nothing here is financial advice, and nothing executes
          without you.
        </p>
      </aside>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px]">
          <AuthHomeLink />
          {children}
        </div>
      </div>
    </div>
  );
}
