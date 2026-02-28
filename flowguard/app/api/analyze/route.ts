import { NextRequest, NextResponse } from "next/server";
import { analyzeProject } from "@/lib/analyzeProject";
import { sampleProject, ProjectData } from "@/lib/sampleData";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const incoming = body?.project ?? sampleProject;

    const projectData: ProjectData = {
      project_name: incoming.project_name ?? "Unnamed Project",
      release_date: incoming.release_date ?? "2025-12-31",
      initial_features: incoming.initial_features ?? [],
      current_features: incoming.current_features ?? [],
      tasks: incoming.tasks ?? [],
      messages: incoming.messages ?? [],
      commits: incoming.commits ?? [],
      whatsapp_messages: incoming.whatsapp_messages ?? [],
      budget_items: incoming.budget_items ?? [],
    };

    const result = await analyzeProject(projectData);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[API] Analysis failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Analysis failed",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}