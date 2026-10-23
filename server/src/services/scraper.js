import axios from "axios";
import * as cheerio from "cheerio";
import robotsParser from "robots-parser";
import crypto from "node:crypto";
import { config } from "../config.js";
import { validatePublicHttpUrl } from "../utils/urlSafety.js";

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function checkRobots(url) {
  const parsed = new URL(url);
  const robotsUrl = `${parsed.origin}/robots.txt`;
  try {
    const response = await axios.get(robotsUrl, {
      timeout: Math.min(config.timeoutMs, 5000),
      maxContentLength: 250000,
      responseType: "text",
      validateStatus: s => s >= 200 && s < 500,
      headers: { "User-Agent": "MERN-Scraper-Starter/1.0 (+respectful public-page scraper)" }
    });
    if (response.status === 404 || response.status === 410) return;
    if (response.status >= 400) return;
    const robots = robotsParser(robotsUrl, response.data);
    if (!robots.isAllowed(url, "MERN-Scraper-Starter")) {
      throw new Error("Scraping disallowed by the site's robots.txt.");
    }
  } catch (err) {
    if (err.message?.includes("robots.txt")) throw err;
    // A robots endpoint that is unavailable is not treated as permission to bypass access controls.
    throw new Error("Could not verify robots.txt. Try again later.");
  }
}

export async function scrapeUrl(inputUrl) {
  const safeUrl = await validatePublicHttpUrl(inputUrl);
  await checkRobots(safeUrl);
  await sleep(config.delayMs);

  const response = await axios.get(safeUrl, {
    timeout: config.timeoutMs,
    maxContentLength: config.maxBytes,
    maxBodyLength: config.maxBytes,
    responseType: "text",
    maxRedirects: 0,
    validateStatus: s => s >= 200 && s < 400,
    headers: {
      "User-Agent": "MERN-Scraper-Starter/1.0 (polite public-page scraper)",
      "Accept": "text/html,application/xhtml+xml"
    }
  });
  const contentType = String(response.headers["content-type"] || "");
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    throw new Error(`Unsupported content type: ${contentType || "unknown"}. Only HTML pages are supported.`);
  }

  const html = String(response.data || "");
  if (Buffer.byteLength(html, "utf8") > config.maxBytes) throw new Error("Page exceeded the configured response size limit.");
  const $ = cheerio.load(html);
  $("script, style, noscript, iframe, svg, nav, footer").remove();

  const title = $("title").first().text().trim() || $("h1").first().text().trim() || "";
  const description = $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() || "";
  const canonicalHref = $('link[rel="canonical"]').attr("href");
  let canonicalUrl = "";
  try { canonicalUrl = canonicalHref ? new URL(canonicalHref, safeUrl).toString() : ""; } catch {}

  const headings = $("h1, h2, h3").map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get().filter(Boolean).slice(0, 60);
  const seen = new Set();
  const links = $("a[href]").map((_, el) => {
    const raw = $(el).attr("href");
    try {
      const href = new URL(raw, safeUrl);
      if (!["http:", "https:"].includes(href.protocol)) return null;
      href.hash = "";
      const value = href.toString();
      if (seen.has(value)) return null;
      seen.add(value);
      return { text: $(el).text().replace(/\s+/g, " ").trim().slice(0, 180), href: value };
    } catch { return null; }
  }).get().filter(Boolean).slice(0, 150);

  const textSnippet = $("body").text().replace(/\s+/g, " ").trim().slice(0, 4000);
  const contentHash = crypto.createHash("sha256")
    .update(JSON.stringify({ title, description, headings, textSnippet }))
    .digest("hex");

  return {
    sourceUrl: safeUrl,
    finalUrl: safeUrl,
    title: title.slice(0, 500),
    description: description.slice(0, 2000),
    canonicalUrl,
    headings,
    links,
    textSnippet,
    contentHash,
    scrapedAt: new Date()
  };
}