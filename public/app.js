"use strict";


/* =====================================================
   FFmpeg Worker Cross-Origin Fix
===================================================== */

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


/* =====================================================
   HELPERS
===================================================== */

const $ = (id) =>
  document.getElementById(id);


/* =====================================================
   STATE
===================================================== */

let videoFile = null;

let videoURL = null;

let outputURL = null;

let ffmpeg = null;

let ffmpegLoaded = false;

let rotate = 0;

let flipH = false;

let flipV = false;

let selectedFilter = "none";

let muted = false;

let fontStyle = "normal";

let textAlign = "center";


/* =====================================================
   ELEMENTS
===================================================== */

const videoInput =
  $("videoInput");

const dropZone =
  $("dropZone");

const videoPreview =
  $("videoPreview");

const liveText =
  $("liveText");

const uploadSection =
  $("uploadSection");

const editorSection =
  $("editorSection");

const fileName =
  $("fileName");

const videoDuration =
  $("videoDuration");

const startTime =
  $("startTime");

const endTime =
  $("endTime");

const resolution =
  $("resolution");

const brightness =
  $("brightness");

const contrast =
  $("contrast");

const saturation =
  $("saturation");

const brightnessValue =
  $("brightnessValue");

const contrastValue =
  $("contrastValue");

const saturationValue =
  $("saturationValue");

const volume =
  $("volume");

const volumeValue =
  $("volumeValue");

const speed =
  $("speed");

const muteBtn =
  $("muteBtn");

const exportBtn =
  $("exportBtn");

const progressBox =
  $("progressBox");

const progressBar =
  $("progressBar");

const progressText =
  $("progressText");

const progressPercent =
  $("progressPercent");

const downloadBox =
  $("downloadBox");

const downloadBtn =
  $("downloadBtn");


/* TEXT CONTROLS */

const overlayText =
  $("overlayText");

const textColor =
  $("textColor");

const textBgColor =
  $("textBgColor");

const transparentBg =
  $("transparentBg");

const textSize =
  $("textSize");

const textSizeValue =
  $("textSizeValue");

const fontFamily =
  $("fontFamily");

const textPosition =
  $("textPosition");

const textShadow =
  $("textShadow");

const designerPreview =
  $("designerPreview");


/* =====================================================
   TIME
===================================================== */

