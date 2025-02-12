# Build stage
FROM node:lts-alpine AS build

# Set environment for pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Increase memory allocation for TypeScript compilation
ENV NODE_OPTIONS=--max-old-space-size=4096

# Copy the rest of the app and build
COPY . .
RUN pnpm run build

# Production stage
FROM nginx:alpine AS stage
COPY --from=build /app/dist/ /usr/share/nginx/html
COPY --from=build /app/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
ENTRYPOINT ["nginx", "-g", "daemon off;"]
