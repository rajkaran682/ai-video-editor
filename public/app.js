"use strict";

/*
  AI Video Editor
  Browser-side FFmpeg.wasm editor
*/


const $ = (id) => document.getElementById(id);


let videoFile = null;
let videoURL = null;

let ffmpeg = null;
let ffmpegLoaded = false;

let outputURL = null;

let rotate = 0;
let flipH = false;
let flipV = false;

let selectedFilter = "none";
let muted = false;


/* -----------------------------
   ELEMENTS
----------------------------- */

const videoInput = $("videoInput");
const dropZone = $("dropZone");

const videoPreview = $("videoPreview");

const uploadSection = $("uploadSection");
const editorSection = $("editorSection");

const fileName = $("fileName");
const videoDuration = $("videoDuration");

const startTime = $("startTime");
const endTime = $("endTime");

const resolution = $("resolution");

const brightness = $("brightness");
const contrast = $("contrast");
const saturation = $("saturation");

const brightnessValue = $("brightnessValue");
const contrastValue = $("contrastValue");
const saturationValue = $("saturationValue");

const volume = $("volume");
const volumeValue = $("volumeValue");

const speed = $("speed");

const muteBtn = $("muteBtn");

const exportBtn = $("exportBtn");

const progressBox = $("progressBox");
const progressBar = $("progressBar");
const progressText = $("progressText");
const progressPercent = $("progressPercent");

const downloadBox = $("downloadBox");
const downloadBtn = $("downloadBtn");

const overlayText = $("overlayText");


/* -----------------------------
   FORMAT TIME
----------------------------- */

function formatTime(seconds) {

  if (!Number.isFinite(seconds)) {
    return "00:00";
  }

  seconds = Math.max(0, seconds);

  const h = Math.floor(seconds / 3600);

  const m = Math.floor(
    (seconds % 3600) / 60
  );

  const s = Math.floor(
    seconds % 60
  );

  if (h > 0) {

    return (
      String(h).padStart(2, "0") +
      ":" +
      String(m).padStart(2, "0") +
      ":" +
      String(s).padStart(2, "0")
    );

  }

  return (
    String(m).padStart(2, "0") +
    ":" +
    String(s).padStart(2, "0")
  );
}


/* -----------------------------
   FILE LOAD
----------------------------- */

videoInput.addEventListener(
  "change",
  (event) => {

    const file =
      event.target.files &&
      event.target.files[0];

    if (file) {
      loadVideo(file);
    }

  }
);


/* Drag & Drop */

dropZone.addEventListener(
  "dragover",
  (event) => {

    event.preventDefault();

    dropZone.classList.add("dragging");

  }
);


dropZone.addEventListener(
  "dragleave",
  () => {

    dropZone.classList.remove("dragging");

  }
);


dropZone.addEventListener(
  "drop",
  (event) => {

    event.preventDefault();

    dropZone.classList.remove("dragging");

    const file =
      event.dataTransfer.files &&
      event.dataTransfer.files[0];

    if (
      file &&
      file.type.startsWith("video/")
    ) {
      loadVideo(file);
    }

  }
);


/* -----------------------------
   LOAD VIDEO
----------------------------- */

function loadVideo(file) {

  videoFile = file;

  if (videoURL) {
    URL.revokeObjectURL(videoURL);
  }

  videoURL =
    URL.createObjectURL(file);

  videoPreview.src = videoURL;

  fileName.textContent =
    file.name;

  uploadSection.classList.add(
    "hidden"
  );

  editorSection.classList.remove(
    "hidden"
  );

  resetEditorValues();

  videoPreview.load();

  videoPreview.addEventListener(
    "loadedmetadata",
    onVideoMetadata,
    { once: true }
  );

}


/* -----------------------------
   VIDEO METADATA
----------------------------- */

