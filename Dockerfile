# Multi-stage build for SmartRetail360
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY jest.config.json ./
COPY .eslintrc.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build stage for frontend
FROM base AS frontend-builder
RUN npm run build:frontend

# Build stage for backend
FROM base AS backend-builder
RUN npm run build:backend

# Production stage
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built backend
COPY --from=backend-builder /app/dist ./dist
COPY --from=backend-builder /app/server ./server

# Copy built frontend
COPY --from=frontend-builder /app/dist/public ./public

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["npm", "start"] 