"use strict";

/* =========================================================
   AI VIDEO EDITOR PRO
   Canvas based compositor
   ========================================================= */

const canvas = document.getElementById("editorCanvas");
const ctx = canvas.getContext("2d");

const bgVideo = document.getElementById("bgVideo");
const frameVideo = document.getElementById("frameVideo");
const bgCameraVideo = document.getElementById("bgCameraVideo");
const frameCameraVideo = document.getElementById("frameCameraVideo");

const bgFile = document.getElementById("bgFile");
const frameFile = document.getElementById("frameFile");
const musicFile = document.getElementById("musicFile");

const statusEl = document.getElementById("status");
const emptyPreview = document.getElementById("emptyPreview");

const recordBtn = document.getElementById("recordBtn");
const stopRecordBtn = document.getElementById("stopRecordBtn");
const downloadBtn = document.getElementById("downloadBtn");
const recordTimer = document.getElementById("recordTimer");

let frameImage = null;

let bgCameraStream = null;
let frameCameraStream = null;

let recording = false;
let mediaRecorder = null;
let recordedChunks = [];
let recordStart = 0;
let timerInterval = null;

let animationStarted = false;

const state = {

  frame: {
    visible: true,
    source: "none",
    x: 0,
    y: 0,
    scale: .65,
    rotation: 0,
    style: "gold"
  },

  magic: {
    type: "none",
    intensity: 70,
    speed: 80,
    size: 4
  },

  text: {
    value: "",
    size: 64,
    color: "#ffffff",
    x: 0,
    y: 260,
    animation: "none"
  },

  color: {
    look: "original",
    brightness: 0,
    contrast: 0,
    saturation: 0
  },

  audio: {
    bg: true,
    frame: true,
    bgVolume: 1,
    frameVolume: 1,
    musicVolume: .4
  }

};


/* =========================================================
   Helpers
   ========================================================= */

function status(text){
  statusEl.textContent = text;
}

function clamp(v,min,max){
  return Math.max(min,Math.min(max,v));
}

function formatTime(sec){
  sec = Math.floor(sec);
  const m = String(Math.floor(sec / 60)).padStart(2,"0");
  const s = String(sec % 60).padStart(2,"0");
  return `${m}:${s}`;
}

function setCanvasResolution(){

  const value = document.getElementById("resolution").value;

  const [w,h] = value.split("x").map(Number);

  canvas.width = w;
  canvas.height = h;

}

function isVideoReady(video){

  return video &&
    video.readyState >= 2 &&
    video.videoWidth > 0 &&
    video.videoHeight > 0;

}

function drawContain(source,x,y,w,h){

  if(!source) return;

  let sw = source.videoWidth || source.naturalWidth;
  let sh = source.videoHeight || source.naturalHeight;

  if(!sw || !sh) return;

  const ratio = Math.min(w/sw,h/sh);

  const dw = sw * ratio;
  const dh = sh * ratio;

  const dx = x + (w-dw)/2;
  const dy = y + (h-dh)/2;

  ctx.drawImage(source,dx,dy,dw,dh);

}


/* =========================================================
   File Upload
   ========================================================= */

bgFile.addEventListener("change",()=>{

  const file = bgFile.files[0];

  if(!file) return;

  bgVideo.src = URL.createObjectURL(file);
  bgVideo.load();

  bgVideo.onloadedmetadata = ()=>{

    bgVideo.currentTime = 0;
    emptyPreview.style.display = "none";

    status("Background Video Ready");

    bgVideo.play().catch(()=>{});

  };

});


frameFile.addEventListener("change",()=>{

  const file = frameFile.files[0];

  if(!file) return;

  const url = URL.createObjectURL(file);

  if(file.type.startsWith("image/")){

    frameImage = new Image();

    frameImage.onload = ()=>{

      state.frame.source = "image";
      state.frame.visible = true;

      status("Frame Photo Ready");

    };

    frameImage.src = url;

  }else if(file.type.startsWith("video/")){

    frameVideo.src = url;
    frameVideo.loop = true;
    frameVideo.muted = true;
    frameVideo.load();

    frameVideo.onloadedmetadata = ()=>{

      state.frame.source = "video";
      state.frame.visible = true;

      frameVideo.play().catch(()=>{});

      status("Frame Video Ready");

    };

  }

});


musicFile.addEventListener("change",()=>{

  const file = musicFile.files[0];

  if(!file) return;

  const music = document.getElementById("musicAudio");

  music.src = URL.createObjectURL(file);
  music.loop = true;

  status("Music Ready");

});


/* =========================================================
   Play
   ========================================================= */

