"use strict";

/*
========================================================
 AI VIDEO EDITOR - PROFESSIONAL BROWSER EDITOR
========================================================
*/

/* -----------------------------------------------------
   FFmpeg Worker cross-origin protection
----------------------------------------------------- */

const NativeWorker = window.Worker;

window.Worker = function (scriptURL, options) {

  const url = String(scriptURL);

  if (
    url.includes("cdn.jsdelivr.net") &&
    (
      url.includes("ffmpeg.js") ||
      url.includes("814.ffmpeg.js")
    )
  ) {

    const workerCode = `
      importScripts(${JSON.stringify(url)});
    `;

    const blob = new Blob(
      [workerCode],
      { type: "text/javascript" }
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


/* -----------------------------------------------------
   Helpers
----------------------------------------------------- */

const $ = id =>
  document.getElementById(id);

const qs = selector =>
  document.querySelector(selector);

const qsa = selector =>
  [...document.querySelectorAll(selector)];


/* -----------------------------------------------------
   Main state
----------------------------------------------------- */

const state = {

  videoFile: null,

  videoURL: null,

  overlayFile: null,

  overlayURL: null,

  overlayType: null,

  filter: "none",

  frame: "none",

  template: "clean",

  text: "",

  textAnimation: "none",

  textSize: 60,

  textColor: "#ffffff",

  textBg: "#000000",

  textFont: "Arial",

  textStyle: "normal",

  textPosition: "middle",

  textAlign: "center",

  textShadow: true,

  textBackground: false,

  animationSpeed: 5,

  overlaySize: 35,

  overlayX: "center",

  overlayY: "center",

  brightness: 100,

  contrast: 100,

  saturation: 100,

  rotate: 0,

  flip: "none",

  volume: 100,

  mute: false,

  speed: 1

};


/* -----------------------------------------------------
   DOM
----------------------------------------------------- */

const video =
  $("video");

const previewArea =
  $("previewArea");

const previewCanvas =
  $("previewCanvas");

const emptyPreview =
  $("emptyPreview");

const videoInput =
  $("videoInput");

const videoInputSide =
  $("videoInputSide");

const overlayInput =
  $("overlayInput");

const textInput =
  $("textInput");

const textColor =
  $("textColor");

const textBg =
  $("textBg");

const textFont =
  $("textFont");

const textStyle =
  $("textStyle");

const textSize =
  $("textSize");

const textPosition =
  $("textPosition");

const textAlign =
  $("textAlign");

const textAnimation =
  $("textAnimation");

const animationSpeed =
  $("animationSpeed");

const textShadow =
  $("textShadow");

const textBackground =
  $("textBackground");

const overlaySize =
  $("overlaySize");

const overlayX =
  $("overlayX");

const overlayY =
  $("overlayY");

const brightness =
  $("brightness");

const contrast =
  $("contrast");

const saturation =
  $("saturation");

const rotate =
  $("rotate");

const flip =
  $("flip");

const volume =
  $("volume");

const mute =
  $("mute");

const speed =
  $("speed");

const resolution =
  $("resolution");

const seek =
  $("seek");

const startTime =
  $("startTime");

const endTime =
  $("endTime");


/* -----------------------------------------------------
   Utility
----------------------------------------------------- */

function formatTime(seconds) {

  seconds =
    Math.max(
      0,
      Number(seconds) || 0
    );

  const m =
    Math.floor(seconds / 60);

  const s =
    Math.floor(seconds % 60);

  return (
    String(m).padStart(2, "0") +
    ":" +
    String(s).padStart(2, "0")
  );
}


function clamp(value, min, max) {

  return Math.min(
    max,
    Math.max(min, value)
  );

}


function setProgress(percent, text) {

  $("progressBox")
    .classList
    .remove("hidden");

  $("progressBar").style.width =
    `${clamp(percent, 0, 100)}%`;

  $("progressText").textContent =
    text || `${Math.round(percent)}%`;

}


function loading(show, text) {

  $("loading")
    .classList
    .toggle("hidden", !show);

  if (text) {

    $("loadingText")
      .textContent = text;

  }

}


/* -----------------------------------------------------
   Video upload
----------------------------------------------------- */

function loadVideoFile(file) {

  if (!file) return;

  if (!file.type.startsWith("video/")) {

    alert("कृपया video file चुनें।");

    return;
  }

  state.videoFile = file;

  if (state.videoURL) {

    URL.revokeObjectURL(
      state.videoURL
    );

  }

  state.videoURL =
    URL.createObjectURL(file);

  video.src =
    state.videoURL;

  video.load();

  video.style.visibility =
    "visible";

  emptyPreview
    .classList
    .add("hidden");

  $("videoStatus")
    .textContent =
    file.name;

  video.onloadedmetadata =
    () => {

      startTime.max =
        video.duration;

      endTime.max =
        video.duration;

      endTime.value =
        video.duration.toFixed(1);

      $("duration")
        .textContent =
        formatTime(video.duration);

      seek.max =
        video.duration;

      seek.value = 0;

      renderPreview();

    };

}


/* -----------------------------------------------------
   Input events
----------------------------------------------------- */

videoInput.addEventListener(
  "change",
  e => loadVideoFile(
    e.target.files[0]
  )
);

videoInputSide.addEventListener(
  "change",
  e => loadVideoFile(
    e.target.files[0]
  )
);


/* Drag & Drop */

previewArea.addEventListener(
  "dragover",
  e => {

    e.preventDefault();

  }
);

previewArea.addEventListener(
  "drop",
  e => {

    e.preventDefault();

    const file =
      e.dataTransfer.files[0];

    loadVideoFile(file);

  }
);


/* -----------------------------------------------------
   Overlay media
----------------------------------------------------- */

overlayInput.addEventListener(
  "change",
  e => {

    const file =
      e.target.files[0];

    if (!file) return;

    state.overlayFile =
      file;

    if (state.overlayURL) {

      URL.revokeObjectURL(
        state.overlayURL
      );

    }

    state.overlayURL =
      URL.createObjectURL(file);

    state.overlayType =
      file.type.startsWith("video/")
        ? "video"
        : "image";

    renderPreview();

  }
);


/* -----------------------------------------------------
   Tabs
----------------------------------------------------- */

qsa(".tab").forEach(
  tab => {

    tab.addEventListener(
      "click",
      () => {

        qsa(".tab")
          .forEach(
            t =>
              t.classList.remove(
                "active"
              )
          );

        qsa(".tab-content")
          .forEach(
            c =>
              c.classList.remove(
                "active"
              )
          );

        tab.classList.add(
          "active"
        );

        $(
          "tab-" +
          tab.dataset.tab
        )
          .classList
          .add("active");

      }
    );

  }
);


/* -----------------------------------------------------
   Basic settings
----------------------------------------------------- */

rotate.addEventListener(
  "change",
  () => {

    state.rotate =
      Number(rotate.value);

    renderPreview();

  }
);

flip.addEventListener(
  "change",
  () => {

    state.flip =
      flip.value;

    renderPreview();

  }
);


/* -----------------------------------------------------
   Look settings
----------------------------------------------------- */

function updateLook() {

  state.brightness =
    Number(brightness.value);

  state.contrast =
    Number(contrast.value);

  state.saturation =
    Number(saturation.value);

  $("brightnessValue")
    .textContent =
    state.brightness;

  $("contrastValue")
    .textContent =
    state.contrast;

  $("saturationValue")
    .textContent =
    state.saturation;

  renderPreview();

}


brightness.addEventListener(
  "input",
  updateLook
);

contrast.addEventListener(
  "input",
  updateLook
);

saturation.addEventListener(
  "input",
  updateLook
);


/* -----------------------------------------------------
   Filters
----------------------------------------------------- */

qsa("[data-filter]")
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          state.filter =
            button.dataset.filter;

          qsa("[data-filter]")
            .forEach(
              b =>
                b.classList.remove(
                  "active"
                )
            );

          button.classList.add(
            "active"
          );

          $("settingFilter")
            .textContent =
            button.textContent.trim();

          renderPreview();

        }
      );

    }
  );


