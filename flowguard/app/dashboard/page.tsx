"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnalysisResult } from "@/lib/sampleData";
import { sampleProject } from "@/lib/sampleData";
import DeadlineMeter from "@/components/DeadlineMeter";
import TaskPriorityList from "@/components/TaskPriorityList";
import SignalCard from "@/components/SignalCard";
import InsightCard from "@/components/InsightCard";
import RecommendationCard from "@/components/RecommendationCard";

function StatPill({ label, value, unit = "", color }: {
  label: string; value: number | string; unit?: string; color: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-1">
      <span className="font-mono text-[10px] text-muted tracking-widest uppercase">{label}</span>
      <div className="flex items-end gap-1">
        <span className="font-display font-extrabold text-2xl" style={{ color }}>{value}</span>
        {unit && <span className="font-mono text-sm mb-0.5" style={{ color, opacity: 0.7 }}>{unit}</span>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function run() {
      const raw = sessionStorage.getItem("project");
      const project = raw ? JSON.parse(raw) : sampleProject;
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project }),
        });
        const json = await res.json();
        if (json.success) setResult(json.data);
        else setError("Analysis failed.");
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    run();
  }, []);

  function getRiskColor(score: number) {
    if (score >= 70) return "#EF4444";
    if (score >= 40) return "#EAB308";
    return "#22C55E";
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/")}
              className="font-mono text-xs text-muted hover:text-accent transition-colors">
              ← Back
            </button>
            <span className="text-border">|</span>
            <span className="font-display font-bold text-sm">
              Flow<span className="text-accent">Guard</span>
            </span>
          </div>
          {result && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-mono"
              style={{
                borderColor: result.ai_powered ? "#22C55E55" : "#EAB30855",
                color: result.ai_powered ? "#22C55E" : "#EAB308",
              }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: result.ai_powered ? "#22C55E" : "#EAB308" }} />
              {result.ai_powered ? "AI Analysis" : "Fallback Scoring"}
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="w-16 h-16 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
            <p className="font-mono text-sm text-muted animate-pulse">
              Analyzing signals across all data sources...
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-6 font-mono text-sm text-red-400">
            {error}
          </div>
        )}

        {result && !loading && (
          <div className="space-y-6">

            {/* HERO: Deadline probability meter — full width */}
            <DeadlineMeter
              probability={result.deadline_extension_probability}
              confidence={result.confidence} />

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatPill label="Waiting Score" value={result.waiting_score}
                color={getRiskColor(result.waiting_score)} />
              <StatPill label="Scope Drift" value={result.scope_drift_score}
                color={getRiskColor(result.scope_drift_score)} />
              <StatPill label="Budget Burn" value={result.budget_burn_percent} unit="%"
                color={getRiskColor(result.budget_burn_percent)} />
              <StatPill label="Wasted Hours" value={result.wasted_hours} unit="h"
                color={result.wasted_hours > 10 ? "#EF4444" : "#EAB308"} />
            </div>

            {/* Signal breakdown + Task priority list */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SignalCard signals={result.signals} />
              <TaskPriorityList tasks={result.prioritized_tasks} />
            </div>

            {/* Insights + Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full bg-accent" />
                  <h2 className="font-display font-semibold text-sm text-text">Insights</h2>
                  <span className="font-mono text-[10px] text-muted">({result.insights.length})</span>
                </div>
                <div className="flex flex-col gap-3">
                  {result.insights.map((ins, i) => <InsightCard key={i} insight={ins} index={i} />)}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full bg-safe" />
                  <h2 className="font-display font-semibold text-sm text-text">Recommendations</h2>
                  <span className="font-mono text-[10px] text-muted">({result.recommendations.length})</span>
                </div>
                <div className="flex flex-col gap-3">
                  {result.recommendations.map((rec, i) => <RecommendationCard key={i} recommendation={rec} index={i} />)}
                </div>
              </div>
            </div>

            <div className="text-center py-6 border-t border-border">
              <p className="font-mono text-[10px] text-muted/40 tracking-widest">
                FLOWGUARD v2.0 · {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}