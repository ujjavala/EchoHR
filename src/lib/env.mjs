import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadDotEnv() {
  const envPath = resolve(".env");
  if (!existsSync(envPath)) {
    return;
  }

  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function loadNotionTokenFromOAuthSession() {
  if (process.env.NOTION_TOKEN) {
    return process.env.NOTION_TOKEN;
  }

  const sessionPath = resolve(".notion-oauth-session.json");
  if (!existsSync(sessionPath)) {
    return "";
  }

  const raw = readFileSync(sessionPath, "utf8");
  const session = JSON.parse(raw);
  const token = session.access_token || "";
  if (token) {
    process.env.NOTION_TOKEN = token;
  }

  return token;
}

export function loadJsonIfExists(path) {
  const resolved = resolve(path);
  if (!existsSync(resolved)) {
    return null;
  }

  return JSON.parse(readFileSync(resolved, "utf8"));
}
