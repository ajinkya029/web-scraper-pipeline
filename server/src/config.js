import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/scraper_pipeline",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  timeoutMs: Number(process.env.SCRAPE_TIMEOUT_MS || 15000),
  maxBytes: Number(process.env.SCRAPE_MAX_BYTES || 3000000),
  delayMs: Number(process.env.SCRAPE_DELAY_MS || 1200)
};