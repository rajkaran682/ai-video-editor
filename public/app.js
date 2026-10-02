"use strict";

/*
  AI VIDEO EDITOR
  Professional browser based editor

  Features:
  - Video upload
  - Trim
  - Rotate
  - Flip
  - Filters
  - Text
  - Animated text
  - Photo/video overlay
  - Frames
  - Templates
  - Background music
  - WebM export
  - MP4 conversion through FFmpeg when available
*/


/* =========================================================
   CROSS ORIGIN WORKER FIX
========================================================= */

const NativeWorker = window.Worker;

window.Worker = function (scriptURL, options) {

  const url = String(scriptURL);

  if (
    url.includes("cdn.jsdelivr.net") &&
    url.includes("814.ffmpeg.js")
  ) {

    const workerCode = `
      importScripts(${JSON.stringify(url)});
    `;

    const blob = new Blob(
      [workerCode],
      {
        type: "text/javascript"
      }
    );

    const blobURL =
      URL.createObjectURL(blob);

    return new NativeWorker(
      blobURL,
      options
    );
  }

  return new NativeWorker(
    scriptURL,
    options
  );
};

window.Worker.prototype =
  NativeWorker.prototype;


/* =========================================================
   DOM HELPERS
========================================================= */

const $ = id =>
  document.getElementById(id);

const video =
  $("video");

const canvas =
  $("previewCanvas");

const ctx =
  canvas.getContext("2d");

const textPreview =
  $("textPreview");

const previewArea =
  $("previewArea");

const progressBar =
  $("progressBar");

const progressText =
  $("progressText");

const downloadBox =
  $("downloadBox");


/* =========================================================
   STATE
========================================================= */

let videoFile = null;
let musicFile = null;
let overlayFile = null;

let overlayURL = null;

let overlayMedia = null;

let animationFrame = null;

let selectedFrame = "none";

let selectedTemplate = "none";

let audioContext = null;

let mediaDestination = null;

let sourceNode = null;

let musicSourceNode = null;

let currentExportURL = null;


/* =========================================================
   SETTINGS
========================================================= */

const state = {

  brightness: 100,

  contrast: 100,

  saturation: 100,

  filter: "none",

  volume: 100,

  mute: false,

  speed: 1,

  rotate: 0,

  flip: "none",

  resolution: "original",

  text: "",

  textColor: "#ffffff",

  textBg: "#000000",

  transparentBg: false,

  fontSize: 64,

  fontFamily: "Arial",

  fontStyle: "normal",

  textAlign: "center",

  textPosition: "middle",

  textShadow: true,

  textAnimation: "none",

  animationSpeed: 1,

  overlayScale: 0.5,

  overlayX: 50,

  overlayY: 50

};


/* =========================================================
   VIDEO UPLOAD
========================================================= */

$("videoInput").addEventListener(
  "change",
  e => {

    const file =
      e.target.files[0];

    if (file) {
      loadVideo(file);
    }

  }
);


$("dropZone").addEventListener(
  "dragover",
  e => {

    e.preventDefault();

    $("dropZone").classList.add("drag");

  }
);


$("dropZone").addEventListener(
  "dragleave",
  () => {

    $("dropZone").classList.remove("drag");

  }
);


$("dropZone").addEventListener(
  "drop",
  e => {

    e.preventDefault();

    $("dropZone").classList.remove("drag");

    const file =
      e.dataTransfer.files[0];

    if (
      file &&
      file.type.startsWith("video/")
    ) {

      loadVideo(file);

    }

  }
);


function loadVideo(file) {

  videoFile = file;

  const url =
    URL.createObjectURL(file);

  video.src = url;

  video.load();

  video.onloadedmetadata = () => {

    $("endTime").value =
      video.duration.toFixed(1);

    $("duration").textContent =
      formatTime(video.duration);

    setupCanvas();

    renderPreview();

  };

}


/* =========================================================
   CANVAS
========================================================= */

function setupCanvas() {

  const width =
    video.videoWidth || 1280;

  const height =
    video.videoHeight || 720;

  canvas.width =
    width;

  canvas.height =
    height;

}


function resizeCanvasForResolution() {

  let width =
    video.videoWidth || 1280;

  let height =
    video.videoHeight || 720;

  if (state.resolution === "1080") {

    const scale =
      1080 / height;

    width =
      Math.round(width * scale);

    height = 1080;

  }

  if (state.resolution === "720") {

    const scale =
      720 / height;

    width =
      Math.round(width * scale);

    height = 720;

  }

  if (state.resolution === "480") {

    const scale =
      480 / height;

    width =
      Math.round(width * scale);

    height = 480;

  }

  canvas.width =
    width;

  canvas.height =
    height;

}


