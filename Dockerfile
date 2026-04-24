FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lockb bunfig.toml ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM node:22-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server-entry.js ./server-entry.js
COPY --from=build /app/package.json ./package.json
EXPOSE 8080
CMD ["node", "server-entry.js"]