document.getElementById("playBtn").onclick = ()=>{

  if(isVideoReady(bgVideo)){
    bgVideo.play().catch(()=>{});
  }

  if(isVideoReady(frameVideo)){
    frameVideo.play().catch(()=>{});
  }

};


/* =========================================================
   Camera
   ========================================================= */

async function startCamera(target){

  try{

    const stream = await navigator.mediaDevices.getUserMedia({

      video:{
        width:{ideal:1920},
        height:{ideal:1080},
        facingMode:"user"
      },

      audio:true

    });

    if(target === "background"){

      bgCameraStream = stream;
      bgCameraVideo.srcObject = stream;
      bgCameraVideo.muted = true;

      state.bgCamera = true;

      await bgCameraVideo.play();

      emptyPreview.style.display = "none";

      status("Background Camera ON");

    }else{

      frameCameraStream = stream;
      frameCameraVideo.srcObject = stream;
      frameCameraVideo.muted = true;

      state.frame.source = "camera";
      state.frame.visible = true;

      await frameCameraVideo.play();

      status("Frame Camera ON");

    }

  }catch(error){

    console.error(error);

    status("Camera permission/error");

    alert(
      "Camera चालू नहीं हो सका। Browser में Camera permission Allow करें।"
    );

  }

}


document.getElementById("startBgCamera").onclick =
  ()=>startCamera("background");

document.getElementById("startFrameCamera").onclick =
  ()=>startCamera("frame");


document.getElementById("stopCameras").onclick = ()=>{

  [bgCameraStream,frameCameraStream].forEach(stream=>{

    if(stream){

      stream.getTracks().forEach(track=>track.stop());

    }

  });

  bgCameraStream = null;
  frameCameraStream = null;

  bgCameraVideo.srcObject = null;
  frameCameraVideo.srcObject = null;

  state.bgCamera = false;

  if(state.frame.source === "camera"){
    state.frame.source = "none";
  }

  status("Cameras Stopped");

};


/* =========================================================
   Frame Controls
   ========================================================= */

document.getElementById("frameUsePhoto").onclick = ()=>{

  if(frameImage){

    state.frame.source = "image";
    state.frame.visible = true;

  }else if(isVideoReady(frameVideo)){

    state.frame.source = "video";
    state.frame.visible = true;

  }else{

    alert("पहले Photo या Video चुनें।");

  }

};


document.getElementById("frameUseCamera").onclick = ()=>{

  if(frameCameraStream){

    state.frame.source = "camera";
    state.frame.visible = true;

  }else{

    startCamera("frame");

  }

};


document.getElementById("hideFrame").onclick = ()=>{

  state.frame.visible = false;

};


document.querySelectorAll(".frame-choice").forEach(btn=>{

  btn.onclick = ()=>{

    document
      .querySelectorAll(".frame-choice")
      .forEach(x=>x.classList.remove("active"));

    btn.classList.add("active");

    state.frame.style = btn.dataset.frame;

  };

});


function updateRange(id,key){

  document.getElementById(id).addEventListener("input",e=>{

    state.frame[key] = Number(e.target.value);

  });

}

updateRange("frameX","x");
updateRange("frameY","y");
updateRange("frameScale","scale");
updateRange("frameRotation","rotation");


document.getElementById("centerFrame").onclick = ()=>{

  state.frame.x = 0;
  state.frame.y = 0;

  document.getElementById("frameX").value = 0;
  document.getElementById("frameY").value = 0;

};


document.getElementById("resetFrame").onclick = ()=>{

  state.frame.x = 0;
  state.frame.y = 0;
  state.frame.scale = .65;
  state.frame.rotation = 0;

  document.getElementById("frameX").value = 0;
  document.getElementById("frameY").value = 0;
  document.getElementById("frameScale").value = .65;
  document.getElementById("frameRotation").value = 0;

};


/* =========================================================
   Magic
   ========================================================= */

document.querySelectorAll(".magic-choice").forEach(btn=>{

  btn.onclick = ()=>{

    document
      .querySelectorAll(".magic-choice")
      .forEach(x=>x.classList.remove("active"));

    btn.classList.add("active");

    state.magic.type = btn.dataset.magic;

  };

});


document.getElementById("magicIntensity").oninput = e=>{
  state.magic.intensity = Number(e.target.value);
};

document.getElementById("magicSpeed").oninput = e=>{
  state.magic.speed = Number(e.target.value);
};

document.getElementById("magicSize").oninput = e=>{
  state.magic.size = Number(e.target.value);
};


/* =========================================================
   Text
   ========================================================= */

document.getElementById("textInput").oninput = e=>{
  state.text.value = e.target.value;
};

document.getElementById("textSize").oninput = e=>{
  state.text.size = Number(e.target.value);
};

