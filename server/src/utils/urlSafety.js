import dns from "node:dns/promises";
import net from "node:net";

function isPrivateIPv4(ip) {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  return p[0] === 10 || p[0] === 127 || p[0] === 0 ||
    (p[0] === 169 && p[1] === 254) ||
    (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
    (p[0] === 192 && p[1] === 168) ||
    (p[0] === 100 && p[1] >= 64 && p[1] <= 127) ||
    p[0] >= 224;
}
function isPrivateIPv6(ip) {
  const x = ip.toLowerCase();
  return x === "::1" || x === "::" || x.startsWith("fc") || x.startsWith("fd") ||
    x.startsWith("fe80:") || x.startsWith("::ffff:127.") || x.startsWith("::ffff:10.");
}

export async function validatePublicHttpUrl(input) {
  let url;
  try { url = new URL(input); } catch { throw new Error("Enter a valid URL."); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP and HTTPS URLs are allowed.");
  if (url.username || url.password) throw new Error("URLs containing credentials are not allowed.");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new Error("Local network hosts are not allowed.");
  }
  if (net.isIP(host)) {
    if ((net.isIPv4(host) && isPrivateIPv4(host)) || (net.isIPv6(host) && isPrivateIPv6(host))) {
      throw new Error("Private or local IP addresses are not allowed.");
    }
  } else {
    let addresses;
    try { addresses = await dns.lookup(host, { all: true, verbatim: true }); }
    catch { throw new Error("The hostname could not be resolved."); }
    if (!addresses.length || addresses.some(a =>
      (net.isIPv4(a.address) && isPrivateIPv4(a.address)) ||
      (net.isIPv6(a.address) && isPrivateIPv6(a.address)))) {
      throw new Error("Host resolves to a private or local address and is blocked.");
    }
  }
  return url.toString();
}