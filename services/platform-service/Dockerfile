FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies in the container (fixes bcrypt binary issues)
RUN npm install --only=production

# Copy application code
COPY . .

EXPOSE 8080
CMD ["npm", "start"]
