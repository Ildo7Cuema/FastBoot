# Build stage for React app
FROM node:18-alpine AS client-build

WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./
RUN npm ci

# Copy client source
COPY client/ .

# Build React app
RUN npm run build

# Production stage
FROM node:18-alpine

# Install required system packages
RUN apk add --no-cache \
    android-tools \
    usbutils \
    bash \
    git \
    python3 \
    make \
    g++

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy server files
COPY server/ ./server/
COPY src/ ./src/

# Copy built React app from build stage
COPY --from=client-build /app/client/build ./client/build

# Copy configuration files
COPY ecosystem.config.js ./
COPY .env.example ./

# Create necessary directories
RUN mkdir -p logs uploads/images uploads/backups data backups

# Set permissions
RUN chmod -R 755 /app

# Create non-root user
RUN addgroup -g 1001 -S fastboot && \
    adduser -S -u 1001 -G fastboot fastboot && \
    chown -R fastboot:fastboot /app

# Switch to non-root user
USER fastboot

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
<<<<<<< Current (Your changes)
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"
=======
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

# Start the application
CMD ["node", "server/index.js"]
>>>>>>> Incoming (Background Agent changes)
