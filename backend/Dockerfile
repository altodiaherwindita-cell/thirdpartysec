FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

# Create necessary directories
RUN mkdir -p uploads logs

EXPOSE 3000

CMD ["node", "src/server.js"]
