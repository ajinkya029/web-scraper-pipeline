import { Router } from "express";
import ScrapedRecord from "../models/ScrapedRecord.js";

const router = Router();
router.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const records = await ScrapedRecord.find().sort({ scrapedAt: -1 }).limit(limit);
    res.json({ records });
  } catch (err) { next(err); }
});
export default router;