import express from "express";
import Task from "../models/Task.js";

const router = express.Router();

/**
 * Minimal user scoping:
 * Expect a query/header like ?userId=demo-user (frontend sends this).
 * Replace with real auth (JWT/session) later.
 */
function getUserId(req) {
  return req.query.userId || req.header("x-user-id");
}

// Create
router.post("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ error: "userId required" });

    const { title, dueDate, priority } = req.body;
    const task = await Task.create({
      userId,
      title,
      dueDate: dueDate || null,
      priority: priority || "medium"
    });
    res.status(201).json(task);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Read (with optional sorting)
router.get("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ error: "userId required" });

    const { sortBy = "createdAt", order = "desc" } = req.query;
    const sort = { [sortBy]: order === "asc" ? 1 : -1 };
    const tasks = await Task.find({ userId }).sort(sort);
    res.json(tasks);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update (title/dueDate/priority/completed)
router.patch("/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ error: "userId required" });

    const { id } = req.params;
    const updates = {};
    ["title", "dueDate", "priority", "completed"].forEach(k => {
      if (k in req.body) updates[k] = req.body[k];
    });

    const updated = await Task.findOneAndUpdate(
      { _id: id, userId },
      { $set: updates },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Task not found" });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete
router.delete("/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ error: "userId required" });

    const { id } = req.params;
    const deleted = await Task.findOneAndDelete({ _id: id, userId });
    if (!deleted) return res.status(404).json({ error: "Task not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
