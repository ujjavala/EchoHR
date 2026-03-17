#!/usr/bin/env node
import { fetchJobs, completeJob } from "../src/lib/job-queue.mjs";
import { sendSlackMessage } from "../src/lib/slack.mjs";
import { loadDotEnv } from "../src/lib/env.mjs";
import { logger } from "../src/lib/logger.mjs";

loadDotEnv();

async function processJob(job) {
  const { id, job_type: type, payload } = job;
  if (type === "slack_notify") {
    await sendSlackMessage(payload);
    return { ok: true, message: "sent" };
  }
  if (type === "noop") {
    return { ok: true, message: "noop" };
  }
  return { ok: true, message: "noop" };
}

async function loop() {
  let running = true;
  process.on("SIGINT", () => {
    running = false;
  });
  while (running) {
    const jobs = await fetchJobs(10);
    if (!jobs.length) {
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }
    for (const job of jobs) {
      try {
        const res = await processJob(job);
        await completeJob(job.id, res.ok, res.message);
        logger.info("job completed", { id: job.id, type: job.job_type });
      } catch (error) {
        await completeJob(job.id, false, error.message);
        logger.error("job failed", { id: job.id, error: error.message });
      }
    }
  }
  logger.info("worker stopped");
}

loop().catch((err) => {
  logger.error("worker crashed", { error: err.message });
  process.exit(1);
});
