import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    dueDate: { type: Date, default: null },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    tags: { type: [String], default: [] },
    completed: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model("Task", TaskSchema);
