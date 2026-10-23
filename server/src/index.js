import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { config } from "./config.js";
import jobsRouter from "./routes/jobs.js";
import recordsRouter from "./routes/records.js";

const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: "32kb" }));

app.get("/api/health", (_req, res) => res.json({
  status: mongoose.connection.readyState === 1 ? "ok" : "starting",
  database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  timestamp: new Date().toISOString()
}));
app.use("/api/jobs", jobsRouter);
app.use("/api/records", recordsRouter);
app.use((req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
});

mongoose.connect(config.mongoUri)
  .then(() => {
    app.listen(config.port, () => console.log(`API listening on http://localhost:${config.port}`));
  })
  .catch(err => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });