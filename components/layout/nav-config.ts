import {
  LayoutDashboard,
  Briefcase,
  Upload,
  Sparkles,
  Settings,
  LineChart,
  ShieldAlert,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Portfolios", href: "/portfolio", icon: Briefcase },
  { label: "Upload", href: "/portfolio/upload", icon: Upload },
  { label: "AI Advisor", href: "/advisor", icon: Sparkles },
  { label: "Markets", href: "/markets", icon: LineChart },
  { label: "Market Risk", href: "/market-risk", icon: ShieldAlert },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function isNavActive(pathname: string, href: string): boolean {
  return href === "/dashboard"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}
