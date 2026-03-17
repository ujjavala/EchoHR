import { readFile } from "node:fs/promises";

async function main() {
  const body = JSON.parse(await readFile("tests/contracts/payloads/notion-page-updated.json", "utf8"));
  if (!body.event?.data?.id) {
    throw new Error("missing page id");
  }
  console.log("contract payload ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
