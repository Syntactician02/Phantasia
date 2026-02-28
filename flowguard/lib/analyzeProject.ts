import { ProjectData, AnalysisResult as FullResult, PrioritizedTask } from "./sampleData";
import { fallbackAnalysis } from "./scoring";
import { computeDeadlineScore } from "./deadlineScore";
import { prioritizeTasks } from "./prioritizeTasks";

export type FinalResult = FullResult;

function buildPrompt(data: ProjectData): string {
  return `You are a senior release manager and project risk analyst.

Analyze this project and return ONLY valid JSON — no markdown, no explanation.

Return exactly this schema:
{
  "delay_risk_score": <0-100>,
  "waiting_score": <0-100>,
  "scope_drift_score": <0-100>,
  "scope_growth_percent": <number>,
  "deadline_extension_probability": <0-100>,
  "confidence": <"Low"|"Medium"|"High">,
  "insights": [<3 to 5 strings>],
  "recommendations": [<3 to 5 strings>]
}

Focus on:
1. Will this project miss its deadline? Give a % probability.
2. What are the biggest bottlenecks right now?
3. What should the PM act on immediately?

Project Data:
${JSON.stringify({
    project_name: data.project_name,
    release_date: data.release_date,
    tasks: data.tasks ?? [],
    messages: data.messages ?? [],
    initial_features: data.initial_features ?? [],
    current_features: data.current_features ?? [],
    commit_count: (data.commits ?? []).length,
    whatsapp_message_count: (data.whatsapp_messages ?? []).length,
    budget_item_count: (data.budget_items ?? []).length,
  }, null, 2)}

JSON only.`;
}

export async function analyzeProject(data: ProjectData): Promise<FinalResult> {
  const apiKey = process.env.LLM_API_KEY;

  // Always compute deterministic signals first
  let deadlineAssessment;
  try {
    deadlineAssessment = computeDeadlineScore(data);
  } catch (err) {
    console.warn("[FlowGuard] deadlineScore failed:", err);
    deadlineAssessment = {
      probability: 50,
      confidence: "Low" as const,
      signals: { waiting: 0, scope_drift: 0, commit_velocity: 0, budget_burn: 0, communication_gap: 0 },
      time_remaining_percent: 50,
      budget_burn_percent: 0,
      financial_risk: "Low" as const,
      wasted_hours: 0,
    };
  }

  let prioritized: PrioritizedTask[] = [];
  try {
    prioritized = prioritizeTasks(data.tasks ?? []);
  } catch (err) {
    console.warn("[FlowGuard] prioritizeTasks failed:", err);
    prioritized = [];
  }

  const { budget_burn_percent, financial_risk, wasted_hours } = deadlineAssessment;

  if (!apiKey) {
    console.log("[FlowGuard] No LLM_API_KEY — using fallback scoring.");
    const base = fallbackAnalysis(data);
    return buildFinalResult(base, deadlineAssessment, prioritized, budget_burn_percent, financial_risk, wasted_hours, false);
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: buildPrompt(data) }],
        temperature: 0.3,
      }),
    });

    if (!response.ok) throw new Error(`Groq error: ${response.status}`);

    const groqData = await response.json();
    const rawText = groqData.choices?.[0]?.message?.content ?? "";
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const aiResult = JSON.parse(cleaned);

    return buildFinalResult(aiResult, deadlineAssessment, prioritized, budget_burn_percent, financial_risk, wasted_hours, true);
  } catch (err) {
    console.warn("[FlowGuard] Groq failed, using fallback:", err);
    const base = fallbackAnalysis(data);
    return buildFinalResult(base, deadlineAssessment, prioritized, budget_burn_percent, financial_risk, wasted_hours, false);
  }
}

function buildFinalResult(
  base: {
    delay_risk_score: number;
    waiting_score: number;
    scope_drift_score: number;
    scope_growth_percent: number;
    insights: string[];
    recommendations: string[];
    deadline_extension_probability?: number;
    confidence?: string;
  },
  deadline: ReturnType<typeof computeDeadlineScore>,
  prioritized: PrioritizedTask[],
  budgetBurnPercent: number,
  financialRisk: "Low" | "Medium" | "High",
  wastedHours: number,
  aiPowered: boolean
): FinalResult {
  return {
    delay_risk_score: base.delay_risk_score ?? 0,
    waiting_score: base.waiting_score ?? 0,
    scope_drift_score: base.scope_drift_score ?? 0,
    scope_growth_percent: base.scope_growth_percent ?? 0,
    deadline_extension_probability: base.deadline_extension_probability ?? deadline.probability ?? 0,
    confidence: (base.confidence as "Low" | "Medium" | "High") ?? deadline.confidence ?? "Low",
    prioritized_tasks: prioritized ?? [],
    budget_burn_percent: budgetBurnPercent ?? 0,
    time_remaining_percent: deadline.time_remaining_percent ?? 50,
    wasted_hours: wastedHours ?? 0,
    financial_risk: financialRisk ?? "Low",
    signals: deadline.signals ?? { waiting: 0, scope_drift: 0, commit_velocity: 0, budget_burn: 0, communication_gap: 0 },
    insights: base.insights ?? [],
    recommendations: base.recommendations ?? [],
    ai_powered: aiPowered,
  };
}