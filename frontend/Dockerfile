# ---- Stage 1: build the static site with Node ----
FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
# Vite bakes VITE_* variables into the JavaScript at build time.
ARG VITE_API_URL=http://localhost:5001
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- Stage 2: serve only the built files with nginx ----
# Node, node_modules and the source code stay behind in stage 1.
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
