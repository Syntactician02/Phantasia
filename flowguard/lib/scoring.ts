// lib/scoring.ts
import { ProjectData } from "./sampleData";

export interface AnalysisResult {
  delay_risk_score: number;
  waiting_score: number;
  scope_drift_score: number;
  scope_growth_percent: number;
  insights: string[];
  recommendations: string[];
}

const WAITING_KEYWORDS = [
  "waiting", "blocked", "pending", "approval",
  "hold", "delay", "stuck", "need", "sign-off"
];

export function computeWaitingScore(data: ProjectData): number {
  let score = 0;
  for (const task of data.tasks) {
    if (task.status === "Blocked") score += 20;
    else if (task.last_updated_days_ago > 7) score += 15;
    else if (task.last_updated_days_ago > 3) score += 8;
  }
  const msgs = [
    ...data.messages,
    ...(data.whatsapp_messages ?? []).map((m) => m.text),
  ];
  for (const msg of msgs) {
    const lower = msg.toLowerCase();
    const hits = WAITING_KEYWORDS.filter((kw) => lower.includes(kw)).length;
    score += hits * 6;
  }
  return Math.min(100, Math.round(score));
}

export function computeScopeDriftScore(data: ProjectData): {
  score: number; growthPercent: number;
} {
  const initial = data.initial_features.length;
  const current = data.current_features.length;
  const added = Math.max(0, current - initial);
  const growthPercent = initial > 0 ? Math.round((added / initial) * 100) : 0;
  const score = Math.min(100, Math.round((growthPercent / 50) * 100));
  return { score, growthPercent };
}

export function computeDelayRisk(w: number, s: number): number {
  return Math.min(100, Math.round(w * 0.6 + s * 0.4));
}

export function fallbackAnalysis(data: ProjectData): AnalysisResult {
  const waitingScore = computeWaitingScore(data);
  const { score: scopeDriftScore, growthPercent } = computeScopeDriftScore(data);
  const delayRiskScore = computeDelayRisk(waitingScore, scopeDriftScore);

  const blockedTasks = data.tasks.filter((t) => t.status === "Blocked");
  const staleTasks = data.tasks.filter((t) => t.last_updated_days_ago > 5);
  const addedFeatures = data.current_features.filter(
    (f) => !data.initial_features.includes(f)
  );

  const insights: string[] = [];
  if (blockedTasks.length > 0)
    insights.push(`${blockedTasks.length} task(s) blocked: ${blockedTasks.map((t) => t.title).join(", ")}.`);
  if (staleTasks.length > 0)
    insights.push(`${staleTasks.length} task(s) not updated in over 5 days.`);
  if (addedFeatures.length > 0)
    insights.push(`Scope grew by ${addedFeatures.length} feature(s): ${addedFeatures.join(", ")}.`);

  const recommendations: string[] = [];
  if (waitingScore > 50) {
    recommendations.push("Hold daily 15-min unblocking standup.");
    recommendations.push("Assign single decision-maker per pending approval.");
  }
  if (scopeDriftScore > 40)
    recommendations.push(`Freeze scope. Move ${addedFeatures.length} feature(s) to v2.1 backlog.`);
  if (staleTasks.length > 2)
    recommendations.push("Re-assign stale tasks idle over 5 days.");

  return {
    delay_risk_score: delayRiskScore,
    waiting_score: waitingScore,
    scope_drift_score: scopeDriftScore,
    scope_growth_percent: growthPercent,
    insights,
    recommendations,
  };
}