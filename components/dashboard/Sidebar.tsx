"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Store,
  Camera,
  Settings,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Eye,
  Bell,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { canAccessSection, ROLE_LABELS, type Role, type Section } from "@/lib/auth/roles";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  section: Section;
}

const mainNav: NavItem[] = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard, section: "overview" },
  { name: "Tiendas", href: "/stores", icon: Store, section: "stores" },
  { name: "Dispositivos", href: "/devices", icon: Camera, section: "devices" },
  { name: "Analytics", href: "/analytics", icon: BarChart3, section: "analytics" },
  { name: "Benchmark", href: "/analytics/benchmark", icon: Trophy, section: "benchmark" },
  { name: "Alertas", href: "/alerts", icon: Bell, section: "alerts" },
];

const bottomNav: NavItem[] = [
  { name: "Configuración", href: "/settings", icon: Settings, section: "settings" },
];

interface SidebarProps {
  role: Role;
  orgName?: string;
  plan?: string;
}

export function Sidebar({ role, orgName = "Mi Organización", plan = "trial" }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const visibleMain = mainNav.filter((item) => canAccessSection(role, item.section));
  const visibleBottom = bottomNav.filter((item) => canAccessSection(role, item.section));

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    // "/analytics" no debe quedar activo dentro de "/analytics/benchmark"
    const moreSpecific = mainNav.some(
      (item) => item.href !== href && item.href.startsWith(href) && pathname.startsWith(item.href)
    );
    return pathname.startsWith(href) && !moreSpecific;
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    const link = (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
          active
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span>{item.name}</span>}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.name}
          </TooltipContent>
        </Tooltip>
      );
    }

    return link;
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "flex h-screen flex-col border-r border-border bg-card transition-all duration-300",
          collapsed ? "w-[68px]" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <Eye className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold">RetailVision</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {visibleMain.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        <Separator />

        {/* Bottom Navigation */}
        <div className="space-y-1 px-3 py-4">
          {visibleBottom.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        {/* Org Info */}
        {!collapsed && (
          <div className="border-t border-border px-4 py-3">
            <p className="truncate text-sm font-medium">{orgName}</p>
            <p className="text-xs text-muted-foreground">
              {ROLE_LABELS[role]} · <span className="capitalize">Plan {plan}</span>
            </p>
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}