/* -----------------------------------------------------
   Text settings
----------------------------------------------------- */

function updateTextState() {

  state.text =
    textInput.value;

  state.textColor =
    textColor.value;

  state.textBg =
    textBg.value;

  state.textFont =
    textFont.value;

  state.textStyle =
    textStyle.value;

  state.textSize =
    Number(textSize.value);

  state.textPosition =
    textPosition.value;

  state.textAlign =
    textAlign.value;

  state.textAnimation =
    textAnimation.value;

  state.animationSpeed =
    Number(animationSpeed.value);

  state.textShadow =
    textShadow.checked;

  state.textBackground =
    textBackground.checked;

  $("textSizeValue")
    .textContent =
    state.textSize;

  $("animationSpeedValue")
    .textContent =
    state.animationSpeed;

  $("settingText")
    .textContent =
    state.text
      ? state.text.substring(0, 18)
      : "None";

  renderPreview();

}


[
  textInput,
  textColor,
  textBg,
  textFont,
  textStyle,
  textSize,
  textPosition,
  textAlign,
  textAnimation,
  animationSpeed,
  textShadow,
  textBackground
]
.forEach(
  element => {

    element.addEventListener(
      "input",
      updateTextState
    );

    element.addEventListener(
      "change",
      updateTextState
    );

  }
);


/* -----------------------------------------------------
   Frame
----------------------------------------------------- */

qsa("[data-frame]")
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          state.frame =
            button.dataset.frame;

          qsa("[data-frame]")
            .forEach(
              b =>
                b.classList.remove(
                  "active"
                )
            );

          button.classList.add(
            "active"
          );

          $("settingFrame")
            .textContent =
            button.textContent.trim();

          renderPreview();

        }
      );

    }
  );


overlaySize.addEventListener(
  "input",
  () => {

    state.overlaySize =
      Number(overlaySize.value);

    $("overlaySizeValue")
      .textContent =
      state.overlaySize;

    renderPreview();

  }
);


overlayX.addEventListener(
  "change",
  () => {

    state.overlayX =
      overlayX.value;

    renderPreview();

  }
);


overlayY.addEventListener(
  "change",
  () => {

    state.overlayY =
      overlayY.value;

    renderPreview();

  }
);


/* -----------------------------------------------------
   Audio
----------------------------------------------------- */

