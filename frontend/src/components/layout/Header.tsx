import React from "react";
import { cn } from "@/lib/utils";

export interface HeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title: React.ReactNode;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

export function Header({
  title,
  subtitle,
  badge,
  actions,
  className,
  ...props
}: HeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-b border-slate-200 bg-white px-8 py-6 shadow-sm sm:flex-row sm:items-center sm:justify-between",
        className
      )}
      {...props}
    >
      <div className="space-y-1.5">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          {badge && <div>{badge}</div>}
        </div>
        {subtitle && (
          <p className="text-base text-slate-500 leading-relaxed max-w-4xl">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center space-x-3 shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}