document.getElementById("textColor").oninput = e=>{
  state.text.color = e.target.value;
};

document.getElementById("textX").oninput = e=>{
  state.text.x = Number(e.target.value);
};

document.getElementById("textY").oninput = e=>{
  state.text.y = Number(e.target.value);
};

document.getElementById("textAnimation").onchange = e=>{
  state.text.animation = e.target.value;
};


/* =========================================================
   Color
   ========================================================= */

document.querySelectorAll("[data-look]").forEach(btn=>{

  btn.onclick = ()=>{

    state.color.look = btn.dataset.look;

  };

});

document.getElementById("brightness").oninput = e=>{
  state.color.brightness = Number(e.target.value);
};

document.getElementById("contrast").oninput = e=>{
  state.color.contrast = Number(e.target.value);
};

document.getElementById("saturation").oninput = e=>{
  state.color.saturation = Number(e.target.value);
};


/* =========================================================
   Audio Controls
   ========================================================= */

document.getElementById("bgAudioOn").onchange = e=>{
  state.audio.bg = e.target.checked;
};

document.getElementById("frameAudioOn").onchange = e=>{
  state.audio.frame = e.target.checked;
};

document.getElementById("bgVolume").oninput = e=>{
  state.audio.bgVolume = Number(e.target.value)/100;
};

document.getElementById("frameVolume").oninput = e=>{
  state.audio.frameVolume = Number(e.target.value)/100;
};

document.getElementById("musicVolume").oninput = e=>{
  state.audio.musicVolume = Number(e.target.value)/100;
};


/* =========================================================
   Canvas Background
   ========================================================= */

function drawBackground(){

  const W = canvas.width;
  const H = canvas.height;

  ctx.save();

  const filter = buildColorFilter();

  ctx.filter = filter;

  if(state.bgCamera && isVideoReady(bgCameraVideo)){

    drawContain(bgCameraVideo,0,0,W,H);

  }else if(isVideoReady(bgVideo)){

    drawContain(bgVideo,0,0,W,H);

  }else{

    const g = ctx.createLinearGradient(0,0,W,H);

    g.addColorStop(0,"#080b16");
    g.addColorStop(1,"#15100b");

    ctx.fillStyle = g;
    ctx.fillRect(0,0,W,H);

  }

  ctx.restore();

}


function buildColorFilter(){

  let brightness = 100 + state.color.brightness;

  let contrast = 100 + state.color.contrast;

  let saturation = 100 + state.color.saturation;

  let filter =
    `brightness(${brightness}%) ` +
    `contrast(${contrast}%) ` +
    `saturate(${saturation}%)`;

  switch(state.color.look){

    case "cinematic":
      filter += " saturate(115%) contrast(110%)";
      break;

    case "vivid":
      filter += " saturate(145%) contrast(108%)";
      break;

    case "warm":
      filter += " sepia(12%) saturate(120%)";
      break;

    case "cool":
      filter += " hue-rotate(12deg) saturate(110%)";
      break;

    case "dream":
      filter += " brightness(108%) saturate(115%) blur(.15px)";
      break;

    case "film":
      filter += " contrast(112%) saturate(88%) sepia(8%)";
      break;

    case "bw":
      filter += " grayscale(100%)";
      break;

  }

  return filter;

}


/* =========================================================
   Frame Rendering
   ========================================================= */

function getFrameSource(){

  if(state.frame.source === "image")
    return frameImage;

  if(state.frame.source === "video")
    return frameVideo;

  if(state.frame.source === "camera")
    return frameCameraVideo;

  return null;

}


function drawFrame(){

  if(!state.frame.visible) return;

  const source = getFrameSource();

  if(!source) return;

  const W = canvas.width;
  const H = canvas.height;

  const baseW = Math.min(W * .52,760);
  const baseH = baseW * .56;

  const w = baseW * state.frame.scale;
  const h = baseH * state.frame.scale;

  const cx = W/2 + state.frame.x;
  const cy = H/2 + state.frame.y;

  ctx.save();

  ctx.translate(cx,cy);

  ctx.rotate(
    state.frame.rotation * Math.PI / 180
  );

  drawFrameDecoration(w,h,state.frame.style);

  ctx.save();

  clipFrame(w,h,state.frame.style);

  ctx.filter = "none";

  drawContain(
    source,
    -w/2,
    -h/2,
    w,
    h
  );

  ctx.restore();

  drawFrameBorder(w,h,state.frame.style);

  ctx.restore();

}


/* =========================================================
   Frame Clip
   ========================================================= */

function roundedRectPath(w,h,r){

  const x = -w/2;
  const y = -h/2;

  ctx.beginPath();

  ctx.roundRect(
    x,
    y,
    w,
    h,
    r
  );

}


