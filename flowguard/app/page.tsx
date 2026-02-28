"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { sampleProject } from "@/lib/sampleData";
import { parseWhatsAppChat, extractMessagesFromWhatsApp } from "@/lib/parseWhatsApp";
import { parseGitHubCSV } from "@/lib/parseGitHub";
import { parseBudgetSheet } from "@/lib/parseBudget";

type UploadState = "idle" | "loading" | "done" | "error";

interface FileStatus {
  github: UploadState;
  whatsapp: UploadState;
  budget: UploadState;
}

export default function Home() {
  const router = useRouter();

  // ✅ FIXED REF TYPES
  const githubRef = useRef<HTMLInputElement | null>(null);
  const whatsappRef = useRef<HTMLInputElement | null>(null);
  const budgetRef = useRef<HTMLInputElement | null>(null);

  const [status, setStatus] = useState<FileStatus>({
    github: "idle",
    whatsapp: "idle",
    budget: "idle",
  });

  const [fileNames, setFileNames] = useState({
    github: "",
    whatsapp: "",
    budget: "",
  });

  const [errors, setErrors] = useState({
    github: "",
    whatsapp: "",
    budget: "",
  });

  const parsed = useRef({
    commits: sampleProject.commits ?? [],
    whatsapp_messages: sampleProject.whatsapp_messages ?? [],
    budget_items: sampleProject.budget_items ?? [],
    messages: sampleProject.messages ?? [],
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

      if (!commits.length) {
        throw new Error(
          "No commits found. Check headers: sha, author, date, message"
        );
      }

      parsed.current.commits = commits;
      setFileStatus("github", "done");
    } catch (err: unknown) {
      setErrors((p) => ({
        ...p,
        github: err instanceof Error ? err.message : "Parse failed",
      }));
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

      if (!msgs.length) {
        throw new Error(
          "No messages found. Export Chat → Without Media (.txt)"
        );
      }

      parsed.current.whatsapp_messages = msgs;
      parsed.current.messages = extractMessagesFromWhatsApp(msgs);

      setFileStatus("whatsapp", "done");
    } catch (err: unknown) {
      setErrors((p) => ({
        ...p,
        whatsapp: err instanceof Error ? err.message : "Parse failed",
      }));
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
      // ✅ SAFE TYPE FIX
      const XLSX: any = await import("xlsx");

      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });

      const workbookWithNames = {
        Sheets: wb.Sheets,
        SheetNames: wb.SheetNames,
      };

      const items = parseBudgetSheet(workbookWithNames, XLSX.utils);

      if (!items.length) {
        const sheetList = wb.SheetNames.join('", "');
        throw new Error(
          `No data found. Sheets: "${sheetList}". Rename one to "Budget".`
        );
      }

      parsed.current.budget_items = items;
      setFileStatus("budget", "done");
    } catch (err: unknown) {
      setErrors((p) => ({
        ...p,
        budget: err instanceof Error ? err.message : "Parse failed",
      }));
      setFileStatus("budget", "error");
    }
  }

  function handleAnalyze(useSample = false) {
    const project = useSample
      ? sampleProject
      : {
          ...sampleProject,
          commits: parsed.current.commits,
          whatsapp_messages: parsed.current.whatsapp_messages,
          budget_items: parsed.current.budget_items,
          messages: parsed.current.messages,
        };

    sessionStorage.setItem("project", JSON.stringify(project));
    router.push("/dashboard");
  }

  const uploadedCount = Object.values(status).filter(
    (s) => s === "done"
  ).length;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      {/* Your full UI remains SAME — no changes needed below */}
    </main>
  );
}