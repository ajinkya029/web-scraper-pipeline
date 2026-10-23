import { Router } from "express";
import mongoose from "mongoose";
import ScrapeJob from "../models/ScrapeJob.js";
import ScrapedRecord from "../models/ScrapedRecord.js";
import { enqueueJob } from "../services/jobQueue.js";
import { validatePublicHttpUrl } from "../utils/urlSafety.js";

const router = Router();

router.post("/", async (req, res, next) => {
  try {
    const url = await validatePublicHttpUrl(String(req.body?.url || "").trim());
    const job = await ScrapeJob.create({ url });
    enqueueJob(job._id);
    res.status(202).json({ message: "Scrape job queued", job });
  } catch (err) {
    if (err.message) return res.status(400).json({ error: err.message });
    next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const jobs = await ScrapeJob.find().sort({ createdAt: -1 }).limit(limit).populate("recordId");
    res.json({ jobs });
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid job ID." });
    const job = await ScrapeJob.findById(req.params.id).populate("recordId");
    if (!job) return res.status(404).json({ error: "Job not found." });
    res.json({ job });
  } catch (err) { next(err); }
});

router.post("/:id/retry", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid job ID." });
    const job = await ScrapeJob.findById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found." });
    if (!["failed", "completed"].includes(job.status)) {
      return res.status(409).json({ error: "Only failed or completed jobs can be retried." });
    }
    job.status = "queued";
    job.error = undefined;
    job.startedAt = undefined;
    job.completedAt = undefined;
    job.recordId = undefined;
    await job.save();
    enqueueJob(job._id);
    res.status(202).json({ message: "Job queued again", job });
  } catch (err) { next(err); }
});

router.get("/records/list", async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const records = await ScrapedRecord.find().sort({ scrapedAt: -1 }).limit(limit);
    res.json({ records });
  } catch (err) { next(err); }
});

export default router;