volume.addEventListener(
  "input",
  () => {

    state.volume =
      Number(volume.value);

    $("volumeValue")
      .textContent =
      state.volume;

    video.volume =
      state.volume / 100;

  }
);


mute.addEventListener(
  "change",
  () => {

    state.mute =
      mute.checked;

    video.muted =
      state.mute;

  }
);


speed.addEventListener(
  "change",
  () => {

    state.speed =
      Number(speed.value);

    video.playbackRate =
      state.speed;

    $("settingSpeed")
      .textContent =
      `${state.speed}x`;

  }
);


/* -----------------------------------------------------
   Video controls
----------------------------------------------------- */

$("playBtn").addEventListener(
  "click",
  () => {

    if (!state.videoFile) return;

    video.play();

  }
);


$("pauseBtn").addEventListener(
  "click",
  () => video.pause()
);


video.addEventListener(
  "timeupdate",
  () => {

    $("currentTime")
      .textContent =
      formatTime(video.currentTime);

    seek.value =
      video.currentTime;

    renderPreview();

  }
);


seek.addEventListener(
  "input",
  () => {

    video.currentTime =
      Number(seek.value);

    renderPreview();

  }
);


startTime.addEventListener(
  "change",
  () => {

    const value =
      clamp(
        Number(startTime.value),
        0,
        video.duration || 0
      );

    startTime.value =
      value;

    if (
      video.currentTime <
      value
    ) {

      video.currentTime =
        value;

    }

  }
);


endTime.addEventListener(
  "change",
  () => {

    const value =
      clamp(
        Number(endTime.value),
        0,
        video.duration || 0
      );

    endTime.value =
      value;

  }
);


/* -----------------------------------------------------
   Preview canvas
----------------------------------------------------- */

function getFilterCSS() {

  let brightnessValue =
    state.brightness / 100;

  let contrastValue =
    state.contrast / 100;

  let saturationValue =
    state.saturation / 100;

  let filter =
    `
      brightness(${brightnessValue})
      contrast(${contrastValue})
      saturate(${saturationValue})
    `;

  if (state.filter === "grayscale") {

    filter +=
      " grayscale(1)";

  }

  if (state.filter === "sepia") {

    filter +=
      " sepia(.8)";

  }

  if (state.filter === "vintage") {

    filter +=
      " sepia(.35) contrast(1.08) saturate(.8)";

  }

  if (state.filter === "cinematic") {

    filter +=
      " contrast(1.18) saturate(1.1)";

  }

  if (state.filter === "cool") {

    filter +=
      " saturate(.9) hue-rotate(10deg)";

  }

  return filter;

}


function renderPreview() {

  if (!state.videoFile) return;

  const width =
    video.videoWidth || 1280;

  const height =
    video.videoHeight || 720;

  previewCanvas.width =
    width;

  previewCanvas.height =
    height;

  const ctx =
    previewCanvas.getContext(
      "2d"
    );

  ctx.clearRect(
    0,
    0,
    width,
    height
  );

  ctx.save();

  ctx.filter =
    getFilterCSS();

  ctx.translate(
    width / 2,
    height / 2
  );

  let scaleX = 1;
  let scaleY = 1;

  if (
    state.flip ===
    "horizontal"
  ) {

    scaleX = -1;

  }

  if (
    state.flip ===
    "vertical"
  ) {

    scaleY = -1;

  }

  ctx.rotate(
    state.rotate *
    Math.PI /
    180
  );

  ctx.scale(
    scaleX,
    scaleY
  );

  let drawW =
    width;

  let drawH =
    height;

  if (
    state.rotate === 90 ||
    state.rotate === 270
  ) {

    drawW =
      height;

    drawH =
      width;

  }

  ctx.drawImage(
    video,
    -drawW / 2,
    -drawH / 2,
    drawW,
    drawH
  );

  ctx.restore();

}


/* -----------------------------------------------------
   Canvas sizing
----------------------------------------------------- */

function resizePreviewCanvas() {

  if (!state.videoFile) return;

  const rect =
    previewArea.getBoundingClientRect();

  const videoW =
    video.videoWidth ||
    1280;

  const videoH =
    video.videoHeight ||
    720;

  const ratio =
    videoW / videoH;

  let width =
    rect.width;

  let height =
    width / ratio;

  if (height > rect.height) {

    height =
      rect.height;

    width =
      height * ratio;

  }

  previewCanvas.style.width =
    `${width}px`;

  previewCanvas.style.height =
    `${height}px`;

}


window.addEventListener(
  "resize",
  resizePreviewCanvas
);

video.addEventListener(
  "loadedmetadata",
  resizePreviewCanvas
);


/* -----------------------------------------------------
   Animation preview overlay
----------------------------------------------------- */

function removePreviewObjects() {

  qsa(".text-preview")
    .forEach(
      e => e.remove()
    );

  qsa(".frame-preview")
    .forEach(
      e => e.remove()
    );

}


