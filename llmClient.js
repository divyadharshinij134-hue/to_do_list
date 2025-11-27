import Groq from "groq-sdk";
import { taskBatchJsonSchema } from "./taskSchema.js";

const apiKey = process.env.GROQ_API_KEY;
const defaultModel = process.env.CLASSIFIER_MODEL || "llama-3.1-8b-instant";
const defaultTemperature = Number(process.env.CLASSIFIER_TEMPERATURE || 0);

let client;

function getClient() {
  if (!client) {
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not configured");
    }
    client = new Groq({ apiKey });
  }
  return client;
}

export async function callClassifierLLM({ prompt }) {
  const sdk = getClient();
  const response = await sdk.chat.completions.create({
    model: defaultModel,
    temperature: defaultTemperature,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "task_classifier_batch",
        schema: taskBatchJsonSchema,
        strict: true
      }
    },
    messages: [
      {
        role: "system",
        content:
          "You are a task parser that converts natural language into strict JSON. Follow the provided schema exactly and never add explanations."
      },
      { role: "user", content: prompt }
    ],
    max_tokens: 700
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned an empty response");
  return {
    content,
    model: response.model || defaultModel
  };
}

export const CLASSIFIER_MODEL = defaultModel;