function formatTime(seconds) {

  if (!Number.isFinite(seconds)) {
    return "00:00";
  }

  seconds =
    Math.max(0, seconds);

  const h =
    Math.floor(seconds / 3600);

  const m =
    Math.floor(
      (seconds % 3600) / 60
    );

  const s =
    Math.floor(seconds % 60);

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


/* =====================================================
   VIDEO LOAD
===================================================== */

videoInput.addEventListener(
  "change",
  event => {

    const file =
      event.target.files &&
      event.target.files[0];

    if (file) {
      loadVideo(file);
    }
  }
);


dropZone.addEventListener(
  "dragover",
  event => {

    event.preventDefault();

    dropZone.classList.add(
      "dragging"
    );
  }
);


dropZone.addEventListener(
  "dragleave",
  () => {

    dropZone.classList.remove(
      "dragging"
    );
  }
);


dropZone.addEventListener(
  "drop",
  event => {

    event.preventDefault();

    dropZone.classList.remove(
      "dragging"
    );

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


function loadVideo(file) {

  videoFile = file;

  if (videoURL) {

    URL.revokeObjectURL(
      videoURL
    );
  }

  videoURL =
    URL.createObjectURL(file);

  videoPreview.src =
    videoURL;

  fileName.textContent =
    file.name;

  uploadSection.classList.add(
    "hidden"
  );

  editorSection.classList.remove(
    "hidden"
  );

  resetEditor();

  videoPreview.load();

  videoPreview.addEventListener(
    "loadedmetadata",
    onMetadata,
    {
      once: true
    }
  );
}


function onMetadata() {

  const duration =
    videoPreview.duration;

  videoDuration.textContent =
    formatTime(duration);

  startTime.value =
    "0";

  endTime.value =
    duration.toFixed(1);

  startTime.max =
    duration;

  endTime.max =
    duration;

}


/* =====================================================
   RESET
===================================================== */

function resetEditor() {

  rotate = 0;

  flipH = false;

  flipV = false;

  selectedFilter =
    "none";

  muted = false;

  fontStyle =
    "normal";

  textAlign =
    "center";

  brightness.value =
    "0";

  contrast.value =
    "1";

  saturation.value =
    "1";

  volume.value =
    "1";

  speed.value =
    "1";

  overlayText.value =
    "";

  textColor.value =
    "#ffffff";

  textBgColor.value =
    "#000000";

  transparentBg.checked =
    true;

  textSize.value =
    "48";

  fontFamily.value =
    "Arial";

  textPosition.value =
    "middle";

  textShadow.checked =
    true;

  brightnessValue.textContent =
    "0";

  contrastValue.textContent =
    "1";

  saturationValue.textContent =
    "1";

  volumeValue.textContent =
    "100%";

  textSizeValue.textContent =
    "48px";

  muteBtn.textContent =
    "🔇 Mute Video";

  document
    .querySelectorAll(".filter-btn")
    .forEach(button => {

      button.classList.remove(
        "active-filter"
      );
    });

  const normalFilter =
    document.querySelector(
      '[data-filter="none"]'
    );

  if (normalFilter) {

    normalFilter.classList.add(
      "active-filter"
    );
  }

  document
    .querySelectorAll(
      ".font-style-btn"
    )
    .forEach(button => {

      button.classList.remove(
        "active-font-style"
      );
    });

  const normalStyle =
    document.querySelector(
      '[data-font-style="normal"]'
    );

  if (normalStyle) {

    normalStyle.classList.add(
      "active-font-style"
    );
  }

  document
    .querySelectorAll(".align-btn")
    .forEach(button => {

      button.classList.remove(
        "active-align"
      );
    });

  const centerAlign =
    document.querySelector(
      '[data-align="center"]'
    );

  if (centerAlign) {

    centerAlign.classList.add(
      "active-align"
    );
  }

  liveText.className =
    "live-text hidden";

  videoPreview.style.filter =
    "none";

  videoPreview.style.transform =
    "none";

  updateTextPreview();

}


/* =====================================================
   VIDEO PREVIEW
===================================================== */

function updateVideoPreview() {

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

  if (
    selectedFilter ===
    "gray"
  ) {

    filter +=
      " grayscale(1)";
  }

  if (
    selectedFilter ===
    "sepia"
  ) {

    filter +=
      " sepia(.8)";
  }

  if (
    selectedFilter ===
    "vintage"
  ) {

    filter +=
      " sepia(.35) contrast(1.1)";
  }

  videoPreview.style.filter =
    filter;


  let transform = "";

  if (rotate !== 0) {

    transform +=
      `rotate(${rotate}deg) `;
  }

  if (flipH) {

    transform +=
      "scaleX(-1) ";
  }

  if (flipV) {

    transform +=
      "scaleY(-1) ";
  }

  videoPreview.style.transform =
    transform || "none";
}


/* =====================================================
   VIDEO CONTROLS
===================================================== */

brightness.addEventListener(
  "input",
  () => {

    brightnessValue.textContent =
      brightness.value;

    updateVideoPreview();
  }
);


contrast.addEventListener(
  "input",
  () => {

    contrastValue.textContent =
      contrast.value;

    updateVideoPreview();
  }
);


saturation.addEventListener(
  "input",
  () => {

    saturationValue.textContent =
      saturation.value;

    updateVideoPreview();
  }
);


volume.addEventListener(
  "input",
  () => {

    const value =
      Number(volume.value);

    volumeValue.textContent =
      Math.round(value * 100) +
      "%";

    videoPreview.volume =
      value;
  }
);


speed.addEventListener(
  "change",
  () => {

    videoPreview.playbackRate =
      Number(speed.value);
  }
);


/* =====================================================
   TRIM
===================================================== */

startTime.addEventListener(
  "change",
  () => {

    let value =
      Number(startTime.value);

    const duration =
      videoPreview.duration;

    value =
      Math.max(
        0,
        Math.min(
          value,
          duration
        )
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

    value =
      Math.max(
        0,
        Math.min(
          value,
          duration
        )
      );

    endTime.value =
      value.toFixed(1);
  }
);


/* =====================================================
   ROTATE
===================================================== */

$("rotateLeft")
  .addEventListener(
    "click",
    () => {

      rotate -= 90;

      if (rotate <= -360) {
        rotate = 0;
      }

      updateVideoPreview();
    }
  );


$("rotateRight")
  .addEventListener(
    "click",
    () => {

      rotate += 90;

      if (rotate >= 360) {
        rotate = 0;
      }

      updateVideoPreview();
    }
  );


/* =====================================================
   FLIP
===================================================== */

$("flipH")
  .addEventListener(
    "click",
    () => {

      flipH =
        !flipH;

      updateVideoPreview();
    }
  );


$("flipV")
  .addEventListener(
    "click",
    () => {

      flipV =
        !flipV;

      updateVideoPreview();
    }
  );


/* =====================================================
   FILTERS
===================================================== */

document
  .querySelectorAll(".filter-btn")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(
            ".filter-btn"
          )
          .forEach(b => {

            b.classList.remove(
              "active-filter"
            );
          });

        button.classList.add(
          "active-filter"
        );

        selectedFilter =
          button.dataset.filter;

        updateVideoPreview();
      }
    );
  });