function addTextPreview() {

  if (!state.text) return;

  const el =
    document.createElement(
      "div"
    );

  el.className =
    "text-preview";

  el.textContent =
    state.text;

  el.style.color =
    state.textColor;

  el.style.fontFamily =
    state.textFont;

  el.style.fontSize =
    `${Math.max(
      14,
      state.textSize *
      .55
    )}px`;

  if (
    state.textStyle ===
    "bold"
  ) {

    el.style.fontWeight =
      "bold";

  }

  if (
    state.textStyle ===
    "italic"
  ) {

    el.style.fontStyle =
      "italic";

  }

  if (
    state.textStyle ===
    "bolditalic"
  ) {

    el.style.fontWeight =
      "bold";

    el.style.fontStyle =
      "italic";

  }

  if (state.textShadow) {

    el.style.textShadow =
      "3px 3px 7px black";

  }

  if (state.textBackground) {

    el.style.background =
      state.textBg;

    el.style.padding =
      "8px 14px";

    el.style.borderRadius =
      "8px";

  }

  if (
    state.textAlign ===
    "left"
  ) {

    el.style.left =
      "5%";

    el.style.transform =
      "translateY(-50%)";

  }

  if (
    state.textAlign ===
    "center"
  ) {

    el.style.left =
      "50%";

    el.style.transform =
      "translate(-50%,-50%)";

  }

  if (
    state.textAlign ===
    "right"
  ) {

    el.style.right =
      "5%";

    el.style.transform =
      "translateY(-50%)";

  }

  if (
    state.textPosition ===
    "top"
  ) {

    el.style.top =
      "14%";

  }

  if (
    state.textPosition ===
    "middle"
  ) {

    el.style.top =
      "50%";

  }

  if (
    state.textPosition ===
    "bottom"
  ) {

    el.style.top =
      "84%";

  }

  const animationClass =
    {
      left: "text-left",
      right: "text-right",
      up: "text-up",
      down: "text-down",
      float: "text-float",
      fade: "text-fade",
      zoom: "text-zoom",
      bounce: "text-bounce",
      type: "text-type"
    }[
      state.textAnimation
    ];

  if (animationClass) {

    el.classList.add(
      animationClass
    );

    const duration =
      11 -
      state.animationSpeed;

    el.style.animationDuration =
      `${duration / 2}s`;

  }

  previewArea.appendChild(
    el
  );

}


function addFramePreview() {

  if (
    !state.overlayURL ||
    state.frame ===
    "none"
  ) {

    return;

  }

  const wrap =
    document.createElement(
      "div"
    );

  wrap.className =
    `frame-preview frame-${state.frame}`;

  const width =
    previewArea.clientWidth;

  const size =
    width *
    state.overlaySize /
    100;

  wrap.style.width =
    `${size}px`;

  wrap.style.height =
    `${size * .72}px`;

  if (
    state.frame ===
    "circle"
  ) {

    wrap.style.height =
      `${size}px`;

  }

  if (
    state.overlayX ===
    "left"
  ) {

    wrap.style.left =
      "5%";

  }

  if (
    state.overlayX ===
    "center"
  ) {

    wrap.style.left =
      "50%";

    wrap.style.transform =
      "translateX(-50%)";

  }

  if (
    state.overlayX ===
    "right"
  ) {

    wrap.style.right =
      "5%";

  }

  if (
    state.overlayY ===
    "top"
  ) {

    wrap.style.top =
      "8%";

  }

  if (
    state.overlayY ===
    "center"
  ) {

    wrap.style.top =
      "50%";

    const old =
      wrap.style.transform ||
      "";

    wrap.style.transform =
      `${old} translateY(-50%)`;

  }

  if (
    state.overlayY ===
    "bottom"
  ) {

    wrap.style.bottom =
      "8%";

  }

  let media;

  if (
    state.overlayType ===
    "video"
  ) {

    media =
      document.createElement(
        "video"
      );

    media.src =
      state.overlayURL;

    media.muted = true;

    media.autoplay = true;

    media.loop = true;

    media.playsInline = true;

    media.play().catch(
      () => {}
    );

  } else {

    media =
      document.createElement(
        "img"
      );

    media.src =
      state.overlayURL;

  }

  wrap.appendChild(
    media
  );

  previewArea.appendChild(
    wrap
  );

}


/* Re-render overlays */

function updateOverlayPreview() {

  removePreviewObjects();

  addTextPreview();

  addFramePreview();

}


setInterval(
  updateOverlayPreview,
  700
);


/* -----------------------------------------------------
   Templates
----------------------------------------------------- */

qsa("[data-template]")
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          const name =
            button.dataset.template;

          state.template =
            name;

          qsa("[data-template]")
            .forEach(
              b =>
                b.classList.remove(
                  "active"
                )
            );

          button.classList.add(
            "active"
          );

          applyTemplate(
            name
          );

        }
      );

    }
  );


function applyTemplate(name) {

  if (name === "clean") {

    state.filter =
      "none";

    state.frame =
      "none";

    textInput.value =
      "";

    state.text = "";

  }

  if (name === "cinema") {

    state.filter =
      "cinematic";

    state.frame =
      "premium";

  }

  if (name === "social") {

    state.filter =
      "none";

    state.frame =
      "rounded";

    textBackground.checked =
      true;

    state.textBackground =
      true;

  }

  if (name === "news") {

    state.filter =
      "contrast";

    state.textPosition =
      "bottom";

    textPosition.value =
      "bottom";

    textBackground.checked =
      true;

    state.textBackground =
      true;

  }

  if (name === "birthday") {

    state.filter =
      "vintage";

    state.textAnimation =
      "bounce";

    textAnimation.value =
      "bounce";

  }

  if (name === "business") {

    state.filter =
      "cool";

    state.textAnimation =
      "fade";

    textAnimation.value =
      "fade";

  }

  $("templateInfo")
    .textContent =
    `${name} template applied`;

  updateTextState();

  renderPreview();

}


