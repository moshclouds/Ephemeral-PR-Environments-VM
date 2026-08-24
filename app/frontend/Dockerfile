# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build (no VITE_* args — URLs are injected at runtime)
COPY . .
RUN npm run build

# Stage 2: Serve the application using Node.js `serve`
FROM node:20-alpine

WORKDIR /app

# Install `serve` and Infisical CLI
RUN apk add --no-cache bash wget \
    && wget -qO- 'https://artifacts-cli.infisical.com/setup.apk.sh' | sh \
    && apk add --no-cache infisical \
    && npm install -g serve

# Copy the built assets from the builder stage
COPY --from=builder /app/dist ./dist

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

CMD ["/entrypoint.sh"]
