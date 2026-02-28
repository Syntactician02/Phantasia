// lib/parseWhatsApp.ts
// Parses WhatsApp exported .txt chat files
// Export from WhatsApp: Chat → Three dots → More → Export Chat → Without Media

import { WhatsAppMessage } from "./sampleData";

// WhatsApp export format (varies slightly by region):
// "12/02/2025, 09:14 - Dev A: message text here"
// "[12/02/2025, 09:14] Dev A: message text here"
const LINE_PATTERNS = [
  /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\s*[-–]\s+([^:]+):\s+(.+)$/i,
  /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\]\s+([^:]+):\s+(.+)$/i,
];

export function parseWhatsAppChat(text: string): WhatsAppMessage[] {
  const lines = text.split("\n");
  const messages: WhatsAppMessage[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip system messages like "Messages and calls are end-to-end encrypted"
    if (trimmed.startsWith("Messages and calls") || trimmed.startsWith("You deleted")) continue;

    let matched = false;
    for (const pattern of LINE_PATTERNS) {
      const match = trimmed.match(pattern);
      if (match) {
        messages.push({
          date: normalizeDate(match[1]),
          author: match[2].trim(),
          text: match[3].trim(),
        });
        matched = true;
        break;
      }
    }

    // If the line didn't match a new-message pattern, it is most likely a
    // continuation of the previous message (WhatsApp breaks long messages
    // across multiple lines in the export). Append it to the last entry if
    // one exists.
    if (!matched && messages.length > 0) {
      messages[messages.length - 1].text += "\n" + trimmed;
    }
  }

  return messages;
}

function normalizeDate(raw: string): string {
  // Convert DD/MM/YY or MM/DD/YYYY to YYYY-MM-DD. WhatsApp exports are
  // ambiguous when both day and month are <= 12; we try to guess based on
  // values and fall back to the more common international format.
  const parts = raw.split("/");
  if (parts.length !== 3) return raw;
  let [a, b, c] = parts;

  const year = c.length === 2 ? `20${c}` : c;

  // Parse numbers for heuristics
  const numA = parseInt(a, 10);
  const numB = parseInt(b, 10);

  let day: number;
  let month: number;

  if (numA > 12 && numB <= 12) {
    // a must be day
    day = numA;
    month = numB;
  } else if (numB > 12 && numA <= 12) {
    // b must be day (US-style date)
    day = numB;
    month = numA;
  } else {
    // Both values could be month or day. WhatsApp typically uses DD/MM, so
    // default to that, but maintain the original ordering in case the
    // project needs a different assumption.
    day = numA;
    month = numB;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Extract plain message strings for use in scoring
export function extractMessagesFromWhatsApp(msgs: WhatsAppMessage[]): string[] {
  return msgs.map((m) => m.text);
}

// Detect communication gaps — days where nobody wrote anything
export function detectCommunicationGaps(msgs: WhatsAppMessage[]): number {
  if (msgs.length < 2) return 0;

  const dates = [...new Set(msgs.map((m) => m.date))].sort();
  let maxGap = 0;

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const gap = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    if (gap > maxGap) maxGap = gap;
  }

  return maxGap; // returns max gap in days
}

// Count how many times blocking keywords appear
export function countBlockingSignals(msgs: WhatsAppMessage[]): number {
  const KEYWORDS = ["waiting", "blocked", "pending", "approval",
    "delay", "stuck", "hold", "can we add", "scope", "new feature"];
  let count = 0;
  for (const msg of msgs) {
    const lower = msg.text.toLowerCase();
    for (const kw of KEYWORDS) {
      if (lower.includes(kw)) count++;
    }
  }
  return count;
}