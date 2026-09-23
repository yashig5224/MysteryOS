"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  count?: string | number;
  badge?: string | number;
  icon?: React.ReactNode;
  content?: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  defaultTab?: string;
  activeTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export function Tabs({
  items,
  defaultTab,
  activeTab: controlledActiveTab,
  onChange,
  className,
}: TabsProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<string>(
    defaultTab || (items.length > 0 ? items[0].id : "")
  );

  const currentTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;

  const handleTabChange = (tabId: string) => {
    if (controlledActiveTab === undefined) {
      setInternalActiveTab(tabId);
    }
    onChange?.(tabId);
  };

  const activeContent = items.find((item) => item.id === currentTab)?.content;

  return (
    <div className={cn("w-full space-y-4", className)}>
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="flex items-center space-x-1 border-b border-slate-200 pb-px overflow-x-auto"
      >
        {items.map((item) => {
          const isActive = item.id === currentTab;
          const displayCount = item.count ?? item.badge;

          return (
            <button
              key={item.id}
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${item.id}`}
              onClick={() => handleTabChange(item.id)}
              className={cn(
                "inline-flex items-center space-x-2 border-b-2 px-3.5 py-2 text-xs font-medium transition-all duration-150 focus:outline-none whitespace-nowrap",
                isActive
                  ? "border-teal-700 text-teal-900 bg-teal-50/60 font-semibold"
                  : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"
              )}
            >
              <span>{item.label}</span>
              {displayCount !== undefined && displayCount !== null && (
                <span
                  className={cn(
                    "rounded px-1.5 py-0.2 text-[10px] font-mono",
                    isActive
                      ? "bg-teal-100 text-teal-800 font-semibold"
                      : "bg-slate-100 text-slate-600"
                  )}
                >
                  {displayCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeContent && (
        <div
          role="tabpanel"
          id={`panel-${currentTab}`}
          aria-labelledby={`tab-${currentTab}`}
          className="animate-in fade-in-50 duration-150"
        >
          {activeContent}
        </div>
      )}
    </div>
  );
}
