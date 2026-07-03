FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app
RUN addgroup --system --gid 1001 codescope && \
    adduser --system --uid 1001 codescope

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/src/widgets/out ./src/widgets/out
COPY --from=build /app/nitro-studio.json ./nitro-studio.json
COPY --from=build /app/nitro-brand.json ./nitro-brand.json

USER codescope
EXPOSE 3000

ENV NODE_ENV=production
ENV NITRO_LOG_LEVEL=info

CMD ["npx", "nitrostack-cli", "start"]
