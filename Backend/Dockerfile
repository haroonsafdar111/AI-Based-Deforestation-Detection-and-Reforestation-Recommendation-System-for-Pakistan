FROM node:20-alpine

WORKDIR /app

# Install python3, pip, requests, and python-dotenv for forestTrendService.js (lightweight)
RUN apk add --no-cache make gcc g++ python3 py3-pip \
 && pip3 install --break-system-packages requests python-dotenv

# Copy package files
COPY package*.json ./

# Install dependencies (only production packages)
RUN npm ci --only=production

# Copy remaining code
COPY . .

# Environment defaults
ENV PORT=5000
ENV NODE_ENV=production

EXPOSE 5000

CMD ["node", "server.js"]
