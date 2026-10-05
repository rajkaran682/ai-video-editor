(() => {
"use strict";

const $ = id => document.getElementById(id);
const qs = s => document.querySelector(s);
const qsa = s => [...document.querySelectorAll(s)];

const S = {
  duration:30,time:0,playing:false,
  bg:null,frame:null,music:null,
  bgStream:null,frameStream:null,
  bgFacing:"user",frameFacing:"user",
  bgFit:"cover",frameFit:"cover",
  frameStyle:"gold",frameOpacity:1,borderWidth:18,
  fx:0,fy:0,fs:55,fr:0,
  text:"",textSize:62,textColor:"#ffffff",textBg:"#000000",
  textOpacity:1,textAlign:"center",textAnim:"none",
  font:"Arial",fontStyle:"bold",textStyle:"gold",
  effect:"none",effectIntensity:.6,effectSpeed:.8,
  look:"original",brightness:100,contrast:100,saturation:100,
  videoVolume:1,frameVolume:1,musicVolume:.7
};

const frames = [
 ["gold","🥇 VIP Gold"],["blackgold","🖤 Royal Black"],["diamond","💎 Diamond"],
 ["platinum","⚪ Platinum"],["purple","🟣 Royal Purple"],["redgold","❤️ Red Gold"],
 ["neon","🌈 Neon"],["glass","🔷 Glass"],["rainbow","🌈 Rainbow"],
 ["crown","👑 Crown"],["floral","🌸 Floral"],["heart","💗 Heart"],
 ["film","🎞️ Cinema"],["royal","👑 Royal"]
];
const effects = [
 ["none","None"],["sparkle","✨ Sparkle"],["gold","🟡 Gold Dust"],["diamond","💎 Diamonds"],
 ["hearts","💗 Hearts"],["petals","🌸 Petals"],["bokeh","🔵 Bokeh"],
 ["stars","⭐ Stars"],["fire","🔥 Fire"],["ice","❄️ Ice"],["neon","⚡ Neon"],["streak","💫 Streaks"]
];
const textStyles = [
 ["gold","🥇 Gold"],["neon","⚡ Neon"],["glass","🔷 Glass"],["royal","👑 Royal"],
 ["cinema","🎬 Cinema"],["love","❤️ Love"],["minimal","◻️ Minimal"],["diamond","💎 Diamond"]
];
const looks = [
 ["original","Original"],["cinematic","🎬 Cinematic"],["vivid","🌈 Vivid"],["warm","☀️ Warm"],
 ["cool","❄️ Cool"],["dream","✨ Dream"],["film","🎞️ Film"],["bw","⚫ B&W"]
];
const templates = [
 ["wedding","💍 Wedding"],["romantic","❤️ Romantic"],["invitation","💌 Invitation"],
 ["birthday","🎂 Birthday"],["anniversary","💐 Anniversary"],["cinematic","🎬 Cinematic"],
 ["royal","👑 Royal"],["travel","✈️ Travel"],["festival","🎉 Festival"],["memories","📸 Memories"]
];

let raf=0, last=performance.now();

function status(msg){ $("status").textContent=msg; }
function error(msg){
  console.error(msg);
  $("errorBox").textContent=String(msg);
  $("errorBox").classList.remove("hidden");
  status("Error — ऊपर संदेश देखें");
}
function clearError(){ $("errorBox").classList.add("hidden"); }

function ratioSize(){
  const r=$("ratio").value;
  if(r==="9:16") return [720,1280];
  if(r==="1:1") return [1080,1080];
  if(r==="4:5") return [1080,1350];
  return [1280,720];
}
function resize(){
  const [w,h]=ratioSize();
  const q=$("quality").value;
  const scale=q==="1080"?Math.min(1,1080/Math.max(w,h)):Math.min(1,720/Math.max(w,h));
  const c=$("canvas");
  c.width=Math.round(w*scale);
  c.height=Math.round(h*scale);
  render();
}
function mediaFromFile(file){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file);
    if(file.type.startsWith("image/")){
      const im=new Image();
      im.onload=()=>resolve({type:"image",el:im,url,name:file.name});
      im.onerror=reject;
      im.src=url;
    }else if(file.type.startsWith("video/")){
      const v=document.createElement("video");
      v.playsInline=true; v.muted=true; v.preload="auto";
      v.onloadedmetadata=()=>resolve({type:"video",el:v,url,name:file.name});
      v.onerror=()=>reject(new Error("Video load नहीं हुआ"));
      v.src=url;
    }else reject(new Error("यह file supported नहीं है"));
  });
}
function drawMedia(ctx,m,x,y,w,h,fit,rotation=0){
  if(!m || !m.el) return;
  const el=m.el;
  if(m.type==="video"){
    if(!el || el.readyState < 2) return;
    try{
      if(Number.isFinite(el.duration) && el.duration > 0 && !S.playing){
        const target=Math.min(Math.max(0,S.time),Math.max(0,el.duration-0.05));
        if(Math.abs((el.currentTime||0)-target)>0.25) el.currentTime=target;
      }
    }catch(_){}
  }
  const sw=Number(el.videoWidth||el.naturalWidth||el.width||0);
  const sh=Number(el.videoHeight||el.naturalHeight||el.height||0);
  if(!sw||!sh)return;
  ctx.save();
  ctx.translate(x+w/2,y+h/2);
  ctx.rotate(rotation*Math.PI/180);
  let dw=w,dh=h;
  if(fit!=="stretch"){
    const scale=fit==="contain"?Math.min(w/sw,h/sh):Math.max(w/sw,h/sh);
    dw=sw*scale;dh=sh*scale;
  }
  ctx.drawImage(el,-dw/2,-dh/2,dw,dh);
  ctx.restore();
}
function applyLook(ctx){
  const b=Number(S.brightness),c=Number(S.contrast),sat=Number(S.saturation);
  let filter=`brightness(${b}%) contrast(${c}%) saturate(${sat}%)`;
  const map={
    cinematic:"contrast(112%) saturate(92%)",
    vivid:"contrast(112%) saturate(135%)",
    warm:"sepia(10%) saturate(125%)",
    cool:"hue-rotate(10deg) saturate(105%)",
    dream:"brightness(108%) saturate(115%)",
    film:"contrast(108%) saturate(88%) sepia(7%)",
    bw:"grayscale(100%)"
  };
  if(map[S.look])filter+=` ${map[S.look]}`;
  return filter;
}
function drawFrame(ctx,w,h){
  if(!S.frameStyle)return;
  const a=S.frameOpacity;
  const bw=Number(S.borderWidth);
  ctx.save();ctx.globalAlpha=a;ctx.lineWidth=bw;
  const colors={
    gold:["#fff0a0","#c99718","#fff7c2"],blackgold:["#050505","#b58a2b","#050505"],
    diamond:["#b9f5ff","#fff","#6ab7ff"],platinum:["#fff","#8d98a5","#fff"],
    purple:["#d7a8ff","#7136a8","#f4d6ff"],redgold:["#ff5a67","#d6a42b","#fff"],
    neon:["#00fff0","#ff00e8","#7dff00"],glass:["#d9f5ff","#6fa5c8","#fff"],
    rainbow:["#ff4b4b","#ffe44b","#4bffce"],crown:["#ffd84a","#b98200","#fff"],
    floral:["#ff8fc7","#fff","#9effd5"],heart:["#ff4d7d","#b60039","#fff"],
    film:["#111","#aaa","#111"],royal:["#0b0b0b","#e6b84a","#111"]
  }[S.frameStyle]||["#fff","#777","#fff"];
  const grad=ctx.createLinearGradient(0,0,w,h);
  grad.addColorStop(0,colors[0]);grad.addColorStop(.5,colors[1]);grad.addColorStop(1,colors[2]);
  ctx.strokeStyle=grad;ctx.strokeRect(bw/2,bw/2,w-bw,h-bw);
  ctx.lineWidth=Math.max(2,bw/5);ctx.strokeStyle=colors[2];ctx.strokeRect(bw*1.2,bw*1.2,w-bw*2.4,h-bw*2.4);
  ctx.restore();
}
function drawEffect(ctx,w,h){
  if(S.effect==="none")return;
  const t=S.time*Number(S.effectSpeed);
  const n=Math.round(18+S.effectIntensity*45);
  ctx.save();
  ctx.globalAlpha=.18+.55*S.effectIntensity;
  for(let i=0;i<n;i++){
    const x=((i*83+t*35)% (w+100))-50;
    const y=((i*137+t*20)% (h+100))-50;
    const s=2+(i%7)*1.5;
    let ch="✦";
    if(S.effect==="hearts")ch="♥";
    if(S.effect==="petals")ch="✿";
    if(S.effect==="stars")ch="★";
    if(S.effect==="fire")ch="•";
    if(S.effect==="ice")ch="❄";
    ctx.font=`${s*4}px Arial`;
    ctx.fillStyle=(S.effect==="gold")?"#ffe08a":(S.effect==="ice"?"#bdefff":"#fff");
    ctx.fillText(ch,x,y);
  }
  ctx.restore();
}
function drawText(ctx,w,h){
  if(!S.text)return;
  ctx.save();
  let size=Number(S.textSize);
  if(S.textAnim==="pulse")size*=1+.08*Math.sin(S.time*5);
  let x=w/2,y=h*.84;
  if(S.textAlign==="left")x=30;
  if(S.textAlign==="right")x=w-30;
  if(S.textAnim==="float")y=h*.84+Math.sin(S.time*2)*18;
  if(S.textAnim==="slide")x=((S.time*120)% (w+400))-200;
  ctx.globalAlpha=S.textOpacity;
  ctx.font=`${S.fontStyle} ${size}px "${S.font}"`;
  ctx.textAlign=S.textAlign;ctx.textBaseline="middle";
  const maxChars=S.textAnim==="typewriter"?Math.max(0,Math.floor(S.time*12)):S.text.length;
  const txt=S.text.slice(0,maxChars);
  const metrics=ctx.measureText(txt);
  if(S.textBg!=="transparent"){
    const pad=18;
    let bx=x;
    if(S.textAlign==="center")bx-=metrics.width/2;
    if(S.textAlign==="right")bx-=metrics.width;
    ctx.fillStyle=S.textBg;ctx.globalAlpha=S.textOpacity*.72;
    ctx.fillRect(bx-pad,y-size*.6,metrics.width+pad*2,size*1.2);
    ctx.globalAlpha=S.textOpacity;
  }
  const styleColors={
    gold:"#ffe28a",neon:"#6ffff0",glass:"#fff",royal:"#f3d06a",
    cinema:"#fff",love:"#ff9eb5",minimal:S.textColor,diamond:"#d7f9ff"
  };
  ctx.fillStyle=styleColors[S.textStyle]||S.textColor;
  ctx.shadowColor="#000";ctx.shadowBlur=10;
  ctx.fillText(txt,x,y);
  ctx.restore();
}
function render(){
  try{
    const c=$("canvas"),ctx=c.getContext("2d");
    const w=c.width,h=c.height;
    if(!ctx || !w || !h)return;
    ctx.clearRect(0,0,w,h);
  ctx.fillStyle="#000";ctx.fillRect(0,0,w,h);
  ctx.save();ctx.filter=applyLook(ctx);
  if(S.bg)drawMedia(ctx,S.bg,0,0,w,h,S.bgFit);
  ctx.restore();

  if(S.frame){
    const fw=w*(S.fs/100),fh=h*(S.fs/100);
    const x=(w-fw)/2+(S.fx/100)*w,y=(h-fh)/2+(S.fy/100)*h;
    ctx.save();ctx.translate(x+fw/2,y+fh/2);ctx.rotate(S.fr*Math.PI/180);
    ctx.beginPath();ctx.rect(-fw/2,-fh/2,fw,fh);ctx.clip();
    drawMedia(ctx,S.frame,-fw/2,-fh/2,fw,fh,S.frameFit);
    ctx.restore();
  }
    drawFrame(ctx,w,h);
    drawEffect(ctx,w,h);
    drawText(ctx,w,h);
    $("stageMessage").style.display=(S.bg||S.frame||S.text)?"none":"block";
  }catch(e){
    console.error("Render error:",e);
    const box=$("errorBox");
    if(box){ box.textContent="Render error: "+(e.message||e); box.classList.remove("hidden"); }
  }
}
function tick(now){
  const dt=Math.min(.08,(now-last)/1000);last=now;
  if(S.playing){
    S.time+=dt;
    if(S.time>=S.duration){S.time=0;S.playing=false;}
    $("timeline").value=S.time;
    updateTime();
    render();
  }
  raf=requestAnimationFrame(tick);
}
function updateTime(){
  const fmt=s=>{s=Math.max(0,s);return String(Math.floor(s/60)).padStart(2,"0")+":"+String(Math.floor(s%60)).padStart(2,"0")};
  $("timeLabel").textContent=`${fmt(S.time)} / ${fmt(S.duration)}`;
}
function startPlay(){
  clearError();S.playing=true;
  if(S.bg?.type==="video")S.bg.el.play().catch(()=>{});
  if(S.frame?.type==="video")S.frame.el.play().catch(()=>{});
  status("Preview चल रहा है");
}
function stopPlay(){S.playing=false;S.bg?.type==="video"&&S.bg.el.pause();S.frame?.type==="video"&&S.frame.el.pause();status("Paused");}

