import React, { useState, useRef, useEffect } from "react";
import {
  InvestigationMessage,
  InvestigationMode,
  InvestigationSource,
} from "@/types/investigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InvestigationSources } from "@/components/investigation/InvestigationSources";
import { SuggestedQuestions } from "@/components/investigation/SuggestedQuestions";

interface InvestigationChatProps {
  messages: InvestigationMessage[];
  loading: boolean;
  onSendMessage: (question: string, mode?: InvestigationMode) => void;
  onResetHistory: () => void;
  onSelectSource?: (source: InvestigationSource) => void;
  activeMode: InvestigationMode;
  onChangeMode: (mode: InvestigationMode) => void;
  suggestedQuestions?: string[];
  className?: string;
}

const MODES: { id: InvestigationMode; label: string; desc: string }[] = [
  { id: "overview", label: "Overview", desc: "Holistic investigation summary" },
  { id: "anomaly", label: "Anomaly", desc: "Explain specific anomaly finding" },
  { id: "pattern", label: "Pattern", desc: "Explain systemic trends & correlations" },
  { id: "evidence", label: "Evidence", desc: "Supporting vs contradictory signals" },
  { id: "hypothesis", label: "Hypothesis", desc: "Evaluate candidate explanations" },
  { id: "timeline", label: "Timeline", desc: "Chronological sequence analysis" },
  { id: "next_step", label: "Next Step", desc: "Actionable investigation recommendations" },
];

export function InvestigationChat({
  messages,
  loading,
  onSendMessage,
  onResetHistory,
  onSelectSource,
  activeMode,
  onChangeMode,
  suggestedQuestions = [],
  className = "",
}: InvestigationChatProps) {
  const [inputQuery, setInputQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || loading) return;
    onSendMessage(inputQuery.trim(), activeMode);
    setInputQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <Card className={`flex flex-col shadow-sm ${className}`}>
      {/* Investigation Dossier Header */}
      <CardHeader className="py-2.5 px-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-xs font-mono text-slate-800 tracking-wider uppercase font-bold">
              Investigation Workspace // RAG Reasoning Engine
            </CardTitle>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onResetHistory}
              className="h-6 px-2 text-[11px] text-slate-600 hover:text-rose-700 hover:border-rose-300"
              title="Reset conversation session"
            >
              Reset Session
            </Button>
          </div>
        </div>

        {/* Mode Selector Pill Bar */}
        <div className="flex items-center gap-1 pt-2 overflow-x-auto">
          <span className="text-[10px] font-mono uppercase text-slate-500 mr-1 shrink-0 font-bold">
            Analysis Mode:
          </span>
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => onChangeMode(m.id)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all shrink-0 border ${
                activeMode === m.id
                  ? "bg-teal-700 text-white border-teal-800 font-semibold shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border-slate-200"
              }`}
              title={m.desc}
            >
              {m.label}
            </button>
          ))}
        </div>
      </CardHeader>

      {/* Investigation Records Stream */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[380px] max-h-[550px] bg-slate-50/30">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 px-4 space-y-3">
            <div className="space-y-1 max-w-lg">
              <h4 className="text-sm font-bold text-slate-900">
                Investigation Dossier Ready
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Query empirical findings, pattern clusters, contradictory evidence, and candidate hypotheses with evidence-grounded attribution.
              </p>
            </div>
            {suggestedQuestions.length > 0 && (
              <div className="pt-3 max-w-lg w-full">
                <SuggestedQuestions
                  questions={suggestedQuestions}
                  onSelectQuestion={(q) => onSendMessage(q, activeMode)}
                />
              </div>
            )}
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={msg.message_id || idx} className="w-full">
              {msg.role === "user" ? (
                <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 uppercase pb-1 border-b border-slate-100">
                    <span className="font-bold text-slate-800">Investigation Query</span>
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-900 pt-0.5">
                    {msg.content}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 uppercase pb-1.5 border-b border-slate-100">
                    <span className="font-bold text-teal-800">
                      Analysis &amp; Synthesis
                    </span>
                    <Badge variant="outline" size="sm" className="text-[9px]">
                      {msg.mode ? msg.mode.toUpperCase() : "REASONING"}
                    </Badge>
                  </div>

                  {/* Analysis Content */}
                  <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>

                  {/* Source Chips */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <InvestigationSources
                        sources={msg.sources}
                        onSelectSource={onSelectSource}
                      />
                    </div>
                  )}

                  {/* Inline follow-up questions */}
                  {msg.suggested_questions && msg.suggested_questions.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <SuggestedQuestions
                        questions={msg.suggested_questions}
                        onSelectQuestion={(q) => onSendMessage(q, activeMode)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm space-y-2">
            <div className="flex items-center space-x-2 text-xs text-teal-800 font-mono font-semibold">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-teal-700 border-r-transparent" />
              <span>Reasoning over structured evidence graph and hypotheses...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </CardContent>

      {/* Query Input Bar */}
      <div className="p-3 border-t border-slate-200 bg-white">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <textarea
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask an investigation question in ${activeMode} mode... (Press Enter to submit)`}
            disabled={loading}
            rows={1}
            className="w-full resize-none rounded-md border border-slate-300 bg-slate-50/50 px-3 py-2 pr-20 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-600 shadow-sm"
          />
          <div className="absolute right-1.5 flex items-center">
            <Button
              type="submit"
              size="sm"
              disabled={loading || !inputQuery.trim()}
              className="h-7 px-3 text-xs"
            >
              <span>Submit</span>
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}
