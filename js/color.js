// js/color.js
import {
  $, $$, clamp, lerp, copyText, hexToRgb, rgbToHex, rgbToHsl, hslToRgb,
  rotateHue, hexFromHsl, contrastRatio, okFlag, parseRGB, randomHex, clampHSL
} from './utils.js';

/* label color for readability */
function textOn(rgb){
  const L = 0.2126*Math.pow(rgb.r/255,2.2) + 0.7152*Math.pow(rgb.g/255,2.2) + 0.0722*Math.pow(rgb.b/255,2.2);
  return L > 0.55 ? '#000' : '#fff';
}

function normalizeHex(h){
  if(!h) return null;
  h = h.trim().toLowerCase();
  if(h[0] !== '#') h = '#'+h;
  const rgb = hexToRgb(h);
  return rgb ? rgbToHex(rgb).toLowerCase() : null;
}

/* paint an existing swatch element */
function paintSwatchEl(el, hex, {isBase=false, big=false, mini=false}={}) {
  el.className = 'swatch' + (big?' big':'') + (mini?' mini':'');
  const rgb = hexToRgb(hex) || {r:0,g:0,b:0};
  el.style.background = hex;
  el.title = hex;
  el.innerHTML = '';
  if (isBase) el.classList.add('base'); else el.classList.remove('base');

  const label = document.createElement('div');
  label.className = 'slabel';
  label.style.color = textOn(rgb);

  const shex = document.createElement('div');
  shex.className = 'shex';
  shex.textContent = hex.toUpperCase();

  const srgb = document.createElement('div');
  srgb.className = 'srgb';
  srgb.textContent = `rgb(${rgb.r},${rgb.g},${rgb.b})`;

  label.append(shex, srgb);
  el.append(label);

  // Click to copy the HEX from this label only
  label.addEventListener('click', (e) => {
    e.stopPropagation(); // prevent the parent swatch's click handler from also firing
    const hexText = shex.textContent.trim();
    navigator.clipboard.writeText(hexText).then(() => {
      label.classList.add('copied');              // trigger the CSS checkmark
      setTimeout(() => label.classList.remove('copied'), 800);
    }).catch(err => console.error('Copy failed', err));
  });

  // Clicking the whole swatch still copies too
  el.onclick = () => copyText(hex);
}

/* create a new swatch node */
export function swatch(hex, opts={}){ const d=document.createElement('div'); paintSwatchEl(d,hex,opts); return d; }

/* big chip */
export function mkChip(hex, isBase=false){
  const d=document.createElement('div'); d.className='chip';
  const top=document.createElement('div'); top.className='chip-top';
  top.append(swatch(hex,{big:true,isBase}));
  d.append(top);
  d.addEventListener('click',()=>copyText(hex));
  d.addEventListener('contextmenu',(e)=>{
    e.preventDefault();
    const inp=document.querySelector('#clBase');
    if(inp){ inp.value = hex; inp.dispatchEvent(new Event('input')); }
  });
  return d;
}

/* ---------- Harmony math with grayscale fallback ---------- */
function isGray(hsl){ return (hsl.s<=1); } // treat very low sat as grayscale

function grayscaleSet(hex){
  // produce 5 visible tints/shades anchored at base L
  const hsl = rgbToHsl(hexToRgb(hex));
  const steps = [-24,-12,0,12,24].map(d => clamp(hsl.l + d, 5, 95));
  return steps.map(L => hexFromHsl(hsl.h, hsl.s, L));
}

function offsetsFor(mode){
  return ({
    analogous:     [-30, 0, 30],
    complementary: [0, 180],
    split:         [0, 150, 210],
    triadic:       [0, 120, 240],
    tetradic:      [0, 90, 180, 270],
    monochrome:    [0],
  })[mode] || [0];
}

