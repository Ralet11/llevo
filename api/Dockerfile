FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY prisma ./prisma/
COPY tsconfig.json ./
COPY src ./src/

RUN npx prisma generate && npm run build

ENV NODE_ENV=production

EXPOSE 3001

CMD ["sh", "-c", "npm run db:migrate:prod && npm run start"]
