FROM node:22-alpine

WORKDIR /app

# Copy only the manifests first: this layer (and npm ci) is reused from the
# build cache until package*.json changes, so code edits rebuild in seconds.
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 5000

# Do not run as root inside the container.
USER node
CMD ["node", "server.js"]
