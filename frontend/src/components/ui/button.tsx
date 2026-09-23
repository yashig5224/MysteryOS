import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-teal-600/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-md select-none";

    const variants = {
      primary:
        "bg-teal-700 hover:bg-teal-800 text-white shadow-sm active:bg-teal-900 border border-teal-800",
      secondary:
        "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 active:bg-slate-300",
      outline:
        "bg-white border border-slate-300 hover:border-slate-400 text-slate-700 hover:bg-slate-50 active:bg-slate-100 shadow-sm",
      ghost:
        "bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 active:bg-slate-200",
      danger:
        "bg-rose-600 hover:bg-rose-700 text-white shadow-sm active:bg-rose-800 border border-rose-700",
    };

    const sizes = {
      sm: "text-xs px-2.5 py-1.5 gap-1.5",
      md: "text-xs px-3.5 py-2 gap-2",
      lg: "text-sm px-4 py-2.5 gap-2",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <svg
            className="h-3.5 w-3.5 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