function harmonySet(hex, mode){
  const baseHex = normalizeHex(hex);
  if (!baseHex) return [];

  const baseRgb = hexToRgb(baseHex);
  const baseHsl = rgbToHsl(baseRgb);

  // If grayscale (low saturation), just make 5 tints/shades anchored at base L
  if (isGray(baseHsl)) {
    const grayList = grayscaleSet(baseHex);
    // ensure base first, pad to 5
    const uniq = [];
    const push = h => { if (h && !uniq.includes(h)) uniq.push(h); };
    push(baseHex);
    grayList.forEach(push);
    while (uniq.length < 5) uniq.push(baseHex);
    return uniq;
  }

  // else rotate hue
  const offs = offsetsFor(mode);
  const rotated = offs.map(d => hexFromHsl(rotateHue(baseHsl.h, d), baseHsl.s, baseHsl.l))
                      .map(normalizeHex);

  // Always start with the exact base color, de-dupe, and pad to 5
  const uniq = [];
  const push = h => { if (h && !uniq.includes(h)) uniq.push(h); };
  push(baseHex);
  rotated.forEach(push);
  while (uniq.length < 5) uniq.push(baseHex);

  return uniq;
}

/* ---------------- Quick Tools ---------------- */
export function mountQuickTools(root){
  root.innerHTML = `
    <div class="grid">
      <label class="tiny">This site never saves or sells your data</label>
      <div class="row">
        <input type="text" id="qpHex" placeholder="#3e1412" value="#3e1412">
        <button class="btn" id="qpApply">Apply</button>
        <button class="btn ghost" id="qpRand">Random</button>
      </div>
      <div class="sw-row" id="qpTints"></div>
      <div class="tiny">Tap to copy • Base color highlighted</div>
    </div>

    <div class="grid" style="margin-top:8px">
      <label class="tiny">Harmony</label>
      <div class="row">
        <input type="text" id="qhBase" placeholder="#3b82f6" value="#3b82f6">
        <select id="qhMode">
          <option value="analogous">Analogous</option>
          <option value="complementary">Complementary</option>
          <option value="split">Split-Complementary</option>
          <option value="triadic">Triadic</option>
          <option value="tetradic">Tetradic</option>
          <option value="monochrome">Monochrome</option>
        </select>
      </div>
      <div class="palette" id="qhOut"></div>
    </div>

    <div class="grid" style="margin-top:8px">
      <label class="tiny">Export</label>
      <div class="row" id="exportRow">
        <select id="exportFormat">
          <option value="png" selected>Canvas → PNG</option>
          <option value="jpg">Canvas → JPG</option>
          <option value="pal">Palette → JSON (clipboard)</option>
        </select>
        <button class="btn primary" id="exportGo">Export</button>
      </div>
    </div>

    <div class="grid">
      <label class="tiny">Shortcuts</label>
      <div class="well">
        <div><span class="kbd">Z</span> Undo &nbsp; <span class="kbd">Shift+Z</span> Redo</div>
        <div><span class="kbd">B</span> Brightness &nbsp; <span class="kbd">C</span> Contrast</div>
        <div><span class="kbd">S</span> Saturation &nbsp; <span class="kbd">H</span> Hue</div>
      </div>
    </div>
  `;

  // Quick Pick – tints/shades around EXACT base
  const qpOut = $('#qpTints', root), inp = $('#qpHex', root);
  function renderQuick(hex){
    qpOut.innerHTML='';
    const rgb = hexToRgb(hex); if(!rgb) return;
    const hsl = rgbToHsl(rgb);

    // base
    qpOut.append(swatch(rgbToHex(rgb), {mini:true, isBase:true}));

    // 5 tints then 5 shades
    for(let i=1;i<=5;i++){
      const L=clamp(hsl.l + i*8, 5, 95);
      qpOut.append(swatch(hexFromHsl(hsl.h,hsl.s,L), {mini:true}));
    }
    for(let i=1;i<=5;i++){
      const L=clamp(hsl.l - i*8, 5, 95);
      qpOut.append(swatch(hexFromHsl(hsl.h,hsl.s,L), {mini:true}));
    }
  }
  $('#qpApply',root).onclick = ()=>renderQuick(inp.value.trim());
  $('#qpRand',root).onclick = ()=>{ inp.value = randomHex(); renderQuick(inp.value); };
  inp.addEventListener('keydown',e=>{ if(e.key==='Enter') renderQuick(inp.value.trim()); });
  renderQuick('#3e1412');

  // Harmony (Quick Tools)
  const hBase=$('#qhBase', root), hMode=$('#qhMode', root), hOut=$('#qhOut', root);
  function drawHarmony(){
    const list = harmonySet(hBase.value.trim(), hMode.value);
    hOut.innerHTML='';
    list.forEach((hx,i)=> hOut.append(mkChip(hx, i===0)));
    window.__palette = list;
  }
  hBase.addEventListener('input', drawHarmony);
  hMode.addEventListener('change', drawHarmony);
  drawHarmony();

  // Export button
  $('#exportGo',root).onclick = ()=>{
    const fmt = $('#exportFormat',root).value;
    const can = document.querySelector('#studioCanvas'); if(!can) return;
    if(fmt==='png'){
      const url = can.toDataURL('image/png'); const a=document.createElement('a'); a.href=url; a.download='Creativity.png'; document.body.appendChild(a); a.click(); a.remove();
    }else if(fmt==='jpg'){
      const url = can.toDataURL('image/jpeg', 0.92); const a=document.createElement('a'); a.href=url; a.download='Creativity.jpg'; document.body.appendChild(a); a.click(); a.remove();
    }else{
      const pal = window.__palette || []; navigator.clipboard.writeText(JSON.stringify(pal)).catch(()=>{});
    }
  };
}

