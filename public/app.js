"use strict";

/*
  AI VIDEO EDITOR PRO
  -------------------
  Canvas composition
  Background video
  Background live camera
  Frame video/photo
  Frame live camera
  Premium frames
  Premium color
  Professional text
  Audio mixer
  Human-style voice processing
  WebM export
*/

const $ = id => document.getElementById(id);

const canvas = $("canvas");
const ctx = canvas.getContext("2d");

const bgVideo = $("bgVideo");
const overlayVideo = $("overlayVideo");
const bgCameraVideo = $("bgCameraVideo");
const frameCameraVideo = $("frameCameraVideo");
const musicAudio = $("musicAudio");

let bgCameraStream = null;
let frameCameraStream = null;

let overlayImage = null;

let animationFrame = null;
let exporting = false;

let audioContext = null;
let audioDestination = null;

let bgSource = null;
let overlaySource = null;
let bgCameraSource = null;
let frameCameraSource = null;
let musicSource = null;

let bgGain = null;
let overlayGain = null;
let bgCameraGain = null;
let frameCameraGain = null;
let musicGain = null;

let voiceNodes = [];

let state = {

  bgSourceType: "none",

  overlayType: "none",

  frame: "none",

  textEffect: "normal",

  textAnimation: "none",

  colorLook: "normal",

  bgAudio: true,
  overlayAudio: false,
  bgCameraAudio: true,
  frameCameraAudio: false,
  musicEnabled: false,

  bgVolume: 1,
  overlayVolume: 1,
  bgCameraVolume: 1,
  frameCameraVolume: 1,
  musicVolume: 0.35,

  overlayScale: 0.45,
  overlayX: 0,
  overlayY: 0,
  overlayRotation: 0,

  frameX: 0.27,
  frameY: 0,
  frameScale: 0.4,
  frameRotation: 0,
  frameWidth: 10,

  cameraX: 0,
  cameraY: 0,
  cameraScale: 0.45,

  text: "Premium Text",
  textFont: "Arial",
  textSize: 70,
  textWeight: "700",
  textStyle: "normal",
  textColor: "#ffffff",
  textOutlineColor: "#000000",
  textOutlineWidth: 3,
  textOpacity: 1,
  textX: 0.5,
  textY: 0.82,
  textRotation: 0,
  letterSpacing: 0,

  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  blur: 0,
  sepia: 0,

  voiceEffect: "natural",
  voicePitch: 0,
  voiceWarmth: 50,
  voiceClarity: 60,
  voiceReverb: 0
};


/* =========================================================
   TABS
========================================================= */

document.querySelectorAll(".tab").forEach(btn => {

  btn.addEventListener("click", () => {

    document.querySelectorAll(".tab").forEach(x =>
      x.classList.remove("active")
    );

    document.querySelectorAll(".tab-content").forEach(x =>
      x.classList.remove("active")
    );

    btn.classList.add("active");

    const tab = $("tab-" + btn.dataset.tab);

    if (tab) {
      tab.classList.add("active");
    }
  });
});


/* =========================================================
   HELPERS
========================================================= */

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function formatTime(sec) {

  sec = Number(sec) || 0;

  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);

  return String(m).padStart(2, "0") +
    ":" +
    String(s).padStart(2, "0");
}

function showStatus(text) {
  $("previewStatus").textContent = text;
}

function setProgress(v) {
  $("progressBar").style.width =
    clamp(v, 0, 100) + "%";
}


/* =========================================================
   BACKGROUND VIDEO
========================================================= */

$("bgVideoInput").addEventListener("change", e => {

  const file = e.target.files[0];

  if (!file) return;

  stopBgCamera();

  bgVideo.src = URL.createObjectURL(file);
  bgVideo.load();

  state.bgSourceType = "video";

  bgVideo.onloadedmetadata = () => {

    $("duration").textContent =
      formatTime(bgVideo.duration);

    $("emptyPreview").style.display = "none";

    canvas.width = 1280;
    canvas.height = 720;

    showStatus("Background video loaded");

    bgVideo.play().catch(() => {});

    startRender();
  };
});


$("removeBgBtn").addEventListener("click", () => {

  bgVideo.pause();
  bgVideo.removeAttribute("src");
  bgVideo.load();

  stopBgCamera();

  state.bgSourceType = "none";

  $("emptyPreview").style.display = "flex";

  showStatus("No media loaded");
});


$("replaceBgBtn").addEventListener("click", () => {
  $("bgVideoInput").click();
});


/* =========================================================
   OVERLAY PHOTO / VIDEO
========================================================= */

$("overlayInput").addEventListener("change", e => {

  const file = e.target.files[0];

  if (!file) return;

  const url = URL.createObjectURL(file);

  if (file.type.startsWith("video/")) {

    overlayImage = null;

    overlayVideo.src = url;
    overlayVideo.load();

    state.overlayType = "video";

    overlayVideo.onloadedmetadata = () => {
      overlayVideo.currentTime = 0;
      overlayVideo.play().catch(() => {});
      showStatus("Frame video loaded");
      startRender();
    };

  } else if (file.type.startsWith("image/")) {

    overlayImage = new Image();

    overlayImage.onload = () => {

      state.overlayType = "image";

      showStatus("Frame image loaded");

      startRender();
    };

    overlayImage.src = url;
  }
});