function onVideoMetadata() {

  const duration =
    videoPreview.duration;

  videoDuration.textContent =
    formatTime(duration);

  startTime.value = "0";

  endTime.value =
    duration.toFixed(1);

  endTime.max =
    duration;

  startTime.max =
    duration;

}


/* -----------------------------
   RESET
----------------------------- */

function resetEditorValues() {

  rotate = 0;

  flipH = false;

  flipV = false;

  selectedFilter = "none";

  muted = false;

  brightness.value = 0;
  contrast.value = 1;
  saturation.value = 1;

  volume.value = 1;

  speed.value = 1;

  brightnessValue.textContent = "0";
  contrastValue.textContent = "1";
  saturationValue.textContent = "1";

  volumeValue.textContent = "100%";

  overlayText.value = "";

  muteBtn.textContent =
    "🔇 Mute Video";

  document
    .querySelectorAll(".filter-btn")
    .forEach((button) => {

      button.classList.remove(
        "active-filter"
      );

    });

  const normal =
    document.querySelector(
      '[data-filter="none"]'
    );

  if (normal) {
    normal.classList.add(
      "active-filter"
    );
  }

  videoPreview.style.filter =
    "none";

  videoPreview.style.transform =
    "none";

}


/* -----------------------------
   LIVE PREVIEW
----------------------------- */

function updatePreview() {

  const b =
    Number(brightness.value);

  const c =
    Number(contrast.value);

  const s =
    Number(saturation.value);

  let filter =
    `brightness(${1 + b}) ` +
    `contrast(${c}) ` +
    `saturate(${s})`;

  if (selectedFilter === "gray") {

    filter += " grayscale(1)";

  }

  if (selectedFilter === "sepia") {

    filter += " sepia(0.8)";

  }

  if (selectedFilter === "vintage") {

    filter +=
      " sepia(0.35) contrast(1.1)";

  }

  videoPreview.style.filter =
    filter;

  let transform = "";

  if (rotate !== 0) {

    transform +=
      `rotate(${rotate}deg) `;

  }

  if (flipH) {

    transform += "scaleX(-1) ";

  }

  if (flipV) {

    transform += "scaleY(-1) ";

  }

  videoPreview.style.transform =
    transform || "none";

}


/* -----------------------------
   RANGE CONTROLS
----------------------------- */

brightness.addEventListener(
  "input",
  () => {

    brightnessValue.textContent =
      brightness.value;

    updatePreview();

  }
);


contrast.addEventListener(
  "input",
  () => {

    contrastValue.textContent =
      contrast.value;

    updatePreview();

  }
);


saturation.addEventListener(
  "input",
  () => {

    saturationValue.textContent =
      saturation.value;

    updatePreview();

  }
);


volume.addEventListener(
  "input",
  () => {

    volumeValue.textContent =
      Math.round(
        Number(volume.value) * 100
      ) + "%";

    videoPreview.volume =
      Number(volume.value);

  }
);


speed.addEventListener(
  "change",
  () => {

    videoPreview.playbackRate =
      Number(speed.value);

  }
);


/* -----------------------------
   TRIM VALIDATION
----------------------------- */

startTime.addEventListener(
  "change",
  () => {

    let value =
      Number(startTime.value);

    const duration =
      videoPreview.duration;

    if (!Number.isFinite(value)) {
      value = 0;
    }

    value =
      Math.max(
        0,
        Math.min(value, duration)
      );

    startTime.value =
      value.toFixed(1);

  }
);


endTime.addEventListener(
  "change",
  () => {

    let value =
      Number(endTime.value);

    const duration =
      videoPreview.duration;

    if (!Number.isFinite(value)) {
      value = duration;
    }

    value =
      Math.max(
        0,
        Math.min(value, duration)
      );

    endTime.value =
      value.toFixed(1);

  }
);


/* -----------------------------
   ROTATE
----------------------------- */