/* =========================================================
   FILTER
========================================================= */

function getFilter() {

  let filters = [

    `brightness(${state.brightness}%)`,

    `contrast(${state.contrast}%)`,

    `saturate(${state.saturation}%)`

  ];

  if (
    state.filter === "grayscale"
  ) {

    filters.push(
      "grayscale(100%)"
    );

  }

  if (
    state.filter === "sepia"
  ) {

    filters.push(
      "sepia(100%)"
    );

  }

  if (
    state.filter === "vintage"
  ) {

    filters.push(
      "sepia(35%) contrast(115%) saturate(80%)"
    );

  }

  if (
    state.filter === "cinematic"
  ) {

    filters.push(
      "contrast(125%) saturate(90%)"
    );

  }

  if (
    state.filter === "warm"
  ) {

    filters.push(
      "sepia(20%) saturate(130%)"
    );

  }

  if (
    state.filter === "cool"
  ) {

    filters.push(
      "hue-rotate(15deg) saturate(90%)"
    );

  }

  return filters.join(" ");

}


/* =========================================================
   DRAW VIDEO
========================================================= */

function drawVideo() {

  if (!video.videoWidth) {
    return;
  }

  ctx.save();

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  ctx.filter =
    getFilter();

  const cw =
    canvas.width;

  const ch =
    canvas.height;

  ctx.translate(
    cw / 2,
    ch / 2
  );

  ctx.rotate(
    Number(state.rotate) *
    Math.PI / 180
  );

  if (
    state.flip === "horizontal"
  ) {

    ctx.scale(-1, 1);

  }

  if (
    state.flip === "vertical"
  ) {

    ctx.scale(1, -1);

  }

  const scale =
    Math.min(
      cw / video.videoWidth,
      ch / video.videoHeight
    );

  const w =
    video.videoWidth * scale;

  const h =
    video.videoHeight * scale;

  ctx.drawImage(
    video,
    -w / 2,
    -h / 2,
    w,
    h
  );

  ctx.restore();

  ctx.filter =
    "none";

}


/* =========================================================
   TEXT ANIMATION
========================================================= */

function getAnimatedTextPosition(
  time,
  width,
  height
) {

  const animation =
    state.textAnimation;

  const speed =
    Number(state.animationSpeed);

  const progress =
    ((time * speed) % 4) / 4;

  let x =
    width / 2;

  let y =
    height / 2;

  if (state.textPosition === "top") {
    y = height * 0.15;
  }

  if (state.textPosition === "bottom") {
    y = height * 0.85;
  }

  if (
    animation === "left"
  ) {

    x =
      -300 +
      (width + 600) * progress;

  }

  if (
    animation === "right"
  ) {

    x =
      width + 300 -
      (width + 600) * progress;

  }

  if (
    animation === "up"
  ) {

    y =
      height + 150 -
      (height + 300) * progress;

  }

  if (
    animation === "down"
  ) {

    y =
      -150 +
      (height + 300) * progress;

  }

  if (
    animation === "float"
  ) {

    x =
      width / 2 +
      Math.sin(time * speed * 2) *
      width *
      0.12;

    y +=
      Math.sin(time * speed * 3) *
      25;

  }

  return {
    x,
    y,
    progress
  };

}


/* =========================================================
   DRAW TEXT
========================================================= */