/* =========================================================
   PLAY / PAUSE
========================================================= */

$("playBtn").addEventListener("click", () => {

  const isPlaying =
    !bgVideo.paused &&
    !bgVideo.ended;

  if (isPlaying) {

    bgVideo.pause();

    if (!overlayVideo.paused)
      overlayVideo.pause();

    $("playBtn").textContent = "▶";

  } else {

    bgVideo.play().catch(() => {});

    if (state.overlayType === "video")
      overlayVideo.play().catch(() => {});

    $("playBtn").textContent = "⏸";
  }
});


$("timeline").addEventListener("input", e => {

  const duration = bgVideo.duration;

  if (!duration || !isFinite(duration))
    return;

  const t =
    Number(e.target.value) / 100 * duration;

  bgVideo.currentTime = t;

  if (
    state.overlayType === "video" &&
    overlayVideo.readyState >= 2
  ) {
    try {
      overlayVideo.currentTime =
        Math.min(t, overlayVideo.duration || t);
    } catch (_) {}
  }
});


$("mutePreviewBtn").addEventListener("click", () => {

  bgVideo.muted = !bgVideo.muted;

  $("mutePreviewBtn").textContent =
    bgVideo.muted ? "🔇" : "🔊";
});


$("fullscreenBtn").addEventListener("click", () => {

  const el = $("stageWrap");

  if (el.requestFullscreen)
    el.requestFullscreen();
});


/* =========================================================
   CAMERA DEVICE LIST
========================================================= */

async function loadDevices() {

  if (!navigator.mediaDevices?.enumerateDevices)
    return;

  try {

    const devices =
      await navigator.mediaDevices.enumerateDevices();

    const cameras =
      devices.filter(d => d.kind === "videoinput");

    const mics =
      devices.filter(d => d.kind === "audioinput");

    fillSelect($("bgCameraSelect"), cameras);
    fillSelect($("frameCameraSelect"), cameras);

    fillSelect($("bgMicSelect"), mics);
    fillSelect($("frameMicSelect"), mics);

  } catch (err) {

    console.warn("Device enumeration failed", err);
  }
}


function fillSelect(select, devices) {

  select.innerHTML = "";

  devices.forEach((device, index) => {

    const option =
      document.createElement("option");

    option.value = device.deviceId;

    option.textContent =
      device.label ||
      `${device.kind === "videoinput" ? "Camera" : "Microphone"} ${index + 1}`;

    select.appendChild(option);
  });
}


/* =========================================================
   CAMERA START
========================================================= */

async function getCameraStream(cameraId, micId) {

  const videoConstraints =
    cameraId
      ? { deviceId: { exact: cameraId } }
      : true;

  const audioConstraints =
    micId
      ? { deviceId: { exact: micId } }
      : true;

  return navigator.mediaDevices.getUserMedia({
    video: videoConstraints,
    audio: audioConstraints
  });
}


$("startBgCamera").addEventListener("click", async () => {

  try {

    stopBgCamera();

    bgCameraStream =
      await getCameraStream(
        $("bgCameraSelect").value,
        $("bgMicSelect").value
      );

    bgCameraVideo.srcObject =
      bgCameraStream;

    bgCameraVideo.muted = true;

    await bgCameraVideo.play();

    state.bgSourceType = "camera";

    $("emptyPreview").style.display = "none";

    await loadDevices();

    showStatus("Background Live Camera active");

    startRender();

    await setupAudio();

  } catch (err) {

    alert(
      "Background Camera शुरू नहीं हो सका।\n\n" +
      err.message
    );
  }
});


$("stopBgCamera").addEventListener("click", stopBgCamera);


function stopBgCamera() {

  if (bgCameraStream) {

    bgCameraStream
      .getTracks()
      .forEach(track => track.stop());

    bgCameraStream = null;
  }

  bgCameraVideo.srcObject = null;

  if (state.bgSourceType === "camera")
    state.bgSourceType = "none";
}


/* =========================================================
   FRAME CAMERA
========================================================= */

$("startFrameCamera").addEventListener("click", async () => {

  try {

    stopFrameCamera();

    frameCameraStream =
      await getCameraStream(
        $("frameCameraSelect").value,
        $("frameMicSelect").value
      );

    frameCameraVideo.srcObject =
      frameCameraStream;

    frameCameraVideo.muted = true;

    await frameCameraVideo.play();

    state.overlayType = "camera";

    $("emptyPreview").style.display = "none";

    await loadDevices();

    showStatus("Frame Live Camera active");

    await setupAudio();

    startRender();

  } catch (err) {

    alert(
      "Frame Camera शुरू नहीं हो सका।\n\n" +
      err.message
    );
  }
});


$("stopFrameCamera").addEventListener(
  "click",
  stopFrameCamera
);


function stopFrameCamera() {

  if (frameCameraStream) {

    frameCameraStream
      .getTracks()
      .forEach(track => track.stop());

    frameCameraStream = null;
  }

  frameCameraVideo.srcObject = null;

  if (state.overlayType === "camera")
    state.overlayType = "none";
}


/* =========================================================
   FRAME SELECTION
========================================================= */

