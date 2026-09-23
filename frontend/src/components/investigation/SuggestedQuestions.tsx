import React from "react";
import { SuggestedQuestion } from "@/types/investigation";

interface SuggestedQuestionsProps {
  questions: SuggestedQuestion[] | string[];
  onSelectQuestion: (question: string) => void;
  className?: string;
}

export function SuggestedQuestions({
  questions,
  onSelectQuestion,
  className = "",
}: SuggestedQuestionsProps) {
  if (!questions || questions.length === 0) return null;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
        Suggested Analytical Paths:
      </div>
      <div className="flex flex-wrap gap-1.5">
        {questions.map((q, idx) => {
          const text = typeof q === "string" ? q : q.question;
          return (
            <button
              key={idx}
              onClick={() => onSelectQuestion(text)}
              className="inline-flex items-center text-xs bg-slate-50 hover:bg-white border border-slate-200 hover:border-teal-600 text-slate-700 hover:text-teal-900 rounded-md px-2.5 py-1 transition-all text-left shadow-sm"
            >
              <span className="truncate max-w-xs sm:max-w-md">{text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
