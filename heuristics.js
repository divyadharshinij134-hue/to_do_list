import * as chrono from "chrono-node";
import { DateTime } from "luxon";

const PRIORITY_KEYWORDS = {
  high: ["urgent", "asap", "immediately", "priority", "important", "today"],
  low: ["whenever", "later", "someday", "optionally", "maybe", "low"]
};

const CATEGORY_KEYWORDS = {
  work: ["meeting", "slides", "report", "client", "email", "project"],
  personal: ["doctor", "rent", "call", "family", "birthday", "gym"],
  study: ["study", "assignment", "exam", "lecture", "course", "read"],
  shopping: ["buy", "purchase", "order", "grocery", "groceries", "shop"]
};
const EXTRA_TAGS = [
  { tag: "communication", keywords: ["follow up", "email", "call"] },
  { tag: "finance", keywords: ["budget", "invoice", "expense", "tax"] },
  { tag: "health", keywords: ["doctor", "medication", "gym", "workout"] }
];

const ESTIMATE_KEYWORDS = [
  { words: ["quick", "tiny", "short"], minutes: 10 },
  { words: ["small", "email", "note"], minutes: 15 },
  { words: ["medium", "review"], minutes: 30 },
  { words: ["long", "deep", "detailed"], minutes: 60 },
  { words: ["big", "comprehensive"], minutes: 90 }
];

const DURATION_REGEX = /(\d+(?:\.\d+)?)\s*(min|mins|minutes|hour|hours|hr|hrs|h)/i;

function toZonedDate(nowIso, timezone) {
  return DateTime.fromISO(nowIso).setZone(timezone, { keepLocalTime: false });
}

export function inferPriority(text = "", fallback = "medium") {
  const lower = text.toLowerCase();
  if (PRIORITY_KEYWORDS.high.some(keyword => lower.includes(keyword))) return "high";
  if (PRIORITY_KEYWORDS.low.some(keyword => lower.includes(keyword))) return "low";
  return fallback;
}

export function inferCategory(text = "", fallback = "other") {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => lower.includes(keyword))) return category;
  }
  return fallback;
}

function inferTags(text = "", fallbackCategory = "other") {
  const tags = new Set();
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => lower.includes(keyword))) {
      tags.add(category);
    }
  }
  for (const bucket of EXTRA_TAGS) {
    if (bucket.keywords.some(keyword => lower.includes(keyword))) {
      tags.add(bucket.tag);
    }
  }
  if (!tags.size && fallbackCategory) tags.add(fallbackCategory);
  return Array.from(tags).slice(0, 5);
}

export function inferEstimate(text = "", fallback = null) {
  const durationMatch = text.match(DURATION_REGEX);
  if (durationMatch) {
    const value = Number(durationMatch[1]);
    const unit = durationMatch[2].toLowerCase();
    if (Number.isFinite(value)) {
      if (unit.startsWith("min")) return Math.max(5, Math.round(value));
      return Math.max(15, Math.round(value * 60));
    }
  }
  const lower = text.toLowerCase();
  for (const bucket of ESTIMATE_KEYWORDS) {
    if (bucket.words.some(word => lower.includes(word))) {
      return bucket.minutes;
    }
  }
  return fallback;
}

export function inferDeadline(text, timezone, nowIso) {
  const referenceDate = toZonedDate(nowIso, timezone).toJSDate();
  const result = chrono.parse(text, referenceDate, { forwardDate: true });
  if (!result.length) return null;
  const parsedDate = result[0].date();
  if (!parsedDate) return null;
  return DateTime.fromJSDate(parsedDate).setZone(timezone, { keepLocalTime: false }).toISO();
}

export function buildStartSuggestion(deadlineIso, estimatedMinutes) {
  if (!deadlineIso || !estimatedMinutes) return null;
  const deadline = DateTime.fromISO(deadlineIso);
  if (!deadline.isValid) return null;
  return deadline.minus({ minutes: Math.ceil(estimatedMinutes * 1.2) }).toISO();
}

export function heuristicParse({ text, timezone, nowIso }) {
  const trimmed = (text || "").trim();
  const baselineTitle = trimmed || "New task";
  const priority = inferPriority(text);
  const category = inferCategory(text);
  const estimated = inferEstimate(text, 30);
  const deadline = inferDeadline(text, timezone, nowIso);
  const startSuggestion = buildStartSuggestion(deadline, estimated);
  const reminder = deadline ? Math.max(15, Math.min(estimated * 2, 180)) : null;

  return {
    title: baselineTitle,
    description: null,
    priority,
    category,
    deadline,
    estimated_minutes: estimated,
    start_time_suggestion: startSuggestion,
    recurrence: "none",
    recurrence_rule: null,
    reminder_minutes_before: reminder,
    is_subtask_of: null,
    source_text: text,
    confidence: 0.55,
    parsed_at: nowIso,
    model_version: "heuristic-v1",
    tags: inferTags(text, category)
  };
}

