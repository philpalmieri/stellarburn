FROM node:20-alpine

WORKDIR /app

# Copy workspace root files
COPY package.json package-lock.json ./

# Copy shared package
COPY packages/shared ./packages/shared

# Copy NPC service package
COPY packages/npc-service ./packages/npc-service

# Install dependencies
RUN npm ci --workspace=@stellarburn/shared --workspace=@stellarburn/npc-service

# Build shared first, then NPC service
RUN npm run build --workspace=@stellarburn/shared
RUN npm run build --workspace=@stellarburn/npc-service

WORKDIR /app/packages/npc-service

EXPOSE 3002

CMD ["npm", "start"]