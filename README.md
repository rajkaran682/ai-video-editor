# AI Video Editor

Browser-first online video editor. Basic processing uses FFmpeg.wasm; video files are not uploaded to this Node server.

## Features
Video preview, trim, crop, resize, rotate, flip, speed, volume, filters, text, music, watermark, thumbnail, audio extraction, MP4/WebM export and Face Swap workspace.

## Run
npm install
npm start

## Render
Runtime: Docker
Branch: main
Dockerfile: /Dockerfile

## Face Swap
The UI/workflow is included, but a real photorealistic face-swap model is deliberately not bundled into this first lightweight deployment. Connect a consent-based local model or API in the marked function in `public/app.js` for actual replacement. Do not use faces without permission.
