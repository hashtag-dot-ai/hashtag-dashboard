# Build stage
FROM node:20-alpine as build

WORKDIR /app

# Build-time env vars (VITE_ vars are baked into the bundle at build time)
ARG VITE_API_URL=https://kg-api.hashtag.ai
ARG VITE_AUTH0_DOMAIN=login.bahi.ai
ARG VITE_AUTH0_CLIENT_ID=AjCQZSU8Q5n8Dc7PsMMe1z9hKVPxlwte
ARG VITE_AUTH0_AUDIENCE=https://api.bahi.ai/api/external

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_AUTH0_DOMAIN=$VITE_AUTH0_DOMAIN
ENV VITE_AUTH0_CLIENT_ID=$VITE_AUTH0_CLIENT_ID
ENV VITE_AUTH0_AUDIENCE=$VITE_AUTH0_AUDIENCE

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Startup hook: lets VITE_API_URL be overridden at runtime via an environment variable
COPY --chmod=755 docker-entrypoint.d/40-app-config.sh /docker-entrypoint.d/

# Expose port 8080
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