function drawText(time) {

  if (
    !state.text.trim()
  ) {

    return;

  }

  const width =
    canvas.width;

  const height =
    canvas.height;

  const pos =
    getAnimatedTextPosition(
      time,
      width,
      height
    );

  let fontWeight =
    "normal";

  let fontStyle =
    "normal";

  if (
    state.fontStyle.includes("bold")
  ) {

    fontWeight =
      "bold";

  }

  if (
    state.fontStyle.includes("italic")
  ) {

    fontStyle =
      "italic";

  }

  let size =
    Number(state.fontSize);

  let scale =
    1;

  let alpha =
    1;

  if (
    state.textAnimation === "zoom"
  ) {

    scale =
      0.5 +
      Math.abs(
        Math.sin(time * 2)
      ) *
      0.5;

  }

  if (
    state.textAnimation === "fade"
  ) {

    alpha =
      0.3 +
      Math.abs(
        Math.sin(time * 2)
      ) *
      0.7;

  }

  if (
    state.textAnimation === "bounce"
  ) {

    pos.y +=
      Math.abs(
        Math.sin(time * 4)
      ) *
      -50;

  }

  ctx.save();

  ctx.globalAlpha =
    alpha;

  ctx.translate(
    pos.x,
    pos.y
  );

  ctx.scale(
    scale,
    scale
  );

  ctx.textAlign =
    state.textAlign;

  ctx.textBaseline =
    "middle";

  ctx.font =
    `${fontStyle} ${fontWeight} ${size}px ${state.fontFamily}`;

  if (
    state.textShadow
  ) {

    ctx.shadowColor =
      "rgba(0,0,0,0.8)";

    ctx.shadowBlur =
      8;

    ctx.shadowOffsetX =
      3;

    ctx.shadowOffsetY =
      3;

  }

  const lines =
    state.text.split("\n");

  const lineHeight =
    size * 1.25;

  lines.forEach(
    (line, index) => {

      const lineY =
        (index -
        (lines.length - 1) / 2) *
        lineHeight;

      if (
        !state.transparentBg
      ) {

        const metrics =
          ctx.measureText(line);

        const padding =
          15;

        ctx.save();

        ctx.shadowColor =
          "transparent";

        ctx.fillStyle =
          state.textBg;

        ctx.fillRect(

          -(
            metrics.width / 2
          ) -
          padding,

          lineY -
          size / 2 -
          padding / 2,

          metrics.width +
          padding * 2,

          size +
          padding

        );

        ctx.restore();

      }

      ctx.fillStyle =
        state.textColor;

      ctx.fillText(
        line,
        0,
        lineY
      );

    }
  );

  ctx.restore();

}


/* =========================================================
   OVERLAY MEDIA
========================================================= */

$("overlayInput").addEventListener(
  "change",
  e => {

    const file =
      e.target.files[0];

    if (!file) {
      return;
    }

    overlayFile =
      file;

    if (overlayURL) {

      URL.revokeObjectURL(
        overlayURL
      );

    }

    overlayURL =
      URL.createObjectURL(file);

    if (
      file.type.startsWith("video/")
    ) {

      overlayMedia =
        document.createElement("video");

      overlayMedia.src =
        overlayURL;

      overlayMedia.muted =
        true;

      overlayMedia.loop =
        true;

      overlayMedia.playsInline =
        true;

      overlayMedia.play()
        .catch(() => {});

    } else {

      overlayMedia =
        new Image();

      overlayMedia.src =
        overlayURL;

    }

  }
);


/* =========================================================
   DRAW OVERLAY
========================================================= */

function drawOverlay(time) {

  if (
    !overlayMedia
  ) {

    return;

  }

  if (
    overlayMedia.readyState !== undefined &&
    overlayMedia.readyState < 2
  ) {

    return;

  }

  const cw =
    canvas.width;

  const ch =
    canvas.height;

  const scale =
    Number(state.overlayScale);

  const base =
    Math.min(cw, ch);

  const w =
    base * scale;

  const ratio =
    overlayMedia.videoWidth
      ? overlayMedia.videoHeight /
        overlayMedia.videoWidth
      : 0.75;

  const h =
    w * ratio;

  const x =
    cw *
    Number(state.overlayX) /
    100;

  const y =
    ch *
    Number(state.overlayY) /
    100;

  ctx.save();

  drawFrameMedia(
    overlayMedia,
    x,
    y,
    w,
    h,
    selectedFrame
  );

  ctx.restore();

}


/* =========================================================
   FRAME DRAWING
========================================================= */

