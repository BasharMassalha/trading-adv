import Image from "next/image";
import { cn } from "@/lib/utils";
import { clientEnv } from "@/lib/env";

/** Transparent lockups cropped from the primary logo masters. */
export const BRAND_LOGO_LIGHT_PATH = "/brand-logo-light.png";
export const BRAND_LOGO_DARK_PATH = "/brand-logo-dark.png";

/** @deprecated Prefer BRAND_LOGO_LIGHT_PATH / BRAND_LOGO_DARK_PATH. */
export const BRAND_LOGO_PATH = BRAND_LOGO_LIGHT_PATH;

const LOGO_LIGHT = { width: 1249, height: 352 } as const;
const LOGO_DARK = { width: 1225, height: 305 } as const;

/** Used for avatar fallbacks where a full logo does not fit. */
export function brandInitials(name = clientEnv.NEXT_PUBLIC_APP_NAME): string {
  const compact = name.replace(/[^a-zA-Z0-9]/g, "");
  if (!compact) return "T1";
  if (compact.length === 1) return compact.toUpperCase();
  return (compact[0] + compact[compact.length - 1]).toUpperCase();
}

type BrandSize = "sm" | "md" | "lg";

const SIZE_CLASS: Record<BrandSize, string> = {
  sm: "h-8 w-auto",
  md: "h-10 w-auto",
  lg: "h-12 w-auto",
};

type MarkProps = {
  className?: string;
  /**
   * `primary` — follows the active theme (dark glyphs on light, light on dark).
   * `ink` — always the light-on-dark mark (for fixed dark surfaces like the auth rail).
   */
  tone?: "primary" | "ink";
};

function LogoImage({
  src,
  width,
  height,
  alt,
  className,
  priority,
  ariaHidden,
}: {
  src: string;
  width: number;
  height: number;
  alt: string;
  className?: string;
  priority?: boolean;
  ariaHidden?: boolean;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      aria-hidden={ariaHidden || undefined}
      className={className}
      priority={priority}
    />
  );
}

export function BrandMark({ className, tone = "primary" }: MarkProps) {
  const imgClass = cn("h-[26px] w-auto object-contain object-left", className);
  if (tone === "ink") {
    return (
      <LogoImage
        src={BRAND_LOGO_DARK_PATH}
        width={LOGO_DARK.width}
        height={LOGO_DARK.height}
        alt=""
        ariaHidden
        className={imgClass}
      />
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center">
      <LogoImage
        src={BRAND_LOGO_LIGHT_PATH}
        width={LOGO_LIGHT.width}
        height={LOGO_LIGHT.height}
        alt=""
        ariaHidden
        className={cn(imgClass, "dark:hidden")}
      />
      <LogoImage
        src={BRAND_LOGO_DARK_PATH}
        width={LOGO_DARK.width}
        height={LOGO_DARK.height}
        alt=""
        ariaHidden
        className={cn(imgClass, "hidden dark:block")}
      />
    </span>
  );
}

export function BrandLockup({
  className,
  size = "md",
  tone = "primary",
  labelClassName: _labelClassName,
}: MarkProps & {
  size?: BrandSize;
  labelClassName?: string;
}) {
  const imgClass = cn("object-contain object-left", SIZE_CLASS[size]);
  const priority = size !== "sm";

  if (tone === "ink") {
    return (
      <span className={cn("inline-flex shrink-0 items-center", className)}>
        <LogoImage
          src={BRAND_LOGO_DARK_PATH}
          width={LOGO_DARK.width}
          height={LOGO_DARK.height}
          alt={clientEnv.NEXT_PUBLIC_APP_NAME}
          className={imgClass}
          priority={priority}
        />
      </span>
    );
  }

  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <LogoImage
        src={BRAND_LOGO_LIGHT_PATH}
        width={LOGO_LIGHT.width}
        height={LOGO_LIGHT.height}
        alt={clientEnv.NEXT_PUBLIC_APP_NAME}
        className={cn(imgClass, "dark:hidden")}
        priority={priority}
      />
      <LogoImage
        src={BRAND_LOGO_DARK_PATH}
        width={LOGO_DARK.width}
        height={LOGO_DARK.height}
        alt=""
        ariaHidden
        className={cn(imgClass, "hidden dark:block")}
        priority={priority}
      />
    </span>
  );
}

/** Shared chrome footnote for signed-in sidebars / drawers. */
export const BRAND_CHROME_FOOTNOTE =
  "Analysis is evidence-led and cited. Agent trades stay inside a book you arm.";