/* -----------------------------------------------------
   Export - Canvas MediaRecorder
----------------------------------------------------- */

function getCanvasSize() {

  const w =
    video.videoWidth ||
    1280;

  const h =
    video.videoHeight ||
    720;

  let targetW =
    w;

  let targetH =
    h;

  if (
    resolution.value !==
    "original"
  ) {

    const target =
      Number(
        resolution.value
      );

    const ratio =
      w / h;

    targetH =
      target;

    targetW =
      Math.round(
        target *
        ratio
      );

  }

  if (
    targetW % 2
  ) {

    targetW--;

  }

  if (
    targetH % 2
  ) {

    targetH--;

  }

  return {
    width: targetW,
    height: targetH
  };

}


/* -----------------------------------------------------
   Draw text on export canvas
----------------------------------------------------- */

function drawExportText(
  ctx,
  width,
  height,
  currentTime,
  duration
) {

  if (!state.text) return;

  let text =
    state.text;

  if (
    state.textAnimation ===
    "type"
  ) {

    const progress =
      clamp(
        currentTime /
        Math.max(
          .1,
          duration
        ),
        0,
        1
      );

    const chars =
      Math.floor(
        text.length *
        Math.min(
          1,
          progress * 1.8
        )
      );

    text =
      text.substring(
        0,
        chars
      );

  }

  ctx.save();

  const size =
    state.textSize *
    (
      width /
      Math.max(
        640,
        video.videoWidth
      )
    );

  let weight =
    "400";

  let style =
    "normal";

  if (
    state.textStyle ===
    "bold"
  ) {

    weight =
      "700";

  }

  if (
    state.textStyle ===
    "italic"
  ) {

    style =
      "italic";

  }

  if (
    state.textStyle ===
    "bolditalic"
  ) {

    weight =
      "700";

    style =
      "italic";

  }

  ctx.font =
    `${style} ${weight} ${size}px ${state.textFont}`;

  ctx.textAlign =
    state.textAlign;

  ctx.textBaseline =
    "middle";

  let x =
    width / 2;

  if (
    state.textAlign ===
    "left"
  ) {

    x =
      width * .06;

  }

  if (
    state.textAlign ===
    "right"
  ) {

    x =
      width * .94;

  }

  let y =
    height / 2;

  if (
    state.textPosition ===
    "top"
  ) {

    y =
      height * .14;

  }

  if (
    state.textPosition ===
    "bottom"
  ) {

    y =
      height * .84;

  }


  const progress =
    duration > 0
      ? currentTime / duration
      : 0;

  const speedFactor =
    .5 +
    state.animationSpeed /
    10;


  if (
    state.textAnimation ===
    "left"
  ) {

    x =
      width *
      (
        -0.3 +
        progress *
        1.6 *
        speedFactor
      );

  }

  if (
    state.textAnimation ===
    "right"
  ) {

    x =
      width *
      (
        1.3 -
        progress *
        1.6 *
        speedFactor
      );

  }

  if (
    state.textAnimation ===
    "up"
  ) {

    y =
      height *
      (
        1.2 -
        progress *
        1.5 *
        speedFactor
      );

  }

  if (
    state.textAnimation ===
    "down"
  ) {

    y =
      height *
      (
        -0.2 +
        progress *
        1.5 *
        speedFactor
      );

  }


  let alpha =
    1;

  if (
    state.textAnimation ===
    "fade"
  ) {

    alpha =
      .25 +
      Math.abs(
        Math.sin(
          currentTime * 2
        )
      ) *
      .75;

  }


  let scale =
    1;

  if (
    state.textAnimation ===
    "zoom"
  ) {

    scale =
      .7 +
      Math.abs(
        Math.sin(
          currentTime * 2
        )
      ) *
      .5;

  }

  if (
    state.textAnimation ===
    "bounce"
  ) {

    y +=
      Math.abs(
        Math.sin(
          currentTime * 4
        )
      ) *
      -height *
      .04;

  }

  if (
    state.textAnimation ===
    "float"
  ) {

    y +=
      Math.sin(
        currentTime * 2
      ) *
      height *
      .025;

  }


  ctx.globalAlpha =
    alpha;

  ctx.translate(
    x,
    y
  );

  ctx.scale(
    scale,
    scale
  );

  const metrics =
    ctx.measureText(
      text
    );

  const padding =
    size * .22;


  if (
    state.textBackground
  ) {

    let boxX;

    if (
      state.textAlign ===
      "center"
    ) {

      boxX =
        -metrics.width / 2;

    } else if (
      state.textAlign ===
      "right"
    ) {

      boxX =
        -metrics.width;

    } else {

      boxX = 0;

    }

    ctx.fillStyle =
      state.textBg;

    ctx.globalAlpha =
      .75;

    ctx.fillRect(
      boxX - padding,
      -size / 2 - padding / 2,
      metrics.width +
        padding * 2,
      size +
        padding
    );

    ctx.globalAlpha =
      alpha;

  }


  if (
    state.textShadow
  ) {

    ctx.shadowColor =
      "rgba(0,0,0,.9)";

    ctx.shadowBlur =
      10;

    ctx.shadowOffsetX =
      3;

    ctx.shadowOffsetY =
      3;

  }


  ctx.fillStyle =
    state.textColor;

  ctx.fillText(
    text,
    0,
    0
  );

  ctx.restore();

}


