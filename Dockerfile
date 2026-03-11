# Simple dev/demo container for EchoHR
FROM node:22-alpine

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

# Default env placeholders (override at runtime)
ENV NOTION_VERSION=2025-09-03 \
    PORT=8787 \
    STATUS_WATCH_WINDOW_MIN=15

# Expose automation server port
EXPOSE 8787

# Entrypoint script selects mode via CMD
CMD ["sh", "-c", "npm run demo -- --seed-demo --force-new && npm run automation-server"]
