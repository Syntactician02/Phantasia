"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sampleProject } from "@/lib/sampleData";

export default function Home() {
  const router = useRouter();
  const [jsonInput, setJsonInput] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [jsonError, setJsonError] = useState("");

  function handleAnalyzeSample() {
    sessionStorage.setItem("project", JSON.stringify(sampleProject));
    router.push("/dashboard");
  }

  function handleAnalyzeCustom() {
    setJsonError("");
    try {
      const parsed = JSON.parse(jsonInput);
      sessionStorage.setItem("project", JSON.stringify(parsed));
      router.push("/dashboard");
    } catch {
      setJsonError("Invalid JSON. Please check your input and try again.");
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(249,115,22,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-2xl w-full text-center relative z-10">
        <div className="inline-flex items-center gap-2 bg-surface border border-border rounded-full px-4 py-2 mb-8">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="font-mono text-xs text-muted tracking-widest">RELEASE INTELLIGENCE</span>
        </div>

        <h1
          className="font-display font-extrabold leading-none mb-4"
          style={{ fontSize: "clamp(56px, 10vw, 96px)" }}
        >
          <span className="text-text">Flow</span>
          <span className="text-accent">Guard</span>
        </h1>

        <p className="font-body text-lg text-muted mb-2 leading-relaxed">
          We detect hidden delays before your product misses deadline.
        </p>

        <p className="font-body text-sm text-muted/60 mb-12 max-w-lg mx-auto">
          AI-powered release intelligence that identifies waiting bottlenecks, scope drift,
          and delay risks — before they become catastrophic.
        </p>

        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {["⏳ Waiting Detection", "📈 Scope Drift Analysis", "🎯 Risk Prediction", "🤖 AI-Powered"].map((f) => (
            <span key={f} className="font-mono text-xs px-3 py-1.5 rounded-full border border-border text-muted">
              {f}
            </span>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <button
            onClick={handleAnalyzeSample}
            className="relative overflow-hidden font-display font-semibold text-sm px-8 py-4 rounded-xl bg-accent text-white transition-all hover:bg-orange-500 hover:scale-105 active:scale-95"
            style={{ boxShadow: "0 0 30px rgba(249,115,22,0.3)" }}
          >
            ⚡ Analyze Sample Project
          </button>

          <button
            onClick={() => setShowInput(!showInput)}
            className="font-display font-semibold text-sm px-8 py-4 rounded-xl border border-border text-text transition-all hover:border-accent/50 hover:bg-surface active:scale-95"
          >
            📋 Paste JSON Manually
          </button>
        </div>

        {showInput && (
          <div className="bg-surface border border-border rounded-xl p-4 text-left animate-slide-up">
            <p className="font-mono text-xs text-muted mb-2">Paste project JSON:</p>
            <textarea
              className="w-full h-48 bg-bg border border-border rounded-lg p-3 font-mono text-xs text-text resize-none focus:outline-none focus:border-accent/50 transition-colors"
              placeholder='{ "project_name": "My App", "initial_features": [...], ... }'
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
            />
            {jsonError && <p className="font-mono text-xs text-red-400 mt-2">{jsonError}</p>}
            <button
              onClick={handleAnalyzeCustom}
              className="mt-3 font-display font-semibold text-sm px-6 py-3 rounded-lg bg-accent text-white hover:bg-orange-500 transition-all"
            >
              Run Analysis →
            </button>
          </div>
        )}
      </div>

      <div className="absolute bottom-6 font-mono text-[10px] text-muted/40 tracking-widest">
        BUILT FOR HACKATHON 2025 · FLOWGUARD v1.0
      </div>
    </main>
  );
}