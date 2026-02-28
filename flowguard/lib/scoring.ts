import { ProjectData } from "./sampleData";

const WAITING_KEYWORDS = ["waiting", "blocked", "pending", "approval", "hold", "delay", "stuck", "need", "sign-off"];

export function computeWaitingScore(data: ProjectData): number {
  let score = 0;
  for (const task of data.tasks) {
    if (task.status === "Blocked") score += 20;
    else if (task.last_updated_days_ago > 7) score += 15;
    else if (task.last_updated_days_ago > 3) score += 8;
  }
  for (const msg of data.messages) {
    const lower = msg.toLowerCase();
    const hits = WAITING_KEYWORDS.filter((kw) => lower.includes(kw)).length;
    score += hits * 6;
  }
  return Math.min(100, Math.round(score));
}

export function computeScopeDriftScore(data: ProjectData): { score: number; growthPercent: number } {
  const initial = data.initial_features.length;
  const current = data.current_features.length;
  const added = Math.max(0, current - initial);
  const growthPercent = initial > 0 ? Math.round((added / initial) * 100) : 0;
  const score = Math.min(100, Math.round((growthPercent / 50) * 100));
  return { score, growthPercent };
}

export function computeDelayRisk(waitingScore: number, scopeDriftScore: number): number {
  return Math.min(100, Math.round(waitingScore * 0.6 + scopeDriftScore * 0.4));
}

export interface AnalysisResult {
  delay_risk_score: number;
  waiting_score: number;
  scope_drift_score: number;
  scope_growth_percent: number;
  insights: string[];
  recommendations: string[];
}

export function fallbackAnalysis(data: ProjectData): AnalysisResult {
  const waitingScore = computeWaitingScore(data);
  const { score: scopeDriftScore, growthPercent } = computeScopeDriftScore(data);
  const delayRiskScore = computeDelayRisk(waitingScore, scopeDriftScore);

  const blockedTasks = data.tasks.filter((t) => t.status === "Blocked");
  const staleTasks = data.tasks.filter((t) => t.last_updated_days_ago > 5);
  const addedFeatures = data.current_features.filter((f) => !data.initial_features.includes(f));

  const insights: string[] = [];
  if (blockedTasks.length > 0)
    insights.push(`${blockedTasks.length} task(s) are currently blocked: ${blockedTasks.map((t) => t.title).join(", ")}.`);
  if (staleTasks.length > 0)
    insights.push(`${staleTasks.length} task(s) haven't been updated in over 5 days — likely stalled.`);
  if (addedFeatures.length > 0)
    insights.push(`Scope has grown by ${addedFeatures.length} feature(s) since kick-off: ${addedFeatures.join(", ")}.`);
  const waitingMessages = data.messages.filter((m) =>
    WAITING_KEYWORDS.some((kw) => m.toLowerCase().includes(kw))
  );
  if (waitingMessages.length > 0)
    insights.push(`${waitingMessages.length} team message(s) contain blocking language — human-chain bottlenecks detected.`);

  const recommendations: string[] = [];
  if (waitingScore > 50) {
    recommendations.push("Hold a daily 15-min unblocking standup to resolve approval chains faster.");
    recommendations.push("Assign a single decision-maker for each pending approval to eliminate multi-party delays.");
  }
  if (scopeDriftScore > 40) {
    recommendations.push(`Freeze scope immediately. Move the ${addedFeatures.length} new feature(s) to a v2.1 backlog.`);
    recommendations.push("Implement a formal change-request process requiring PM + Tech Lead sign-off before adding scope.");
  }
  if (delayRiskScore > 60)
    recommendations.push("Consider negotiating a 1-week release buffer with stakeholders before the situation becomes critical.");
  if (staleTasks.length > 2)
    recommendations.push("Re-assign or time-box stale tasks — tasks idle over 5 days need immediate ownership change.");

  return {
    delay_risk_score: delayRiskScore,
    waiting_score: waitingScore,
    scope_drift_score: scopeDriftScore,
    scope_growth_percent: growthPercent,
    insights,
    recommendations,
  };
}