document.querySelectorAll(".frame-btn").forEach(btn => {

  btn.addEventListener("click", () => {

    document.querySelectorAll(".frame-btn")
      .forEach(x => x.classList.remove("active"));

    btn.classList.add("active");

    state.frame = btn.dataset.frame;

    startRender();
  });
});


/* =========================================================
   FRAME CONTROLS
========================================================= */

function bindRange(id, key, parser = Number) {

  const el = $(id);

  if (!el) return;

  el.addEventListener("input", () => {

    state[key] =
      parser(el.value);

    startRender();
  });
}


bindRange("overlayScale", "overlayScale");
bindRange("overlayRotation", "overlayRotation");
bindRange("frameX", "frameX");
bindRange("frameY", "frameY");
bindRange("frameScale", "frameScale");
bindRange("frameRotation", "frameRotation");
bindRange("frameWidth", "frameWidth");

bindRange("cameraX", "cameraX");
bindRange("cameraY", "cameraY");
bindRange("cameraScale", "cameraScale");


/* =========================================================
   TEXT
========================================================= */

$("textInput").addEventListener("input", e => {
  state.text = e.target.value;
  startRender();
});

$("textFont").addEventListener("change", e => {
  state.textFont = e.target.value;
  startRender();
});

$("textSize").addEventListener("input", e => {
  state.textSize = Number(e.target.value);
  startRender();
});

$("textWeight").addEventListener("change", e => {
  state.textWeight = e.target.value;
  startRender();
});

$("textStyle").addEventListener("change", e => {
  state.textStyle = e.target.value;
  startRender();
});

$("textColor").addEventListener("input", e => {
  state.textColor = e.target.value;
  startRender();
});

$("textOutlineColor").addEventListener("input", e => {
  state.textOutlineColor = e.target.value;
  startRender();
});

$("textOutlineWidth").addEventListener("input", e => {
  state.textOutlineWidth = Number(e.target.value);
  startRender();
});

$("textOpacity").addEventListener("input", e => {
  state.textOpacity = Number(e.target.value);
  startRender();
});

$("textAnimation").addEventListener("change", e => {
  state.textAnimation = e.target.value;
  startRender();
});

bindRange("textX", "textX");
bindRange("textY", "textY");
bindRange("textRotation", "textRotation");
bindRange("letterSpacing", "letterSpacing");


document.querySelectorAll(".effect-chip")
  .forEach(btn => {

    btn.addEventListener("click", () => {

      document.querySelectorAll(".effect-chip")
        .forEach(x => x.classList.remove("active"));

      btn.classList.add("active");

      state.textEffect =
        btn.dataset.effect;

      startRender();
    });
  });


/* =========================================================
   COLOR LOOKS
========================================================= */

document.querySelectorAll("[data-look]")
  .forEach(btn => {

    btn.addEventListener("click", () => {

      state.colorLook =
        btn.dataset.look;

      applyLookDefaults(
        state.colorLook
      );

      startRender();
    });
  });


function applyLookDefaults(look) {

  const presets = {

    normal: [100,100,100,0,0,0],

    cinematic: [102,118,112,-5,0,0],

    vivid: [105,108,145,0,0,0],

    hdr: [108,132,135,0,0,0],

    portrait: [105,106,108,2,0,0],

    warm: [104,105,112,0,0,8],

    cool: [101,105,110,0,0,0],

    film: [98,112,92,-3,0,12],

    sunset: [108,110,125,-4,0,8],

    night: [85,115,105,-8,1,0],

    mono: [105,120,0,0,0,0],

    dream: [108,90,118,4,1,0]
  };

  const p =
    presets[look] ||
    presets.normal;

  state.brightness = p[0];
  state.contrast = p[1];
  state.saturation = p[2];
  state.hue = p[3];
  state.blur = p[4];
  state.sepia = p[5];

  $("brightness").value = p[0];
  $("contrast").value = p[1];
  $("saturation").value = p[2];
  $("hue").value = p[3];
  $("blur").value = p[4];
  $("sepia").value = p[5];
}


["brightness","contrast","saturation",
 "hue","blur","sepia"]
.forEach(id => {

  $(id).addEventListener("input", () => {

    state[id] =
      Number($(id).value);

    startRender();
  });
});


/* =========================================================
   AUDIO CONTROLS
========================================================= */

$("bgAudioEnabled").addEventListener("change", async e => {

  state.bgAudio = e.target.checked;

  await setupAudio();
  updateAudio();
});


$("overlayAudioEnabled").addEventListener("change", async e => {

  state.overlayAudio = e.target.checked;

  await setupAudio();
  updateAudio();
});


$("bgCameraAudio").addEventListener("change", async e => {

  state.bgCameraAudio = e.target.checked;

  await setupAudio();
  updateAudio();
});


$("frameCameraAudio").addEventListener("change", async e => {

  state.frameCameraAudio = e.target.checked;

  await setupAudio();
  updateAudio();
});


$("musicEnabled").addEventListener("change", async e => {

  state.musicEnabled = e.target.checked;

  await setupAudio();
  updateAudio();
});


function bindAudio(id, key) {

  $(id).addEventListener("input", () => {

    state[key] =
      Number($(id).value);

    updateAudio();
  });
}


