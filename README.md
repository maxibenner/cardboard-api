# Cardboard API: Image & Video Thumbnail Service

This project provides HTTP server endpoints for generating and uploading thumbnails for images and videos stored in cloud storage. It is designed to work with Firebase (Firestore), Google Cloud Storage, and Wasabi S3-compatible storage.

## Features
- Generates thumbnails for images and videos on demand
- Uploads thumbnails to Google Cloud Storage
- Updates Firestore documents with thumbnail metadata
- Uses Wasabi S3-compatible storage for source files

## Environment Variables
Set the following environment variables in your `.env` file (see `sample.env` for a template):

- `PROJECT_ID` — Your Firebase/Google Cloud project ID
- `FIREBASE_SERVICE_ACCOUNT` — The full JSON for your Firebase service account (escaped as a single line)
- `AWS_ENDPOINT` — Wasabi S3 endpoint (e.g., `s3.us-east-1.wasabisys.com`)
- `AWS_ACCESS_KEY_ID` — Wasabi S3 access key
- `AWS_SECRET_ACCESS_KEY` — Wasabi S3 secret key
- `AWS_REGION` — Wasabi S3 region (e.g., `us-east-1`)

## Setup
1. Copy `sample.env` to `.env` and fill in your credentials.
2. Install dependencies:
   ```sh
   npm install
   ```
3. Run the servers:
   ```sh
   node img-thumb.js
   node video-thumb.js
   ```

## Usage
- Make an HTTP request to the running server with the required query parameters (e.g., `key`).
- The server will generate a thumbnail, upload it to GCS, and update Firestore.