$("rotateLeft").addEventListener(
  "click",
  () => {

    rotate -= 90;

    if (rotate <= -360) {
      rotate = 0;
    }

    updatePreview();

  }
);


$("rotateRight").addEventListener(
  "click",
  () => {

    rotate += 90;

    if (rotate >= 360) {
      rotate = 0;
    }

    updatePreview();

  }
);


/* -----------------------------
   FLIP
----------------------------- */

$("flipH").addEventListener(
  "click",
  () => {

    flipH = !flipH;

    updatePreview();

  }
);


$("flipV").addEventListener(
  "click",
  () => {

    flipV = !flipV;

    updatePreview();

  }
);


/* -----------------------------
   FILTER
----------------------------- */

document
  .querySelectorAll(".filter-btn")
  .forEach((button) => {

    button.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(".filter-btn")
          .forEach((b) => {

            b.classList.remove(
              "active-filter"
            );

          });

        button.classList.add(
          "active-filter"
        );

        selectedFilter =
          button.dataset.filter;

        updatePreview();

      }
    );

  });


/* -----------------------------
   MUTE
----------------------------- */

muteBtn.addEventListener(
  "click",
  () => {

    muted = !muted;

    videoPreview.muted =
      muted;

    if (muted) {

      muteBtn.textContent =
        "🔊 Unmute Video";

    } else {

      muteBtn.textContent =
        "🔇 Mute Video";

    }

  }
);


/* -----------------------------
   TABS
----------------------------- */

document
  .querySelectorAll(".tab")
  .forEach((tab) => {

    tab.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(".tab")
          .forEach((t) => {

            t.classList.remove(
              "active"
            );

          });

        document
          .querySelectorAll(".tab-content")
          .forEach((content) => {

            content.classList.remove(
              "active"
            );

          });

        tab.classList.add("active");

        const id =
          tab.dataset.tab;

        const content =
          document.getElementById(id);

        if (content) {
          content.classList.add(
            "active"
          );
        }

      }
    );

  });


/* -----------------------------
   NEW PROJECT
----------------------------- */

$("newProjectBtn").addEventListener(
  "click",
  () => {

    if (outputURL) {

      URL.revokeObjectURL(
        outputURL
      );

      outputURL = null;

    }

    videoFile = null;

    videoPreview.removeAttribute(
      "src"
    );

    videoPreview.load();

    editorSection.classList.add(
      "hidden"
    );

    uploadSection.classList.remove(
      "hidden"
    );

    downloadBox.classList.add(
      "hidden"
    );

    progressBox.classList.add(
      "hidden"
    );

    videoInput.value = "";

    resetEditorValues();

  }
);


/* -----------------------------
   FFMPEG LOAD
----------------------------- */

async function loadFFmpeg() {

  if (ffmpegLoaded) {
    return;
  }

  if (
    !window.FFmpegWASM ||
    !window.FFmpegUtil
  ) {

    throw new Error(
      "FFmpeg library load नहीं हुई। Page को refresh करके फिर प्रयास करें।"
    );

  }

  const {
    FFmpeg
  } = window.FFmpegWASM;

  const {
    toBlobURL
  } = window.FFmpegUtil;

  ffmpeg =
    new FFmpeg();

  ffmpeg.on(
    "progress",
    ({ progress }) => {

      const percent =
        Math.max(
          0,
          Math.min(
            100,
            Math.round(
              progress * 100
            )
          )
        );

      setProgress(
        percent,
        `Video processing... ${percent}%`
      );

    }
  );


  ffmpeg.on(
    "log",
    ({ message }) => {

      console.log(
        "[FFmpeg]",
        message
      );

    }
  );


  const base =
    "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd";


  setProgress(
    5,
    "FFmpeg loading..."
  );


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


  ffmpegLoaded = true;

  setProgress(
    0,
    ""
  );

}


/* -----------------------------
   PROGRESS
----------------------------- */

