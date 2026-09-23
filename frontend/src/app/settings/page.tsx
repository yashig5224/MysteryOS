"use client";

import React from "react";
import { Header } from "@/components/layout/Header";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-slate-900">
      <Header
        title="System Settings"
        subtitle="Configure investigation engine thresholds, analytical parameters, and environment settings"
        badge={<Badge variant="outline">SYSTEM v1.0</Badge>}
      />

      <PageContainer className="py-8 space-y-6 max-w-4xl">
        {/* Engine Parameters */}
        <Card className="p-6 bg-white border-slate-200 shadow-sm space-y-4">
          <CardHeader className="px-0 pt-0 pb-2 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900">
              Analytical Engine Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0 space-y-4 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <span className="font-semibold text-slate-900 block">IQR Anomaly Multiplier</span>
                <span className="text-slate-600">Standard interquartile range outlier threshold</span>
              </div>
              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                1.5 &times; IQR
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <span className="font-semibold text-slate-900 block">Z-Score Significance Bound</span>
                <span className="text-slate-600">Standard deviation limit for extreme observations</span>
              </div>
              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                |z| &ge; 3.0
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <span className="font-semibold text-slate-900 block">Correlation Discovery Cutoff</span>
                <span className="text-slate-600">Minimum Pearson/Spearman absolute coefficient</span>
              </div>
              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                |r| &ge; 0.45
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <span className="font-semibold text-slate-900 block">Evidence Confidence Threshold</span>
                <span className="text-slate-600">Minimum composite score required for Strong corroboration</span>
              </div>
              <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded border border-teal-200">
                Score &ge; 80
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Environment & Backend */}
        <Card className="p-6 bg-white border-slate-200 shadow-sm space-y-4">
          <CardHeader className="px-0 pt-0 pb-2 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900">
              Environment &amp; Platform Status
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0 space-y-3 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600">Backend API URL</span>
              <span className="font-mono text-slate-900 font-semibold">http://127.0.0.1:8000/api</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600">Design System Mode</span>
              <span className="font-mono font-bold text-teal-800 uppercase">Light Mode Only</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-600">Backend Verification Suite</span>
              <Badge variant="success" size="sm">50 TESTS PASSING</Badge>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    </div>
  );
}
