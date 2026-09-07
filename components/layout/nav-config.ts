import {
  LayoutDashboard,
  Briefcase,
  Upload,
  Brain,
  Settings,
  LineChart,
  ShieldAlert,
  Users,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Optional step number shown in trial chrome */
  step?: number;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Portfolios", href: "/portfolio", icon: Briefcase },
      { label: "Upload", href: "/portfolio/upload", icon: Upload },
      { label: "AI advisor", href: "/advisor", icon: Brain },
    ],
  },
  {
    label: "Research",
    items: [
      { label: "Superinvestors", href: "/superinvestors", icon: Users },
      { label: "Markets", href: "/markets", icon: LineChart },
      { label: "Market risk", href: "/market-risk", icon: ShieldAlert },
    ],
  },
  {
    label: "Account",
    items: [{ label: "Settings", href: "/settings", icon: Settings }],
  },
];

/** Slim funnel nav for guest free-trial sessions. */
export const TRIAL_NAV_GROUPS: NavGroup[] = [
  {
    label: "Your free trial",
    items: [
      { label: "Import", href: "/portfolio/upload", icon: Upload, step: 1 },
      { label: "Portfolio", href: "/portfolio", icon: Briefcase, step: 2 },
      { label: "Analysis", href: "/advisor", icon: Brain, step: 3 },
    ],
  },
];

export const NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
export const TRIAL_NAV: NavItem[] = TRIAL_NAV_GROUPS.flatMap((g) => g.items);

/** Paths guests may use during the free trial. */
export function isTrialAllowedPath(pathname: string): boolean {
  if (pathname.startsWith("/portfolio")) return true;
  if (pathname.startsWith("/advisor")) return true;
  return false;
}

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  if (href === "/portfolio") {
    // Avoid marking Portfolios active on /portfolio/upload
    return (
      pathname === "/portfolio" ||
      (/^\/portfolio\/[^/]+$/.test(pathname) && !pathname.startsWith("/portfolio/upload"))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Longest matching nav href wins, so `/portfolio/upload` resolves to "Upload"
 * rather than "Portfolios".
 */
export function currentNavLabel(
  pathname: string,
  isGuest = false,
): string | null {
  const items = isGuest ? TRIAL_NAV : NAV;
  const match = [...items]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => isNavActive(pathname, item.href));
  return match?.label ?? null;
}
