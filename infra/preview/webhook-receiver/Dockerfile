FROM node:18-alpine

# Install Docker CLI so the container can run `docker restart` commands
RUN apk add --no-cache docker-cli

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src

EXPOSE 3000

CMD ["npm", "start"]