function drawFrameMedia(
  media,
  x,
  y,
  w,
  h,
  frame
) {

  if (
    frame === "circle"
  ) {

    ctx.save();

    ctx.beginPath();

    ctx.arc(
      x,
      y,
      Math.min(w, h) / 2,
      0,
      Math.PI * 2
    );

    ctx.clip();

    ctx.drawImage(
      media,
      x - w / 2,
      y - h / 2,
      w,
      h
    );

    ctx.restore();

    ctx.save();

    ctx.strokeStyle =
      "#ffffff";

    ctx.lineWidth =
      Math.max(5, w * 0.02);

    ctx.beginPath();

    ctx.arc(
      x,
      y,
      Math.min(w, h) / 2,
      0,
      Math.PI * 2
    );

    ctx.stroke();

    ctx.restore();

    return;
  }


  if (
    frame === "heart"
  ) {

    ctx.save();

    ctx.beginPath();

    const top =
      y - h * 0.25;

    ctx.moveTo(
      x,
      y + h * 0.42
    );

    ctx.bezierCurveTo(
      x - w * 0.65,
      y - h * 0.05,
      x - w * 0.55,
      top - h * 0.45,
      x,
      top
    );

    ctx.bezierCurveTo(
      x + w * 0.55,
      top - h * 0.45,
      x + w * 0.65,
      y - h * 0.05,
      x,
      y + h * 0.42
    );

    ctx.clip();

    ctx.drawImage(
      media,
      x - w / 2,
      y - h / 2,
      w,
      h
    );

    ctx.restore();

    return;
  }


  if (
    frame === "polaroid"
  ) {

    ctx.save();

    ctx.fillStyle =
      "#ffffff";

    ctx.fillRect(
      x - w / 2 - 15,
      y - h / 2 - 15,
      w + 30,
      h + 55
    );

    ctx.drawImage(
      media,
      x - w / 2,
      y - h / 2,
      w,
      h
    );

    ctx.restore();

    return;
  }


  ctx.drawImage(
    media,
    x - w / 2,
    y - h / 2,
    w,
    h
  );


  if (
    frame === "mobile"
  ) {

    ctx.save();

    ctx.strokeStyle =
      "#111111";

    ctx.lineWidth =
      Math.max(10, w * 0.035);

    ctx.strokeRect(
      x - w / 2,
      y - h / 2,
      w,
      h
    );

    ctx.fillStyle =
      "#111111";

    ctx.fillRect(
      x - w * 0.07,
      y - h / 2,
      w * 0.14,
      8
    );

    ctx.restore();

  }


  if (
    frame === "rounded"
  ) {

    ctx.save();

    ctx.strokeStyle =
      "#ffffff";

    ctx.lineWidth =
      8;

    ctx.strokeRect(
      x - w / 2,
      y - h / 2,
      w,
      h
    );

    ctx.restore();

  }


  if (
    frame === "film"
  ) {

    ctx.save();

    ctx.strokeStyle =
      "#ffffff";

    ctx.lineWidth =
      10;

    ctx.strokeRect(
      x - w / 2,
      y - h / 2,
      w,
      h
    );

    ctx.fillStyle =
      "#ffffff";

    for (
      let i = 0;
      i < 5;
      i++
    ) {

      ctx.fillRect(
        x - w / 2 - 4,
        y - h / 2 + i * h / 4,
        12,
        20
      );

      ctx.fillRect(
        x + w / 2 - 8,
        y - h / 2 + i * h / 4,
        12,
        20
      );

    }

    ctx.restore();

  }


  if (
    frame === "premium"
  ) {

    ctx.save();

    ctx.strokeStyle =
      "#f5d76e";

    ctx.lineWidth =
      12;

    ctx.strokeRect(
      x - w / 2,
      y - h / 2,
      w,
      h
    );

    ctx.strokeStyle =
      "#ffffff";

    ctx.lineWidth =
      3;

    ctx.strokeRect(
      x - w / 2 + 15,
      y - h / 2 + 15,
      w - 30,
      h - 30
    );

    ctx.restore();

  }


  if (
    frame === "tv"
  ) {

    ctx.save();

    ctx.strokeStyle =
      "#202020";

    ctx.lineWidth =
      18;

    ctx.strokeRect(
      x - w / 2,
      y - h / 2,
      w,
      h
    );

    ctx.restore();

  }

}


/* =========================================================
   TEMPLATES
========================================================= */

function drawTemplate() {

  const w =
    canvas.width;

  const h =
    canvas.height;

  if (
    selectedTemplate === "cinema"
  ) {

    ctx.fillStyle =
      "rgba(0,0,0,0.35)";

    ctx.fillRect(
      0,
      0,
      w,
      h * 0.10
    );

    ctx.fillRect(
      0,
      h * 0.90,
      w,
      h * 0.10
    );

  }


  if (
    selectedTemplate === "story"
  ) {

    ctx.strokeStyle =
      "rgba(255,255,255,0.8)";

    ctx.lineWidth =
      10;

    ctx.strokeRect(
      20,
      20,
      w - 40,
      h - 40
    );

  }


  if (
    selectedTemplate === "vintage"
  ) {

    ctx.fillStyle =
      "rgba(170,120,60,0.12)";

    ctx.fillRect(
      0,
      0,
      w,
      h
    );

  }


  if (
    selectedTemplate === "minimal"
  ) {

    ctx.strokeStyle =
      "rgba(255,255,255,0.7)";

    ctx.lineWidth =
      3;

    ctx.strokeRect(
      25,
      25,
      w - 50,
      h - 50
    );

  }


  if (
    selectedTemplate === "social"
  ) {

    ctx.fillStyle =
      "rgba(0,0,0,0.18)";

    ctx.fillRect(
      0,
      h * 0.82,
      w,
      h * 0.18
    );

  }

}


