import mongoose from "mongoose";

const ScrapedRecordSchema = new mongoose.Schema({
  sourceUrl: { type: String, required: true, index: true },
  finalUrl: String,
  title: String,
  description: String,
  canonicalUrl: String,
  headings: [String],
  links: [{ text: String, href: String }],
  textSnippet: String,
  contentHash: { type: String, index: true },
  scrapedAt: { type: Date, default: Date.now }
}, { timestamps: true });

ScrapedRecordSchema.index({ sourceUrl: 1, contentHash: 1 }, { unique: true, sparse: true });
export default mongoose.model("ScrapedRecord", ScrapedRecordSchema);