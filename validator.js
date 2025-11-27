import Ajv from "ajv";
import addFormats from "ajv-formats";
import { DateTime } from "luxon";
import { taskJsonSchema } from "./taskSchema.js";
import { heuristicParse, buildStartSuggestion } from "./heuristics.js";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validateTask = ajv.compile(taskJsonSchema);
const ALLOWED_KEYS = new Set(Object.keys(taskJsonSchema.properties));
const ENUM_NORMALIZERS = {
  priority: new Set(["low", "medium", "high"]),
  category: new Set(["work", "personal", "study", "shopping", "other"]),
  recurrence: new Set(["none", "daily", "weekly", "monthly", "custom"])
};

function clamp(value, min, max) {
  if (typeof value !== "number" || Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function normalizeString(value) {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeEnum(value, field) {
  if (typeof value !== "string") return null;
  const lower = value.toLowerCase();
  return ENUM_NORMALIZERS[field].has(lower) ? lower : null;
}

function normalizeInteger(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function normalizeIso(value) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return null;
  const iso = value.trim();
  const dt = DateTime.fromISO(iso);
  return dt.isValid ? dt.toISO() : null;
}

function normalizeTags(value) {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : String(value).split(",");
  const tags = raw
    .map(entry => normalizeString(entry))
    .filter(Boolean)
    .slice(0, 8);
  return Array.from(new Set(tags));
}

function sanitizeCandidate(candidate) {
  if (!candidate || typeof candidate !== "object") return {};
  const sanitized = {};
  for (const [key, value] of Object.entries(candidate)) {
    if (!ALLOWED_KEYS.has(key)) continue;
    switch (key) {
      case "title":
      case "description":
      case "recurrence_rule":
      case "is_subtask_of":
      case "model_version":
      case "source_text":
        sanitized[key] = normalizeString(value);
        break;
      case "priority":
      case "category":
      case "recurrence":
        sanitized[key] = normalizeEnum(value, key);
        break;
      case "deadline":
      case "start_time_suggestion":
      case "parsed_at":
        sanitized[key] = normalizeIso(value);
        break;
      case "estimated_minutes":
      case "reminder_minutes_before":
        sanitized[key] = normalizeInteger(value);
        break;
      case "confidence":
        sanitized[key] = typeof value === "number" ? value : Number(value);
        break;
      case "tags":
        sanitized[key] = normalizeTags(value);
        break;
      default:
        sanitized[key] = value ?? null;
    }
  }
  return sanitized;
}

function formatAjvErrors(errors = []) {
  return errors.map(err => {
    const location = err.instancePath || "/";
    return `${location} ${err.message}`;
  });
}

function finalizeTaskPayload(base, overrides, { text, nowIso, modelVersion }) {
  const payload = {
    ...base,
    ...overrides
  };

  payload.title = normalizeString(payload.title) || base.title;
  payload.description = payload.description ?? null;
  payload.source_text = normalizeString(payload.source_text) || text;
  payload.parsed_at = payload.parsed_at || nowIso;
  payload.model_version = normalizeString(payload.model_version) || modelVersion || base.model_version;
  payload.confidence = clamp(payload.confidence ?? base.confidence, 0, 1);
  payload.priority = payload.priority || base.priority;
  payload.category = payload.category || base.category;
  payload.tags = normalizeTags(payload.tags?.length ? payload.tags : base.tags);

  if (!payload.start_time_suggestion) {
    payload.start_time_suggestion = buildStartSuggestion(payload.deadline, payload.estimated_minutes);
  }
  if (!payload.reminder_minutes_before && payload.deadline) {
    payload.reminder_minutes_before = Math.min(
      180,
      Math.max(15, Math.round((payload.estimated_minutes || 30) * 2))
    );
  }

  return payload;
}

export function validateAndNormalize(candidate, { text, timezone, nowIso, modelVersion }) {
  const fallback = heuristicParse({ text, timezone, nowIso });
  const normalizedTasks = [];
  let usedFallback = false;
  let issues = [];

  const taskCandidates = Array.isArray(candidate?.tasks) ? candidate.tasks.slice(0, 10) : [];

  if (!taskCandidates.length) {
    usedFallback = true;
    issues.push("tasks missing from LLM response");
    normalizedTasks.push({ ...fallback });
  } else {
    taskCandidates.forEach((taskCandidate, index) => {
      const sanitized = sanitizeCandidate(taskCandidate);
      const merged = finalizeTaskPayload(fallback, sanitized, { text, nowIso, modelVersion });

      if (!validateTask(merged)) {
        const errorMessages = formatAjvErrors(validateTask.errors).map(
          message => `task[${index}] ${message}`
        );
        issues = issues.concat(errorMessages);
        normalizedTasks.push({
          ...fallback,
          title: `${fallback.title} (${index + 1})`,
          model_version: modelVersion || fallback.model_version
        });
        usedFallback = true;
      } else {
        normalizedTasks.push(merged);
      }
    });
  }

  return {
    tasks: normalizedTasks,
    issues,
    usedFallback
  };
}

