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

# Expose ports for all services (img/video, dev/live)
EXPOSE 8081 8091

# Start both servers (img-thumb and video-thumb) in the background
CMD ["sh", "-c", "node -r dotenv/config img-thumb.js & node -r dotenv/config video-thumb.js && wait"]
