"use client";
// Prioritized task list — numbered by urgency

import { PrioritizedTask } from "@/lib/sampleData";

const PRIORITY_COLORS = {
  CRITICAL: { text: "#EF4444", bg: "#EF444418", border: "#EF444433" },
  HIGH:     { text: "#F97316", bg: "#F9731618", border: "#F9731633" },
  MEDIUM:   { text: "#EAB308", bg: "#EAB30818", border: "#EAB30833" },
  LOW:      { text: "#6B7280", bg: "#6B728018", border: "#6B728033" },
};

const STATUS_ICONS: Record<string, string> = {
  "Blocked": "🔴",
  "In Progress": "🟡",
  "Not Started": "⚪",
  "Done": "🟢",
};

interface Props { tasks: PrioritizedTask[]; }

export default function TaskPriorityList({ tasks }: Props) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-5 rounded-full bg-accent" />
        <h3 className="font-display font-semibold text-sm text-text">
          Prioritized Task Order
        </h3>
        <span className="font-mono text-[10px] text-muted ml-1">
          (what to work on first)
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {tasks.map((task, i) => {
          const colors = PRIORITY_COLORS[task.priority];
          return (
            <div key={i}
              className="flex items-start gap-3 p-3 rounded-lg border animate-slide-up"
              style={{
                background: colors.bg,
                borderColor: colors.border,
                animationDelay: `${i * 60}ms`,
                animationFillMode: "both",
                opacity: 0,
              }}>
              {/* Rank number */}
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-mono text-xs font-bold"
                style={{ background: colors.border, color: colors.text }}>
                {task.status === "Done" ? "✓" : i + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-body text-sm text-text font-medium">
                    {STATUS_ICONS[task.status]} {task.title}
                  </span>
                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded tracking-widest"
                    style={{ color: colors.text, background: colors.border }}>
                    {task.priority}
                  </span>
                  {task.blocks_count > 0 && (
                    <span className="font-mono text-[9px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">
                      blocks {task.blocks_count}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-mono text-[10px] text-muted">{task.assigned_to}</span>
                  {task.days_idle > 0 && (
                    <span className="font-mono text-[10px] text-muted">
                      idle {task.days_idle}d
                    </span>
                  )}
                  <span className="font-mono text-[10px] text-muted/60 italic">
                    {task.reason}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}