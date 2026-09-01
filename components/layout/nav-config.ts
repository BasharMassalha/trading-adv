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

export const NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function isNavActive(pathname: string, href: string): boolean {
  return href === "/dashboard"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Longest matching nav href wins, so `/portfolio/upload` resolves to "Upload"
 * rather than "Portfolios".
 */
export function currentNavLabel(pathname: string): string | null {
  const match = [...NAV]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => isNavActive(pathname, item.href));
  return match?.label ?? null;
}
