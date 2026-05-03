FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Start a new stage for a smaller final image
FROM node:20-alpine

WORKDIR /app

# Install simple http server for static serving
RUN npm install -g serve

# Copy built assets
COPY --from=build /app/dist ./dist

# Optional: Add an env var for the port
ENV PORT=3000
EXPOSE 3000

# Start server
CMD ["serve", "-s", "dist", "-l", "tcp://0.0.0.0:3000"]