/* =========================================================
   MAIN RENDER
========================================================= */

function renderPreview() {

  if (!video.videoWidth) {
    return;
  }

  drawVideo();

  drawTemplate();

  drawOverlay(
    video.currentTime
  );

  drawText(
    video.currentTime
  );

  updateTextDOM();

  animationFrame =
    requestAnimationFrame(
      renderPreview
    );

}


/* =========================================================
   TEXT DOM PREVIEW
========================================================= */

function updateTextDOM() {

  if (
    !state.text.trim()
  ) {

    textPreview.textContent =
      "";

    return;

  }

  textPreview.textContent =
    state.text;

  textPreview.style.color =
    state.textColor;

  textPreview.style.fontFamily =
    state.fontFamily;

  textPreview.style.fontSize =
    `${Math.max(12, state.fontSize * 0.45)}px`;

  textPreview.style.fontWeight =
    state.fontStyle.includes("bold")
      ? "700"
      : "400";

  textPreview.style.fontStyle =
    state.fontStyle.includes("italic")
      ? "italic"
      : "normal";

  textPreview.style.textAlign =
    state.textAlign;

  textPreview.style.background =
    state.transparentBg
      ? "transparent"
      : state.textBg;

  textPreview.style.boxShadow =
    state.textShadow
      ? "3px 3px 8px rgba(0,0,0,0.8)"
      : "none";

  textPreview.style.left =
    "50%";

  if (
    state.textPosition === "top"
  ) {

    textPreview.style.top =
      "15%";

  }

  if (
    state.textPosition === "middle"
  ) {

    textPreview.style.top =
      "50%";

  }

  if (
    state.textPosition === "bottom"
  ) {

    textPreview.style.top =
      "85%";

  }

  textPreview.style.transform =
    "translate(-50%, -50%)";

}


/* =========================================================
   TAB SYSTEM
========================================================= */

document
  .querySelectorAll(".tab")
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          document
            .querySelectorAll(".tab")
            .forEach(
              b =>
                b.classList.remove(
                  "active"
                )
            );

          document
            .querySelectorAll(".panel")
            .forEach(
              p =>
                p.classList.remove(
                  "active"
                )
            );

          button.classList.add(
            "active"
          );

          const panel =
            $(button.dataset.tab);

          if (panel) {

            panel.classList.add(
              "active"
            );

          }

        }
      );

    }
  );


/* =========================================================
   GENERIC SETTINGS
========================================================= */

function bindRange(
  id,
  key
) {

  const element =
    $(id);

  if (!element) {
    return;
  }

  element.addEventListener(
    "input",
    () => {

      state[key] =
        element.value;

      renderPreview();

    }
  );

}


bindRange(
  "brightness",
  "brightness"
);

bindRange(
  "contrast",
  "contrast"
);

bindRange(
  "saturation",
  "saturation"
);

bindRange(
  "volume",
  "volume"
);

bindRange(
  "animationSpeed",
  "animationSpeed"
);

bindRange(
  "overlayScale",
  "overlayScale"
);

bindRange(
  "overlayX",
  "overlayX"
);

bindRange(
  "overlayY",
  "overlayY"
);


/* =========================================================
   SELECT SETTINGS
========================================================= */

function bindSelect(
  id,
  key
) {

  $(id).addEventListener(
    "change",
    () => {

      state[key] =
        $(id).value;

      renderPreview();

    }
  );

}


bindSelect(
  "rotate",
  "rotate"
);

bindSelect(
  "flip",
  "flip"
);

bindSelect(
  "resolution",
  "resolution"
);

bindSelect(
  "filter",
  "filter"
);

bindSelect(
  "speed",
  "speed"
);

bindSelect(
  "fontFamily",
  "fontFamily"
);

bindSelect(
  "fontStyle",
  "fontStyle"
);

bindSelect(
  "textAlign",
  "textAlign"
);

bindSelect(
  "textPosition",
  "textPosition"
);

bindSelect(
  "textAnimation",
  "textAnimation"
);


/* =========================================================
   TEXT INPUTS
========================================================= */

