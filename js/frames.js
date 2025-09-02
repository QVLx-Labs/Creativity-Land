// js/frames.js
import { $ as dom$, hexToRgb, rgbToHex } from './utils.js';
import { clamp } from './utils.js';

export function mountFrames(root){
  root.innerHTML = `
    <div class="two-col" style="margin-top:8px">
      <div class="stack">
        <label class="tiny">Uploads</label>
        <div class="row">
          <div class="chip" style="flex:1">
            <div><b>Base photo</b></div>
            <input type="file" id="frImg1" accept="image/*">
          </div>
          <div class="chip" style="flex:1">
            <div><b>Frame</b></div>
            <input type="file" id="frImg2" accept="image/*">
          </div>
        </div>

        <label class="tiny">Placement</label>
        <div class="row">
          <div style="min-width:90px"><span class="tiny">S</span><input type="number" id="frScale" min="1" max="500" value="100" /></div>
          <div style="min-width:90px"><span class="tiny">W</span><input type="number" id="frW" min="1" value="0" /></div>
          <div style="min-width:90px"><span class="tiny">H</span><input type="number" id="frH" min="1" value="0" /></div>
          <div style="min-width:90px"><span class="tiny">X</span><input type="number" id="frX" value="0" /></div>
          <div style="min-width:90px"><span class="tiny">Y</span><input type="number" id="frY" value="0" /></div>
        </div>

        <label class="tiny">Frame Options</label>
        <div class="row">
          <div style="min-width:160px">
            <span class="tiny">Opacity</span>
            <input type="range" id="frOpacity" min="0" max="100" value="0" class="range">
          </div>
          <div style="min-width:180px;display:flex;align-items:center;gap:6px">
            <input type="checkbox" id="frRecolor">
            <label for="frRecolor" class="tiny">Recolor near-white to RGB</label>
          </div>
        </div>

        <label class="tiny">White → Color (RGB)</label>
        <div class="row">
          <input type="number" id="frR" min="0" max="255" value="255" placeholder="R">
          <input type="number" id="frG" min="0" max="255" value="0" placeholder="G">
          <input type="number" id="frB" min="0" max="255" value="128" placeholder="B">
        </div>

        <label class="tiny">Make Color Transparent (base)</label>
        <div class="row">
          <input type="number" id="trR" min="0" max="255" value="0" placeholder="R">
          <input type="number" id="trG" min="0" max="255" value="0" placeholder="G">
          <input type="number" id="trB" min="0" max="255" value="0" placeholder="B">
        </div>

        <div class="button-row">
          <button class="btn ghost" id="frReset">Reset to image</button>
          <a class="btn primary" id="frDownload" download="Framed.png">Download</a>
        </div>
      </div>

      <div class="stack">
        <canvas id="frCanvas"></canvas>
        <div class="hint">Live preview. Use S/W/H/X/Y or drag sliders; opacity starts at 0 by design.</div>
      </div>
    </div>
  `;

  const can = dom$('#frCanvas', root);
  const ctx = can.getContext('2d');
  const baseFile=dom$('#frImg1',root), frameFile=dom$('#frImg2',root);
  const sInp=dom$('#frScale',root), wInp=dom$('#frW',root), hInp=dom$('#frH',root), xInp=dom$('#frX',root), yInp=dom$('#frY',root);
  const opInp=dom$('#frOpacity',root), recolorChk=dom$('#frRecolor',root);
  const rInp=dom$('#frR',root), gInp=dom$('#frG',root), bInp=dom$('#frB',root);
  const trR=dom$('#trR',root), trG=dom$('#trG',root), trB=dom$('#trB',root);
  const dl=dom$('#frDownload',root), resetBtn=dom$('#frReset',root);

  let baseImg=null, frameImg=null, baseNaturalW=0, baseNaturalH=0;

  // Keep the frame overlay locked to its natural aspect: width drives, height syncs.
  function syncFrameHeightFromWidth(){
    if(!frameImg) return;
    const ar = frameImg.naturalWidth / frameImg.naturalHeight;
    const w = parseInt(wInp.value,10) || frameImg.naturalWidth;
    const h = Math.max(1, Math.round(w / ar));
    if ((parseInt(hInp.value,10) || 0) !== h) hInp.value = h;
  }

  function fitToContainer(){
    const panel = can.parentElement;
    const maxW = panel.clientWidth || 640;
    const maxH = 420;

    // If no base yet, use a neutral 16:9 so the box isn’t weird
    if(!baseImg){
      const cw = maxW;
      const ch = Math.min(maxH, Math.round((maxW * 9) / 16));
      can.width = cw; can.height = ch;
      can.style.width = cw + 'px';
      can.style.height = ch + 'px';
      return;
    }

    // Fit the base image while preserving its native aspect
    const ratio = baseImg.naturalWidth / baseImg.naturalHeight;
    let cw = maxW, ch = Math.round(maxW / ratio);
    if(ch > maxH){ ch = maxH; cw = Math.round(maxH * ratio); }

    can.width = cw; can.height = ch;
    can.style.width = cw + 'px';
    can.style.height = ch + 'px';

    // Initialize controls the first time or after reset
    if(parseInt(wInp.value,10)===0 || parseInt(hInp.value,10)===0){
      wInp.value = cw;
      // h will be synced from frame aspect if a frame is present
      if(!frameImg){ hInp.value = ch; }
      sInp.value = 100; xInp.value = 0; yInp.value = 0;
    }
  }

  function loadFileToImage(file, cb){
    const r = new FileReader();
    r.onload = e=>{
      const img = new Image();
      img.onload = ()=>cb(img);
      img.src = e.target.result;
    };
    r.readAsDataURL(file);
  }

  function recolorWhiteish(imgData, tgt){ // Only if checked
    const d = imgData.data;
    for(let i=0;i<d.length;i+=4){
      const r=d[i], g=d[i+1], b=d[i+2];
      if(r>220 && g>220 && b>220 && Math.abs(r-g)<8 && Math.abs(r-b)<8 && Math.abs(g-b)<8){
        d[i]=tgt.r; d[i+1]=tgt.g; d[i+2]=tgt.b;
      }
    }
  }

  function makeColorTransparent(imgData, key){
    const d = imgData.data;
    for(let i=0;i<d.length;i+=4){
      if(d[i]===key.r && d[i+1]===key.g && d[i+2]===key.b) d[i+3]=0;
    }
  }

  function render(){
    ctx.clearRect(0,0,can.width,can.height);
    if(!baseImg){ return; }

    // Base always fills the canvas (no distortion)
    ctx.drawImage(baseImg, 0, 0, baseImg.naturalWidth, baseImg.naturalHeight, 0, 0, can.width, can.height);

    // Optional base transparency key
    const kr = {
      r: parseInt(trR.value,10) || 0,
      g: parseInt(trG.value,10) || 0,
      b: parseInt(trB.value,10) || 0
    };
    if (kr.r || kr.g || kr.b) {
      const imgData = ctx.getImageData(0,0,can.width,can.height);
      makeColorTransparent(imgData, kr);
      ctx.putImageData(imgData,0,0);
    }

    if(frameImg){
      // Width drives; height is derived from the frame’s natural aspect
      const ar = frameImg.naturalWidth / frameImg.naturalHeight;
      const inputW = parseInt(wInp.value, 10) || frameImg.naturalWidth;
      const inputH = Math.max(1, Math.round(inputW / ar));
      if ((parseInt(hInp.value,10) || 0) !== inputH) hInp.value = inputH;

      const scale  = (parseInt(sInp.value, 10) || 33) / 100;
      const fw = Math.max(1, Math.round(inputW * scale));
      const fh = Math.max(1, Math.round(inputH * scale));

      // Offscreen for recolor pipeline
      const off = document.createElement('canvas');
      off.width = fw; off.height = fh;
      const ox = off.getContext('2d');
      ox.drawImage(frameImg, 0, 0, fw, fh);

      if (recolorChk.checked) {
        const target = {
          r: parseInt(rInp.value,10) || 0,
          g: parseInt(gInp.value,10) || 0,
          b: parseInt(bInp.value,10) || 0
        };
        const data = ox.getImageData(0,0,fw,fh);
        recolorWhiteish(data, target);
        ox.putImageData(data,0,0);
      }

      // Draw overlay
      ctx.save();
      ctx.globalAlpha = clamp((parseInt(opInp.value,10) || 33) / 100, 0, 1);
      const dx = Math.round((can.width - fw) / 2) + (parseInt(xInp.value, 10) || 0);
      const dy = Math.round((can.height - fh) / 2) + (parseInt(yInp.value, 10) || 0);
      ctx.drawImage(off, dx, dy);
      ctx.restore();
    }

    dl.href = can.toDataURL('image/png');
  }

  function resetToImage(){
    if(!baseImg) return;
    fitToContainer();
    wInp.value = can.width;
    if(frameImg){
      syncFrameHeightFromWidth(); // keep frame aspect
    }else{
      hInp.value = can.height;    // harmless default until a frame loads
    }
    sInp.value = 33;
    xInp.value = 0;
    yInp.value = 0;
    opInp.value = 100;
    recolorChk.checked = false;
    render();
  }

  baseFile.addEventListener('change', e=>{
    const f=e.target.files && e.target.files[0]; if(!f) return;
    loadFileToImage(f, img=>{
      baseImg = img; baseNaturalW = img.naturalWidth; baseNaturalH = img.naturalHeight;
      fitToContainer(); resetToImage();
    });
  });

  frameFile.addEventListener('change', e=>{
    const f=e.target.files && e.target.files[0]; if(!f) return;
    loadFileToImage(f, img=>{
      frameImg = img;
      // sensible defaults for overlay size and position
      wInp.value = can.width;
      syncFrameHeightFromWidth();
      sInp.value = 100;
      xInp.value = 0;
      yInp.value = 0;
      render();
    });
  });

  // Keep height synced whenever width changes (prevents stretch)
  wInp.addEventListener('input', syncFrameHeightFromWidth);
  wInp.addEventListener('change', syncFrameHeightFromWidth);

  // live updates (no Render button)
  [sInp,hInp,xInp,yInp,opInp,rInp,gInp,bInp,trR,trG,trB].forEach(el=>{
    el.addEventListener('input', render);
    el.addEventListener('change', render);
  });
  recolorChk.addEventListener('change', render);
  resetBtn.addEventListener('click', resetToImage);

  // initial canvas baseline
  fitToContainer(); render();

  // keep layout correct on rotation / resize (register ONCE, here)
  const onResize = ()=>{ fitToContainer(); render(); };
  window.addEventListener('resize', onResize, { passive:true });
}