async function camera(target,facing){
  clearError();
  stopCamera(target);
  const stream=await navigator.mediaDevices.getUserMedia({
    video:{facingMode:{ideal:facing},width:{ideal:1920},height:{ideal:1080}},
    audio:true
  });
  const v=document.createElement("video");
  v.autoplay=true;v.playsInline=true;v.muted=true;v.srcObject=stream;
  await v.play().catch(()=>{});
  const media={type:"video",el:v,stream,url:null,name:"Camera",ready:true};
  if(target==="bg"){S.bg=media;S.bgStream=stream;$("bgCamStatus").textContent=`Camera ON • ${facing==="user"?"Front":"Back"}`;}
  else{S.frame=media;S.frameStream=stream;$("frameCamStatus").textContent=`Camera ON • ${facing==="user"?"Front":"Back"}`;}
  status(`${target==="bg"?"Background":"Frame"} camera ON`);
  render();
}
function stopCamera(target){
  const stream=target==="bg"?S.bgStream:S.frameStream;
  if(stream)stream.getTracks().forEach(t=>t.stop());
  if(target==="bg"){S.bgStream=null;$("bgCamStatus").textContent="Camera बंद";}
  else{S.frameStream=null;$("frameCamStatus").textContent="Camera बंद";}
}

async function exportVideo(){
  clearError();
  if(!window.MediaRecorder){error("इस browser में MediaRecorder उपलब्ध नहीं है। Chrome/Edge का latest version इस्तेमाल करें।");return;}
  try{
    status("Export तैयार हो रहा है…");
    stopPlay();
    const stream=$("canvas").captureStream(30);
    const mime=["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"].find(MediaRecorder.isTypeSupported);
    if(!mime)throw new Error("WebM recording supported नहीं है।");
    const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:8000000});
    const chunks=[];
    rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
    const done=new Promise((resolve,reject)=>{rec.onstop=resolve;rec.onerror=e=>reject(e.error||e)});
    S.time=0;render();
    rec.start(200);
    const duration=Math.max(1,S.duration);
    const started=performance.now();
    const oldPlaying=S.playing;S.playing=true;
    await new Promise(resolve=>{
      const loop=()=>{
        const elapsed=(performance.now()-started)/1000;
        S.time=Math.min(duration,elapsed);
        $("timeline").value=S.time;updateTime();render();
        if(elapsed<duration)requestAnimationFrame(loop);else resolve();
      };loop();
    });
    S.playing=false;rec.stop();await done;
    const blob=new Blob(chunks,{type:mime});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=`ai-video-editor-${Date.now()}.webm`;
    document.body.appendChild(a);a.click();a.remove();
    status("Export complete — Download शुरू हो गया");
    S.time=0;render();updateTime();
  }catch(e){error("Export failed: "+(e.message||e))}
}