$("textInput").addEventListener(
  "input",
  () => {

    state.text =
      $("textInput").value;

    renderPreview();

  }
);


$("textColor").addEventListener(
  "input",
  () => {

    state.textColor =
      $("textColor").value;

    renderPreview();

  }
);


$("textBg").addEventListener(
  "input",
  () => {

    state.textBg =
      $("textBg").value;

    renderPreview();

  }
);


$("transparentBg").addEventListener(
  "change",
  () => {

    state.transparentBg =
      $("transparentBg").checked;

    renderPreview();

  }
);


$("fontSize").addEventListener(
  "input",
  () => {

    state.fontSize =
      $("fontSize").value;

    renderPreview();

  }
);


$("textShadow").addEventListener(
  "change",
  () => {

    state.textShadow =
      $("textShadow").checked;

    renderPreview();

  }
);


/* =========================================================
   AUDIO SETTINGS
========================================================= */

$("volume").addEventListener(
  "input",
  () => {

    state.volume =
      Number(
        $("volume").value
      );

    video.volume =
      Math.min(
        1,
        state.volume / 100
      );

  }
);


$("mute").addEventListener(
  "change",
  () => {

    state.mute =
      $("mute").checked;

    video.muted =
      state.mute;

  }
);


$("speed").addEventListener(
  "change",
  () => {

    state.speed =
      Number(
        $("speed").value
      );

    video.playbackRate =
      state.speed;

  }
);


/* =========================================================
   MUSIC
========================================================= */

$("musicInput").addEventListener(
  "change",
  e => {

    musicFile =
      e.target.files[0];

    if (musicFile) {

      $("musicName").textContent =
        musicFile.name;

    }

  }
);


$("removeMusic").addEventListener(
  "click",
  () => {

    musicFile =
      null;

    $("musicInput").value =
      "";

    $("musicName").textContent =
      "कोई music नहीं चुना गया";

  }
);


/* =========================================================
   FRAME BUTTONS
========================================================= */

document
  .querySelectorAll(".frame-btn")
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          document
            .querySelectorAll(".frame-btn")
            .forEach(
              b =>
                b.classList.remove(
                  "active"
                )
            );

          button.classList.add(
            "active"
          );

          selectedFrame =
            button.dataset.frame;

          renderPreview();

        }
      );

    }
  );


$("removeOverlay").addEventListener(
  "click",
  () => {

    overlayFile =
      null;

    overlayMedia =
      null;

    if (overlayURL) {

      URL.revokeObjectURL(
        overlayURL
      );

      overlayURL =
        null;

    }

    $("overlayInput").value =
      "";

    renderPreview();

  }
);


/* =========================================================
   TEMPLATE BUTTONS
========================================================= */

document
  .querySelectorAll(".template-btn")
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          document
            .querySelectorAll(".template-btn")
            .forEach(
              b =>
                b.classList.remove(
                  "active"
                )
            );

          button.classList.add(
            "active"
          );

          selectedTemplate =
            button.dataset.template;

          renderPreview();

        }
      );

    }
  );


/* =========================================================
   TIMELINE
========================================================= */

video.addEventListener(
  "timeupdate",
  () => {

    const duration =
      video.duration || 0;

    if (duration) {

      $("timelineRange").value =
        (
          video.currentTime /
          duration
        ) *
        100;

    }

    $("currentTime").textContent =
      formatTime(
        video.currentTime
      );

  }
);


$("timelineRange").addEventListener(
  "input",
  () => {

    if (!video.duration) {
      return;
    }

    video.currentTime =
      video.duration *
      (
        Number(
          $("timelineRange").value
        ) / 100
      );

  }
);


$("playBtn").addEventListener(
  "click",
  () => {

    video.play();

  }
);


$("pauseBtn").addEventListener(
  "click",
  () => {

    video.pause();

  }
);


$("resetBtn").addEventListener(
  "click",
  () => {

    video.currentTime =
      Number(
        $("startTime").value || 0
      );

  }
);


/* =========================================================
   FORMAT TIME
========================================================= */

function formatTime(seconds) {

  if (
    !Number.isFinite(seconds)
  ) {

    return "00:00";

  }

  const mins =
    Math.floor(
      seconds / 60
    );

  const secs =
    Math.floor(
      seconds % 60
    );

  return (
    String(mins).padStart(2, "0") +
    ":" +
    String(secs).padStart(2, "0")
  );

}


/* =========================================================
   START / END
========================================================= */

$("startTime").addEventListener(
  "change",
  () => {

    const start =
      Number(
        $("startTime").value
      );

    if (
      Number.isFinite(start)
    ) {

      video.currentTime =
        start;

    }

  }
);