function clipFrame(w,h,style){

  ctx.beginPath();

  if(style === "circle"){

    ctx.arc(0,0,Math.min(w,h)/2,0,Math.PI*2);

  }else{

    roundedRectPath(
      w,
      h,
      style === "glass" ? 30 : 22
    );

  }

  ctx.clip();

}


/* =========================================================
   VIP Frame Decorations
   ========================================================= */

function drawFrameDecoration(w,h,style){

  ctx.save();

  const x = -w/2;
  const y = -h/2;

  if(style === "gold"){

    ctx.shadowBlur = 35;
    ctx.shadowColor = "#ffd76a";

    const g = ctx.createLinearGradient(
      x,y,x+w,y+h
    );

    g.addColorStop(0,"#fff1a8");
    g.addColorStop(.25,"#c9962d");
    g.addColorStop(.5,"#fff0a0");
    g.addColorStop(.75,"#a96d10");
    g.addColorStop(1,"#ffe58a");

    ctx.fillStyle = g;

    ctx.roundRect(
      x-18,y-18,
      w+36,h+36,
      28
    );

    ctx.fill();

  }

  else if(style === "blackgold"){

    ctx.shadowBlur = 28;
    ctx.shadowColor = "#d9a93c";

    ctx.fillStyle = "#090909";

    ctx.roundRect(
      x-24,y-24,
      w+48,h+48,
      28
    );

    ctx.fill();

    ctx.strokeStyle = "#d6a83f";
    ctx.lineWidth = 10;

    ctx.stroke();

  }

  else if(style === "diamond"){

    ctx.shadowBlur = 30;
    ctx.shadowColor = "#9eeaff";

    const g = ctx.createLinearGradient(
      x,y,x+w,y+h
    );

    g.addColorStop(0,"#ffffff");
    g.addColorStop(.2,"#9defff");
    g.addColorStop(.5,"#ffffff");
    g.addColorStop(.8,"#9ccaff");
    g.addColorStop(1,"#ffffff");

    ctx.strokeStyle = g;
    ctx.lineWidth = 18;

    ctx.roundRect(
      x-9,y-9,
      w+18,h+18,
      24
    );

    ctx.stroke();

    drawDiamondCorners(w,h);

  }

  else if(style === "platinum"){

    ctx.shadowBlur = 20;
    ctx.shadowColor = "#fff";

    ctx.strokeStyle = "#dce4ed";
    ctx.lineWidth = 22;

    ctx.roundRect(
      x-11,y-11,
      w+22,h+22,
      22
    );

    ctx.stroke();

  }

  else if(style === "purple"){

    ctx.shadowBlur = 38;
    ctx.shadowColor = "#a855f7";

    ctx.strokeStyle = "#b36cff";
    ctx.lineWidth = 22;

    ctx.roundRect(
      x-11,y-11,
      w+22,h+22,
      28
    );

    ctx.stroke();

  }

  else if(style === "redgold"){

    ctx.shadowBlur = 32;
    ctx.shadowColor = "#ff5b39";

    ctx.strokeStyle = "#d6a83f";
    ctx.lineWidth = 25;

    ctx.roundRect(
      x-12,y-12,
      w+24,h+24,
      25
    );

    ctx.stroke();

    ctx.strokeStyle = "#9f1717";
    ctx.lineWidth = 8;

    ctx.roundRect(
      x-18,y-18,
      w+36,h+36,
      31
    );

    ctx.stroke();

  }

  else if(style === "neon"){

    ctx.shadowBlur = 35;
    ctx.shadowColor = "#00eaff";

    ctx.strokeStyle = "#00eaff";
    ctx.lineWidth = 13;

    ctx.roundRect(
      x-7,y-7,
      w+14,h+14,
      25
    );

    ctx.stroke();

  }

  else if(style === "glass"){

    ctx.shadowBlur = 30;
    ctx.shadowColor = "#ffffff";

    ctx.fillStyle = "rgba(255,255,255,.12)";

    ctx.roundRect(
      x-25,y-25,
      w+50,h+50,
      32
    );

    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,.7)";
    ctx.lineWidth = 4;

    ctx.stroke();

  }

  else if(style === "rainbow"){

    const g = ctx.createLinearGradient(
      x,y,x+w,y+h
    );

    g.addColorStop(0,"#ff0000");
    g.addColorStop(.2,"#ffff00");
    g.addColorStop(.4,"#00ff88");
    g.addColorStop(.6,"#00ccff");
    g.addColorStop(.8,"#8c5cff");
    g.addColorStop(1,"#ff38c8");

    ctx.shadowBlur = 30;
    ctx.shadowColor = "#fff";

    ctx.strokeStyle = g;
    ctx.lineWidth = 18;

    ctx.roundRect(
      x-9,y-9,
      w+18,h+18,
      28
    );

    ctx.stroke();

  }

  else if(style === "crown"){

    ctx.shadowBlur = 30;
    ctx.shadowColor = "#ffd84a";

    ctx.strokeStyle = "#ffd84a";
    ctx.lineWidth = 18;

    ctx.roundRect(
      x-9,y-9,
      w+18,h+18,
      25
    );

    ctx.stroke();

    drawCrown(w,h);

  }

  ctx.restore();

}


