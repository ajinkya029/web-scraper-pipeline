import ScrapeJob from "../models/ScrapeJob.js";
import ScrapedRecord from "../models/ScrapedRecord.js";
import { scrapeUrl } from "./scraper.js";

const pending = [];
let active = false;

export function enqueueJob(jobId) {
  pending.push(String(jobId));
  void processQueue();
}

async function processQueue() {
  if (active) return;
  active = true;
  try {
    while (pending.length) {
      const id = pending.shift();
      const job = await ScrapeJob.findById(id);
      if (!job || job.status !== "queued") continue;
      job.status = "running";
      job.startedAt = new Date();
      job.attempts += 1;
      job.error = undefined;
      await job.save();
      try {
        const data = await scrapeUrl(job.url);
        let record;
        try {
          record = await ScrapedRecord.findOneAndUpdate(
            { sourceUrl: data.sourceUrl, contentHash: data.contentHash },
            { $set: data },
            { new: true, upsert: true, setDefaultsOnInsert: true }
          );
        } catch (err) {
          if (err.code === 11000) {
            record = await ScrapedRecord.findOne({ sourceUrl: data.sourceUrl, contentHash: data.contentHash });
          } else throw err;
        }
        job.status = "completed";
        job.completedAt = new Date();
        job.recordId = record?._id;
        await job.save();
      } catch (err) {
        job.status = "failed";
        job.completedAt = new Date();
        job.error = String(err.message || "Scrape failed").slice(0, 1000);
        await job.save();
      }
    }
  } finally {
    active = false;
    if (pending.length) void processQueue();
  }
}