$("endTime").addEventListener(
  "change",
  () => {

    const end =
      Number(
        $("endTime").value
      );

    if (
      Number.isFinite(end) &&
      video.currentTime > end
    ) {

      video.currentTime =
        end;

    }

  }
);


/* =========================================================
   AUDIO STREAM
========================================================= */

function setupAudio() {

  if (
    audioContext
  ) {

    return;

  }

  audioContext =
    new (
      window.AudioContext ||
      window.webkitAudioContext
    )();

  mediaDestination =
    audioContext.createMediaStreamDestination();

  try {

    sourceNode =
      audioContext.createMediaElementSource(
        video
      );

    sourceNode
      .connect(
        audioContext.destination
      );

    sourceNode
      .connect(
        mediaDestination
      );

  } catch (error) {

    console.warn(
      "Audio source setup:",
      error
    );

  }

}


/* =========================================================
   MUSIC STREAM
========================================================= */

async function setupMusic() {

  if (!musicFile) {
    return;
  }

  if (!audioContext) {
    setupAudio();
  }

  const music =
    new Audio();

  music.src =
    URL.createObjectURL(
      musicFile
    );

  music.loop =
    true;

  music.volume =
    0.45;

  try {

    await music.play();

  } catch (error) {

    console.warn(
      "Music playback requires user interaction.",
      error
    );

  }

  try {

    musicSourceNode =
      audioContext.createMediaElementSource(
        music
      );

    musicSourceNode
      .connect(
        mediaDestination
      );

  } catch (error) {

    console.warn(
      "Music audio setup:",
      error
    );

  }

  return music;

}


/* =========================================================
   EXPORT CANVAS STREAM
========================================================= */

async function createExportStream() {

  if (!videoFile) {

    throw new Error(
      "पहले video upload करें।"
    );

  }

  resizeCanvasForResolution();

  setupAudio();

  if (
    audioContext &&
    audioContext.state === "suspended"
  ) {

    await audioContext.resume();

  }

  const canvasStream =
    canvas.captureStream(30);

  const tracks = [
    ...canvasStream.getVideoTracks()
  ];

  if (
    mediaDestination
  ) {

    tracks.push(
      ...mediaDestination
        .stream
        .getAudioTracks()
    );

  }

  return new MediaStream(
    tracks
  );

}


/* =========================================================
   WEBM EXPORT
========================================================= */

async function exportWebM() {

  const stream =
    await createExportStream();

  const mimeTypes = [

    "video/webm;codecs=vp9,opus",

    "video/webm;codecs=vp8,opus",

    "video/webm"

  ];

  let mimeType =
    "";

  for (
    const type of mimeTypes
  ) {

    if (
      MediaRecorder.isTypeSupported(
        type
      )
    ) {

      mimeType =
        type;

      break;

    }

  }

  if (!mimeType) {

    throw new Error(
      "इस browser में video recording supported नहीं है।"
    );

  }

  const recorder =
    new MediaRecorder(
      stream,
      {
        mimeType
      }
    );

  const chunks =
    [];

  recorder.ondataavailable =
    event => {

      if (
        event.data.size
      ) {

        chunks.push(
          event.data
        );

      }

    };


  const blobPromise =
    new Promise(
      resolve => {

        recorder.onstop =
          () => {

            resolve(
              new Blob(
                chunks,
                {
                  type:
                    mimeType
                }
              )
            );

          };

      }
    );


  recorder.start(
    250
  );

  const start =
    Number(
      $("startTime").value || 0
    );

  const end =
    Number(
      $("endTime").value ||
      video.duration
    );

  video.currentTime =
    start;

  video.muted =
    true;

  await video.play();

  const duration =
    Math.max(
      0.1,
      end - start
    );

  const startedAt =
    performance.now();


  return new Promise(
    resolve => {

      function tick() {

        const elapsed =
          (
            performance.now() -
            startedAt
          ) / 1000;

        const percent =
          Math.min(
            100,
            (
              elapsed /
              duration
            ) * 100
          );

        progressBar.style.width =
          `${percent}%`;

        progressText.textContent =
          `Exporting ${Math.round(percent)}%`;

        if (
          elapsed >= duration ||
          video.currentTime >= end
        ) {

          video.pause();

          recorder.stop();

          resolve(
            blobPromise
          );

          return;

        }

        requestAnimationFrame(
          tick
        );

      }

      tick();

    }
  );

}


