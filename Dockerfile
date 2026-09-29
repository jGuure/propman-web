# Build once, run on any domain: API_URL, BASE_DOMAIN, ROOT_URL, TENANT_URL_TEMPLATE and ADMIN_URL are read at
# runtime (see src/lib/config.ts), so nothing about the domain is baked into the image.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/package.json ./
COPY --from=build --chown=app:app /app/node_modules node_modules
COPY --from=build --chown=app:app /app/.next .next
COPY --from=build --chown=app:app /app/public public
COPY --from=build --chown=app:app /app/next.config.ts ./
USER app
EXPOSE 3000
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
