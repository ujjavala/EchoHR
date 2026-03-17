export function createLimiter({ concurrency = 1, intervalMs = 400, backoffBaseMs = 800 } = {}) {
  const queue = [];
  let active = 0;
  let last = 0;
  let errorCount = 0;

  async function run(fn) {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      pump();
    });
  }

  function pump() {
    if (active >= concurrency) return;
    const job = queue.shift();
    if (!job) return;
    const wait = Math.max(0, intervalMs - (Date.now() - last));
    active += 1;
    setTimeout(async () => {
      last = Date.now();
      try {
        const res = await job.fn();
        errorCount = 0;
        job.resolve(res);
      } catch (err) {
        errorCount += 1;
        job.reject(err);
      } finally {
        active -= 1;
        const backoff = Math.min(backoffBaseMs * errorCount, 5000);
        setTimeout(pump, backoff);
      }
    }, wait);
  }

  return run;
}
