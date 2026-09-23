import React, { useState, useEffect } from "react";
import {
  InvestigationMessage,
  InvestigationMode,
  InvestigationSource,
  InvestigationSummary,
  SuggestedQuestion,
} from "@/types/investigation";
import { EvidenceSummary, Hypothesis, InvestigationThread } from "@/types/evidence";
import { investigationService } from "@/services/investigationService";
import { InvestigationChat } from "@/components/investigation/InvestigationChat";
import { InvestigationContext } from "@/components/investigation/InvestigationContext";
import { InvestigationSummaryCard } from "@/components/investigation/InvestigationSummaryCard";
import { SuggestedQuestions } from "@/components/investigation/SuggestedQuestions";
import { AlertCircle, Sparkles } from "lucide-react";

interface InvestigationAssistantProps {
  datasetId: string;
  evidenceSummary: EvidenceSummary | null;
  initialQuestion?: string;
  onSelectSource?: (source: InvestigationSource) => void;
  onSelectHypothesis?: (hypothesis: Hypothesis) => void;
  onSelectThreadModal?: (thread: InvestigationThread) => void;
}

export function InvestigationAssistant({
  datasetId,
  evidenceSummary,
  initialQuestion,
  onSelectSource,
  onSelectHypothesis,
  onSelectThreadModal,
}: InvestigationAssistantProps) {
  const [messages, setMessages] = useState<InvestigationMessage[]>([]);
  const [summary, setSummary] = useState<InvestigationSummary | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<SuggestedQuestion[]>([]);
  const [activeMode, setActiveMode] = useState<InvestigationMode>("overview");
  const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>(
    evidenceSummary?.threads?.[0]?.thread_id
  );

  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial conversation history, summary, and suggested questions
  useEffect(() => {
    async function loadInitialData() {
      if (!datasetId) return;
      try {
        // 1. History
        try {
          const histResp = await investigationService.getHistory(datasetId);
          setMessages(histResp.messages || []);
        } catch (e) {
          console.error("Error loading chat history:", e);
        }

        // 2. Suggested Questions
        try {
          const sqResp = await investigationService.getSuggestedQuestions(datasetId);
          setSuggestedQuestions(sqResp || []);
        } catch (e) {
          console.error("Error loading suggested questions:", e);
        }

        // 3. Summary
        try {
          setLoadingSummary(true);
          const sumResp = await investigationService.getSummary(datasetId);
          setSummary(sumResp);
        } catch (e) {
          console.error("Error loading investigation summary:", e);
        } finally {
          setLoadingSummary(false);
        }
      } catch (err: any) {
        setError(err?.message || "Failed to initialize investigation assistant.");
      }
    }

    loadInitialData();
  }, [datasetId]);

  // Handle auto-submitting initialQuestion from Graph or other tabs
  const handledInitialRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (initialQuestion && initialQuestion !== handledInitialRef.current && !loadingChat) {
      handledInitialRef.current = initialQuestion;
      handleSendMessage(initialQuestion);
    }
  }, [initialQuestion]);

  // Handle asking an investigation question
  const handleSendMessage = async (questionText: string, mode?: InvestigationMode) => {
    if (!questionText.trim() || loadingChat) return;
    setLoadingChat(true);
    setError(null);

    const useMode = mode || activeMode;
    const now = new Date().toISOString();

    // Optimistic user message append
    const tempUserMsg: InvestigationMessage = {
      message_id: `temp_${Date.now()}`,
      role: "user",
      content: questionText,
      mode: useMode,
      timestamp: now,
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await investigationService.askQuestion(datasetId, {
        question: questionText,
        mode: useMode,
        thread_id: selectedThreadId,
      });

      const asstMsg: InvestigationMessage = {
        message_id: response.response_id,
        role: "assistant",
        content: response.answer,
        sources: response.sources,
        suggested_questions: response.suggested_questions,
        mode: response.mode,
        timestamp: response.created_at,
      };

      setMessages((prev) => [...prev, asstMsg]);
    } catch (err: any) {
      setError(err?.detail || err?.message || "Investigation query failed.");
      const errorMsg: InvestigationMessage = {
        message_id: `err_${Date.now()}`,
        role: "assistant",
        content: `**Investigation Assistant Error**: ${
          err?.detail || err?.message || "Failed to reason over dataset evidence."
        }`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoadingChat(false);
    }
  };

  // Handle reset conversation history
  const handleResetHistory = async () => {
    try {
      await investigationService.resetHistory(datasetId);
      setMessages([]);
    } catch (err: any) {
      console.error("Reset history error:", err);
    }
  };

  // Handle refreshing executive summary
  const handleRefreshSummary = async () => {
    setLoadingSummary(true);
    try {
      const sumResp = await investigationService.getSummary(datasetId);
      setSummary(sumResp);
    } catch (err: any) {
      console.error("Refresh summary error:", err);
    } finally {
      setLoadingSummary(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Section: Executive Investigation Synopsis */}
      <InvestigationSummaryCard
        summary={summary}
        loading={loadingSummary}
        onRefresh={handleRefreshSummary}
        onSelectSource={onSelectSource}
      />

      {/* Main Grid: Chat Console + Context Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Investigation Console */}
        <div className="lg:col-span-2 space-y-4">
          <InvestigationChat
            messages={messages}
            loading={loadingChat}
            onSendMessage={handleSendMessage}
            onResetHistory={handleResetHistory}
            onSelectSource={onSelectSource}
            activeMode={activeMode}
            onChangeMode={setActiveMode}
            suggestedQuestions={suggestedQuestions.map((q) => q.question)}
          />

          {/* Quick Suggested Questions Pill Bar if chat has messages */}
          {messages.length > 0 && suggestedQuestions.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
              <SuggestedQuestions
                questions={suggestedQuestions}
                onSelectQuestion={(q) => handleSendMessage(q, activeMode)}
              />
            </div>
          )}
        </div>

        {/* Right 1 Col: Active Investigation Context */}
        <div className="space-y-6">
          <InvestigationContext
            evidenceSummary={evidenceSummary}
            selectedThreadId={selectedThreadId}
            onSelectThread={(tId) => setSelectedThreadId(tId)}
            onSelectHypothesis={onSelectHypothesis}
            onSelectThreadModal={onSelectThreadModal}
          />
        </div>
      </div>
    </div>
  );
}