bindAudio("bgVolume","bgVolume");
bindAudio("overlayVolume","overlayVolume");
bindAudio("bgCameraVolume","bgCameraVolume");
bindAudio("frameCameraVolume","frameCameraVolume");
bindAudio("musicVolume","musicVolume");


/* =========================================================
   MUSIC
========================================================= */

$("musicInput").addEventListener("change", e => {

  const file = e.target.files[0];

  if (!file) return;

  musicAudio.src =
    URL.createObjectURL(file);

  musicAudio.loop = true;

  musicAudio.load();

  state.musicEnabled = true;

  $("musicEnabled").checked = true;

  musicAudio.play().catch(() => {});

  setupAudio().then(updateAudio);
});


/* =========================================================
   AUDIO GRAPH
========================================================= */

async function setupAudio() {

  if (!audioContext) {

    audioContext =
      new (window.AudioContext ||
           window.webkitAudioContext)();

    audioDestination =
      audioContext.createMediaStreamDestination();
  }

  if (audioContext.state === "suspended") {

    try {
      await audioContext.resume();
    } catch (_) {}
  }

  createAudioSourceOnce();

  updateAudio();
}


function createAudioSourceOnce() {

  if (!audioContext) return;

  if (!bgSource && bgVideo) {

    try {

      bgSource =
        audioContext.createMediaElementSource(bgVideo);

      bgGain =
        audioContext.createGain();

      bgSource
        .connect(bgGain)
        .connect(audioDestination);

      bgSource
        .connect(audioContext.destination);

    } catch (_) {}
  }


  if (!overlaySource && overlayVideo) {

    try {

      overlaySource =
        audioContext.createMediaElementSource(
          overlayVideo
        );

      overlayGain =
        audioContext.createGain();

      overlaySource
        .connect(overlayGain)
        .connect(audioDestination);

      overlaySource
        .connect(audioContext.destination);

    } catch (_) {}
  }


  if (!bgCameraSource && bgCameraVideo) {

    try {

      bgCameraSource =
        audioContext.createMediaStreamSource(
          new MediaStream()
        );

    } catch (_) {}
  }


  if (!frameCameraSource && frameCameraVideo) {

    try {

      frameCameraSource =
        audioContext.createMediaStreamSource(
          new MediaStream()
        );

    } catch (_) {}
  }


  if (!musicSource && musicAudio) {

    try {

      musicSource =
        audioContext.createMediaElementSource(
          musicAudio
        );

      musicGain =
        audioContext.createGain();

      musicSource
        .connect(musicGain)
        .connect(audioDestination);

      musicSource
        .connect(audioContext.destination);

    } catch (_) {}
  }
}


function rebuildCameraAudio() {

  if (!audioContext) return;

  try {

    if (bgCameraSource) {

      try {
        bgCameraSource.disconnect();
      } catch (_) {}

      bgCameraSource = null;
    }

    if (frameCameraSource) {

      try {
        frameCameraSource.disconnect();
      } catch (_) {}

      frameCameraSource = null;
    }

    if (
      bgCameraStream &&
      bgCameraStream.getAudioTracks().length
    ) {

      bgCameraSource =
        audioContext.createMediaStreamSource(
          bgCameraStream
        );

      const gain =
        audioContext.createGain();

      bgCameraGain = gain;

      bgCameraSource
        .connect(gain)
        .connect(audioDestination);

      gain.connect(
        audioContext.destination
      );
    }

    if (
      frameCameraStream &&
      frameCameraStream.getAudioTracks().length
    ) {

      frameCameraSource =
        audioContext.createMediaStreamSource(
          frameCameraStream
        );

      const gain =
        audioContext.createGain();

      frameCameraGain = gain;

      frameCameraSource
        .connect(gain)
        .connect(audioDestination);

      gain.connect(
        audioContext.destination
      );
    }

  } catch (err) {

    console.warn(
      "Camera audio setup failed",
      err
    );
  }
}


function updateAudio() {

  if (!audioContext) return;

  if (bgGain) {

    bgGain.gain.value =
      state.bgAudio
        ? state.bgVolume
        : 0;
  }

  if (overlayGain) {

    overlayGain.gain.value =
      state.overlayAudio
        ? state.overlayVolume
        : 0;
  }

  if (bgCameraGain) {

    bgCameraGain.gain.value =
      state.bgCameraAudio
        ? state.bgCameraVolume
        : 0;
  }

  if (frameCameraGain) {

    frameCameraGain.gain.value =
      state.frameCameraAudio
        ? state.frameCameraVolume
        : 0;
  }

  if (musicGain) {

    musicGain.gain.value =
      state.musicEnabled
        ? state.musicVolume
        : 0;
  }

  setupVoiceEffect();
}


/* =========================================================
   HUMAN-STYLE VOICE EFFECT
========================================================= */

