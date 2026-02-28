// lib/prioritizeTasks.ts
// Scores and ranks tasks by urgency and impact

import { Task, PrioritizedTask } from "./sampleData";

export function prioritizeTasks(tasks: Task[]): PrioritizedTask[] {
  const scored = tasks.map((task) => {
    let score = 0;
    let reason = "";

    // How many other tasks does this one block?
    const blocksCount = task.blocks?.length ?? 0;
    score += blocksCount * 25;
    if (blocksCount > 0) reason += `Blocks ${blocksCount} other task(s). `;

    // Is it currently blocked itself?
    if (task.status === "Blocked") {
      score += 30;
      reason += "Currently blocked — needs immediate unblocking. ";
    }

    // How long has it been idle?
    if (task.last_updated_days_ago > 7) {
      score += 20;
      reason += `Idle for ${task.last_updated_days_ago} days. `;
    } else if (task.last_updated_days_ago > 3) {
      score += 10;
      reason += `Stale for ${task.last_updated_days_ago} days. `;
    }

    // Large estimated work remaining
    if (task.status !== "Done" && (task.estimated_hours ?? 0) > 20) {
      score += 15;
      reason += `Large task (${task.estimated_hours}h estimated). `;
    }

    // Not started tasks with big scope are urgent
    if (task.status === "Not Started" && (task.estimated_hours ?? 0) > 15) {
      score += 20;
      reason += "Not started — high effort task needs to begin now. ";
    }

    // Done tasks get lowest priority
    if (task.status === "Done") {
      score = -100;
      reason = "Already completed.";
    }

    // Determine priority label
    let priority: PrioritizedTask["priority"];
    if (score >= 60) priority = "CRITICAL";
    else if (score >= 35) priority = "HIGH";
    else if (score >= 15) priority = "MEDIUM";
    else priority = "LOW";

    return {
      title: task.title,
      assigned_to: task.assigned_to,
      priority,
      reason: reason.trim() || "Normal priority task.",
      status: task.status,
      blocks_count: blocksCount,
      days_idle: task.last_updated_days_ago,
      _score: score,
    };
  });

  // Sort by score descending, done tasks go to bottom
  return scored
    .sort((a, b) => b._score - a._score)
    .map(({ _score, ...task }) => task);
}