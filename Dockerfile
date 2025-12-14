# Stage 1: Build the React Client
FROM node:18-alpine as build-client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Build the Node.js Server
FROM node:18-alpine as build-server
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server/ ./
RUN npm run build

# Stage 3: Production Image
FROM node:18-alpine as production
WORKDIR /app

# Copy server package.json for production dependencies
COPY --from=build-server /app/server/package*.json ./

# Install only production dependencies
RUN npm install --production

# Copy built server files
# Server compiled code goes to server_dist so relative path ../dist works
COPY --from=build-server /app/server/dist ./server_dist

# Copy built client files
# Client build goes to dist folder for serving
COPY --from=build-client /app/client/dist ./dist

# Environment configuration
# Cloud Run injects PORT, but we set a default just in case
ENV NODE_ENV=production
ENV PORT=8080

# Expose the Cloud Run port
EXPOSE 8080

# Start the server
CMD ["node", "server_dist/index.js"]
