"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { sampleProject } from "@/lib/sampleData";
import { parseWhatsAppChat, extractMessagesFromWhatsApp } from "@/lib/parseWhatsApp";
import { parseGitHubCSV } from "@/lib/parseGitHub";
import * as XLSX from "xlsx";
import { parseBudgetSheet } from "@/lib/parseBudget";

type UploadState = "idle" | "loading" | "done" | "error";

interface FileStatus {
  github: UploadState;
  whatsapp: UploadState;
  budget: UploadState;
}

export default function Home() {
  const router = useRouter();
  const githubRef = useRef<HTMLInputElement>(null);
  const whatsappRef = useRef<HTMLInputElement>(null);
  const budgetRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<FileStatus>({
    github: "idle", whatsapp: "idle", budget: "idle"
  });
  const [fileNames, setFileNames] = useState({
    github: "", whatsapp: "", budget: ""
  });
  const [errors, setErrors] = useState({
    github: "", whatsapp: "", budget: ""
  });

  // Collected parsed data stored in state
  const parsed = useRef({
    commits: sampleProject.commits ?? [],
    whatsapp_messages: sampleProject.whatsapp_messages ?? [],
    budget_items: sampleProject.budget_items ?? [],
    tasks: sampleProject.tasks,
    messages: sampleProject.messages,
    initial_features: sampleProject.initial_features,
    current_features: sampleProject.current_features,
  });

  function setFileStatus(key: keyof FileStatus, state: UploadState) {
    setStatus((prev) => ({ ...prev, [key]: state }));
  }

  async function handleGitHubUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileStatus("github", "loading");
    setFileNames((p) => ({ ...p, github: file.name }));
    setErrors((p) => ({ ...p, github: "" }));
    try {
      const text = await file.text();
      const commits = parseGitHubCSV(text);
      if (!commits.length) throw new Error("No commits found. Check CSV format.");
      parsed.current.commits = commits;
      setFileStatus("github", "done");
    } catch (err: unknown) {
      setErrors((p) => ({ ...p, github: err instanceof Error ? err.message : "Parse failed" }));
      setFileStatus("github", "error");
    }
  }

  async function handleWhatsAppUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileStatus("whatsapp", "loading");
    setFileNames((p) => ({ ...p, whatsapp: file.name }));
    setErrors((p) => ({ ...p, whatsapp: "" }));
    try {
      const text = await file.text();
      const msgs = parseWhatsAppChat(text);
      if (!msgs.length) throw new Error("No messages found. Export chat from WhatsApp.");
      parsed.current.whatsapp_messages = msgs;
      parsed.current.messages = extractMessagesFromWhatsApp(msgs);
      setFileStatus("whatsapp", "done");
    } catch (err: unknown) {
      setErrors((p) => ({ ...p, whatsapp: err instanceof Error ? err.message : "Parse failed" }));
      setFileStatus("whatsapp", "error");
    }
  }

  async function handleBudgetUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileStatus("budget", "loading");
    setFileNames((p) => ({ ...p, budget: file.name }));
    setErrors((p) => ({ ...p, budget: "" }));
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
      const items = parseBudgetSheet(wb);
      if (!items.length) throw new Error('No data found. Make sure sheet is named "Budget".');
      parsed.current.budget_items = items;
      setFileStatus("budget", "done");
    } catch (err: unknown) {
      setErrors((p) => ({ ...p, budget: err instanceof Error ? err.message : "Parse failed" }));
      setFileStatus("budget", "error");
    }
  }

  function handleAnalyze(useSample = false) {
    const project = useSample ? sampleProject : {
      ...sampleProject,
      commits: parsed.current.commits,
      whatsapp_messages: parsed.current.whatsapp_messages,
      budget_items: parsed.current.budget_items,
      messages: parsed.current.messages,
    };
    sessionStorage.setItem("project", JSON.stringify(project));
    router.push("/dashboard");
  }

  const uploadedCount = Object.values(status).filter((s) => s === "done").length;

  const FileUploadBox = ({
    id, icon, title, subtitle, accept, inputRef, state, fileName, error, onChange,
  }: {
    id: string; icon: string; title: string; subtitle: string;
    accept: string; inputRef: React.RefObject<HTMLInputElement>;
    state: UploadState; fileName: string; error: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }) => {
    const stateColors = {
      idle: { border: "#1E2028", bg: "transparent", text: "#6B7280" },
      loading: { border: "#F97316", bg: "#F9731608", text: "#F97316" },
      done: { border: "#22C55E", bg: "#22C55E08", text: "#22C55E" },
      error: { border: "#EF4444", bg: "#EF444408", text: "#EF4444" },
    };
    const colors = stateColors[state];

    return (
      <div className="flex flex-col gap-2">
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full p-4 rounded-xl border-2 border-dashed text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{ borderColor: colors.border, background: colors.bg }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <div className="flex-1">
              <p className="font-display font-semibold text-sm text-text">{title}</p>
              <p className="font-mono text-[10px] text-muted mt-0.5">{subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              {state === "done" && <span className="text-sm">✅</span>}
              {state === "loading" && (
                <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              )}
              {state === "error" && <span className="text-sm">❌</span>}
              {state === "idle" && (
                <span className="font-mono text-[10px] text-muted px-2 py-1 rounded border border-border">
                  Upload
                </span>
              )}
            </div>
          </div>
          {fileName && (
            <p className="font-mono text-[10px] mt-2" style={{ color: colors.text }}>
              {state === "done" ? "✓" : "→"} {fileName}
            </p>
          )}
        </button>
        {error && (
          <p className="font-mono text-[10px] text-red-400 px-1">{error}</p>
        )}
        <input ref={inputRef} type="file" accept={accept}
          className="hidden" onChange={onChange} />
      </div>
    );
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(249,115,22,0.05) 0%, transparent 70%)" }} />

      <div className="max-w-xl w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-surface border border-border rounded-full px-4 py-2 mb-6">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="font-mono text-xs text-muted tracking-widest">RELEASE INTELLIGENCE</span>
          </div>
          <h1 className="font-display font-extrabold leading-none mb-3"
            style={{ fontSize: "clamp(48px, 10vw, 80px)" }}>
            <span className="text-text">Flow</span>
            <span className="text-accent">Guard</span>
          </h1>
          <p className="font-body text-base text-muted leading-relaxed">
            Upload your project files and get an AI-powered
            deadline probability with prioritized task order.
          </p>
        </div>

        {/* Upload boxes */}
        <div className="flex flex-col gap-3 mb-6">
          <FileUploadBox
            id="github" icon="💻" title="GitHub Commits"
            subtitle="Export: git log --pretty=format:'%H,%an,%ad,%s' --date=short > commits.csv"
            accept=".csv" inputRef={githubRef}
            state={status.github} fileName={fileNames.github}
            error={errors.github} onChange={handleGitHubUpload} />

          <FileUploadBox
            id="whatsapp" icon="💬" title="WhatsApp Chat Export"
            subtitle="WhatsApp → Chat → ⋮ → More → Export Chat → Without Media (.txt)"
            accept=".txt" inputRef={whatsappRef}
            state={status.whatsapp} fileName={fileNames.whatsapp}
            error={errors.whatsapp} onChange={handleWhatsAppUpload} />

          <FileUploadBox
            id="budget" icon="📊" title="Budget Excel Sheet"
            subtitle='Excel file with sheet named "Budget" — columns: Item, Budgeted Hours, Spent Hours, Cost Per Hour, Status'
            accept=".xlsx,.xls" inputRef={budgetRef}
            state={status.budget} fileName={fileNames.budget}
            error={errors.budget} onChange={handleBudgetUpload} />
        </div>

        {/* Progress indicator */}
        {uploadedCount > 0 && (
          <div className="flex items-center gap-2 mb-4 px-1">
            <div className="flex gap-1">
              {[0,1,2].map((i) => (
                <div key={i} className="w-2 h-2 rounded-full transition-all"
                  style={{ background: i < uploadedCount ? "#22C55E" : "#1E2028" }} />
              ))}
            </div>
            <span className="font-mono text-[10px] text-muted">
              {uploadedCount}/3 files uploaded — {uploadedCount === 3 ? "ready for full analysis" : "partial analysis available"}
            </span>
          </div>
        )}

        {/* Analyze button */}
        <button
          onClick={() => handleAnalyze(false)}
          disabled={uploadedCount === 0}
          className="w-full font-display font-semibold text-sm py-4 rounded-xl bg-accent text-white transition-all hover:bg-orange-500 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          style={{ boxShadow: uploadedCount > 0 ? "0 0 30px rgba(249,115,22,0.3)" : "none" }}>
          {uploadedCount === 0 ? "Upload at least one file to analyze" :
           uploadedCount === 3 ? "⚡ Run Full Analysis" :
           `⚡ Analyze with ${uploadedCount} file${uploadedCount > 1 ? "s" : ""}`}
        </button>

        {/* Demo link */}
        <div className="text-center mt-4">
          <button onClick={() => handleAnalyze(true)}
            className="font-mono text-xs text-muted hover:text-accent transition-colors underline underline-offset-2">
            or try with sample data →
          </button>
        </div>

        {/* Excel format reminder */}
        <div className="mt-6 bg-surface border border-border rounded-xl p-4">
          <p className="font-mono text-[10px] text-accent mb-2 tracking-widest">
            📊 BUDGET EXCEL FORMAT
          </p>
          <div className="font-mono text-[10px] text-muted grid grid-cols-5 gap-x-2 border-b border-border pb-1 mb-1">
            {["Item","Budgeted Hours","Spent Hours","Cost Per Hour","Status"].map((h) => (
              <span key={h} className="text-text">{h}</span>
            ))}
          </div>
          <div className="font-mono text-[10px] text-muted grid grid-cols-5 gap-x-2">
            <span>Dev A</span><span>80</span><span>52</span><span>60</span><span>Active</span>
          </div>
          <div className="font-mono text-[10px] text-muted grid grid-cols-5 gap-x-2">
            <span>Dark Mode</span><span>20</span><span>23</span><span>55</span><span>Cut</span>
          </div>
          <p className="font-mono text-[9px] text-muted/50 mt-2">
            Status options: Active | Blocked | Cut | Done
          </p>
        </div>
      </div>

      <div className="absolute bottom-6 font-mono text-[10px] text-muted/40 tracking-widest">
        FLOWGUARD v2.0 · HACKATHON 2025
      </div>
    </main>
  );
}