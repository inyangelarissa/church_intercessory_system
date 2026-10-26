FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server/index.js"]