function setProgress(
  percent,
  message
) {

  progressBox.classList.remove(
    "hidden"
  );

  progressBar.style.width =
    `${percent}%`;

  progressPercent.textContent =
    `${percent}%`;

  progressText.textContent =
    message || "Processing...";

}


/* -----------------------------
   FILTER BUILD
----------------------------- */

function buildVideoFilter() {

  const filters = [];

  const b =
    Number(brightness.value);

  const c =
    Number(contrast.value);

  const s =
    Number(saturation.value);


  if (
    b !== 0 ||
    c !== 1 ||
    s !== 1
  ) {

    filters.push(
      `eq=brightness=${b}:contrast=${c}:saturation=${s}`
    );

  }


  if (selectedFilter === "gray") {

    filters.push(
      "hue=s=0"
    );

  }


  if (selectedFilter === "sepia") {

    filters.push(
      "colorchannelmixer=" +
      "rr=.393:rg=.769:rb=.189:" +
      "gr=.349:gg=.686:gb=.168:" +
      "br=.272:bg=.534:bb=.131"
    );

  }


  if (selectedFilter === "vintage") {

    filters.push(
      "eq=contrast=1.12:saturation=0.75"
    );

  }


  if (rotate === 90) {

    filters.push(
      "transpose=1"
    );

  }

  else if (rotate === 180) {

    filters.push(
      "hflip",
      "vflip"
    );

  }

  else if (rotate === -90) {

    filters.push(
      "transpose=2"
    );

  }


  if (flipH) {

    filters.push(
      "hflip"
    );

  }


  if (flipV) {

    filters.push(
      "vflip"
    );

  }


  const res =
    resolution.value;


  if (res !== "original") {

    const height =
      Number(res);

    filters.push(
      `scale=-2:${height}`
    );

  }


  return filters.join(",");

}


/* -----------------------------
   SPEED AUDIO FILTER
----------------------------- */

function buildAtempoFilter(value) {

  const speedValue =
    Number(value);

  const filters = [];

  let remaining =
    speedValue;


  while (remaining > 2) {

    filters.push(
      "atempo=2"
    );

    remaining /= 2;

  }


  while (remaining < 0.5) {

    filters.push(
      "atempo=0.5"
    );

    remaining /= 0.5;

  }


  filters.push(
    `atempo=${remaining}`
  );

  return filters.join(",");

}


/* -----------------------------
   EXPORT
----------------------------- */

exportBtn.addEventListener(
  "click",
  exportVideo
);


