# Use a glibc-based Node.js image to ensure binary compatibility
FROM node:22-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies, including development ones like tsx
RUN npm install

# Copy the rest of the source code
COPY . .

# Create a non-root user for better security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port (optional, but good practice)
EXPOSE 3000

# Set the entrypoint to ensure the container always runs this command
ENTRYPOINT ["npx", "tsx", "main.ts"]


