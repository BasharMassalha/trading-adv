"use client";

import Link from "next/link";
import { SquareTerminal } from "lucide-react";
import { useBeginNavigation } from "@/components/loading/navigation-loading-context";
import { clientEnv } from "@/lib/env";

export function AuthHomeLink() {
  const begin = useBeginNavigation();
  return (
    <Link
      href="/"
      onClick={begin}
      className="mb-8 flex items-center justify-center gap-2 text-sm font-semibold tracking-tight"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <SquareTerminal className="h-4 w-4" />
      </span>
      {clientEnv.NEXT_PUBLIC_APP_NAME}
    </Link>
  );
}