function drawFrameBorder(w,h,style){

  ctx.save();

  const x = -w/2;
  const y = -h/2;

  ctx.shadowBlur = 0;

  if(style === "gold"){

    ctx.strokeStyle = "#fff0a0";
    ctx.lineWidth = 3;

  }else if(style === "diamond"){

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;

  }else if(style === "neon"){

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;

  }else{

    ctx.strokeStyle = "rgba(255,255,255,.55)";
    ctx.lineWidth = 2;

  }

  ctx.roundRect(
    x,y,w,h,20
  );

  ctx.stroke();

  ctx.restore();

}


function drawDiamondCorners(w,h){

  const points = [
    [-w/2-20,-h/2-20],
    [w/2+20,-h/2-20],
    [-w/2-20,h/2+20],
    [w/2+20,h/2+20]
  ];

  points.forEach(([x,y])=>{

    ctx.save();

    ctx.translate(x,y);
    ctx.rotate(Math.PI/4);

    ctx.fillStyle = "#ffffff";

    ctx.fillRect(
      -7,-7,
      14,14
    );

    ctx.restore();

  });

}


function drawCrown(w,h){

  ctx.save();

  ctx.translate(0,-h/2-35);

  ctx.fillStyle = "#ffd94d";
  ctx.strokeStyle = "#fff0a0";
  ctx.lineWidth = 3;

  ctx.beginPath();

  ctx.moveTo(-70,20);
  ctx.lineTo(-50,-25);
  ctx.lineTo(-15,5);
  ctx.lineTo(0,-40);
  ctx.lineTo(20,5);
  ctx.lineTo(55,-25);
  ctx.lineTo(75,20);
  ctx.closePath();

  ctx.fill();
  ctx.stroke();

  ctx.restore();

}


/* =========================================================
   Magic Effects
   ========================================================= */

function randomParticle(i,time){

  const seed =
    Math.sin(i*123.456)*43758.5453;

  const r =
    seed-Math.floor(seed);

  const seed2 =
    Math.sin(i*91.77)*24631.22;

  const r2 =
    seed2-Math.floor(seed2);

  const speed =
    state.magic.speed / 100;

  return {

    x:r*canvas.width,

    y:
      (r2*canvas.height +
       time*.02*speed*(20+r*80))
      % canvas.height,

    size:
      state.magic.size*(.5+r),

    alpha:
      .25+r*.75,

    phase:r*10

  };

}


function drawMagic(time){

  const type = state.magic.type;

  if(type === "none") return;

  const intensity =
    state.magic.intensity/100;

  ctx.save();

  if(type === "galaxy"){

    drawGalaxy(time,intensity);

  }else if(type === "rainbow"){

    drawRainbowAura(time,intensity);

  }else if(type === "neon"){

    drawNeonAura(time,intensity);

  }else if(type === "fire"){

    drawFire(time,intensity);

  }else if(type === "ice"){

    drawIce(time,intensity);

  }else if(type === "streak"){

    drawLightStreak(time,intensity);

  }else{

    drawParticles(time,intensity,type);

  }

  ctx.restore();

}


function drawParticles(time,intensity,type){

  const count =
    Math.floor(70*intensity)+20;

  for(let i=0;i<count;i++){

    const p =
      randomParticle(i,time);

    let alpha =
      p.alpha*intensity;

    if(type === "gold"){

      ctx.fillStyle =
        `rgba(255,210,70,${alpha})`;

    }else if(type === "diamond"){

      ctx.fillStyle =
        `rgba(220,250,255,${alpha})`;

    }else{

      ctx.fillStyle =
        `rgba(255,255,255,${alpha})`;

    }

    ctx.shadowBlur =
      type === "diamond" ? 14 : 8;

    ctx.shadowColor =
      ctx.fillStyle;

    ctx.beginPath();

    ctx.arc(
      p.x,
      p.y,
      p.size,
      0,
      Math.PI*2
    );

    ctx.fill();

    if(type === "diamond"){

      ctx.strokeStyle =
        `rgba(255,255,255,${alpha})`;

      ctx.beginPath();

      ctx.moveTo(p.x-p.size*2,p.y);
      ctx.lineTo(p.x+p.size*2,p.y);

      ctx.moveTo(p.x,p.y-p.size*2);
      ctx.lineTo(p.x,p.y+p.size*2);

      ctx.stroke();

    }

  }

}


