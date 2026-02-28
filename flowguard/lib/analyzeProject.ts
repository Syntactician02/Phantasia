// lib/analyzeProject.ts
import { ProjectData, AnalysisResult as FullResult, PrioritizedTask } from "./sampleData";
import { fallbackAnalysis } from "./scoring";
import { computeDeadlineScore } from "./deadlineScore";
import { prioritizeTasks } from "./prioritizeTasks";
import { computeFinancialHealth } from "./parseBudget";

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
  "insights": [<string x3-5>],
  "recommendations": [<string x3-5>]
}

Focus on:
1. Will this project miss its deadline? Give a % probability.
2. What are the biggest bottlenecks?
3. What should the PM act on immediately?

Project Data:
${JSON.stringify({
  project_name: data.project_name,
  release_date: data.release_date,
  tasks: data.tasks,
  messages: data.messages,
  initial_features: data.initial_features,
  current_features: data.current_features,
  commit_count: data.commits?.length ?? 0,
  whatsapp_message_count: data.whatsapp_messages?.length ?? 0,
}, null, 2)}

JSON only.`;
}

export async function analyzeProject(data: ProjectData): Promise<FinalResult> {
  const apiKey = process.env.LLM_API_KEY;

  // Always compute deterministic signals (used regardless of AI)
  const deadlineAssessment = computeDeadlineScore(data);
  const prioritized = prioritizeTasks(data.tasks);

  // Financial summary
  let budgetBurnPercent = deadlineAssessment.budget_burn_percent;
  let financialRisk = deadlineAssessment.financial_risk;
  let wastedHours = deadlineAssessment.wasted_hours;

  if (!apiKey) {
    const base = fallbackAnalysis(data);
    return buildFinalResult(base, deadlineAssessment, prioritized, budgetBurnPercent,
      financialRisk, wastedHours, false);
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
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

    return buildFinalResult(aiResult, deadlineAssessment, prioritized,
      budgetBurnPercent, financialRisk, wastedHours, true);
  } catch (err) {
    console.warn("[FlowGuard] Groq failed, using fallback:", err);
    const base = fallbackAnalysis(data);
    return buildFinalResult(base, deadlineAssessment, prioritized,
      budgetBurnPercent, financialRisk, wastedHours, false);
  }
}

function buildFinalResult(
  base: { delay_risk_score: number; waiting_score: number; scope_drift_score: number; scope_growth_percent: number; insights: string[]; recommendations: string[]; deadline_extension_probability?: number; confidence?: string },
  deadline: ReturnType<typeof computeDeadlineScore>,
  prioritized: PrioritizedTask[],
  budgetBurnPercent: number,
  financialRisk: "Low" | "Medium" | "High",
  wastedHours: number,
  aiPowered: boolean
): FinalResult {
  return {
    delay_risk_score: base.delay_risk_score,
    waiting_score: base.waiting_score,
    scope_drift_score: base.scope_drift_score,
    scope_growth_percent: base.scope_growth_percent,
    deadline_extension_probability: base.deadline_extension_probability ?? deadline.probability,
    confidence: (base.confidence as "Low" | "Medium" | "High") ?? deadline.confidence,
    prioritized_tasks: prioritized,
    budget_burn_percent: budgetBurnPercent,
    time_remaining_percent: deadline.time_remaining_percent,
    wasted_hours: wastedHours,
    financial_risk: financialRisk,
    signals: deadline.signals,
    insights: base.insights,
    recommendations: base.recommendations,
    ai_powered: aiPowered,
  };
}