/* =====================================================
   MUTE
===================================================== */

muteBtn.addEventListener(
  "click",
  () => {

    muted =
      !muted;

    videoPreview.muted =
      muted;

    muteBtn.textContent =
      muted
        ? "🔊 Unmute Video"
        : "🔇 Mute Video";
  }
);


/* =====================================================
   TABS
===================================================== */

document
  .querySelectorAll(".tab")
  .forEach(tab => {

    tab.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(".tab")
          .forEach(t => {

            t.classList.remove(
              "active"
            );
          });

        document
          .querySelectorAll(
            ".tab-content"
          )
          .forEach(content => {

            content.classList.remove(
              "active"
            );
          });

        tab.classList.add(
          "active"
        );

        const id =
          tab.dataset.tab;

        const content =
          $(id);

        if (content) {

          content.classList.add(
            "active"
          );
        }
      }
    );
  });


/* =====================================================
   TEXT DESIGNER
===================================================== */

function updateTextPreview() {

  const text =
    overlayText.value ||
    "आपका Text";

  const size =
    Number(textSize.value);

  let weight =
    "400";

  let style =
    "normal";

  if (
    fontStyle === "bold"
  ) {

    weight =
      "700";
  }

  if (
    fontStyle === "italic"
  ) {

    style =
      "italic";
  }

  if (
    fontStyle === "bolditalic"
  ) {

    weight =
      "700";

    style =
      "italic";
  }


  /* Designer preview */

  designerPreview.textContent =
    text;

  designerPreview.style.color =
    textColor.value;

  designerPreview.style.fontFamily =
    fontFamily.value;

  designerPreview.style.fontSize =
    Math.min(
      size,
      72
    ) + "px";

  designerPreview.style.fontWeight =
    weight;

  designerPreview.style.fontStyle =
    style;

  designerPreview.style.textAlign =
    textAlign;

  if (
    transparentBg.checked
  ) {

    designerPreview.style.background =
      "transparent";

  } else {

    designerPreview.style.background =
      textBgColor.value;
  }


  if (
    textShadow.checked
  ) {

    designerPreview.style.textShadow =
      "3px 3px 5px rgba(0,0,0,.8)";

  } else {

    designerPreview.style.textShadow =
      "none";
  }


  /* Actual video preview */

  liveText.textContent =
    text;

  liveText.style.color =
    textColor.value;

  liveText.style.fontFamily =
    fontFamily.value;

  /*
    Video preview is displayed smaller than
    the real video, so scale the font.
  */

  const previewSize =
    Math.max(
      12,
      Math.min(
        80,
        size *
        (
          videoPreview.clientWidth /
          Math.max(
            videoPreview.videoWidth,
            1
          )
        )
      )
    );

  liveText.style.fontSize =
    previewSize + "px";

  liveText.style.fontWeight =
    weight;

  liveText.style.fontStyle =
    style;

  liveText.style.textAlign =
    textAlign;

  liveText.className =
    "live-text";

  liveText.classList.add(
    textPosition.value
  );


  if (
    transparentBg.checked
  ) {

    liveText.style.background =
      "transparent";

  } else {

    liveText.style.background =
      textBgColor.value;
  }


  if (
    textShadow.checked
  ) {

    liveText.style.textShadow =
      "3px 3px 5px rgba(0,0,0,.85)";

  } else {

    liveText.style.textShadow =
      "none";
  }


  if (!overlayText.value) {

    liveText.classList.add(
      "hidden"
    );
  }
}


/* TEXT EVENTS */

overlayText.addEventListener(
  "input",
  updateTextPreview
);


textColor.addEventListener(
  "input",
  updateTextPreview
);


