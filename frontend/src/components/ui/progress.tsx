import React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "success" | "warning" | "danger";
  showLabel?: boolean;
  label?: string;
}

export function Progress({
  className,
  value = 0,
  max = 100,
  size = "md",
  variant = "primary",
  showLabel = false,
  label,
  ...props
}: ProgressProps) {
  const percentage = Math.min(Math.max(0, (value / max) * 100), 100);

  const sizes = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-3",
  };

  const variants = {
    primary: "bg-teal-700",
    secondary: "bg-slate-700",
    success: "bg-emerald-600",
    warning: "bg-amber-600",
    danger: "bg-rose-600",
  };

  return (
    <div className={cn("w-full space-y-1", className)} {...props}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>{label}</span>
          <span className="font-mono font-medium">{Math.round(percentage)}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={cn("w-full overflow-hidden rounded-full bg-slate-200", sizes[size])}
      >
        <div
          className={cn("h-full transition-all duration-300 ease-out rounded-full", variants[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
