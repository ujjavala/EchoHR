import { randomUUID } from "node:crypto";

function redact(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (/token|secret|email/i.test(k)) {
      out[k] = "[redacted]";
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function withRequestId(request) {
  const rid = request?.headers?.["x-request-id"] || randomUUID();
  return rid;
}

export function log(level, message, meta = {}) {
  const entry = { level, message, ts: new Date().toISOString(), ...redact(meta) };
  console.log(JSON.stringify(entry));
}

export const logger = {
  info: (msg, meta) => log("info", msg, meta),
  warn: (msg, meta) => log("warn", msg, meta),
  error: (msg, meta) => log("error", msg, meta)
};