async function exportVideo() {

  if (!videoFile) {

    alert(
      "पहले वीडियो upload करें।"
    );

    return;

  }


  const start =
    Number(startTime.value);

  const end =
    Number(endTime.value);

  const duration =
    videoPreview.duration;


  if (
    !Number.isFinite(duration)
  ) {

    alert(
      "वीडियो की duration नहीं मिली।"
    );

    return;

  }


  if (
    start < 0 ||
    end <= start ||
    start >= duration
  ) {

    alert(
      "Start और End time सही चुनें।"
    );

    return;

  }


  exportBtn.disabled = true;

  downloadBox.classList.add(
    "hidden"
  );


  try {

    await loadFFmpeg();


    setProgress(
      10,
      "Video file तैयार हो रही है..."
    );


    const {
      fetchFile
    } = window.FFmpegUtil;


    const inputName =
      "input.mp4";

    const outputName =
      "edited-video.mp4";


    await ffmpeg.writeFile(
      inputName,
      await fetchFile(videoFile)
    );


    const args = [];


    /* Trim */

    args.push(
      "-ss",
      String(start)
    );

    args.push(
      "-i",
      inputName
    );


    args.push(
      "-t",
      String(end - start)
    );


    /* Video filter */

    const vf =
      buildVideoFilter();


    if (vf) {

      args.push(
        "-vf",
        vf
      );

    }


    /* Speed */

    const speedValue =
      Number(speed.value);


    if (
      speedValue !== 1
    ) {

      /*
        Video speed
      */

      const currentVF =
        vf
          ? vf + ","
          : "";

      args.splice(
        args.indexOf("-vf"),
        args.indexOf("-vf") >= 0
          ? 2
          : 0
      );


      const speedVideo =
        `setpts=${(
          1 / speedValue
        ).toFixed(6)}*PTS`;


      const finalVF =
        currentVF +
        speedVideo;


      args.push(
        "-vf",
        finalVF
      );

    }


    /* Audio */

    if (muted) {

      args.push(
        "-an"
      );

    } else {

      if (
        Number(volume.value) !== 1 ||
        speedValue !== 1
      ) {

        const audioFilters = [];


        const volumeValueNumber =
          Number(volume.value);


        if (
          volumeValueNumber !== 1
        ) {

          audioFilters.push(
            `volume=${volumeValueNumber}`
          );

        }


        if (
          speedValue !== 1
        ) {

          audioFilters.push(
            buildAtempoFilter(
              speedValue
            )
          );

        }


        if (
          audioFilters.length
        ) {

          args.push(
            "-af",
            audioFilters.join(",")
          );

        }

      }

    }


    /* Video codec */

    args.push(
      "-c:v",
      "libx264"
    );

    args.push(
      "-preset",
      "ultrafast"
    );

    args.push(
      "-crf",
      "23"
    );


    /* Audio codec */

    if (!muted) {

      args.push(
        "-c:a",
        "aac"
      );

      args.push(
        "-b:a",
        "128k"
      );

    }


    args.push(
      "-movflags",
      "+faststart"
    );


    args.push(
      "-y",
      outputName
    );


    setProgress(
      15,
      "Video editing शुरू..."
    );


    console.log(
      "FFmpeg command:",
      args
    );


    await ffmpeg.exec(
      args
    );


    setProgress(
      95,
      "Edited video तैयार हो रहा है..."
    );


    const data =
      await ffmpeg.readFile(
        outputName
      );


    const blob =
      new Blob(
        [data.buffer],
        {
          type:
            "video/mp4"
        }
      );


    if (outputURL) {

      URL.revokeObjectURL(
        outputURL
      );

    }


    outputURL =
      URL.createObjectURL(
        blob
      );


    downloadBtn.href =
      outputURL;


    downloadBtn.download =
      createDownloadName(
        videoFile.name
      );


    downloadBox.classList.remove(
      "hidden"
    );


    setProgress(
      100,
      "Export पूरा हो गया!"
    );


    /* automatically scroll */

    downloadBox.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });


  }

  catch (error) {

    console.error(
      "Export Error:",
      error
    );


    alert(
      "Video export नहीं हो सका। Browser console में error देखें।\n\n" +
      (
        error &&
        error.message
          ? error.message
          : error
      )
    );


    setProgress(
      0,
      "Export failed"
    );

  }

  finally {

    exportBtn.disabled = false;

  }

}


/* -----------------------------
   DOWNLOAD NAME
----------------------------- */

function createDownloadName(
  original
) {

  const clean =
    original
      .replace(
        /\.[^/.]+$/,
        ""
      )
      .replace(
        /[^a-zA-Z0-9-_]/g,
        "-"
      );

  return (
    clean +
    "-edited.mp4"
  );

}


/* -----------------------------
   TEXT PREVIEW
----------------------------- */

overlayText.addEventListener(
  "input",
  () => {

    /*
      Live browser preview only.
      Actual text rendering can be added
      with a bundled font in the next stage.
    */

    console.log(
      "Overlay text:",
      overlayText.value
    );

  }
);


/* -----------------------------
   INITIAL STATE
----------------------------- */

videoPreview.addEventListener(
  "loadedmetadata",
  () => {

    videoPreview.volume =
      Number(volume.value);

    videoPreview.playbackRate =
      Number(speed.value);

  }
);