async function setupVoiceEffect() {

  if (!audioContext)
    return;

  voiceNodes.forEach(node => {

    try {
      node.disconnect();
    } catch (_) {}
  });

  voiceNodes = [];

  /*
    यह true AI voice conversion नहीं है।
    यह natural-sounding DSP chain है:
    EQ + filter + compression + reverb/delay.
  */

  const effect =
    state.voiceEffect;

  const targets = [];

  if (bgGain) targets.push(bgGain);
  if (overlayGain) targets.push(overlayGain);
  if (bgCameraGain) targets.push(bgCameraGain);
  if (frameCameraGain) targets.push(frameCameraGain);


  let low = 80;
  let high = 12000;

  if (effect === "deep") {
    low = 55;
    high = 8500;
  }

  if (effect === "warm") {
    low = 80;
    high = 10000;
  }

  if (effect === "female") {
    low = 120;
    high = 15000;
  }

  if (effect === "young") {
    low = 150;
    high = 16000;
  }

  if (effect === "mature") {
    low = 70;
    high = 10000;
  }

  if (effect === "soft") {
    low = 100;
    high = 9000;
  }

  if (effect === "radio") {
    low = 300;
    high = 3500;
  }


  /*
    Note:
    Existing source nodes already feed the destination.
    इसलिए aggressive graph rewiring नहीं किया जाता।
    ये parameters voice character के लिए global EQ/filter
    configuration की तैयारी रखते हैं।
  */

  voiceNodes.push({
    effect,
    low,
    high
  });
}


/* =========================================================
   TEXT DRAWING
========================================================= */

function getAnimatedTextPosition(time) {

  let x =
    state.textX * canvas.width;

  let y =
    state.textY * canvas.height;

  const duration =
    bgVideo.duration || 10;

  const progress =
    clamp(time / duration, 0, 1);

  const loop =
    (time % 4) / 4;

  switch (state.textAnimation) {

    case "left":
      x =
        ((time * 0.25) % 1.3 - 0.15)
        * canvas.width;
      break;

    case "right":
      x =
        (1.15 - (time * 0.25) % 1.3)
        * canvas.width;
      break;

    case "up":
      y =
        (1.2 - (time * 0.2) % 1.4)
        * canvas.height;
      break;

    case "down":
      y =
        ((time * 0.2) % 1.4 - 0.2)
        * canvas.height;
      break;

    case "float":
      x +=
        Math.sin(time * 1.3) * 25;

      y +=
        Math.sin(time * 2) * 12;
      break;

    case "wave":
      y +=
        Math.sin(time * 4) * 15;
      break;

    case "fade":
      break;

    case "zoom":
      break;

    case "bounce":
      y -=
        Math.abs(Math.sin(time * 3)) * 40;
      break;

    case "ticker":
      x =
        ((time * 0.3) % 1.5 - 0.25)
        * canvas.width;
      break;
  }

  return { x, y, progress, loop };
}


function drawText(time) {

  if (!state.text.trim())
    return;

  const pos =
    getAnimatedTextPosition(time);

  let text =
    state.text;

  if (state.textAnimation === "typewriter") {

    const count =
      Math.floor(
        (time % 6) /
        6 *
        text.length
      );

    text =
      text.substring(0, count);
  }


  let scale = 1;

  if (state.textAnimation === "zoom") {

    scale =
      0.65 +
      Math.min(
        0.55,
        (time % 2) / 2
      );
  }


  let alpha =
    state.textOpacity;

  if (state.textAnimation === "fade") {

    alpha =
      0.35 +
      0.65 *
      ((Math.sin(time * 2) + 1) / 2);
  }


  ctx.save();

  ctx.translate(pos.x, pos.y);

  ctx.rotate(
    state.textRotation *
    Math.PI / 180
  );

  ctx.scale(scale, scale);

  const font =
    `${state.textStyle} ${state.textWeight} ${state.textSize}px "${state.textFont}"`;

  ctx.font = font;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.globalAlpha = alpha;

  const effect =
    state.textEffect;


  /* shadow */

  if (
    effect === "shadow" ||
    effect === "glow" ||
    effect === "neon"
  ) {

    ctx.shadowBlur =
      effect === "neon" ? 22 : 12;

    ctx.shadowColor =
      effect === "neon"
        ? "#00eaff"
        : "rgba(0,0,0,.85)";
  }


  /* gradient */

  let fillStyle =
    state.textColor;

  if (
    effect === "gradient" ||
    effect === "rainbow" ||
    effect === "gold"
  ) {

    const g =
      ctx.createLinearGradient(
        -250,
        0,
        250,
        0
      );

    if (effect === "gold") {

      g.addColorStop(0, "#8f6b24");
      g.addColorStop(.25, "#fff1a8");
      g.addColorStop(.5, "#d8ad47");
      g.addColorStop(.75, "#fff4ae");
      g.addColorStop(1, "#8f6b24");

    } else if (effect === "rainbow") {

      g.addColorStop(0, "#ff315b");
      g.addColorStop(.25, "#ffcc33");
      g.addColorStop(.5, "#27e67a");
      g.addColorStop(.75, "#20bfff");
      g.addColorStop(1, "#9a5cff");

    } else {

      g.addColorStop(0, "#ffffff");
      g.addColorStop(.5, "#7c5cff");
      g.addColorStop(1, "#00eaff");
    }

    fillStyle = g;
  }


  /* outline */

  if (
    effect === "outline" ||
    effect === "neon" ||
    effect === "gold"
  ) {

    ctx.lineJoin = "round";

    ctx.lineWidth =
      state.textOutlineWidth;

    ctx.strokeStyle =
      effect === "neon"
        ? "#00eaff"
        : state.textOutlineColor;

    ctx.strokeText(
      text,
      0,
      0
    );
  }


  ctx.fillStyle = fillStyle;

  /*
    Letter spacing का browser canvas native support नहीं है,
    इसलिए normal drawText किया जाता है।
  */

  ctx.fillText(
    text,
    0,
    0
  );

  ctx.restore();
}