textBgColor.addEventListener(
  "input",
  updateTextPreview
);


transparentBg.addEventListener(
  "change",
  updateTextPreview
);


textSize.addEventListener(
  "input",
  () => {

    textSizeValue.textContent =
      textSize.value + "px";

    updateTextPreview();
  }
);


fontFamily.addEventListener(
  "change",
  updateTextPreview
);


textPosition.addEventListener(
  "change",
  updateTextPreview
);


textShadow.addEventListener(
  "change",
  updateTextPreview
);


/* FONT STYLE */

document
  .querySelectorAll(
    ".font-style-btn"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(
            ".font-style-btn"
          )
          .forEach(b => {

            b.classList.remove(
              "active-font-style"
            );
          });

        button.classList.add(
          "active-font-style"
        );

        fontStyle =
          button.dataset.fontStyle;

        updateTextPreview();
      }
    );
  });


/* ALIGNMENT */

document
  .querySelectorAll(
    ".align-btn"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(
            ".align-btn"
          )
          .forEach(b => {

            b.classList.remove(
              "active-align"
            );
          });

        button.classList.add(
          "active-align"
        );

        textAlign =
          button.dataset.align;

        updateTextPreview();
      }
    );
  });


/* =====================================================
   NEW PROJECT
===================================================== */

$("newProjectBtn")
  .addEventListener(
    "click",
    () => {

      if (outputURL) {

        URL.revokeObjectURL(
          outputURL
        );

        outputURL =
          null;
      }

      videoFile =
        null;

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

      videoInput.value =
        "";

      resetEditor();
    }
  );


/* =====================================================
   FFMPEG
===================================================== */

