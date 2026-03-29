FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies (cached layer)
COPY package*.json ./
RUN npm install --omit=dev

# Copy source
COPY . .

# Create logs directory
RUN mkdir -p logs

FROM node:20-alpine AS production

RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001

WORKDIR /app

COPY --from=base --chown=nodeuser:nodejs /app ./

USER nodeuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "server.js"]