/* -----------------------------------------------------
   Draw overlay frame
----------------------------------------------------- */

async function createOverlayElement() {

  if (
    !state.overlayFile ||
    state.frame ===
    "none"
  ) {

    return null;

  }

  const element =
    document.createElement(
      state.overlayType ===
      "video"
        ? "video"
        : "img"
    );

  element.src =
    state.overlayURL;

  element.muted = true;

  element.playsInline = true;

  if (
    state.overlayType ===
    "video"
  ) {

    element.loop =
      true;

    await new Promise(
      resolve => {

        if (
          element.readyState >=
          2
        ) {

          resolve();

        } else {

          element.onloadeddata =
            resolve;

        }

      }
    );

    await element.play()
      .catch(
        () => {}
      );

  } else {

    await new Promise(
      resolve => {

        if (
          element.complete
        ) {

          resolve();

        } else {

          element.onload =
            resolve;

        }

      }
    );

  }

  return element;

}


/* -----------------------------------------------------
   Draw frame media on canvas
----------------------------------------------------- */

function drawOverlay(
  ctx,
  overlay,
  width,
  height
) {

  if (!overlay) return;

  const size =
    width *
    state.overlaySize /
    100;

  let ow =
    size;

  let oh =
    size *
    .72;

  if (
    state.frame ===
    "circle"
  ) {

    oh =
      size;

  }

  let x =
    (width - ow) / 2;

  let y =
    (height - oh) / 2;

  if (
    state.overlayX ===
    "left"
  ) {

    x =
      width * .05;

  }

  if (
    state.overlayX ===
    "right"
  ) {

    x =
      width -
      ow -
      width * .05;

  }

  if (
    state.overlayY ===
    "top"
  ) {

    y =
      height * .08;

  }

  if (
    state.overlayY ===
    "bottom"
  ) {

    y =
      height -
      oh -
      height * .08;

  }


  ctx.save();

  /* mask */

  if (
    state.frame ===
    "circle"
  ) {

    ctx.beginPath();

    ctx.arc(
      x + ow / 2,
      y + oh / 2,
      Math.min(
        ow,
        oh
      ) / 2,
      0,
      Math.PI * 2
    );

    ctx.clip();

  }

  if (
    state.frame ===
    "rounded"
  ) {

    roundedClip(
      ctx,
      x,
      y,
      ow,
      oh,
      30
    );

  }


  ctx.drawImage(
    overlay,
    x,
    y,
    ow,
    oh
  );

  ctx.restore();


  /* frame */

  ctx.save();

  if (
    state.frame ===
    "circle"
  ) {

    ctx.strokeStyle =
      "#ffffff";

    ctx.lineWidth =
      Math.max(
        6,
        width * .008
      );

    ctx.beginPath();

    ctx.arc(
      x + ow / 2,
      y + oh / 2,
      Math.min(
        ow,
        oh
      ) / 2,
      0,
      Math.PI * 2
    );

    ctx.stroke();

  }


  if (
    state.frame ===
    "rounded"
  ) {

    drawRoundedBorder(
      ctx,
      x,
      y,
      ow,
      oh,
      30,
      "#ffffff"
    );

  }


  if (
    state.frame ===
    "phone"
  ) {

    drawRoundedBorder(
      ctx,
      x - 8,
      y - 8,
      ow + 16,
      oh + 16,
      35,
      "#080808"
    );

    drawRoundedBorder(
      ctx,
      x - 3,
      y - 3,
      ow + 6,
      oh + 6,
      30,
      "#777"
    );

  }


  if (
    state.frame ===
    "premium"
  ) {

    drawRoundedBorder(
      ctx,
      x - 8,
      y - 8,
      ow + 16,
      oh + 16,
      18,
      "#d8b56a"
    );

  }


  if (
    state.frame ===
    "tv"
  ) {

    drawRoundedBorder(
      ctx,
      x - 12,
      y - 12,
      ow + 24,
      oh + 24,
      20,
      "#333"
    );

  }


  if (
    state.frame ===
    "film"
  ) {

    ctx.strokeStyle =
      "#111";

    ctx.lineWidth =
      18;

    ctx.strokeRect(
      x,
      y,
      ow,
      oh
    );

  }


  if (
    state.frame ===
    "polaroid"
  ) {

    ctx.fillStyle =
      "#fff";

    ctx.fillRect(
      x - 10,
      y - 10,
      ow + 20,
      oh + 55
    );

  }

  ctx.restore();

}


