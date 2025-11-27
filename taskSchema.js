const taskProperties = {
  title: { type: "string", minLength: 1 },
  description: { type: ["string", "null"] },
  priority: { type: "string", enum: ["low", "medium", "high"] },
  category: { type: "string", enum: ["work", "personal", "study", "shopping", "other"] },
  deadline: { type: ["string", "null"], format: "date-time" },
  estimated_minutes: { type: ["integer", "null"], minimum: 1 },
  start_time_suggestion: { type: ["string", "null"], format: "date-time" },
  recurrence: { type: "string", enum: ["none", "daily", "weekly", "monthly", "custom"] },
  recurrence_rule: { type: ["string", "null"] },
  reminder_minutes_before: { type: ["integer", "null"], minimum: 5 },
  is_subtask_of: { type: ["string", "null"] },
  source_text: { type: "string", minLength: 1 },
  confidence: { type: "number", minimum: 0, maximum: 1 },
  parsed_at: { type: "string", format: "date-time" },
  model_version: { type: "string", minLength: 1 },
  tags: {
    type: "array",
    items: { type: "string", minLength: 1 },
    default: [],
    maxItems: 8
  }
};

const requiredFields = [
  "title",
  "description",
  "priority",
  "category",
  "deadline",
  "estimated_minutes",
  "start_time_suggestion",
  "recurrence",
  "recurrence_rule",
  "reminder_minutes_before",
  "is_subtask_of",
  "source_text",
  "confidence",
  "parsed_at",
  "model_version",
  "tags"
];

export const taskJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: taskProperties,
  required: requiredFields
};

export const taskBatchJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    tasks: {
      type: "array",
      minItems: 1,
      maxItems: 10,
      items: taskJsonSchema
    },
    notes: { type: ["string", "null"] }
  },
  required: ["tasks"]
};

export const schemaText = `{
  "tasks": [
    {
      "title": "string",
      "description": "string|null",
      "priority": "low|medium|high",
      "category": "work|personal|study|shopping|other",
      "deadline": "ISO8601|null",
      "estimated_minutes": integer|null,
      "start_time_suggestion": "ISO8601|null",
      "recurrence": "none|daily|weekly|monthly|custom",
      "recurrence_rule": "string|null",
      "reminder_minutes_before": integer|null,
      "is_subtask_of": "task_id|null",
      "source_text": "string",
      "confidence": 0.0-1.0,
      "parsed_at": "ISO8601",
      "model_version": "string",
      "tags": ["string"]
    }
  ]
}`;

