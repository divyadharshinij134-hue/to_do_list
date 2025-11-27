export function safeJsonParse(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function extractJsonSubstring(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  let depth = 0;
  let start = -1;
  for (let i = 0; i < trimmed.length; i += 1) {
    const char = trimmed[i];
    if (char === "{" && start === -1) {
      start = i;
    }
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (start !== -1 && depth === 0) {
      return trimmed.slice(start, i + 1);
    }
  }
  return null;
}