function drawGalaxy(time,intensity){

  const W=canvas.width;
  const H=canvas.height;

  const g=ctx.createRadialGradient(
    W*.5,H*.5,30,
    W*.5,H*.5,W*.7
  );

  g.addColorStop(
    0,
    `rgba(120,60,255,${.12*intensity})`
  );

  g.addColorStop(
    .5,
    `rgba(40,100,255,${.08*intensity})`
  );

  g.addColorStop(
    1,
    "rgba(0,0,0,0)"
  );

  ctx.fillStyle=g;
  ctx.fillRect(0,0,W,H);

  drawParticles(
    time,
    intensity,
    "diamond"
  );

}


function drawRainbowAura(time,intensity){

  const W=canvas.width;
  const H=canvas.height;

  ctx.globalCompositeOperation="screen";

  const g=ctx.createLinearGradient(
    0,
    Math.sin(time*.001)*H,
    W,
    H
  );

  g.addColorStop(
    0,
    `rgba(255,0,100,${.12*intensity})`
  );

  g.addColorStop(
    .33,
    `rgba(0,255,200,${.10*intensity})`
  );

  g.addColorStop(
    .66,
    `rgba(60,100,255,${.12*intensity})`
  );

  g.addColorStop(
    1,
    `rgba(255,0,220,${.10*intensity})`
  );

  ctx.fillStyle=g;
  ctx.fillRect(0,0,W,H);

}


function drawNeonAura(time,intensity){

  ctx.globalCompositeOperation="screen";

  for(let i=0;i<5;i++){

    ctx.beginPath();

    const y =
      canvas.height*(.15+i*.18) +
      Math.sin(time*.002+i)*30;

    ctx.moveTo(0,y);

    for(let x=0;x<canvas.width;x+=40){

      ctx.lineTo(
        x,
        y+
        Math.sin(x*.008+time*.002+i)*25
      );

    }

    ctx.strokeStyle =
      `rgba(${i%2?0:50},${100+i*25},255,${.10*intensity})`;

    ctx.lineWidth=15;
    ctx.shadowBlur=30;

    ctx.stroke();

  }

}


function drawFire(time,intensity){

  ctx.globalCompositeOperation="screen";

  for(let i=0;i<70;i++){

    const x =
      (i*137)%canvas.width;

    const y =
      canvas.height-
      ((time*.05+i*73)%220);

    ctx.fillStyle =
      `rgba(255,${70+i%80},20,${.08*intensity})`;

    ctx.beginPath();

    ctx.arc(
      x,
      y,
      5+(i%10),
      0,
      Math.PI*2
    );

    ctx.fill();

  }

}


function drawIce(time,intensity){

  ctx.globalCompositeOperation="screen";

  for(let i=0;i<35;i++){

    const x=(i*193)%canvas.width;

    const y=
      (i*97+time*.02)%canvas.height;

    ctx.strokeStyle=
      `rgba(170,235,255,${.16*intensity})`;

    ctx.lineWidth=2;

    ctx.beginPath();

    ctx.moveTo(x-8,y);
    ctx.lineTo(x+8,y);
    ctx.moveTo(x,y-8);
    ctx.lineTo(x,y+8);

    ctx.stroke();

  }

}


function drawLightStreak(time,intensity){

  ctx.globalCompositeOperation="screen";

  for(let i=0;i<10;i++){

    const y =
      (i*83+time*.05)%canvas.height;

    const x =
      Math.sin(i+time*.001)*200;

    const g=ctx.createLinearGradient(
      x,
      y,
      x+400,
      y
    );

    g.addColorStop(
      0,
      "rgba(255,255,255,0)"
    );

    g.addColorStop(
      .5,
      `rgba(255,255,255,${.18*intensity})`
    );

    g.addColorStop(
      1,
      "rgba(255,255,255,0)"
    );

    ctx.strokeStyle=g;
    ctx.lineWidth=5;

    ctx.beginPath();

    ctx.moveTo(x,y);
    ctx.lineTo(x+400,y);

    ctx.stroke();

  }

}


/* =========================================================
   Text
   ========================================================= */

