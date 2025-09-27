FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Create node user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./
COPY packages/*/package.json ./packages/*/

# Install dependencies
RUN npm ci --only=development

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose ports
EXPOSE 3000 9229

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Default command (can be overridden)
CMD ["npm", "run", "dev"]