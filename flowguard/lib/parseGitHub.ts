// lib/parseGitHub.ts
// Parses GitHub commit history exported as CSV
//
// How to export from GitHub:
// Option 1 (terminal): git log --pretty=format:"%H,%an,%ad,%s" --date=short > commits.csv
// Option 2 (GitHub UI): Insights > Contributors (download)
// Option 3 (GitHub API): https://api.github.com/repos/OWNER/REPO/commits

import Papa from "papaparse";
import { GitCommit } from "./sampleData";

interface RawCommitRow {
  sha?: string;
  hash?: string;
  author?: string;
  author_name?: string;
  date?: string;
  authored_date?: string;
  message?: string;
  commit_message?: string;
}

export function parseGitHubCSV(csvText: string): GitCommit[] {
  const result = Papa.parse<RawCommitRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.toLowerCase().trim().replace(/\s+/g, "_"),
  });

  return result.data
    .map((row) => ({
      sha: row.sha ?? row.hash ?? "unknown",
      author: row.author ?? row.author_name ?? "Unknown",
      date: row.date ?? row.authored_date ?? "",
      message: row.message ?? row.commit_message ?? "",
    }))
    .filter((c) => c.date); // remove rows without a date
}

// Calculate commit velocity: commits per week over time
export function getCommitVelocity(commits: GitCommit[]): {
  weeklyCommits: { week: string; count: number }[];
  velocityDropPercent: number;
} {
  if (!commits.length) return { weeklyCommits: [], velocityDropPercent: 0 };

  // Sort by date
  const sorted = [...commits].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Group into weeks
  const weekMap = new Map<string, number>();
  for (const commit of sorted) {
    const d = new Date(commit.date);
    const weekStart = getWeekStart(d);
    weekMap.set(weekStart, (weekMap.get(weekStart) ?? 0) + 1);
  }

  const weeklyCommits = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count], i) => ({ week: `W${i + 1}`, count }));

  // Compare first half vs second half velocity
  const mid = Math.floor(weeklyCommits.length / 2);
  if (mid === 0) return { weeklyCommits, velocityDropPercent: 0 };

  const firstHalfAvg =
    weeklyCommits.slice(0, mid).reduce((s, w) => s + w.count, 0) / mid;
  const secondHalfAvg =
    weeklyCommits.slice(mid).reduce((s, w) => s + w.count, 0) /
    (weeklyCommits.length - mid);

  const velocityDropPercent =
    firstHalfAvg > 0
      ? Math.max(0, Math.round(((firstHalfAvg - secondHalfAvg) / firstHalfAvg) * 100))
      : 0;

  return { weeklyCommits, velocityDropPercent };
}

// Detect risky commit patterns
export function getRiskyCommitSignals(commits: GitCommit[]): {
  hotfixCount: number;
  wipCount: number;
  daysSinceLastCommit: number;
  mostActiveAuthor: string;
  silentAuthors: string[];
} {
  const RISKY_KEYWORDS = ["hotfix", "fix", "bug", "wip", "revert", "broken", "urgent"];
  const WIP_KEYWORDS = ["wip", "work in progress", "incomplete"];

  let hotfixCount = 0;
  let wipCount = 0;

  const authorLastCommit = new Map<string, Date>();

  for (const commit of commits) {
    const lower = commit.message.toLowerCase();
    if (RISKY_KEYWORDS.some((kw) => lower.includes(kw))) hotfixCount++;
    if (WIP_KEYWORDS.some((kw) => lower.includes(kw))) wipCount++;

    const d = new Date(commit.date);
    const existing = authorLastCommit.get(commit.author);
    if (!existing || d > existing) authorLastCommit.set(commit.author, d);
  }

  const now = new Date();
  let daysSinceLastCommit = 0;
  let mostActiveAuthor = "";
  let maxCommits = 0;

  const authorCommitCount = new Map<string, number>();
  for (const commit of commits) {
    authorCommitCount.set(commit.author, (authorCommitCount.get(commit.author) ?? 0) + 1);
  }

  for (const [author, count] of authorCommitCount.entries()) {
    if (count > maxCommits) { maxCommits = count; mostActiveAuthor = author; }
  }

  let latestDate = new Date(0);
  for (const d of authorLastCommit.values()) {
    if (d > latestDate) latestDate = d;
  }
  daysSinceLastCommit = Math.round((now.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));

  // Authors who haven't committed in the last 7 days
  const silentAuthors = Array.from(authorLastCommit.entries())
    .filter(([, d]) => {
      const days = Math.round((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      return days > 7;
    })
    .map(([author]) => author);

  return { hotfixCount, wipCount, daysSinceLastCommit, mostActiveAuthor, silentAuthors };
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}