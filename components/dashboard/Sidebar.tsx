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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";

const mainNav = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Tiendas", href: "/stores", icon: Store },
  { name: "Dispositivos", href: "/devices", icon: Camera },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Benchmark", href: "/analytics/benchmark", icon: Trophy },
  { name: "Alertas", href: "/alerts", icon: Bell },
];

const bottomNav = [
  { name: "Configuración", href: "/settings", icon: Settings },
];

interface SidebarProps {
  orgName?: string;
  plan?: string;
}

export function Sidebar({ orgName = "Mi Organización", plan = "trial" }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const NavLink = ({ item }: { item: (typeof mainNav)[number] }) => {
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
          {mainNav.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        <Separator />

        {/* Bottom Navigation */}
        <div className="space-y-1 px-3 py-4">
          {bottomNav.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        {/* Org Info */}
        {!collapsed && (
          <div className="border-t border-border px-4 py-3">
            <p className="truncate text-sm font-medium">{orgName}</p>
            <p className="text-xs text-muted-foreground capitalize">
              Plan {plan}
            </p>
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}
