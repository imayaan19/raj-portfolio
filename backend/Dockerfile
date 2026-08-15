FROM node:20-slim AS base
WORKDIR /app
# Prisma needs OpenSSL
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# ── deps + build ──
COPY package*.json ./
COPY prisma ./prisma
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

ENV NODE_ENV=production
EXPOSE 4000
# Run migrations then boot
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
