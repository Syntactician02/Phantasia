// lib/deadlineScore.ts
// Combines all signals into a single deadline extension probability

import { ProjectData, SignalBreakdown } from "./sampleData";
import { computeWaitingScore, computeScopeDriftScore } from "./scoring";
import { getCommitVelocity, getRiskyCommitSignals } from "./parseGitHub";
import { detectCommunicationGaps, countBlockingSignals } from "./parseWhatsApp";
import { computeFinancialHealth } from "./parseBudget";

export interface DeadlineAssessment {
  probability: number;          // 0-100: chance of missing deadline
  confidence: "Low" | "Medium" | "High";
  signals: SignalBreakdown;
  time_remaining_percent: number;
  budget_burn_percent: number;
  financial_risk: "Low" | "Medium" | "High";
  wasted_hours: number;
}

export function computeDeadlineScore(
  data: ProjectData
): DeadlineAssessment {

  // ── Signal 1: Waiting (from tasks + messages) ─────────
  const rawWaiting = computeWaitingScore(data);
  const waitingSignal = rawWaiting; // 0-100

  // ── Signal 2: Scope Drift ──────────────────────────────
  const { score: scopeScore } = computeScopeDriftScore(data);
  const scopeSignal = scopeScore; // 0-100

  // ── Signal 3: Commit Velocity Drop ────────────────────
  let commitSignal = 0;
  if (data.commits && data.commits.length > 0) {
    const { velocityDropPercent } = getCommitVelocity(data.commits);
    const { hotfixCount, wipCount, daysSinceLastCommit } =
      getRiskyCommitSignals(data.commits);
    commitSignal = Math.min(100,
      velocityDropPercent +
      hotfixCount * 5 +
      wipCount * 8 +
      Math.min(daysSinceLastCommit * 3, 30)
    );
  }

  // ── Signal 4: Communication Gap ───────────────────────
  let communicationSignal = 0;
  if (data.whatsapp_messages && data.whatsapp_messages.length > 0) {
    const maxGap = detectCommunicationGaps(data.whatsapp_messages);
    const blockingCount = countBlockingSignals(data.whatsapp_messages);
    communicationSignal = Math.min(100, maxGap * 8 + blockingCount * 4);
  } else if (data.messages.length > 0) {
    // Fallback: use plain messages array
    const KEYWORDS = ["waiting", "blocked", "pending", "approval", "delay", "stuck"];
    const hits = data.messages.filter((m) =>
      KEYWORDS.some((kw) => m.toLowerCase().includes(kw))
    ).length;
    communicationSignal = Math.min(100, hits * 12);
  }

  // ── Signal 5: Budget Burn ──────────────────────────────
  let budgetSignal = 0;
  let budgetBurnPercent = 0;
  let financialRisk: "Low" | "Medium" | "High" = "Low";
  let wastedHours = 0;

  // Calculate time remaining
  const today = new Date();
  const release = new Date(data.release_date);
  const totalDays = 60; // assume 60-day project window
  const daysLeft = Math.max(0, Math.round((release.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  const timeRemainingPercent = Math.min(100, Math.round((daysLeft / totalDays) * 100));

  if (data.budget_items && data.budget_items.length > 0) {
    const fin = computeFinancialHealth(data.budget_items, timeRemainingPercent);
    budgetBurnPercent = fin.burn_percent;
    financialRisk = fin.financial_risk;
    wastedHours = fin.wasted_hours;
    // Budget signal: overburn relative to time consumed
    const timeUsed = 100 - timeRemainingPercent;
    budgetSignal = Math.min(100, Math.max(0, fin.burn_percent - timeUsed) * 2);
  }

  // ── Weighted Combination ───────────────────────────────
  // Weights must sum to 1.0
  const probability = Math.min(100, Math.round(
    waitingSignal      * 0.28 +
    scopeSignal        * 0.22 +
    commitSignal       * 0.22 +
    communicationSignal * 0.18 +
    budgetSignal       * 0.10
  ));

  // ── Confidence based on how many data sources we have ─
  const sourceCount = [
    data.commits && data.commits.length > 0,
    data.whatsapp_messages && data.whatsapp_messages.length > 0,
    data.budget_items && data.budget_items.length > 0,
  ].filter(Boolean).length;

  const confidence: "Low" | "Medium" | "High" =
    sourceCount >= 3 ? "High" : sourceCount === 2 ? "Medium" : "Low";

  return {
    probability,
    confidence,
    signals: {
      waiting: waitingSignal,
      scope_drift: scopeSignal,
      commit_velocity: commitSignal,
      budget_burn: budgetSignal,
      communication_gap: communicationSignal,
    },
    time_remaining_percent: timeRemainingPercent,
    budget_burn_percent: budgetBurnPercent,
    financial_risk: financialRisk,
    wasted_hours: wastedHours,
  };
}