function makeAssets(){
  const fill=(id,arr,key)=>{
    const box=$(id);box.innerHTML="";
    arr.forEach(([v,label])=>{
      const b=document.createElement("button");b.className="asset";b.textContent=label;b.dataset.value=v;
      b.onclick=()=>{S[key]=v;qsa(`#${id} .asset`).forEach(x=>x.classList.remove("active"));b.classList.add("active");render()};
      box.appendChild(b);
    });
  };
  fill("frameGrid",frames,"frameStyle");
  fill("effectGrid",effects,"effect");
  fill("textStyles",textStyles,"textStyle");
  fill("lookGrid",looks,"look");
  const tg=$("templateGrid");tg.innerHTML="";
  templates.forEach(([v,label])=>{
    const b=document.createElement("button");b.className="asset";b.textContent=label;
    b.onclick=()=>applyTemplate(v);tg.appendChild(b);
  });
  qsa("#frameGrid .asset")[0]?.classList.add("active");
  qsa("#effectGrid .asset")[0]?.classList.add("active");
  qsa("#textStyles .asset")[0]?.classList.add("active");
  qsa("#lookGrid .asset")[0]?.classList.add("active");
}
function applyTemplate(name){
  const preset={
    wedding:{frame:"gold",effect:"sparkle",look:"warm",textStyle:"gold",textAnim:"float"},
    romantic:{frame:"heart",effect:"hearts",look:"dream",textStyle:"love",textAnim:"float"},
    invitation:{frame:"royal",effect:"gold",look:"cinematic",textStyle:"royal",textAnim:"slide"},
    birthday:{frame:"rainbow",effect:"sparkle",look:"vivid",textStyle:"neon",textAnim:"pulse"},
    anniversary:{frame:"floral",effect:"petals",look:"warm",textStyle:"love",textAnim:"float"},
    cinematic:{frame:"film",effect:"streak",look:"cinematic",textStyle:"cinema",textAnim:"none"},
    royal:{frame:"blackgold",effect:"gold",look:"cinematic",textStyle:"royal",textAnim:"none"},
    travel:{frame:"platinum",effect:"bokeh",look:"vivid",textStyle:"minimal",textAnim:"slide"},
    festival:{frame:"neon",effect:"stars",look:"vivid",textStyle:"neon",textAnim:"pulse"},
    memories:{frame:"glass",effect:"bokeh",look:"dream",textStyle:"minimal",textAnim:"float"}
  }[name];
  if(!preset)return;
  Object.assign(S,preset);
  syncControls();
  status(`${name} template applied`);
  render();
}
function syncControls(){
  const map={fx:S.fx,fy:S.fy,fs:S.fs,fr:S.fr,frameOpacity:S.frameOpacity*100,borderWidth:S.borderWidth,
    textSize:S.textSize,textOpacity:S.textOpacity*100,effectIntensity:S.effectIntensity*100,effectSpeed:S.effectSpeed,
    brightness:S.brightness,contrast:S.contrast,saturation:S.saturation,videoVolume:S.videoVolume*100,
    frameVolume:S.frameVolume*100,musicVolume:S.musicVolume*100};
  Object.entries(map).forEach(([id,v])=>{if($(id))$(id).value=v});
  $("textInput").value=S.text;$("textColor").value=S.textColor;$("textBg").value=S.textBg;
  $("font").value=S.font;$("fontStyle").value=S.fontStyle;$("textAlign").value=S.textAlign;$("textAnim").value=S.textAnim;
  qsa(".asset").forEach(b=>b.classList.toggle("active",b.dataset.value===S.frameStyle||b.dataset.value===S.effect||b.dataset.value===S.textStyle||b.dataset.value===S.look));
}

