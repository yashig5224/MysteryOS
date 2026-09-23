import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "secondary" | "success" | "warning" | "danger" | "outline";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "default",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  const baseStyles =
    "inline-flex items-center font-medium rounded-md transition-colors select-none";

  const variants = {
    default: "bg-slate-100 text-slate-700 border border-slate-200",
    primary: "bg-teal-50 text-teal-800 border border-teal-200",
    secondary: "bg-slate-100 text-slate-800 border border-slate-200",
    success: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    warning: "bg-amber-50 text-amber-900 border border-amber-200",
    danger: "bg-rose-50 text-rose-800 border border-rose-200",
    outline: "bg-white text-slate-700 border border-slate-200",
  };

  const sizes = {
    sm: "px-1.5 py-0.5 text-[10px] leading-tight",
    md: "px-2 py-0.5 text-xs",
  };

  return (
    <span className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {children}
    </span>
  );
}