/* =========================================================
   FFMPEG MP4 CONVERSION
========================================================= */

async function convertToMP4(
  webmBlob
) {

  progressText.textContent =
    "MP4 conversion शुरू हो रहा है...";

  progressBar.style.width =
    "10%";


  if (
    !window.FFmpeg ||
    !window.FFmpegUtil
  ) {

    throw new Error(
      "FFmpeg library उपलब्ध नहीं है। WebM format में export करें।"
    );

  }


  const {
    FFmpeg
  } =
    window.FFmpeg;

  const {
    fetchFile,
    toBlobURL
  } =
    window.FFmpegUtil;


  const ffmpeg =
    new FFmpeg();


  ffmpeg.on(
    "progress",
    ({ progress }) => {

      const percent =
        Math.round(
          progress * 100
        );

      progressBar.style.width =
        `${10 + percent * 0.9}%`;

      progressText.textContent =
        `MP4 conversion ${percent}%`;

    }
  );


  const base =
    "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd";


  await ffmpeg.load({

    coreURL:
      await toBlobURL(
        `${base}/ffmpeg-core.js`,
        "text/javascript"
      ),

    wasmURL:
      await toBlobURL(
        `${base}/ffmpeg-core.wasm`,
        "application/wasm"
      )

  });


  await ffmpeg.writeFile(
    "input.webm",
    await fetchFile(
      webmBlob
    )
  );


  await ffmpeg.exec([
    "-i",
    "input.webm",

    "-c:v",
    "libx264",

    "-preset",
    "veryfast",

    "-crf",
    "23",

    "-c:a",
    "aac",

    "-movflags",
    "+faststart",

    "output.mp4"
  ]);


  const data =
    await ffmpeg.readFile(
      "output.mp4"
    );


  return new Blob(
    [data.buffer],
    {
      type:
        "video/mp4"
    }
  );

}


/* =========================================================
   DOWNLOAD
========================================================= */

function showDownload(
  blob,
  extension
) {

  if (
    currentExportURL
  ) {

    URL.revokeObjectURL(
      currentExportURL
    );

  }

  currentExportURL =
    URL.createObjectURL(
      blob
    );

  downloadBox.innerHTML =
    "";

  const link =
    document.createElement(
      "a"
    );

  link.href =
    currentExportURL;

  link.download =
    `ai-video-${Date.now()}.${extension}`;

  link.textContent =
    `⬇️ Download ${extension.toUpperCase()}`;

  downloadBox.appendChild(
    link
  );

}


/* =========================================================
   EXPORT BUTTON
========================================================= */

$("exportBtn").addEventListener(
  "click",
  async () => {

    try {

      if (!videoFile) {

        alert(
          "पहले video upload करें।"
        );

        return;

      }

      downloadBox.innerHTML =
        "";

      progressBar.style.width =
        "0%";

      progressText.textContent =
        "Export शुरू हो रहा है...";


      const format =
        $("exportFormat").value;


      const webm =
        await exportWebM();


      if (
        format === "webm"
      ) {

        progressBar.style.width =
          "100%";

        progressText.textContent =
          "Export पूरा हो गया।";

        showDownload(
          webm,
          "webm"
        );

        return;

      }


      try {

        const mp4 =
          await convertToMP4(
            webm
          );

        progressBar.style.width =
          "100%";

        progressText.textContent =
          "MP4 Export पूरा हो गया।";

        showDownload(
          mp4,
          "mp4"
        );

      } catch (
        mp4Error
      ) {

        console.error(
          mp4Error
        );

        progressText.textContent =
          "MP4 conversion उपलब्ध नहीं हुआ। WebM export तैयार है।";

        showDownload(
          webm,
          "webm"
        );

      }

    } catch (
      error
    ) {

      console.error(
        error
      );

      progressText.textContent =
        "Export में error आया।";

      alert(
        error.message ||
        "Video export नहीं हो सका।"
      );

    }

  }
);


/* =========================================================
   INITIALIZE
========================================================= */

video.addEventListener(
  "loadedmetadata",
  () => {

    setupCanvas();

    renderPreview();

  }
);


video.addEventListener(
  "play",
  () => {

    if (!animationFrame) {

      renderPreview();

    }

  }
);


video.addEventListener(
  "loadeddata",
  () => {

    renderPreview();

  }
);


/* =========================================================
   START
========================================================= */

progressBar.style.width =
  "0%";

progressText.textContent =
  "Ready";

console.log(
  "AI Video Editor loaded successfully."
);
