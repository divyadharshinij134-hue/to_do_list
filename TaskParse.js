import mongoose from "mongoose";

const TaskParseSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    sourceText: { type: String, required: true },
    timezone: { type: String, required: true },
    llmResponse: { type: String, default: null },
    normalizedTasks: { type: Array, required: true },
    confidence: { type: Number, default: null },
    modelVersion: { type: String, default: null },
    issues: { type: String, default: null },
    latencyMs: { type: Number, default: null },
    classifierError: { type: String, default: null },
    promptSnapshot: { type: String, default: null },
    usedFallback: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model("TaskParse", TaskParseSchema);