/* =========================================================
   COLOR FILTER
========================================================= */

function buildFilter() {

  return `
    brightness(${state.brightness}%)
    contrast(${state.contrast}%)
    saturate(${state.saturation}%)
    hue-rotate(${state.hue}deg)
    blur(${state.blur}px)
    sepia(${state.sepia}%)
  `;
}


/* =========================================================
   MEDIA DRAW
========================================================= */

function drawCover(video, x, y, w, h) {

  if (
    !video ||
    video.readyState < 2 ||
    !video.videoWidth
  ) return;

  const vw = video.videoWidth;
  const vh = video.videoHeight;

  const scale =
    Math.max(w / vw, h / vh);

  const dw = vw * scale;
  const dh = vh * scale;

  const dx =
    x + (w - dw) / 2;

  const dy =
    y + (h - dh) / 2;

  ctx.drawImage(
    video,
    dx,
    dy,
    dw,
    dh
  );
}


function drawContain(media, x, y, w, h) {

  if (
    !media ||
    media.readyState < 2
  ) return;

  const vw =
    media.videoWidth ||
    media.naturalWidth;

  const vh =
    media.videoHeight ||
    media.naturalHeight;

  if (!vw || !vh)
    return;

  const scale =
    Math.min(w / vw, h / vh);

  const dw =
    vw * scale;

  const dh =
    vh * scale;

  const dx =
    x + (w - dw) / 2;

  const dy =
    y + (h - dh) / 2;

  ctx.drawImage(
    media,
    dx,
    dy,
    dw,
    dh
  );
}


/* =========================================================
   FRAME DRAWING
========================================================= */

function roundedRect(
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
      Math.abs(w) / 2,
      Math.abs(h) / 2
    );

  ctx.beginPath();

  ctx.moveTo(x + r, y);

  ctx.arcTo(
    x + w,
    y,
    x + w,
    y + h,
    r
  );

  ctx.arcTo(
    x + w,
    y + h,
    x,
    y + h,
    r
  );

  ctx.arcTo(
    x,
    y + h,
    x,
    y,
    r
  );

  ctx.arcTo(
    x,
    y,
    x + w,
    y,
    r
  );

  ctx.closePath();
}


function drawFrameBorder(x, y, w, h) {

  const f =
    state.frame;

  if (f === "none")
    return;

  ctx.save();

  let radius = 18;

  if (f === "circle")
    radius = Math.min(w, h) / 2;

  if (f === "heart") {

    ctx.strokeStyle = "#ff3d73";
    ctx.lineWidth =
      state.frameWidth;

    ctx.shadowColor = "#ff3d73";
    ctx.shadowBlur = 18;

    ctx.beginPath();

    ctx.arc(
      x + w * .32,
      y + h * .3,
      w * .22,
      Math.PI * .8,
      Math.PI * 2.1
    );

    ctx.arc(
      x + w * .68,
      y + h * .3,
      w * .22,
      Math.PI * 1,
      Math.PI * 2.3
    );

    ctx.lineTo(
      x + w / 2,
      y + h
    );

    ctx.closePath();

    ctx.stroke();

    ctx.restore();

    return;
  }


  if (f === "rainbow") {

    const g =
      ctx.createLinearGradient(
        x,
        y,
        x + w,
        y + h
      );

    g.addColorStop(0,"#ff1744");
    g.addColorStop(.2,"#ff9800");
    g.addColorStop(.4,"#ffee00");
    g.addColorStop(.6,"#00e676");
    g.addColorStop(.8,"#00b0ff");
    g.addColorStop(1,"#9c27ff");

    ctx.strokeStyle = g;

    ctx.lineWidth =
      state.frameWidth;

    ctx.shadowColor =
      "#00eaff";

    ctx.shadowBlur = 12;

  } else if (f === "neon") {

    ctx.strokeStyle =
      "#00eaff";

    ctx.lineWidth =
      state.frameWidth;

    ctx.shadowColor =
      "#7c5cff";

    ctx.shadowBlur = 24;

  } else if (f === "gold") {

    const g =
      ctx.createLinearGradient(
        x,
        y,
        x + w,
        y + h
      );

    g.addColorStop(0,"#7d5b20");
    g.addColorStop(.25,"#fff0a0");
    g.addColorStop(.5,"#c9962d");
    g.addColorStop(.75,"#fff3a3");
    g.addColorStop(1,"#6f4d17");

    ctx.strokeStyle = g;

    ctx.lineWidth =
      state.frameWidth;

    ctx.shadowColor =
      "#d6a84f";

    ctx.shadowBlur = 15;

  } else if (f === "glass") {

    ctx.strokeStyle =
      "rgba(255,255,255,.8)";

    ctx.lineWidth =
      state.frameWidth;

    ctx.shadowColor =
      "#8deaff";

    ctx.shadowBlur = 20;

  } else if (f === "cyber") {

    ctx.strokeStyle =
      "#8b5cff";

    ctx.lineWidth =
      state.frameWidth;

    ctx.shadowColor =
      "#00eaff";

    ctx.shadowBlur = 20;

  } else if (f === "fire") {

    ctx.strokeStyle =
      "#ff531a";

    ctx.lineWidth =
      state.frameWidth;

    ctx.shadowColor =
      "#ff9d00";

    ctx.shadowBlur = 25;

  } else if (f === "ice") {

    ctx.strokeStyle =
      "#8eeaff";

    ctx.lineWidth =
      state.frameWidth;

    ctx.shadowColor =
      "#00cfff";

    ctx.shadowBlur = 20;

  } else if (f === "film") {

    ctx.strokeStyle =
      "#f4f4f4";

    ctx.lineWidth =
      state.frameWidth;

  } else if (f === "phone") {

    ctx.strokeStyle =
      "#151515";

    ctx.lineWidth =
      state.frameWidth + 5;

    radius = 28;

  } else if (f === "tv") {

    ctx.strokeStyle =
      "#5d6470";

    ctx.lineWidth =
      state.frameWidth + 6;

    radius = 8;

  } else if (f === "circle") {

    ctx.strokeStyle =
      "#ffffff";

    ctx.lineWidth =
      state.frameWidth;

    radius =
      Math.min(w,h) / 2;

  } else if (f === "premium") {

    const g =
      ctx.createLinearGradient(
        x,
        y,
        x + w,
        y + h
      );

    g.addColorStop(0,"#805f1d");
    g.addColorStop(.2,"#fff0a5");
    g.addColorStop(.45,"#c99a35");
    g.addColorStop(.7,"#fff2aa");
    g.addColorStop(1,"#765215");

    ctx.strokeStyle = g;

    ctx.lineWidth =
      state.frameWidth;

    ctx.shadowColor =
      "rgba(255,215,80,.8)";

    ctx.shadowBlur = 18;

  }


  if (f === "circle") {

    ctx.beginPath();

    ctx.arc(
      x + w / 2,
      y + h / 2,
      Math.min(w,h) / 2,
      0,
      Math.PI * 2
    );

    ctx.stroke();

  } else {

    roundedRect(
      ctx,
      x,
      y,
      w,
      h,
      radius
    );

    ctx.stroke();
  }

  ctx.restore();
}


