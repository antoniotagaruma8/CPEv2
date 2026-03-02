"use client";

import { useState } from "react";

interface GradingResult {
  score: number;
  band: string;
  feedback: string;
  detailed_analysis: {
    content: string;
    communicative_achievement: string;
    organisation: string;
    language: string;
  };
  corrections: Array<{
    original: string;
    correction: string;
    reason: string;
  }>;
}

interface WritingGraderProps {
  prompt?: string;
  taskType?: string;
  label?: string;
  placeholder?: string;
}

export default function WritingGrader({ 
  prompt = "", 
  taskType = "CPE Writing",
  label = "Your Answer",
  placeholder = "Type your essay here..."
}: WritingGraderProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GradingResult | null>(null);

  const handleGrade = async () => {
    if (!input.trim()) return;
    
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/grade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskType,
          questionContext: prompt,
          studentInput: input,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        alert("Error grading: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Failed to grade", error);
      alert("Failed to connect to grading service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y font-mono text-sm"
          placeholder={placeholder}
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleGrade}
          disabled={loading || input.length === 0}
          className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Grading..." : "Grade My Work"}
        </button>
      </div>

      {result && (
        <div className="mt-8 p-6 bg-white border border-gray-200 rounded-xl shadow-sm animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-6 border-b pb-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Assessment Result</h3>
              <p className="text-gray-500">Based on Cambridge C2 Proficiency scales</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">{result.score}/20</div>
              <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Band {result.band}</div>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-2">Overall Feedback</h4>
            <p className="text-gray-700 leading-relaxed">{result.feedback}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <AnalysisCard title="Content" content={result.detailed_analysis.content} />
            <AnalysisCard title="Communicative Achievement" content={result.detailed_analysis.communicative_achievement} />
            <AnalysisCard title="Organisation" content={result.detailed_analysis.organisation} />
            <AnalysisCard title="Language" content={result.detailed_analysis.language} />
          </div>

          {result.corrections && result.corrections.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Key Corrections</h4>
              <div className="space-y-3">
                {result.corrections.map((item, idx) => (
                  <div key={idx} className="p-3 bg-red-50 rounded-lg border border-red-100 text-sm">
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
                      <span className="line-through text-red-500 opacity-70">{item.original}</span>
                      <span className="text-gray-400 hidden sm:inline">→</span>
                      <span className="text-green-700 font-medium">{item.correction}</span>
                    </div>
                    <p className="mt-1 text-gray-600 text-xs italic">{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AnalysisCard({ title, content }: { title: string; content: string }) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
      <h5 className="font-semibold text-gray-900 text-sm mb-1">{title}</h5>
      <p className="text-gray-600 text-sm">{content}</p>
    </div>
  );
}