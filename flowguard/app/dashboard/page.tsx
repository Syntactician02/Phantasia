"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RiskScore from "@/components/RiskScore";
import ScopeChart from "@/components/ScopeChart";
import WaitingHeatmap from "@/components/WaitingHeatmap";
import InsightCard from "@/components/InsightCard";
import RecommendationCard from "@/components/RecommendationCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { sampleProject } from "@/lib/sampleData";

interface AnalysisResult {
  delay_risk_score: number;
  waiting_score: number;
  scope_drift_score: number;
  scope_growth_percent: number;
  insights: string[];
  recommendations: string[];
  ai_powered: boolean;
}

function StatBox({ label, value, unit = "", color = "#E5E7EB", delay = 0 }: {
  label: string; value: number; unit?: string; color?: string; delay?: number;
}) {
  return (
    <div
      className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-1 animate-slide-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both", opacity: 0 }}
    >
      <span className="font-mono text-[10px] text-muted tracking-widest uppercase">{label}</span>
      <div className="flex items-end gap-1.5">
        <span className="font-display font-extrabold text-3xl" style={{ color }}>{value}</span>
        {unit && <span className="font-mono text-sm mb-1" style={{ color, opacity: 0.7 }}>{unit}</span>}
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

  const barData = result ? [
    { name: "Waiting", value: result.waiting_score, fill: "#EF4444" },
    { name: "Scope Drift", value: result.scope_drift_score, fill: "#F97316" },
    { name: "Overall Risk", value: result.delay_risk_score, fill: "#EAB308" },
  ] : [];

  function getColor(score: number) {
    if (score >= 70) return "#EF4444";
    if (score >= 40) return "#EAB308";
    return "#22C55E";
  }

  return (
    <div className="min-h-screen bg-bg">
      <nav className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/")} className="font-mono text-xs text-muted hover:text-accent transition-colors">← Back</button>
            <span className="text-border">|</span>
            <span className="font-display font-bold text-sm">Flow<span className="text-accent">Guard</span></span>
          </div>
          {result && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-mono"
              style={{ borderColor: result.ai_powered ? "#22C55E55" : "#EAB30855", color: result.ai_powered ? "#22C55E" : "#EAB308" }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: result.ai_powered ? "#22C55E" : "#EAB308" }} />
              {result.ai_powered ? "AI Analysis" : "Fallback Scoring"}
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="w-16 h-16 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
            <p className="font-mono text-sm text-muted animate-pulse">Analyzing project signals...</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-6 font-mono text-sm text-red-400">{error}</div>
        )}

        {result && !loading && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-surface border border-border rounded-xl p-6 flex flex-col items-center justify-center gap-4 animate-fade-in">
                <RiskScore score={result.delay_risk_score} label="Release Risk Score" size="lg" />
              </div>
              <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-4">
                <StatBox label="Waiting Score" value={result.waiting_score} color={getColor(result.waiting_score)} delay={100} />
                <StatBox label="Scope Drift Score" value={result.scope_drift_score} color={getColor(result.scope_drift_score)} delay={160} />
                <StatBox label="Scope Growth" value={result.scope_growth_percent} unit="%" color={result.scope_growth_percent > 30 ? "#EF4444" : "#EAB308"} delay={220} />
                <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4 animate-slide-up" style={{ animationDelay: "280ms", animationFillMode: "both", opacity: 0 }}>
                  <RiskScore score={result.waiting_score} label="Waiting" size="sm" />
                </div>
                <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4 animate-slide-up" style={{ animationDelay: "340ms", animationFillMode: "both", opacity: 0 }}>
                  <RiskScore score={result.scope_drift_score} label="Scope" size="sm" />
                </div>
                <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-1 animate-slide-up" style={{ animationDelay: "400ms", animationFillMode: "both", opacity: 0 }}>
                  <span className="font-mono text-[10px] text-muted tracking-widest uppercase">Features Added</span>
                  <span className="font-display font-extrabold text-3xl text-orange-400">
                    {sampleProject.current_features.length - sampleProject.initial_features.length}
                  </span>
                  <span className="font-mono text-[10px] text-muted">of {sampleProject.initial_features.length} original</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface border border-border rounded-xl p-5">
                <div className="mb-4">
                  <h3 className="font-display font-semibold text-sm text-text">Risk Signal Comparison</h3>
                  <p className="font-mono text-xs text-muted mt-0.5">Waiting vs scope vs overall</p>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={barData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: "#111318", border: "1px solid #1E2028", borderRadius: 8, fontFamily: "JetBrains Mono, monospace", fontSize: 11 }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {barData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ScopeChart />
            </div>

            <WaitingHeatmap />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full bg-accent" />
                  <h2 className="font-display font-semibold text-sm text-text">Detected Insights</h2>
                  <span className="font-mono text-[10px] text-muted">({result.insights.length})</span>
                </div>
                <div className="flex flex-col gap-3">
                  {result.insights.map((insight, i) => <InsightCard key={i} insight={insight} index={i} />)}
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
                FLOWGUARD RELEASE INTELLIGENCE · ANALYSIS COMPLETE · {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}