import { DateTime } from "luxon";
import { schemaText } from "./taskSchema.js";

const SYSTEM_INSTRUCTIONS = [
  "You are a precise task parser.",
  "Return ONLY valid JSON that matches the provided schema.",
  "Always respond with a `tasks` array, one object per task extracted from the user's input.",
  "Treat each sentence that ends with a period (.) as a separate potential task; do not merge sentences together.",
  "If the user provides multiple tasks, include multiple objects in the array.",
  "Fill unknown values with null and keep confidence between 0 and 1.",
  "Convert relative dates into absolute ISO8601 timestamps using the provided timezone and reference timestamp.",
  "Use the exact user wording for source_text for each task.",
  "Populate tags with relevant lowercase keywords (max 5)."
].join(" ");

function annotateUserInput(text) {
  if (!text) return "";
  const sentences = text
    .split(".")
    .map(sentence => sentence.trim())
    .filter(Boolean);

  if (sentences.length <= 1) return text.trim();

  return sentences
    .map((sentence, index) => `Task ${index + 1}: ${sentence}${sentence.endsWith(".") ? "" : "."}`)
    .join("\n");
}

function buildExamplePayload(nowIso, timezone) {
  const base = DateTime.fromISO(nowIso).setZone(timezone, { keepLocalTime: false });

  const saturdayNoon = base.plus({ days: 2 }).set({ hour: 12, minute: 0, second: 0, millisecond: 0 });
  const tuesdayMorning = base.plus({ days: 4 }).set({ hour: 9, minute: 0, second: 0, millisecond: 0 });
  const mondayStandup = base.plus({ days: 3 }).set({ hour: 10, minute: 0, second: 0, millisecond: 0 });
  const fridayFollowUp = base.plus({ days: 5 }).set({ hour: 16, minute: 0, second: 0, millisecond: 0 });

  return [
    {
      user: "1) Buy groceries for the week on Saturday morning. 2) Schedule dentist appointment for Tuesday at 9am.",
      json: {
        tasks: [
          {
            title: "Buy weekly groceries",
            description: "Milk, eggs, veggies",
            priority: "medium",
            category: "shopping",
            deadline: saturdayNoon.toISO(),
            estimated_minutes: 30,
            start_time_suggestion: saturdayNoon.minus({ minutes: 40 }).toISO(),
            recurrence: "weekly",
            recurrence_rule: "FREQ=WEEKLY;BYDAY=SA",
            reminder_minutes_before: 60,
            is_subtask_of: null,
            source_text: "Buy groceries for the week on Saturday morning",
            confidence: 0.92,
            parsed_at: nowIso,
            model_version: "gpt-classifier-example",
            tags: ["shopping", "errands"]
          },
          {
            title: "Dentist appointment",
            description: "Routine cleaning",
            priority: "high",
            category: "personal",
            deadline: tuesdayMorning.toISO(),
            estimated_minutes: 60,
            start_time_suggestion: tuesdayMorning.minus({ minutes: 15 }).toISO(),
            recurrence: "none",
            recurrence_rule: null,
            reminder_minutes_before: 90,
            is_subtask_of: null,
            source_text: "Schedule dentist appointment for Tuesday at 9am",
            confidence: 0.9,
            parsed_at: nowIso,
            model_version: "gpt-classifier-example",
            tags: ["personal", "health"]
          }
        ]
      }
    },
    {
      user: "Finish Monday standup notes (30 min) and follow up with Alex about the Q4 budget by Friday 4pm.",
      json: {
        tasks: [
          {
            title: "Prepare Monday standup notes",
            description: null,
            priority: "medium",
            category: "work",
            deadline: mondayStandup.toISO(),
            estimated_minutes: 30,
            start_time_suggestion: mondayStandup.minus({ minutes: 40 }).toISO(),
            recurrence: "weekly",
            recurrence_rule: "FREQ=WEEKLY;BYDAY=MO",
            reminder_minutes_before: 30,
            is_subtask_of: null,
            source_text: "Finish Monday standup notes (30 min)",
            confidence: 0.87,
            parsed_at: nowIso,
            model_version: "gpt-classifier-example",
            tags: ["work", "meeting"]
          },
          {
            title: "Follow up with Alex about Q4 budget",
            description: "Confirm final numbers",
            priority: "high",
            category: "work",
            deadline: fridayFollowUp.toISO(),
            estimated_minutes: 20,
            start_time_suggestion: fridayFollowUp.minus({ minutes: 40 }).toISO(),
            recurrence: "none",
            recurrence_rule: null,
            reminder_minutes_before: 45,
            is_subtask_of: null,
            source_text: "follow up with Alex about the Q4 budget by Friday 4pm",
            confidence: 0.9,
            parsed_at: nowIso,
            model_version: "gpt-classifier-example",
            tags: ["work", "finance", "communication"]
          }
        ]
      }
    }
  ];
}

export function buildPrompt({ text, timezone, nowIso }) {
  const annotatedUserText = annotateUserInput(text);
  const examples = buildExamplePayload(nowIso, timezone)
    .map(
      example =>
        `User: "${example.user}"\nJSON: ${JSON.stringify(example.json, null, 2)}`
    )
    .join("\n\n");

  return `${SYSTEM_INSTRUCTIONS}

Schema:
${schemaText}

Reference timestamp: ${nowIso}
User timezone: ${timezone}

Examples:
${examples}

Now parse the new request.
User:
${annotatedUserText || text.trim()}
JSON:`;
}

