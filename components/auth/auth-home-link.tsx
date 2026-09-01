"use client";

import Link from "next/link";
import { useBeginNavigation } from "@/components/loading/navigation-loading-context";
import { BrandLockup } from "@/components/brand";

export function AuthHomeLink() {
  const begin = useBeginNavigation();
  return (
    <Link
      href="/"
      onClick={begin}
      className="mb-7 inline-flex lg:hidden"
      aria-label="Back to home"
    >
      <BrandLockup size="md" />
    </Link>
  );
}
