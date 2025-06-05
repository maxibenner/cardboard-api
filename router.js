#!/usr/bin/env node
const http = require("http");
const url = require("url");
const { spawn } = require("child_process");

// Import the two handlers
const imgThumb = require("./img-thumb");
const videoThumb = require("./video-thumb");

// Create a simple router server
const PORT = process.env.PORT || 8080;

http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname.replace(/^\/+|\/+$/g, ""); // trim slashes

  if (path === "img-thumb") {
    // Forward to img-thumb handler
    req.url = parsedUrl.search || "";
    await imgThumb.handleRequest(req, res);
  } else if (path === "video-thumb") {
    // Forward to video-thumb handler
    req.url = parsedUrl.search || "";
    await videoThumb.handleRequest(req, res);
  } else if (path === "healthz") {
    // Health check for required env vars
    const requiredVars = [
      'PROJECT_ID',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'AWS_REGION',
      'AWS_ENDPOINT',
      'FIREBASE_SERVICE_ACCOUNT'
    ];
    const missing = requiredVars.filter(v => !process.env[v] || process.env[v] === '');
    if (missing.length === 0) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    } else {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', missing }));
    }
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
}).listen(PORT, () => {
  console.log(`Router server running on port ${PORT}`);
});