function drawText(time){

  const text=state.text.value;

  if(!text) return;

  ctx.save();

  let x =
    canvas.width/2+
    state.text.x;

  let y =
    canvas.height/2+
    state.text.y;

  let scale=1;

  if(state.text.animation==="float"){

    y += Math.sin(time*.003)*15;

  }

  if(state.text.animation==="pulse"){

    scale =
      1+
      Math.sin(time*.004)*.08;

  }

  if(state.text.animation==="slide"){

    x +=
      Math.sin(time*.0015)*120;

  }

  ctx.translate(x,y);
  ctx.scale(scale,scale);

  ctx.font =
    `bold ${state.text.size}px Arial`;

  ctx.textAlign="center";
  ctx.textBaseline="middle";

  ctx.lineWidth=8;
  ctx.strokeStyle="rgba(0,0,0,.75)";

  ctx.shadowBlur =
    state.text.animation==="glow" ? 25 : 8;

  ctx.shadowColor=
    state.text.color;

  ctx.strokeText(text,0,0);

  ctx.fillStyle=state.text.color;

  ctx.fillText(text,0,0);

  ctx.restore();

}


/* =========================================================
   Render Loop
   ========================================================= */

function render(){

  const now=performance.now();

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  drawBackground();

  drawFrame();

  drawMagic(now);

  drawText(now);

  requestAnimationFrame(render);

}

setCanvasResolution();
render();


/* =========================================================
   Drag + Touch + Pinch + Rotation
   ========================================================= */

let pointerMode=null;

let startX=0;
let startY=0;

let originalFrameX=0;
let originalFrameY=0;

let initialDistance=0;
let initialScale=0;

let initialAngle=0;
let initialRotation=0;


function pointerPosition(e){

  const rect=canvas.getBoundingClientRect();

  return {

    x:
      (e.clientX-rect.left)*
      canvas.width/rect.width,

    y:
      (e.clientY-rect.top)*
      canvas.height/rect.height

  };

}


function frameHit(x,y){

  const cx=
    canvas.width/2+
    state.frame.x;

  const cy=
    canvas.height/2+
    state.frame.y;

  const w=
    canvas.width*.52*
    state.frame.scale;

  const h=
    w*.56;

  return (
    Math.abs(x-cx)<w/2 &&
    Math.abs(y-cy)<h/2
  );

}


canvas.addEventListener("pointerdown",e=>{

  if(!state.frame.visible) return;

  const p=pointerPosition(e);

  if(!frameHit(p.x,p.y)) return;

  canvas.setPointerCapture(e.pointerId);

  pointerMode="drag";

  startX=p.x;
  startY=p.y;

  originalFrameX=state.frame.x;
  originalFrameY=state.frame.y;

});


canvas.addEventListener("pointermove",e=>{

  if(pointerMode!=="drag") return;

  const p=pointerPosition(e);

  state.frame.x =
    originalFrameX+
    (p.x-startX);

  state.frame.y =
    originalFrameY+
    (p.y-startY);

  document.getElementById("frameX").value =
    clamp(state.frame.x,-640,640);

  document.getElementById("frameY").value =
    clamp(state.frame.y,-360,360);

});


canvas.addEventListener("pointerup",()=>{
  pointerMode=null;
});


/* Touch gesture */

canvas.addEventListener(
  "touchstart",
  e=>{

    if(e.touches.length!==2) return;

    const a=e.touches[0];
    const b=e.touches[1];

    initialDistance=
      Math.hypot(
        a.clientX-b.clientX,
        a.clientY-b.clientY
      );

    initialScale=state.frame.scale;

    initialAngle=
      Math.atan2(
        b.clientY-a.clientY,
        b.clientX-a.clientX
      );

    initialRotation=
      state.frame.rotation;

  },
  {passive:true}
);


canvas.addEventListener(
  "touchmove",
  e=>{

    if(e.touches.length!==2) return;

    e.preventDefault();

    const a=e.touches[0];
    const b=e.touches[1];

    const distance=
      Math.hypot(
        a.clientX-b.clientX,
        a.clientY-b.clientY
      );

    const scaleChange=
      distance/initialDistance;

    state.frame.scale=
      clamp(
        initialScale*scaleChange,
        .15,
        2.5
      );

    const angle=
      Math.atan2(
        b.clientY-a.clientY,
        b.clientX-a.clientX
      );

    const delta=
      (angle-initialAngle)*
      180/Math.PI;

    state.frame.rotation=
      initialRotation+delta;

    document.getElementById("frameScale").value =
      state.frame.scale;

    document.getElementById("frameRotation").value =
      state.frame.rotation;

  },
  {passive:false}
);


/* =========================================================
   Tabs
   ========================================================= */

document.querySelectorAll(".tab").forEach(tab=>{

  tab.onclick=()=>{

    document
      .querySelectorAll(".tab")
      .forEach(x=>x.classList.remove("active"));

    document
      .querySelectorAll(".tab-content")
      .forEach(x=>x.classList.remove("active"));

    tab.classList.add("active");

    document
      .getElementById(tab.dataset.tab)
      .classList.add("active");

  };

});