function roundedClip(
  ctx,
  x,
  y,
  w,
  h,
  r
) {

  r =
    Math.min(
      r,
      w / 2,
      h / 2
    );

  ctx.beginPath();

  ctx.moveTo(
    x + r,
    y
  );

  ctx.lineTo(
    x + w - r,
    y
  );

  ctx.quadraticCurveTo(
    x + w,
    y,
    x + w,
    y + r
  );

  ctx.lineTo(
    x + w,
    y + h - r
  );

  ctx.quadraticCurveTo(
    x + w,
    y + h,
    x + w - r,
    y + h
  );

  ctx.lineTo(
    x + r,
    y + h
  );

  ctx.quadraticCurveTo(
    x,
    y + h,
    x,
    y + h - r
  );

  ctx.lineTo(
    x,
    y + r
  );

  ctx.quadraticCurveTo(
    x,
    y,
    x + r,
    y
  );

  ctx.closePath();

  ctx.clip();

}


function drawRoundedBorder(
  ctx,
  x,
  y,
  w,
  h,
  r,
  color
) {

  r =
    Math.min(
      r,
      w / 2,
      h / 2
    );

  ctx.strokeStyle =
    color;

  ctx.lineWidth =
    Math.max(
      5,
      w * .012
    );

  ctx.beginPath();

  ctx.moveTo(
    x + r,
    y
  );

  ctx.lineTo(
    x + w - r,
    y
  );

  ctx.quadraticCurveTo(
    x + w,
    y,
    x + w,
    y + r
  );

  ctx.lineTo(
    x + w,
    y + h - r
  );

  ctx.quadraticCurveTo(
    x + w,
    y + h,
    x + w - r,
    y + h
  );

  ctx.lineTo(
    x + r,
    y + h
  );

  ctx.quadraticCurveTo(
    x,
    y + h,
    x,
    y + h - r
  );

  ctx.lineTo(
    x,
    y + r
  );

  ctx.quadraticCurveTo(
    x,
    y,
    x + r,
    y
  );

  ctx.stroke();

}


/* -----------------------------------------------------
   Draw complete frame
----------------------------------------------------- */

function drawExportFrame(
  ctx,
  width,
  height
) {

  if (
    state.frame ===
    "none"
  ) {

    return;

  }

  ctx.save();

  if (
    state.frame ===
    "premium"
  ) {

    ctx.strokeStyle =
      "#d8b56a";

    ctx.lineWidth =
      Math.max(
        10,
        width * .012
      );

    ctx.strokeRect(
      10,
      10,
      width - 20,
      height - 20
    );

  }

  if (
    state.frame ===
    "film"
  ) {

    ctx.strokeStyle =
      "#111";

    ctx.lineWidth =
      Math.max(
        25,
        width * .025
      );

    ctx.strokeRect(
      0,
      0,
      width,
      height
    );

  }

  ctx.restore();

}


/* -----------------------------------------------------
   Export main
----------------------------------------------------- */

