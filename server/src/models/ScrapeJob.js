import mongoose from "mongoose";

const ScrapeJobSchema = new mongoose.Schema({
  url: { type: String, required: true },
  status: { type: String, enum: ["queued", "running", "completed", "failed"], default: "queued", index: true },
  attempts: { type: Number, default: 0 },
  startedAt: Date,
  completedAt: Date,
  error: String,
  recordId: { type: mongoose.Schema.Types.ObjectId, ref: "ScrapedRecord" }
}, { timestamps: true });

export default mongoose.model("ScrapeJob", ScrapeJobSchema);