function bind(){
  qsa(".tab").forEach(b=>b.onclick=()=>{
    qsa(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");
    qsa(".page").forEach(x=>x.classList.toggle("active",x.dataset.page===b.dataset.page));
  });
  $("bgFile").onchange=async e=>{try{if(e.target.files[0]){S.bg=await mediaFromFile(e.target.files[0]);S.duration=S.bg.type==="video"?Math.min(600,S.bg.el.duration||30):30;$("timeline").max=S.duration;status("Background media loaded");render();updateTime()}}catch(x){error(x.message)}};
  $("frameFile").onchange=async e=>{try{if(e.target.files[0]){S.frame=await mediaFromFile(e.target.files[0]);status("Frame media loaded");render()}}catch(x){error(x.message)}};
  qsa(".fit").forEach(b=>b.onclick=()=>{S.bgFit=b.dataset.fit;qsa(".fit").forEach(x=>x.classList.toggle("active",x===b));render()});
  qsa(".ffit").forEach(b=>b.onclick=()=>{S.frameFit=b.dataset.frameFit;qsa(".ffit").forEach(x=>x.classList.toggle("active",x===b));render()});
  ["fx","fy","fs","fr"].forEach(id=>$(id).oninput=e=>{S[id]=Number(e.target.value);render()});
  $("frameOpacity").oninput=e=>{S.frameOpacity=Number(e.target.value)/100;render()};
  $("borderWidth").oninput=e=>{S.borderWidth=Number(e.target.value);render()};
  $("textInput").oninput=e=>{S.text=e.target.value;render()};
  $("textSize").oninput=e=>{S.textSize=Number(e.target.value);render()};
  $("textOpacity").oninput=e=>{S.textOpacity=Number(e.target.value)/100;render()};
  $("textColor").oninput=e=>{S.textColor=e.target.value;render()};
  $("textBg").oninput=e=>{S.textBg=e.target.value;render()};
  $("font").onchange=e=>{S.font=e.target.value;render()};
  $("fontStyle").onchange=e=>{S.fontStyle=e.target.value;render()};
  $("textAlign").onchange=e=>{S.textAlign=e.target.value;render()};
  $("textAnim").onchange=e=>{S.textAnim=e.target.value;render()};
  $("effectIntensity").oninput=e=>{S.effectIntensity=Number(e.target.value)/100;render()};
  $("effectSpeed").oninput=e=>{S.effectSpeed=Number(e.target.value)/100;render()};
  ["brightness","contrast","saturation"].forEach(id=>$(id).oninput=e=>{S[id]=Number(e.target.value);render()});
  $("videoVolume").oninput=e=>{S.videoVolume=Number(e.target.value)/100};
  $("frameVolume").oninput=e=>{S.frameVolume=Number(e.target.value)/100};
  $("musicVolume").oninput=e=>{S.musicVolume=Number(e.target.value)/100};
  $("musicFile").onchange=e=>{S.music=e.target.files[0]||null;status(S.music?"Music selected":"Music removed")};
  $("ratio").onchange=resize;$("quality").onchange=resize;
  $("playBtn").onclick=startPlay;$("pauseBtn").onclick=stopPlay;
  $("restartBtn").onclick=()=>{S.time=0;$("timeline").value=0;render();updateTime();status("Start पर वापस")};
  $("timeline").oninput=e=>{S.time=Number(e.target.value);render();updateTime()};
  $("bgFront").onclick=()=>camera("bg","user");$("bgBack").onclick=()=>camera("bg","environment");$("bgStop").onclick=()=>stopCamera("bg");
  $("frameFront").onclick=()=>camera("frame","user");$("frameBack").onclick=()=>camera("frame","environment");$("frameStop").onclick=()=>stopCamera("frame");
  $("exportBtn").onclick=exportVideo;
  window.addEventListener("error",e=>error(`JavaScript error: ${e.message}`));
  window.addEventListener("unhandledrejection",e=>error(`Error: ${e.reason?.message||e.reason}`));
}

window.addEventListener("DOMContentLoaded",()=>{
  try{
    makeAssets();bind();resize();updateTime();status("Editor ready");
    raf=requestAnimationFrame(tick);
  }catch(e){error(e.stack||e.message)}
});
})();