async function exportVideo() {

  if (!state.videoFile) {

    alert(
      "पहले video upload करें।"
    );

    return;

  }


  const start =
    Number(
      startTime.value
    );

  const end =
    Number(
      endTime.value
    ) ||
    video.duration;

  if (
    end <= start
  ) {

    alert(
      "End time, Start time से बड़ा होना चाहिए।"
    );

    return;

  }


  loading(
    true,
    "Video export तैयार हो रहा है..."
  );

  setProgress(
    2,
    "Preparing video..."
  );


  try {

    const size =
      getCanvasSize();

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width =
      size.width;

    canvas.height =
      size.height;

    const ctx =
      canvas.getContext(
        "2d",
        {
          alpha: false
        }
      );


    const overlay =
      await createOverlayElement();


    video.pause();

    video.currentTime =
      start;

    video.playbackRate =
      state.speed;

    video.muted =
      state.mute;


    await new Promise(
      resolve => {

        const done =
          () => {

            video.removeEventListener(
              "seeked",
              done
            );

            resolve();

          };

        video.addEventListener(
          "seeked",
          done
        );

      }
    );


    const stream =
      canvas.captureStream(
        30
      );


    /*
      Audio capture.
      We use the video element audio when possible.
    */

    let audioContext = null;
    let audioDestination = null;

    try {

      audioContext =
        new (
          window.AudioContext ||
          window.webkitAudioContext
        )();

      const source =
        audioContext
          .createMediaElementSource(
            video
          );

      audioDestination =
        audioContext
          .createMediaStreamDestination();

      const gain =
        audioContext
          .createGain();

      gain.gain.value =
        state.mute
          ? 0
          : state.volume / 100;

      source.connect(
        gain
      );

      gain.connect(
        audioDestination
      );

      const audioTracks =
        audioDestination
          .stream
          .getAudioTracks();

      audioTracks.forEach(
        track =>
          stream.addTrack(
            track
          )
      );

    } catch (audioError) {

      console.warn(
        "Audio capture unavailable:",
        audioError
      );

    }


    const mimeTypes = [

      "video/webm;codecs=vp9,opus",

      "video/webm;codecs=vp8,opus",

      "video/webm"

    ];


    const mimeType =
      mimeTypes.find(
        type =>
          MediaRecorder.isTypeSupported(
            type
          )
      );


    if (!mimeType) {

      throw new Error(
        "इस browser में video recording supported नहीं है।"
      );

    }


    const recorder =
      new MediaRecorder(
        stream,
        {
          mimeType,
          videoBitsPerSecond:
            8000000
        }
      );


    const chunks = [];


    recorder.ondataavailable =
      event => {

        if (
          event.data &&
          event.data.size
        ) {

          chunks.push(
            event.data
          );

        }

      };


    const recorderPromise =
      new Promise(
        (resolve, reject) => {

          recorder.onstop =
            () => {

              resolve();

            };

          recorder.onerror =
            event => {

              reject(
                event.error ||
                new Error(
                  "Recorder error"
                )
              );

            };

        }
      );


    /*
      Draw loop
    */

    let stopped =
      false;

    const total =
      end - start;


    function drawFrame() {

      if (stopped) return;


      const current =
        video.currentTime -
        start;

      const progress =
        clamp(
          current / total,
          0,
          1
        );


      const vw =
        video.videoWidth ||
        1280;

      const vh =
        video.videoHeight ||
        720;


      ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );


      ctx.save();


      ctx.filter =
        getFilterCSS();


      let scaleX = 1;
      let scaleY = 1;


      if (
        state.flip ===
        "horizontal"
      ) {

        scaleX = -1;

      }


      if (
        state.flip ===
        "vertical"
      ) {

        scaleY = -1;

      }


      ctx.translate(
        canvas.width / 2,
        canvas.height / 2
      );


      ctx.rotate(
        state.rotate *
        Math.PI /
        180
      );


      ctx.scale(
        scaleX,
        scaleY
      );


      let dw =
        canvas.width;

      let dh =
        canvas.height;


      if (
        state.rotate === 90 ||
        state.rotate === 270
      ) {

        dw =
          canvas.height;

        dh =
          canvas.width;

      }


      /*
        Cover the canvas while keeping aspect ratio.
      */

      const videoRatio =
        vw / vh;

      const canvasRatio =
        dw / dh;

      if (
        videoRatio >
        canvasRatio
      ) {

        dh =
          dw /
          videoRatio;

      } else {

        dw =
          dh *
          videoRatio;

      }


      ctx.drawImage(
        video,
        -dw / 2,
        -dh / 2,
        dw,
        dh
      );


      ctx.restore();


      /*
        Frame media
      */

      if (overlay) {

        drawOverlay(
          ctx,
          overlay,
          canvas.width,
          canvas.height
        );

      }


      /*
        Text
      */

      drawExportText(
        ctx,
        canvas.width,
        canvas.height,
        current,
        total
      );


      /*
        Global frame
      */

      drawExportFrame(
        ctx,
        canvas.width,
        canvas.height
      );


      setProgress(
        5 +
        progress * 85,
        `Rendering ${Math.round(
          progress * 100
        )}%`
      );


      if (
        video.currentTime >=
        end
      ) {

        stopped = true;

        video.pause();

        recorder.stop();

        return;

      }


      requestAnimationFrame(
        drawFrame
      );

    }


    recorder.start(
      250
    );


    await video.play();


    drawFrame();


    await recorderPromise;


    if (audioContext) {

      try {

        await audioContext.close();

      } catch (_) {}

    }


    const blob =
      new Blob(
        chunks,
        {
          type:
            mimeType
        }
      );


    if (!blob.size) {

      throw new Error(
        "Exported video empty है।"
      );

    }


    const url =
      URL.createObjectURL(
        blob
      );


    const download =
      $("downloadBtn");


    download.href =
      url;

    download.download =
      "ai-edited-video.webm";

    download.textContent =
      "⬇️ Download Edited Video";

    download.classList
      .remove("hidden");


    setProgress(
      100,
      "Export complete!"
    );


    loading(
      false
    );


    alert(
      "वीडियो तैयार है। नीचे Download बटन दबाकर डाउनलोड करें।"
    );


  } catch (error) {

    console.error(
      "Export error:",
      error
    );

    loading(
      false
    );

    $("progressBox")
      .classList
      .remove("hidden");

    $("progressText")
      .textContent =
      "Export failed: " +
      error.message;


    alert(
      "Export में समस्या आई:\n\n" +
      error.message +
      "\n\nChrome/Edge में दोबारा प्रयास करें।"
    );

  }

}


/* -----------------------------------------------------
   Export buttons
----------------------------------------------------- */

$("exportBtn")
  .addEventListener(
    "click",
    exportVideo
  );

$("exportBtnSide")
  .addEventListener(
    "click",
    exportVideo
  );


/* -----------------------------------------------------
   Initial UI
----------------------------------------------------- */

$("volumeValue")
  .textContent =
  "100";

$("textSizeValue")
  .textContent =
  "60";

$("animationSpeedValue")
  .textContent =
  "5";

$("overlaySizeValue")
  .textContent =
  "35";


/* -----------------------------------------------------
   Initial render
----------------------------------------------------- */

video.addEventListener(
  "loadeddata",
  () => {

    renderPreview();

    resizePreviewCanvas();

    updateOverlayPreview();

  }
);


/* -----------------------------------------------------
   File cleanup
----------------------------------------------------- */

window.addEventListener(
  "beforeunload",
  () => {

    if (state.videoURL) {

      URL.revokeObjectURL(
        state.videoURL
      );

    }

    if (state.overlayURL) {

      URL.revokeObjectURL(
        state.overlayURL
      );

    }

  }
);
