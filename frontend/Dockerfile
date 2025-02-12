# Use Node.js Alpine version
FROM node:lts-alpine AS build

# Disable Corepack if it's causing issues
ENV COREPACK_ENABLE=0

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Set npm registry to avoid network issues
RUN npm config set registry https://registry.npmjs.org

# Manually install PNPM instead of using Corepack
RUN npm install -g pnpm@8.15.5

# Install dependencies with force flag to recreate lockfile
RUN pnpm install --no-frozen-lockfile

# Copy rest of the project files
COPY . .

# Build the project
RUN pnpm run build

# Use Nginx as the final container
FROM nginx:alpine AS production

# Copy the built files
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]