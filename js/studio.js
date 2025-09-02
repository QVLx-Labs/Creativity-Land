// js/studio.js
import { $, clamp } from './utils.js';
import { removeBackgroundFromImage } from './bgremove.js';

export function mountStudio(root) {
  root.innerHTML = `
    <div class="editor-wrap">
      <div>
        <div id="studioPreview" style="display:none">
          <canvas id="studioCanvas" width="960" height="600" aria-label="Editor canvas"></canvas>
          <div class="button-row" style="margin-top:10px">
            <input type="file" id="studioFile" accept="image/*">
            <button class="btn" id="fitContain">Fit</button>
            <button class="btn" id="zoom100">100%</button>

            <!-- Background Remover (non-ML) -->
            <button class="btn" id="aiRemoveBg" title="Background -> transparency">Remove BG</button>
            <label class="tiny" style="display:flex;align-items:center;gap:6px">
              Feather <input id="rbFeather" type="range" min="0" max="10" value="2" class="range" style="max-width:140px">
              <span id="rbFeatherLbl" class="tiny">2px</span>
            </label>

            <!-- Color -> Transparency (Studio) -->
            <label class="tiny" style="display:flex;align-items:center;gap:6px">
              Color → α
              <input id="ctHex" type="text" placeholder="#ffffff" style="width:100px">
              Tolerance <input id="ctTol" type="number" min="0" max="255" value="20" style="width:70px">
              <button class="btn" id="colorToAlphaBtn">Make Transparent</button>
            </label>

            <button class="btn primary" id="downloadImg">Download</button>
            <span class="tag" id="statusDim">—</span>
          </div>
        </div>
        <div id="studioUploadEmpty" class="button-row">
          <input type="file" id="studioFileEmpty" accept="image/*">
          <span class="tiny">Upload an image to begin.</span>
        </div>
      </div>

      <div class="stack">
        <h3>Adjustments</h3>
        <div><label class="tiny">Brightness <span id="lblBright" class="hint">0</span></label>
          <input class="range" id="rngBright" type="range" min="-100" max="100" value="0"></div>
        <div><label class="tiny">Contrast <span id="lblContrast" class="hint">0</span></label>
          <input class="range" id="rngContrast" type="range" min="-100" max="100" value="0"></div>
        <div><label class="tiny">Saturation <span id="lblSat" class="hint">0</span></label>
          <input class="range" id="rngSat" type="range" min="-100" max="200" value="0"></div>
        <div><label class="tiny">Hue Rotate <span id="lblHue" class="hint">0°</span></label>
          <input class="range" id="rngHue" type="range" min="-180" max="180" value="0"></div>
        <div><label class="tiny">Blur <span id="lblBlur" class="hint">0</span></label>
          <input class="range" id="rngBlur" type="range" min="0" max="8" value="0"></div>
        <div class="button-row">
          <button class="btn" data-filter="grayscale">Grayscale</button>
          <button class="btn" data-filter="sepia">Sepia</button>
          <button class="btn" data-filter="invert">Invert</button>
          <button class="btn" data-filter="sharpen">Sharpen</button>
          <button class="btn ghost" id="clearAdj">Clear</button>
        </div>

        <h3>History</h3>
        <div class="button-row">
          <button class="btn" id="undoBtn">Undo (Z)</button>
          <button class="btn" id="redoBtn">Redo (Shift+Z)</button>
        </div>

        <h3>Canvas Ops</h3>
        <div class="button-row">
          <button class="btn" id="rotateL">Rotate -90°</button>
          <button class="btn" id="rotateR">Rotate +90°</button>
          <button class="btn" id="flipH">Flip H</button>
          <button class="btn" id="flipV">Flip V</button>
        </div>

        <h3>Resize</h3>
        <div class="row">
          <input type="number" id="rsW" min="1" placeholder="Width">
          <input type="number" id="rsH" min="1" placeholder="Height">
          <label class="tiny" style="display:flex;align-items:center;gap:6px">
            <input type="checkbox" id="rsLock" checked> Lock aspect
          </label>
          <button class="btn" id="applyResize">Apply Resize</button>
          <button class="btn ghost" id="resetResize">Reset Size</button>
        </div>
      </div>
    </div>
  `;

  const can = $('#studioCanvas', root), ctx = can.getContext('2d');
  const fileEmpty = $('#studioFileEmpty', root), file = $('#studioFile', root);
  const fit = $('#fitContain', root), z100 = $('#zoom100', root), stat = $('#statusDim', root);
  const rotateL = $('#rotateL', root), rotateR = $('#rotateR', root), flipH = $('#flipH', root), flipV = $('#flipV', root);
  const rsW = $('#rsW', root), rsH = $('#rsH', root), rsLock = $('#rsLock', root), applyResize = $('#applyResize', root), resetResize = $('#resetResize', root);
  const undoBtn = $('#undoBtn', root), redoBtn = $('#redoBtn', root), downloadBtn = $('#downloadImg', root);

  const rngBright=$('#rngBright', root), rngContrast=$('#rngContrast', root), rngSat=$('#rngSat', root), rngHue=$('#rngHue', root), rngBlur=$('#rngBlur', root);
  const lblB=$('#lblBright', root), lblC=$('#lblContrast', root), lblS=$('#lblSat', root), lblH=$('#lblHue', root), lblBl=$('#lblBlur', root);
  const filterBtns = Array.from(root.querySelectorAll('button[data-filter]'));

  // Background remover controls
  const aiBtn = $('#aiRemoveBg', root);
  const rbFeather = $('#rbFeather', root);
  const rbFeatherLbl = $('#rbFeatherLbl', root);

  // Color -> transparency controls (Studio)
  const ctHex = $('#ctHex', root);
  const ctTol = $('#ctTol', root);
  const colorToAlphaBtn = $('#colorToAlphaBtn', root);

  // Optional (absent) reset button guard to avoid runtime errors
  const reset = $('#resetImg', root);

  const adj = { bright: 0, contrast: 0, sat: 0, hue: 0, blur: 0 };
  let img = null, origImage = null, origWidth = 0, origHeight = 0, aspect = 1, origDataURL = null;
  const redoStack = [], undoStack = [];

  // NEW: view mode state ("fit" | "100")
  let viewMode = 'fit';

  const showPreview = show => {
    $('#studioPreview', root).style.display = show ? 'block' : 'none';
    $('#studioUploadEmpty', root).style.display = show ? 'none' : 'flex';
  };

  const makeFilter = () => [
    `brightness(${100+adj.bright}%)`,
    `contrast(${100+adj.contrast}%)`,
    `saturate(${100+adj.sat}%)`,
    `hue-rotate(${adj.hue}deg)`,
    adj.blur>0 ? `blur(${adj.blur}px)` : ''
  ].filter(Boolean).join(' ');

  function draw() {
    ctx.clearRect(0,0,can.width,can.height);
    if(!img){ stat.textContent='—'; return; }

    ctx.filter = makeFilter();

    if (viewMode === 'fit') {
      const s = Math.min(can.width / img.width, can.height / img.height);
      const w = Math.round(img.width * s), h = Math.round(img.height * s);
      const x = (can.width - w) / 2, y = (can.height - h) / 2;
      ctx.drawImage(img, x, y, w, h);
      stat.textContent = `${img.width}×${img.height} • ${Math.round(s*100)}%`;
    } else {
      // 100%: draw at natural size, centered (cropped if larger)
      const x = Math.round((can.width - img.width) / 2);
      const y = Math.round((can.height - img.height) / 2);
      ctx.drawImage(img, x, y);
      stat.textContent = `${img.width}×${img.height} • 100%`;
    }
  }

  function commitFromCanvas(off) {
    saveUndo();
    const next = new Image();
    next.onload = ()=>{ img = next; draw(); };
    next.src = off.toDataURL('image/png');
  }

  const applyResizeNow = () => {
    if(!img) return;
    const w = Math.max(1, parseInt(rsW.value,10) || img.width);
    const h = Math.max(1, parseInt(rsH.value,10) || img.height);
    const off = document.createElement('canvas');
    off.width = w; off.height = h;
    off.getContext('2d').drawImage(img, 0, 0, w, h);
    commitFromCanvas(off);
  };

  const resetResizeNow = () => {
    if(!origDataURL) return;
    const i = new Image();
    i.onload = ()=>{ img = i; rsW.value = origWidth; rsH.value = origHeight; viewMode = 'fit'; draw(); };
    i.src = origDataURL;
  };

  const loadFromFile = file => {
    const fr=new FileReader();
    fr.onload=ev=>{
      const i=new Image();
      i.onload=()=>{
        img = i; origImage = i;
        origWidth=i.naturalWidth; origHeight=i.naturalHeight;
        aspect = origWidth/origHeight;
        origDataURL = ev.target.result;
        rsW.value = origWidth; rsH.value = origHeight;
        undoStack.length=0; redoStack.length=0;
        viewMode = 'fit';
        showPreview(true); draw();
      };
      i.src=ev.target.result;
    };
    fr.readAsDataURL(file);
  };

  fileEmpty.onchange = e=>{ const f=e.target.files?.[0]; if(f) loadFromFile(f); };
  file.onchange       = e=>{ const f=e.target.files?.[0]; if(f) loadFromFile(f); };

  if (reset) {
    reset.onclick = ()=>{
      adj.bright=adj.contrast=adj.sat=adj.hue=adj.blur=0;
      viewMode='fit';
      sync(); draw();
    };
  }
  fit.onclick   = ()=>{ viewMode='fit'; draw(); };
  z100.onclick  = ()=>{ viewMode='100'; draw(); };

  const sync = ()=> {
    lblB.textContent = adj.bright; lblC.textContent = adj.contrast; lblS.textContent = adj.sat; lblH.textContent = `${adj.hue}°`; lblBl.textContent = adj.blur;
    rngBright.value=adj.bright; rngContrast.value=adj.contrast; rngSat.value=adj.sat; rngHue.value=adj.hue; rngBlur.value=adj.blur;
  };

  rngBright.oninput = e=>{ adj.bright=+e.target.value; sync(); draw(); };
  rngContrast.oninput= e=>{ adj.contrast=+e.target.value; sync(); draw(); };
  rngSat.oninput     = e=>{ adj.sat=+e.target.value; sync(); draw(); };
  rngHue.oninput     = e=>{ adj.hue=+e.target.value; sync(); draw(); };
  rngBlur.oninput    = e=>{ adj.blur=+e.target.value; sync(); draw(); };

  filterBtns.forEach(b=> b.onclick = ()=>{
    if(b.dataset.filter==='grayscale'){ adj.sat=-100; adj.hue=0; }
    if(b.dataset.filter==='sepia'){ adj.sat=10; adj.hue=18; }
    if(b.dataset.filter==='invert'){ adj.hue=180; }
    if(b.dataset.filter==='sharpen'){ adj.contrast=20; }
    sync(); draw();
  });

  $('#clearAdj',root).onclick = ()=>{ adj.bright=adj.contrast=adj.sat=adj.hue=adj.blur=0; sync(); draw(); };

  rotateL.onclick = ()=> rotate(-90);
  rotateR.onclick = ()=> rotate(90);
  flipH.onclick   = ()=> flip('h');
  flipV.onclick   = ()=> flip('v');
  applyResize.onclick = applyResizeNow;
  resetResize.onclick = resetResizeNow;

  rsW.oninput = ()=>{ if(rsLock.checked && img) rsH.value = Math.round((+rsW.value)/aspect); };
  rsH.oninput = ()=>{ if(rsLock.checked && img) rsW.value = Math.round((+rsH.value)*aspect); };

  function rotate(deg){
    if(!img) return;
    const off = document.createElement('canvas');
    if(Math.abs(deg)%180===90){ off.width = img.height; off.height = img.width; } 
    else { off.width = img.width; off.height = img.height; }
    const ox = off.getContext('2d');
    ox.translate(off.width/2, off.height/2);
    ox.rotate((deg*Math.PI)/180);
    ox.drawImage(img, -img.width/2, -img.height/2);
    commitFromCanvas(off);
  }

  function flip(axis){
    if(!img) return;
    const off = document.createElement('canvas');
    off.width = img.width; off.height = img.height;
    const ox = off.getContext('2d');
    ox.translate(off.width/2, off.height/2);
    ox.scale(axis==='h' ? -1 : 1, axis==='v' ? -1 : 1);
    ox.drawImage(img, -img.width/2, -img.height/2);
    commitFromCanvas(off);
  }

  const saveUndo = ()=>{
    if(!img) return;
    const off = document.createElement('canvas');
    off.width = img.width; off.height = img.height;
    off.getContext('2d').drawImage(img,0,0);
    undoStack.push(off);
    if(undoStack.length>30) undoStack.shift();
  };

  undoBtn.onclick = ()=>{
    const last = undoStack.pop(); if(!last) return;
    redoStack.push(canvasSnapshot());
    commitFromCanvas(last);
  };

  redoBtn.onclick = ()=>{
    const r = redoStack.pop(); if(!r) return;
    undoStack.push(canvasSnapshot());
    commitFromCanvas(r);
  };

  const canvasSnapshot = ()=>{
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img,0,0);
    return c;
  };

  // Download final edited image at actual resolution with filters
  downloadBtn.onclick = ()=>{
    if(!img) return;
    const out = document.createElement('canvas');
    out.width = img.width;
    out.height = img.height;
    const octx = out.getContext('2d');
    octx.filter = makeFilter();
    octx.drawImage(img, 0, 0, img.width, img.height);
    const link = document.createElement('a');
    link.download = 'edited-image.png';
    link.href = out.toDataURL('image/png');
    link.click();
  };

  /* ===================== BACKGROUND REMOVER (pure JS) ===================== */
  aiBtn.addEventListener('click', async () => {
    if (!origImage) { alert('Load an image first.'); return; }
    aiBtn.disabled = true; const prev = aiBtn.textContent; aiBtn.textContent = 'Removing…';
    try {
      const feather = parseInt(rbFeather.value, 10) || 0;
      const resultCanvas = await removeBackgroundFromImage(origImage, { feather });
      commitFromCanvas(resultCanvas);
    } catch (err) {
      console.error('BG remove error:', err);
      alert('Background remover failed. Check bgremove.js and options.');
    } finally {
      aiBtn.disabled = false; aiBtn.textContent = prev;
    }
  });

  /* ===================== COLOR → TRANSPARENCY (Studio) ===================== */
  colorToAlphaBtn?.addEventListener('click', () => {
    if (!img) { alert('Load an image first.'); return; }

    const hex = (ctHex?.value || '').trim().toLowerCase();
    const target = parseHexForStudio(hex);
    if (!target) { alert('Enter a valid hex color like #ffffff or #fff'); return; }

    const tol = clamp(parseInt(ctTol?.value, 10) || 0, 0, 255);

    // Work on a raw-pixel copy (no filters)
    const off = document.createElement('canvas');
    off.width = img.width; off.height = img.height;
    const octx = off.getContext('2d', { willReadFrequently: true });
    octx.drawImage(img, 0, 0);

    const id = octx.getImageData(0, 0, off.width, off.height);
    const d = id.data;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i+1], b = d[i+2];
      const dr = r - target.r, dg = g - target.g, db = b - target.b;
      const dist = Math.sqrt(dr*dr + dg*dg + db*db); // Euclidean RGB
      if (dist <= tol) d[i+3] = 0; // transparent
    }

    octx.putImageData(id, 0, 0);
    commitFromCanvas(off);
  });

  function parseHexForStudio(h) {
    if (!h) return null;
    let s = h[0] === '#' ? h : ('#' + h);
    if (s.length === 4) s = '#' + s.slice(1).split('').map(ch => ch+ch).join('');
    if (!/^#[0-9a-f]{6}$/i.test(s)) return null;
    return {
      r: parseInt(s.slice(1,3),16),
      g: parseInt(s.slice(3,5),16),
      b: parseInt(s.slice(5,7),16),
    };
  }

  rbFeather.addEventListener('input', ()=>{ rbFeatherLbl.textContent = `${rbFeather.value}px`; });

  showPreview(false);
}
