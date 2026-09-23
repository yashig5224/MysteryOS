import React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  FileSearch,
  Database,
  BrainCircuit,
  Settings,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  currentPath?: string;
  items?: NavItem[];
}

const defaultNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Investigations", href: "/investigation" },
  { label: "Datasets", href: "/datasets" },
  { label: "AI Copilot", href: "/copilot" },
  { label: "Settings", href: "/settings" },
];

export function Sidebar({
  currentPath,
  items = defaultNavItems,
  className,
  ...props
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-screen w-48 flex-col justify-between border-r border-slate-200 bg-white p-4 text-slate-800 shadow-sm",
        className
      )}
      {...props}
    >
      <div className="space-y-6">
        {/* Brand */}
        <Link href="/" className="flex items-center space-x-2.5 px-2 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-800 text-white font-bold text-xs tracking-wider shadow-sm">
            MOS
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-slate-900">MysteryOS</div>
            <div className="text-[10px] font-mono text-slate-500 uppercase">Data Intelligence</div>
          </div>
        </Link>

        {/* Navigation links */}
        <nav className="space-y-1">
          {items.map((item) => {
            const isActive = currentPath ? currentPath.startsWith(item.href) : false;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-all duration-150 group",
                  isActive
                    ? "bg-teal-50 text-teal-900 border border-teal-200/80 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                )}
              >
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* System Status footer */}
      <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs">
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="font-medium text-slate-700">Analytics Engine Ready</span>
        </div>
        <p className="mt-0.5 text-[10px] font-mono text-slate-500">FastAPI &bull; MysteryOS v2.0</p>
      </div>
    </aside>
  );
}
