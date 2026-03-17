const counters = {
  slack_sent: 0,
  slack_failed: 0,
  notion_429: 0,
  webhook_latency_ms: 0
};

export function inc(name, delta = 1) {
  counters[name] = (counters[name] || 0) + delta;
}

export function setMetric(name, value) {
  counters[name] = value;
}

export function snapshot() {
  return { ...counters };
}