/* =========================================================
   Audio Preview
   ========================================================= */

function updateAudioPreview(){

  bgVideo.muted =
    !state.audio.bg;

  bgVideo.volume =
    state.audio.bgVolume;

  frameVideo.muted =
    !state.audio.frame;

  frameVideo.volume =
    state.audio.frameVolume;

  document.getElementById("musicAudio").volume =
    state.audio.musicVolume;

}

setInterval(updateAudioPreview,300);


/* =========================================================
   Recording
   ========================================================= */

function getRecordingMime(){

  const types=[
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm"
  ];

  return types.find(
    t=>MediaRecorder.isTypeSupported(t)
  ) || "";

}


async function startRecording(){

  if(recording) return;

  setCanvasResolution();

  const fps=
    Number(document.getElementById("fps").value);

  const videoStream =
    canvas.captureStream(fps);

  let finalStream =
    new MediaStream();

  videoStream
    .getVideoTracks()
    .forEach(track=>{
      finalStream.addTrack(track);
    });


  /*
    Camera audio and media audio are intentionally
    kept simple here.

    The canvas contains the complete visual composition,
    including background camera and frame camera.
  */

  const audioTracks=[];

  if(
    bgCameraStream &&
    state.audio.bg
  ){

    bgCameraStream
      .getAudioTracks()
      .forEach(t=>audioTracks.push(t));

  }

  if(
    frameCameraStream &&
    state.audio.frame
  ){

    frameCameraStream
      .getAudioTracks()
      .forEach(t=>audioTracks.push(t));

  }

  /*
    If camera audio exists, attach it.
    Browser MediaRecorder can record multiple audio
    tracks on some browsers, but support varies.
  */

  if(audioTracks.length){

    audioTracks.forEach(track=>{
      finalStream.addTrack(track);
    });

  }


  const mime=getRecordingMime();

  if(!mime){

    alert(
      "इस browser में WebM recording supported नहीं है। Chrome/Edge का नया version इस्तेमाल करें।"
    );

    return;

  }

  recordedChunks=[];

  try{

    mediaRecorder=
      new MediaRecorder(
        finalStream,
        {
          mimeType:mime,
          videoBitsPerSecond:12000000
        }
      );

  }catch(error){

    console.error(error);

    alert("Recording शुरू नहीं हो सकी।");

    return;

  }


  mediaRecorder.ondataavailable=e=>{

    if(e.data && e.data.size>0){
      recordedChunks.push(e.data);
    }

  };


  mediaRecorder.onstop=()=>{

    const blob=
      new Blob(
        recordedChunks,
        {type:mime}
      );

    const url=
      URL.createObjectURL(blob);

    downloadBtn.href=url;
    downloadBtn.download=
      "ai-video-editor-pro.webm";

    downloadBtn.classList.remove("hidden");

    status("Recording Ready");

  };


  mediaRecorder.start(500);

  recording=true;

  recordStart=Date.now();

  recordBtn.disabled=true;
  stopRecordBtn.disabled=false;

  downloadBtn.classList.add("hidden");

  timerInterval=
    setInterval(()=>{

      recordTimer.textContent=
        formatTime(
          (Date.now()-recordStart)/1000
        );

    },500);

  status("🔴 Recording...");

}


function stopRecording(){

  if(!recording) return;

  recording=false;

  clearInterval(timerInterval);

  recordTimer.textContent=
    formatTime(
      (Date.now()-recordStart)/1000
    );

  if(
    mediaRecorder &&
    mediaRecorder.state!=="inactive"
  ){

    mediaRecorder.stop();

  }

  recordBtn.disabled=false;
  stopRecordBtn.disabled=true;

  status("Processing Recording...");

}


recordBtn.onclick=startRecording;
stopRecordBtn.onclick=stopRecording;


/* =========================================================
   Auto stop background video
   ========================================================= */

bgVideo.addEventListener("ended",()=>{

  if(recording){

    stopRecording();

  }

});


/* =========================================================
   Resolution
   ========================================================= */

document
  .getElementById("resolution")
  .addEventListener(
    "change",
    setCanvasResolution
  );


/* =========================================================
   Visibility
   ========================================================= */

document.addEventListener(
  "visibilitychange",
  ()=>{

    if(document.hidden){

      /*
        Do not stop rendering/camera automatically.
        Mobile browsers may pause background tabs,
        which is a browser restriction.
      */

    }

  }
);


/* =========================================================
   Initial status
   ========================================================= */

status("Ready — Premium Editor");