/* ---------------- Color Lab ---------------- */
export function mountColorLab(root){
  root.innerHTML = `
    <div class="two-col">
      <div class="stack">
        <label class="tiny">Base Color</label>
        <div class="row">
          <input type="text" id="clBase" placeholder="#3b82f6" value="#3b82f6">
          <select id="clMode">
            <option value="analogous">Analogous</option>
            <option value="complementary">Complementary</option>
            <option value="split">Split-Complementary</option>
            <option value="triadic">Triadic</option>
            <option value="tetradic">Tetradic</option>
            <option value="monochrome">Monochrome</option>
          </select>
          <button class="btn" id="clPick">Eyedropper</button>
          <button class="btn ghost" id="clRand">Random</button>
          <button class="btn primary" id="clGen">Generate</button>
        </div>

        <h3>Color Wheel</h3>
        <canvas id="clWheel" width="240" height="240"></canvas>

        <h3>Palette</h3>
        <div class="palette" id="clPalette"></div>
        <div class="tiny">Click to copy • Right-click a swatch to set as base</div>

        <h3>Adjust Palette</h3>
        <div class="grid">
          <label class="tiny">Hue (°) <span id="adjHueLbl" class="tiny">0</span></label>
          <input class="range" id="adjHue" type="range" min="-180" max="180" value="0">
          <label class="tiny">Saturation (%) <span id="adjSatLbl" class="tiny">0</span></label>
          <input class="range" id="adjSat" type="range" min="-100" max="100" value="0">
          <label class="tiny">Brightness (%) <span id="adjBriLbl" class="tiny">0</span></label>
          <input class="range" id="adjBri" type="range" min="-100" max="100" value="0">
          <label class="tiny">Temperature (cool → warm) <span id="adjTmpLbl" class="tiny">0</span></label>
          <input class="range" id="adjTmp" type="range" min="-50" max="50" value="0">
          <div class="button-row"><button class="btn ghost" id="adjReset">Reset</button></div>
        </div>

        <h3>Export Palette</h3>
        <div class="grid">
          <select id="pexportFmt">
            <option value="css">CSS variables</option>
            <option value="widget">Embeddable JS widget</option>
            <option value="tailwind">Tailwind object</option>
            <option value="csv">CSV</option>
            <option value="csvhash">CSV with #</option>
            <option value="array">Array</option>
            <option value="object">Object (name:hex)</option>
            <option value="extended">Extended Array</option>
            <option value="xml">XML</option>
          </select>
          <div class="button-row">
            <button class="btn" id="pexportCopy">Copy</button>
            <button class="btn ghost" id="pexportDownload">Download .txt</button>
          </div>
          <div class="well"><pre id="pexportOut" style="white-space:pre-wrap;word-break:break-word;margin:0"></pre></div>
        </div>
      </div>

      <div class="stack">
        <label class="tiny">Contrast Check</label>
        <div class="well" id="clPreview" style="min-height:160px;border-radius:12px;padding:14px">
          <div class="row">
            <input id="clFg" type="text" placeholder="Text color (e.g. #000000)">
            <input id="clBg" type="text" placeholder="Background (e.g. #ffffff)">
            <button class="btn" id="clCheck">Check</button>
          </div>
          <div class="row" style="margin-top:8px">
            <div class="chip" style="min-width:180px"><div class="chip-top"><div id="clFgSw" class="swatch"></div></div></div>
            <div class="chip" style="min-width:180px"><div class="chip-top"><div id="clBgSw" class="swatch"></div></div></div>
            <div class="chip">
              <div><b>Ratio:</b> <span id="clRatio">—</span></div>
              <div class="tiny">AA: <span id="clAA">—</span> • AAA: <span id="clAAA">—</span></div>
            </div>
          </div>
          <div class="well" id="clDemo" style="margin-top:10px;border-style:dashed">
            <div style="font-size:20px"><b>The quick brown fox</b></div>
            <div>jumps over the lazy dog — 1234567890</div>
          </div>
        </div>
      </div>
    </div>
  `;

  const base=$('#clBase', root), mode=$('#clMode', root), gen=$('#clGen', root);
  const pal=$('#clPalette', root), tFg=$('#clFg', root), tBg=$('#clBg', root);
  const outFg=$('#clFgSw', root), outBg=$('#clBgSw', root), ratioEl=$('#clRatio', root), aa=$('#clAA', root), aaa=$('#clAAA', root), demo=$('#clDemo', root);

  /* ----- Color Wheel with moving indicator (follows H & S) ----- */
  const wheel=$('#clWheel',root), ctx=wheel.getContext('2d');
  const cx=wheel.width/2, cy=wheel.height/2, R=Math.min(cx,cy)-2;

  function drawWheelBase(){
    const img=ctx.createImageData(wheel.width,wheel.height);
    for(let y=0;y<wheel.height;y++){
      for(let x=0;x<wheel.width;x++){
        const dx=x-cx, dy=y-cy, r=Math.hypot(dx,dy), i=(y*wheel.width+x)*4;
        if(r>R){ img.data[i+3]=0; continue; }
        let h=(Math.atan2(dy,dx)*180/Math.PI+360)%360; const s=Math.min(1, r/R);
        const rgb=hslToRgb({h,s:s*100,l:50});
        img.data[i]=rgb.r; img.data[i+1]=rgb.g; img.data[i+2]=rgb.b; img.data[i+3]=255;
      }
    }
    ctx.putImageData(img,0,0);
  }

  function drawIndicator(){
    const rgb = hexToRgb(base.value.trim()) || {r:59,g:130,b:246};
    const hsl = rgbToHsl(rgb);
    drawWheelBase();
    const ang = (hsl.h*Math.PI)/180;
    const s = clamp(hsl.s/100, 0, 1); // indicator radius tracks saturation!
    const x = cx + Math.cos(ang)*R*s;
    const y = cy + Math.sin(ang)*R*s;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x,y,6,0,Math.PI*2);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.9;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.stroke();
    ctx.restore();
  }
  drawIndicator();

  wheel.addEventListener('click',(e)=>{
    const rect=wheel.getBoundingClientRect();
    const x=e.clientX-rect.left, y=e.clientY-rect.top;
    const dx=x-cx, dy=y-cy, r=Math.hypot(dx,dy); if(r>R) return;
    const h=(Math.atan2(dy,dx)*180/Math.PI+360)%360;
    const s=Math.min(1, r/R);
    base.value = rgbToHex(hslToRgb({h,s:s*100,l:50}));
    generate();
  });

  /* ----- Palette render + export ----- */
  function renderPalette(hex){
    const list=harmonySet(hex, mode.value);
    pal.innerHTML=''; list.forEach((hx,i)=> pal.append(mkChip(hx, i===0)));
    window.__palette = list;
    updateExport();
    drawIndicator();
  }
  function generate(){ renderPalette(base.value.trim()); }
  gen.onclick = generate;
  $('#clRand',root).onclick = ()=>{ base.value = randomHex(); generate(); };
  base.addEventListener('input', generate);
  base.addEventListener('keydown',e=>{ if(e.key==='Enter') generate(); });
  mode.addEventListener('change', generate);
  generate();

  // Eyedropper
  $('#clPick',root).onclick = async ()=>{
    try{
      if('EyeDropper' in window){
        const ed = new window.EyeDropper();
        const res = await ed.open();
        if(res && res.sRGBHex){ base.value = res.sRGBHex; generate(); }
      }else{
        const inp=document.createElement('input'); inp.type='color';
        inp.value = base.value || '#3b82f6';
        inp.addEventListener('input',()=>{ base.value = inp.value; generate(); });
        inp.click();
      }
    }catch{}
  };

  // Contrast
  function doCheck(){
    const r1=hexToRgb(tFg.value.trim()) || parseRGB(tFg.value.trim()); if(!r1){ alert('Bad text color'); return; }
    const r2=hexToRgb(tBg.value.trim()) || parseRGB(tBg.value.trim()); if(!r2){ alert('Bad background'); return; }
    const rx = contrastRatio(r1,r2); ratioEl.textContent = rx.toFixed(2);
    aa.innerHTML = okFlag(rx>=4.5); aaa.innerHTML = okFlag(rx>=7);
    paintSwatchEl(outFg, rgbToHex(r1));
    paintSwatchEl(outBg, rgbToHex(r2));
    demo.style.color = rgbToHex(r1); demo.style.background = rgbToHex(r2);
  }
  $('#clCheck',root).onclick = doCheck;
  tFg.value='#0b0e14'; tBg.value='#ffffff'; doCheck();

  // Adjust Palette – live
  const aHue=$('#adjHue',root), aSat=$('#adjSat',root), aBri=$('#adjBri',root), aTmp=$('#adjTmp',root);
  const aHueLbl=$('#adjHueLbl',root), aSatLbl=$('#adjSatLbl',root), aBriLbl=$('#adjBriLbl',root), aTmpLbl=$('#adjTmpLbl',root);
  function applyAdjust(){
    const src = harmonySet(base.value.trim(), mode.value);
    const out = src.map(hx=>{
      const r=hexToRgb(hx); let hsl=rgbToHsl(r);
      hsl.h += (parseInt(aHue.value)||0) + ((parseInt(aTmp.value)||0)*0.6);
      hsl.s += parseInt(aSat.value)||0;
      hsl.l += parseInt(aBri.value)||0;
      hsl = clampHSL(hsl);
      return hexFromHsl(hsl.h,hsl.s,hsl.l);
    });
    pal.innerHTML=''; out.forEach((hx,i)=>pal.append(mkChip(hx, i===0)));
    window.__palette = out; updateExport();
  }
  [aHue,aSat,aBri,aTmp].forEach(el=>el.addEventListener('input', ()=>{
    aHueLbl.textContent=aHue.value; aSatLbl.textContent=aSat.value; aBriLbl.textContent=aBri.value; aTmpLbl.textContent=aTmp.value;
    applyAdjust();
  }));
  $('#adjReset',root).onclick = ()=>{
    aHue.value=0; aSat.value=0; aBri.value=0; aTmp.value=0;
    aHueLbl.textContent='0'; aSatLbl.textContent='0'; aBriLbl.textContent='0'; aTmpLbl.textContent='0';
    generate();
  };

  // Export (lazy lookups prevent TDZ)
  function hexes(){ return (window.__palette||[]).map(x=>x.replace('#','').toLowerCase()); }
  function exportText(){
    const fmtSel = $('#pexportFmt',root);
    const arr = window.__palette||[];
    const names = ['Yale Blue','Berkeley Blue','Oxford Blue','Powder blue','Mint cream'];
    const sel = fmtSel ? fmtSel.value : 'css';
    switch(sel){
      case 'css':     return `:root{\n${arr.map((h,i)=>`  --color-${i+1}: ${h};`).join('\n')}\n}`;
      case 'widget':  return `/* Embeddable */\n(function(w){ w.CreativityPalette=${JSON.stringify(arr)}; })(window);`;
      case 'tailwind':{ const obj={}; arr.forEach((hex,i)=>{ obj[`color_${i+1}`]={DEFAULT:hex}; }); return JSON.stringify(obj,null,2); }
      case 'csv':     return hexes().join(',');
      case 'csvhash': return arr.join(', ');
      case 'array':   return JSON.stringify(hexes());
      case 'object':  { const o={}; arr.forEach((h,i)=>{ o[names[i]||`Color ${i+1}`]=h.replace('#',''); }); return JSON.stringify(o); }
      case 'extended':{
        const to = arr.map((h,i)=>{
          const rgb = hexToRgb(h), hsl = rgbToHsl(rgb);
          const hsb = {h:hsl.h, s:hsl.s, b:Math.round((Math.max(rgb.r,rgb.g,rgb.b)/255)*100)};
          const cmyk = (()=>{
            const r=rgb.r/255,g=rgb.g/255,b=rgb.b/255, k=1-Math.max(r,g,b);
            if(k===1) return [0,0,0,100];
            const c=Math.round((1-r-k)/(1-k)*100), m=Math.round((1-g-k)/(1-k)*100), y=Math.round((1-b-k)/(1-k)*100), K=Math.round(k*100);
            return [c,m,y,K];
          })();
          function f(t){return t>0.008856?Math.cbrt(t):(7.787*t+16/116);}
          function srgb2xyz(v){v/=255; return v<=0.04045? v/12.92 : Math.pow((v+0.055)/1.055,2.4);}
          const X=srgb2xyz(rgb.r)*0.4124+srgb2xyz(rgb.g)*0.3576+srgb2xyz(rgb.b)*0.1805;
          const Y=srgb2xyz(rgb.r)*0.2126+srgb2xyz(rgb.g)*0.7152+srgb2xyz(rgb.b)*0.0722;
          const Z=srgb2xyz(rgb.r)*0.0193+srgb2xyz(rgb.g)*0.1192+srgb2xyz(rgb.b)*0.9505;
          const xr=X/0.95047, yr=Y/1.00000, zr=Z/1.08883;
          const L=116*f(yr)-16, a=500*(f(xr)-f(yr)), b2=200*(f(yr)-f(zr));
          return {name:names[i]||`Color ${i+1}`, hex:h.replace('#',''), rgb:[rgb.r,rgb.g,rgb.b], cmyk, hsb:[hsb.h,hsb.s,hsb.b], hsl:[hsl.h,hsl.s,hsl.l], lab:[Math.round(L),Math.round(a),Math.round(b2)]};
        });
        return JSON.stringify(to);
      }
      case 'xml':
        return `<palette>\n${arr.map(h=>{ const r=hexToRgb(h); return `  <color name="" hex="${h.replace('#','')}" r="${r.r}" g="${r.g}" b="${r.b}" />`; }).join('\n')}\n</palette>`;
      default: return '';
    }
  }
  function updateExport(){ const outEl = $('#pexportOut',root); if(outEl) outEl.textContent = exportText(); }
  root.addEventListener('change', (e)=>{ if(e.target && e.target.id==='pexportFmt') updateExport(); });
  $('#pexportCopy',root).onclick = ()=> navigator.clipboard.writeText(($('#pexportOut',root)?.textContent)||'');
  $('#pexportDownload',root).onclick = ()=>{
    const txt=( $('#pexportOut',root)?.textContent )||''; const blob=new Blob([txt],{type:'text/plain'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='palette.txt'; a.click(); URL.revokeObjectURL(a.href);
  };
  updateExport();
}
