// analyze.js
import { $ } from './utils.js';

export function mountAnalyze(root){
  root.innerHTML = `
    <div class="button-row ana-toolbar">
      <input type="file" id="anaFile" accept="image/*">
      <button class="btn" id="anaRun">Analyze</button>
      <span class="tag tiny" id="anaStatus">—</span>
    </div>

    <div class="ana-grid" style="margin-top:10px">
      <canvas id="anaCanvas" aria-label="Preview"></canvas>
      <div class="stack" style="flex:1">
        <div class="chip">
          <div><b>Analysis Report</b></div>
          <div id="anaReport" class="tiny">—</div>
        </div>
      </div>
    </div>
  `;

  const f   = $('#anaFile',root);
  const run = $('#anaRun',root);
  const can = $('#anaCanvas',root);
  const rep = $('#anaReport',root);
  const status = $('#anaStatus',root);

  let srcData = null;
  let imgObj = null;
  let aspect = 16/9; // default until image loads

  function fitCanvas() {
    // measure the width the grid has actually given this canvas
    let colW = can.getBoundingClientRect().width;
  
    // first call can be 0 while layout settles — try once on the next frame
    if (!colW) {
      requestAnimationFrame(fitCanvas);
      return;
    }
  
    const cssW = Math.max(260, Math.floor(colW));
    const cssH = Math.round(cssW / aspect);
    const dpr  = Math.min(window.devicePixelRatio || 1, 2);
  
    // CSS box size (what the user sees)
    can.style.width  = cssW + 'px';
    can.style.height = cssH + 'px';
  
    // drawing buffer size (crispness)
    can.width  = Math.round(cssW * dpr);
    can.height = Math.round(cssH * dpr);
  
    const ctx = can.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // 1 unit == 1 CSS px
  }

  function drawPreview() {
    const ctx = can.getContext('2d');
    const w = can.clientWidth;
    const h = can.clientHeight;
    ctx.clearRect(0,0,w,h);

    if (!imgObj) return;

    const s = Math.min(w / imgObj.naturalWidth, h / imgObj.naturalHeight);
    const dw = Math.round(imgObj.naturalWidth * s);
    const dh = Math.round(imgObj.naturalHeight * s);
    const dx = Math.round((w - dw) / 2);
    const dy = Math.round((h - dh) / 2);
    ctx.drawImage(imgObj, dx, dy, dw, dh);
  }

  function setStatus(t){ status.textContent = t; }

  f.onchange = e=>{
    const file = e.target.files && e.target.files[0];
    if(!file){ setStatus('—'); return; }
    setStatus('Reading…');

    const fr = new FileReader();
    fr.onload = ev=>{
      srcData = ev.target.result;
      const i = new Image();
      i.onload = ()=>{
        imgObj = i;
        aspect = i.naturalWidth / i.naturalHeight || aspect;
        fitCanvas();
        drawPreview();
        rep.textContent = 'Loaded. Tap Analyze.';
        can.dataset.natw = i.naturalWidth;
        can.dataset.nath = i.naturalHeight;
        setStatus(`${i.naturalWidth}×${i.naturalHeight}`);
      };
      i.src = srcData;
    };
    fr.readAsDataURL(file);
  };

  run.onclick = ()=>{
    if(!srcData){ alert('Load an image first'); return; }
    const ctx = can.getContext('2d');

    // analyze the actually drawn resolution (device px)
    const W = can.width;
    const H = can.height;
    const { data } = ctx.getImageData(0,0,W,H);

    const bins = new Map();
    let alphaCount = 0;

    for(let i=0;i<data.length;i+=4){
      const r=data[i], g=data[i+1], b=data[i+2], a=data[i+3];
      // coarse binning for robustness
      const key = ((Math.floor(r/24))<<16) | ((Math.floor(g/24))<<8) | (Math.floor(b/24));
      bins.set(key, (bins.get(key)||0)+1);
      if(a<255) alphaCount++;
    }

    const colors = bins.size;
    const total = W*H;

    let entropy=0;
    for(const c of bins.values()){
      const p=c/total; entropy -= p * Math.log2(p);
    }

    const input = f.files[0];
    const transPct = (alphaCount/total)*100;
    const fmt = (input && input.name.includes('.') ? input.name.split('.').pop().toUpperCase() : '—');

    rep.innerHTML = `
      <div><b>Number of colors:</b> ${colors}</div>
      <div><b>Entropy:</b> ${entropy.toFixed(2)} bits</div>
      <div><b>Transparency:</b> ${transPct.toFixed(2)}%</div>
      <div><b>File size:</b> ${(input.size/1024).toFixed(2)} KB</div>
      <div><b>Dimensions:</b> ${can.dataset.natw} × ${can.dataset.nath} px</div>
      <div><b>Format:</b> ${fmt}</div>
      <div><b>Heuristic:</b> ${
        (colors<=100 && entropy<=7.5) ? 'Professional' :
        (colors<=200 && entropy<=8.5)? 'Possibly Professional' : 'Colorful/Organic'
      }</div>
    `;
  };

  // responsive redraws
  window.addEventListener('resize', ()=>{ fitCanvas(); drawPreview(); }, { passive:true });

  // first paint baseline
  fitCanvas();
}