async function loadFFmpeg() {

  if (ffmpegLoaded) {
    return;
  }

  if (
    !window.FFmpegWASM ||
    !window.FFmpegUtil
  ) {

    throw new Error(
      "FFmpeg library load नहीं हुई। Page refresh करके फिर प्रयास करें।"
    );
  }


  const {
    FFmpeg
  } =
    window.FFmpegWASM;

  const {
    toBlobURL
  } =
    window.FFmpegUtil;


  ffmpeg =
    new FFmpeg();


  ffmpeg.on(
    "progress",
    ({ progress }) => {

      const percent =
        Math.round(
          Math.max(
            0,
            Math.min(
              100,
              progress * 100
            )
          )
        );

      setProgress(
        percent,
        `Processing... ${percent}%`
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


  ffmpegLoaded =
    true;


  setProgress(
    0,
    ""
  );
}


/* =====================================================
   PROGRESS
===================================================== */

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
    message ||
    "Processing...";
}


/* =====================================================
   VIDEO FILTER
===================================================== */

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


  if (
    selectedFilter === "gray"
  ) {

    filters.push(
      "hue=s=0"
    );
  }


  if (
    selectedFilter === "sepia"
  ) {

    filters.push(
      "colorchannelmixer=" +
      "rr=.393:rg=.769:rb=.189:" +
      "gr=.349:gg=.686:gb=.168:" +
      "br=.272:bg=.534:bb=.131"
    );
  }


  if (
    selectedFilter === "vintage"
  ) {

    filters.push(
      "eq=contrast=1.12:saturation=.75"
    );
  }


  if (rotate === 90) {

    filters.push(
      "transpose=1"
    );

  } else if (rotate === 180) {

    filters.push(
      "hflip",
      "vflip"
    );

  } else if (rotate === -90) {

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


  return filters;
}


/* =====================================================
   RESOLUTION
===================================================== */

function getOutputSize() {

  let width =
    videoPreview.videoWidth;

  let height =
    videoPreview.videoHeight;


  const selected =
    resolution.value;


  if (
    selected !== "original"
  ) {

    const targetHeight =
      Number(selected);

    const ratio =
      width / height;

    height =
      targetHeight;

    width =
      Math.round(
        targetHeight * ratio
      );

    /*
      H264 prefers even dimensions.
    */

    width =
      width % 2 === 0
        ? width
        : width - 1;

    height =
      height % 2 === 0
        ? height
        : height - 1;
  }


  return {
    width,
    height
  };
}


/* =====================================================
   TEXT CANVAS
===================================================== */

async function createTextOverlay() {

  const text =
    overlayText.value.trim();


  if (!text) {

    return false;
  }


  const {
    width,
    height
  } =
    getOutputSize();


  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width =
    width;

  canvas.height =
    height;


  const ctx =
    canvas.getContext(
      "2d"
    );


  ctx.clearRect(
    0,
    0,
    width,
    height
  );


  const size =
    Number(textSize.value);


  let weight =
    "400";

  let style =
    "normal";


  if (
    fontStyle === "bold"
  ) {

    weight =
      "700";
  }


  if (
    fontStyle === "italic"
  ) {

    style =
      "italic";
  }


  if (
    fontStyle === "bolditalic"
  ) {

    weight =
      "700";

    style =
      "italic";
  }


  ctx.font =
    `${style} ${weight} ${size}px "${fontFamily.value}"`;


  ctx.fillStyle =
    textColor.value;


  ctx.textAlign =
    textAlign;


  ctx.textBaseline =
    "middle";


  /*
    Convert alignment into X coordinate.
  */

  let x =
    width / 2;

  if (
    textAlign === "left"
  ) {

    x =
      width * 0.05;

  } else if (
    textAlign === "right"
  ) {

    x =
      width * 0.95;
  }


  let y;

  if (
    textPosition.value === "top"
  ) {

    y =
      height * 0.12;

  } else if (
    textPosition.value === "bottom"
  ) {

    y =
      height * 0.88;

  } else {

    y =
      height * 0.50;
  }


  /*
    Multi-line text.
  */

  const lines =
    text.split("\n");


  const lineHeight =
    size * 1.2;


  const totalHeight =
    lines.length *
    lineHeight;


  let startY =
    y -
    totalHeight / 2 +
    lineHeight / 2;


  /*
    Background box.
  */

  if (
    !transparentBg.checked
  ) {

    let maxWidth =
      0;

    for (
      const line of lines
    ) {

      const metrics =
        ctx.measureText(line);

      maxWidth =
        Math.max(
          maxWidth,
          metrics.width
        );
    }


    const padding =
      size * 0.35;


    let boxX =
      x -
      maxWidth / 2 -
      padding;


    if (
      textAlign === "left"
    ) {

      boxX =
        x -
        padding;

    } else if (
      textAlign === "right"
    ) {

      boxX =
        x -
        maxWidth -
        padding;
    }


    const boxY =
      startY -
      lineHeight / 2 -
      padding;


    const boxW =
      maxWidth +
      padding * 2;


    const boxH =
      totalHeight +
      padding * 2;


    ctx.fillStyle =
      textBgColor.value;


    ctx.fillRect(
      boxX,
      boxY,
      boxW,
      boxH
    );
  }


  /*
    Shadow
  */

  if (
    textShadow.checked
  ) {

    ctx.shadowColor =
      "rgba(0,0,0,.85)";

    ctx.shadowBlur =
      Math.max(
        3,
        size * .08
      );

    ctx.shadowOffsetX =
      size * .04;

    ctx.shadowOffsetY =
      size * .04;
  }


  ctx.fillStyle =
    textColor.value;


  for (
    const line of lines
  ) {

    ctx.fillText(
      line,
      x,
      startY
    );

    startY +=
      lineHeight;
  }


  /*
    Convert canvas to PNG.
  */

  const blob =
    await new Promise(
      resolve =>
        canvas.toBlob(
          resolve,
          "image/png"
        )
    );


  if (!blob) {

    throw new Error(
      "Text overlay image नहीं बन सकी।"
    );
  }


  const {
    fetchFile
  } =
    window.FFmpegUtil;


  await ffmpeg.writeFile(
    "text-overlay.png",
    await fetchFile(blob)
  );


  return true;
}


/* =====================================================
   ATEMPO
===================================================== */

function buildAtempo(value) {

  const speedValue =
    Number(value);

  const filters = [];

  let remaining =
    speedValue;


  while (
    remaining > 2
  ) {

    filters.push(
      "atempo=2"
    );

    remaining /= 2;
  }


  while (
    remaining < .5
  ) {

    filters.push(
      "atempo=.5"
    );

    remaining /= .5;
  }


  filters.push(
    `atempo=${remaining}`
  );


  return filters.join(",");
}


/* =====================================================
   EXPORT
===================================================== */

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
      "वीडियो duration नहीं मिली।"
    );

    return;
  }


  if (
    start < 0 ||
    end <= start ||
    start >= duration
  ) {

    alert(
      "Start और End time सही करें।"
    );

    return;
  }


  exportBtn.disabled =
    true;

  downloadBox.classList.add(
    "hidden"
  );


  try {

    await loadFFmpeg();


    const {
      fetchFile
    } =
    window.FFmpegUtil;


    const inputName =
      "input.mp4";

    const outputName =
      "edited-video.mp4";


    setProgress(
      10,
      "Video file loading..."
    );


    await ffmpeg.writeFile(
      inputName,
      await fetchFile(videoFile)
    );


    /*
      Create text PNG if text exists.
    */

    let hasText =
      false;


    if (
      overlayText.value.trim()
    ) {

      setProgress(
        15,
        "Text design तैयार हो रहा है..."
      );

      hasText =
        await createTextOverlay();
    }


    const videoFilters =
      buildVideoFilter();


    /*
      Resolution is handled by the
      normal video filter.
    */

    const {
      width,
      height
    } =
      getOutputSize();


    if (
      resolution.value !==
      "original"
    ) {

      videoFilters.push(
        `scale=${width}:${height}`
      );
    }


    /*
      Speed changes video PTS.
    */

    const speedValue =
      Number(speed.value);


    if (
      speedValue !== 1
    ) {

      videoFilters.push(
        `setpts=${(
          1 / speedValue
        ).toFixed(6)}*PTS`
      );
    }


    /*
      TEXT OVERLAY

      We use FFmpeg's second input
      for the transparent PNG.
    */

    const args = [];


    args.push(
      "-ss",
      String(start)
    );


    args.push(
      "-i",
      inputName
    );


    if (hasText) {

      args.push(
        "-i",
        "text-overlay.png"
      );
    }


    args.push(
      "-t",
      String(end - start)
    );


    /*
      Audio
    */

    const audioFilters = [];


    if (!muted) {

      const vol =
        Number(volume.value);


      if (
        vol !== 1
      ) {

        audioFilters.push(
          `volume=${vol}`
        );
      }


      if (
        speedValue !== 1
      ) {

        audioFilters.push(
          buildAtempo(
            speedValue
          )
        );
      }
    }


    /*
      Build complex video filter
      when text is present.
    */

    if (hasText) {

      let baseVideo =
        "[0:v]";


      if (
        videoFilters.length
      ) {

        args.push(
          "-filter_complex",
          `${baseVideo}${videoFilters.join(",")}[v0];` +
          `[v0][1:v]overlay=0:0:format=auto[vout]`
        );

      } else {

        args.push(
          "-filter_complex",
          `[0:v][1:v]overlay=0:0:format=auto[vout]`
        );
      }


      args.push(
        "-map",
        "[vout]"
      );


      if (!muted) {

        args.push(
          "-map",
          "0:a?"
        );
      }


    } else {

      /*
        Normal video filter.
      */

      if (
        videoFilters.length
      ) {

        args.push(
          "-vf",
          videoFilters.join(",")
        );
      }


      args.push(
        "-map",
        "0:v:0"
      );


      if (!muted) {

        args.push(
          "-map",
          "0:a?"
        );
      }
    }


    /*
      Audio filter
    */

    if (
      !muted &&
      audioFilters.length
    ) {

      args.push(
        "-af",
        audioFilters.join(",")
      );
    }


    /*
      Video encoder
    */

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


    /*
      Audio
    */

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
      "-shortest"
    );


    args.push(
      "-y",
      outputName
    );


    console.log(
      "FFmpeg command:",
      args
    );


    setProgress(
      20,
      "Video editing शुरू..."
    );


    await ffmpeg.exec(
      args
    );


    setProgress(
      95,
      "Final video तैयार हो रहा है..."
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


    downloadBox.scrollIntoView({
      behavior:
        "smooth",
      block:
        "center"
    });


  } catch (error) {

    console.error(
      "EXPORT ERROR:",
      error
    );


    alert(
      "Video export नहीं हो सका।\n\n" +
      (
        error &&
        error.message
          ? error.message
          : String(error)
      )
    );


    setProgress(
      0,
      "Export failed"
    );


  } finally {

    exportBtn.disabled =
      false;
  }
}


/* =====================================================
   DOWNLOAD NAME
===================================================== */

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


/* =====================================================
   INITIAL
===================================================== */

videoPreview.addEventListener(
  "loadedmetadata",
  () => {

    videoPreview.volume =
      Number(volume.value);

    videoPreview.playbackRate =
      Number(speed.value);

    updateTextPreview();
  }
);
