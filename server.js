import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import tasksRouter from "./routes/tasks.js";
import { fileURLToPath } from "url";
import { MongoMemoryServer } from "mongodb-memory-server";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend
app.use(express.static(path.join(__dirname, "public")));

// API
app.use("/api/tasks", tasksRouter);

// Health
app.get("/health", (_req, res) => res.json({ ok: true }));

const { MONGODB_URI, PORT, USE_IN_MEMORY_DB, MEMORY_MONGO_VERSION } = process.env;
let mongoServer;

async function startInMemoryMongo() {
  const memoryOptions = {
    instance: { dbName: "sparkling-times" },
    spawnOpts: { spawnTimeoutMS: 60000 },
  };

  if (MEMORY_MONGO_VERSION) {
    memoryOptions.binary = { version: MEMORY_MONGO_VERSION };
  }

  mongoServer = await MongoMemoryServer.create(memoryOptions);
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  console.log(`MongoDB (in-memory) connected at ${uri}`);
}

async function connectToDatabase() {
  const preferMemory = USE_IN_MEMORY_DB === "true" || !MONGODB_URI;

  if (!preferMemory && MONGODB_URI) {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log(`MongoDB connected at ${MONGODB_URI}`);
      return;
    } catch (err) {
      console.warn(`MongoDB connection failed (${err.message}). Falling back to in-memory instance.`);
    }
  }

  await startInMemoryMongo();
}

async function shutdown() {
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

(async () => {
  try {
    await connectToDatabase();
    app.listen(PORT || 3000, () => {
      console.log(`Server listening on http://localhost:${PORT || 3000}`);
    });
  } catch (e) {
    console.error("Failed to start:", e);
    process.exit(1);
  }
})();
