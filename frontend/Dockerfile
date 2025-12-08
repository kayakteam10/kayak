# Frontend Dockerfile for Kayak Simulation
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Expose port 8088
EXPOSE 8088

# Start the application
CMD ["npm", "start"]
