# Simple dev/demo container for EchoHR (Debian base to avoid npm tarball issues on Alpine)
FROM node:22

WORKDIR /app
COPY package.json ./
# Install only the needed dependency with relaxed checks to avoid integrity errors
RUN npm set progress=false \
 && npm config set registry https://registry.npmjs.org \
 && npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 1000 \
 && npm config set fetch-retry-maxtimeout 2000 \
 && npm cache clean --force \
 && npm install --ignore-scripts --legacy-peer-deps --force pg@8.11.3

COPY . .

# Default env placeholders (override at runtime)
ENV NOTION_VERSION=2025-09-03 \
    PORT=8787 \
    STATUS_WATCH_WINDOW_MIN=15

# Expose automation server port
EXPOSE 8787

# Entrypoint: migrate -> seed demo -> start worker (background) + automation server
CMD ["sh", "-c", "npm run migrate >/dev/null 2>&1 || true; npm run demo -- --seed-demo --force-new && (npm run worker >/dev/null 2>&1 &) && npm run automation-server"]
