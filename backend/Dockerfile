FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run migrate || true

EXPOSE 5000

CMD ["npm", "start"]