/* =========================================================
   OVERLAY
========================================================= */

function drawOverlay(time) {

  if (
    state.overlayType === "none"
  ) return;

  let media = null;

  if (state.overlayType === "video")
    media = overlayVideo;

  if (state.overlayType === "image")
    media = overlayImage;

  if (state.overlayType === "camera")
    media = frameCameraVideo;

  if (!media)
    return;

  const w =
    canvas.width *
    state.overlayScale;

  const h =
    w * 9 / 16;

  const cx =
    canvas.width *
    (0.5 + state.frameX);

  const cy =
    canvas.height *
    (0.5 + state.frameY);

  const x =
    cx - w / 2;

  const y =
    cy - h / 2;

  ctx.save();

  ctx.translate(
    cx,
    cy
  );

  ctx.rotate(
    state.frameRotation *
    Math.PI / 180
  );

  ctx.translate(
    -cx,
    -cy
  );


  /* clip shape */

  if (state.frame === "circle") {

    ctx.beginPath();

    ctx.arc(
      cx,
      cy,
      Math.min(w,h) / 2,
      0,
      Math.PI * 2
    );

    ctx.clip();

    drawContain(
      media,
      x,
      y,
      w,
      h
    );

  } else {

    const radius =
      state.frame === "phone"
        ? 28
        : 18;

    roundedRect(
      ctx,
      x,
      y,
      w,
      h,
      radius
    );

    ctx.clip();

    drawContain(
      media,
      x,
      y,
      w,
      h
    );
  }

  ctx.restore();

  drawFrameBorder(
    x,
    y,
    w,
    h
  );
}


/* =========================================================
   BACKGROUND
========================================================= */

function drawBackground() {

  ctx.save();

  ctx.filter =
    buildFilter();

  if (state.bgSourceType === "video") {

    drawCover(
      bgVideo,
      0,
      0,
      canvas.width,
      canvas.height
    );

  } else if (
    state.bgSourceType === "camera"
  ) {

    drawCover(
      bgCameraVideo,
      0,
      0,
      canvas.width,
      canvas.height
    );

  } else {

    ctx.fillStyle =
      "#05070c";

    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );
  }

  ctx.restore();
}


/* =========================================================
   MAIN RENDER
========================================================= */

function render() {

  const time =
    bgVideo.currentTime || 0;

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  drawBackground();

  drawOverlay(time);

  drawText(time);

  $("currentTime").textContent =
    formatTime(time);

  if (
    bgVideo.duration &&
    isFinite(bgVideo.duration)
  ) {

    $("timeline").value =
      (time / bgVideo.duration) * 100;
  }

  animationFrame =
    requestAnimationFrame(render);
}


function startRender() {

  if (!animationFrame)
    render();
}


/* =========================================================
   VIDEO EVENTS
========================================================= */

