import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadDotEnv, requireEnv } from "./lib/env.mjs";

loadDotEnv();

const NOTION_VERSION = process.env.NOTION_VERSION || "2025-09-03";

function usage() {
  console.log("Usage:");
  console.log("  npm run notion-oauth:url");
  console.log("  npm run notion-oauth:exchange -- --code=<oauth_code>");
}

function getArg(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : "";
}

function buildAuthorizeUrl() {
  const clientId = requireEnv("NOTION_OAUTH_CLIENT_ID");
  const redirectUri = requireEnv("NOTION_OAUTH_REDIRECT_URI");
  const owner = process.env.NOTION_OAUTH_AUTHORIZE_OWNER || "user";
  const state = process.env.NOTION_OAUTH_STATE || "";

  const url = new URL("https://api.notion.com/v1/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("owner", owner);
  url.searchParams.set("redirect_uri", redirectUri);
  if (state) {
    url.searchParams.set("state", state);
  }

  return url.toString();
}

function basicAuthHeader(clientId, clientSecret) {
  const value = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");
  return `Basic ${value}`;
}

async function exchangeCode(code) {
  const clientId = requireEnv("NOTION_OAUTH_CLIENT_ID");
  const clientSecret = requireEnv("NOTION_OAUTH_CLIENT_SECRET");
  const redirectUri = requireEnv("NOTION_OAUTH_REDIRECT_URI");

  const response = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Notion OAuth exchange failed: ${response.status} ${text}`);
  }

  return response.json();
}

async function persistSession(payload) {
  const path = resolve(".notion-oauth-session.json");
  await writeFile(path, JSON.stringify(payload, null, 2));
  return path;
}

async function main() {
  const command = process.argv[2];

  if (!command) {
    usage();
    process.exitCode = 1;
    return;
  }

  if (command === "url") {
    console.log(buildAuthorizeUrl());
    return;
  }

  if (command === "exchange") {
    const code = getArg("code");
    if (!code) {
      throw new Error("Missing --code=<oauth_code>");
    }

    const result = await exchangeCode(code);
    const output = {
      received_at: new Date().toISOString(),
      bot_id: result.bot_id,
      workspace_id: result.workspace_id,
      workspace_name: result.workspace_name,
      owner: result.owner,
      duplicated_template_id: result.duplicated_template_id,
      access_token: result.access_token,
      refresh_token: result.refresh_token
    };

    const sessionPath = await persistSession(output);
    console.log(JSON.stringify({
      sessionPath,
      bot_id: output.bot_id,
      workspace_id: output.workspace_id,
      workspace_name: output.workspace_name
    }, null, 2));
    return;
  }

  usage();
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
