# Use official Node.js LTS image
FROM node:18-slim

# Install ffmpeg and ffprobe for video processing
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package.json ./
RUN npm install --production
RUN npm install dotenv --save

# Copy all source files
COPY . .

# Copy env file if present
COPY .env .env
COPY sample.env sample.env

# Create tmp directory for video thumbnails
RUN mkdir -p /usr/src/app/tmp

# Expose only the router port
EXPOSE 8080

# Start the router server
CMD ["node", "-r", "dotenv/config", "router.js"]