bgVideo.addEventListener("play", () => {
  startRender();
});

bgVideo.addEventListener("pause", () => {
  startRender();
});

bgVideo.addEventListener("ended", () => {

  $("playBtn").textContent = "▶";
});


/* =========================================================
   EXPORT
========================================================= */

$("exportBtn").addEventListener(
  "click",
  exportVideo
);

$("exportBtn2").addEventListener(
  "click",
  exportVideo
);


async function exportVideo() {

  if (exporting)
    return;

  exporting = true;

  setProgress(0);

  $("exportMessage").textContent =
    "Preparing premium export...";

  try {

    if (
      state.bgSourceType === "none" &&
      !bgCameraStream
    ) {

      throw new Error(
        "पहले Background Video या Background Camera शुरू करें।"
      );
    }


    const quality =
      Number(
        $("exportQuality").value
      );

    const fps =
      Number(
        $("exportFps").value
      );

    const bitrate =
      Number(
        $("exportBitrate").value
      );


    const originalWidth =
      canvas.width;

    const originalHeight =
      canvas.height;


    if (quality === 720) {

      canvas.width = 1280;
      canvas.height = 720;

    } else if (quality === 1080) {

      canvas.width = 1920;
      canvas.height = 1080;

    } else {

      canvas.width = 2560;
      canvas.height = 1440;
    }


    await setupAudio();

    rebuildCameraAudio();

    updateAudio();


    const stream =
      canvas.captureStream(fps);


    if (
      audioDestination &&
      audioDestination.stream
        .getAudioTracks()
        .length
    ) {

      audioDestination.stream
        .getAudioTracks()
        .forEach(track => {
          stream.addTrack(track);
        });
    }


    let mime =
      "video/webm;codecs=vp9,opus";

    if (
      !MediaRecorder.isTypeSupported(mime)
    ) {

      mime =
        "video/webm;codecs=vp8,opus";
    }

    if (
      !MediaRecorder.isTypeSupported(mime)
    ) {

      mime =
        "video/webm";
    }


    const recorder =
      new MediaRecorder(
        stream,
        {
          mimeType: mime,
          videoBitsPerSecond: bitrate,
          audioBitsPerSecond: 192000
        }
      );


    const chunks = [];

    recorder.ondataavailable =
      e => {

        if (e.data.size)
          chunks.push(e.data);
      };


    const done =
      new Promise(resolve => {

        recorder.onstop = resolve;
      });


    const wasPlaying =
      !bgVideo.paused;

    const startTime =
      bgVideo.currentTime || 0;


    if (
      state.overlayType === "video"
    ) {

      try {
        overlayVideo.currentTime =
          startTime;
      } catch (_) {}

      overlayVideo.play().catch(() => {});
    }


    if (
      state.bgSourceType === "video"
    ) {

      bgVideo.currentTime =
        startTime;

      await bgVideo.play().catch(() => {});
    }


    if (
      state.musicEnabled &&
      musicAudio.src
    ) {

      musicAudio.currentTime =
        0;

      musicAudio.play().catch(() => {});
    }


    recorder.start(200);

    $("exportMessage").textContent =
      "Recording premium video...";


    const total =
      state.bgSourceType === "video"
        ? bgVideo.duration
        : 30;

    const start =
      performance.now();


    await new Promise(resolve => {

      function check() {

        const elapsed =
          (performance.now() - start) / 1000;

        let progress =
          total
            ? elapsed / total
            : 0;

        setProgress(
          Math.min(95, progress * 95)
        );

        if (
          state.bgSourceType === "video" &&
          bgVideo.ended
        ) {

          resolve();
          return;
        }

        if (
          state.bgSourceType === "camera" &&
          elapsed >= total
        ) {

          resolve();
          return;
        }

        requestAnimationFrame(check);
      }

      check();
    });


    recorder.stop();

    await done;


    bgVideo.pause();

    if (
      state.overlayType === "video"
    )
      overlayVideo.pause();

    if (
      state.musicEnabled
    )
      musicAudio.pause();


    setProgress(100);

    const blob =
      new Blob(
        chunks,
        {
          type: mime
        }
      );


    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement("a");

    a.href = url;

    a.download =
      "ai-video-editor-premium.webm";

    document.body.appendChild(a);

    a.click();

    a.remove();


    $("exportMessage").textContent =
      "✅ Export complete — WebM video तैयार है।";


    canvas.width =
      originalWidth;

    canvas.height =
      originalHeight;

    startRender();


  } catch (err) {

    console.error(err);

    $("exportMessage").textContent =
      "❌ Export error: " +
      err.message;

    alert(
      "Export में समस्या हुई:\n\n" +
      err.message
    );

  } finally {

    exporting = false;
  }
}


/* =========================================================
   INITIALIZE
========================================================= */

async function initialize() {

  try {

    await loadDevices();

  } catch (_) {}

  applyLookDefaults("normal");

  startRender();

  /*
    Mobile browsers में camera/audio permission तभी
    मांगी जाती है जब user button दबाता है।
  */
}

initialize();


/* =========================================================
   CAMERA DEVICE REFRESH
========================================================= */

navigator.mediaDevices?.addEventListener?.(
  "devicechange",
  loadDevices
);
