import Image from "next/image";
import { cn } from "@/lib/utils";
import { clientEnv } from "@/lib/env";

export const BRAND_LOGO_PATH = "/brand-logo.png";

/** Intrinsic size of `LOGO.png` (copied to public/brand-logo.png). */
const LOGO_WIDTH = 1672;
const LOGO_HEIGHT = 941;

/** Used for avatar fallbacks where a full logo does not fit. */
export function brandInitials(name = clientEnv.NEXT_PUBLIC_APP_NAME): string {
  const compact = name.replace(/[^a-zA-Z0-9]/g, "");
  if (!compact) return "T1";
  if (compact.length === 1) return compact.toUpperCase();
  return (compact[0] + compact[compact.length - 1]).toUpperCase();
}

type BrandSize = "sm" | "md" | "lg";

const SIZE_CLASS: Record<BrandSize, string> = {
  sm: "h-8 w-auto max-w-[132px]",
  md: "h-10 w-auto max-w-[168px]",
  lg: "h-14 w-auto max-w-[240px]",
};

type MarkProps = {
  className?: string;
  /** Kept for compatibility with existing call sites. */
  tone?: "primary" | "ink";
};

export function BrandMark({ className }: MarkProps) {
  return (
    <Image
      src={BRAND_LOGO_PATH}
      alt=""
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      aria-hidden
      className={cn("h-[26px] w-[26px] object-contain", className)}
    />
  );
}

export function BrandLockup({
  className,
  size = "md",
  tone: _tone,
  labelClassName: _labelClassName,
}: MarkProps & {
  size?: BrandSize;
  labelClassName?: string;
}) {
  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <Image
        src={BRAND_LOGO_PATH}
        alt={clientEnv.NEXT_PUBLIC_APP_NAME}
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        className={cn("object-contain object-left", SIZE_CLASS[size])}
        priority={size !== "sm"}
      />
    </span>
  );
}
