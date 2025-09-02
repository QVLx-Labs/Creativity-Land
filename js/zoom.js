// js/zoom.js
import { $ } from './utils.js';

export function mountZoom(root){
  root.innerHTML = `
    <div class="row" style="margin-top:8px">
      <input type="file" id="zFile" accept="image/*">
      <label class="tiny" style="align-self:center">Zoom</label>
      <input type="range" id="zFactor" min="1" max="8" value="1" class="range" style="max-width:220px">
      <span class="tiny" id="zFactorLbl">1× (fit)</span>
    </div>
    <div class="container" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px">
      <div class="viewer panel" id="zView" style="height:420px;position:relative;overflow:hidden"></div>
      <div class="zoom panel" id="zZoom" style="height:420px"></div>
    </div>
  `;

  const zFile   = $('#zFile',root);
  const view    = $('#zView',root);
  const zoom    = $('#zZoom',root);
  const factor  = $('#zFactor',root);
  const flbl    = $('#zFactorLbl',root);

  let img = null;
  // last click (normalized 0..1), default center
  let lastPoint = { x: 0.5, y: 0.5 };

  function setFactorLabel(){
    const f = parseFloat(factor.value)||1;
    flbl.textContent = f === 1 ? '1× (fit)' : `${f.toFixed(0)}×`;
  }

  function clearZoom(){
    if(!img){ zoom.style.backgroundImage=''; return; }
    // show whole image fitted when factor is 1
    zoom.style.backgroundImage   = `url(${img.src})`;
    zoom.style.backgroundRepeat  = 'no-repeat';
    zoom.style.backgroundPosition= 'center center';
    zoom.style.backgroundSize    = 'contain';
  }

  function attach(imgEl){
    view.innerHTML = '';
    view.appendChild(imgEl);
    imgEl.style.maxWidth  = '100%';
    imgEl.style.maxHeight = '100%';
    imgEl.style.width     = '100%';
    imgEl.style.height    = '100%';
    imgEl.style.objectFit = 'contain';

    zoom.style.backgroundColor  = '#0b0e14';
    zoom.style.backgroundRepeat = 'no-repeat';

    lastPoint = { x: 0.5, y: 0.5 };
    render(); // render with current factor (defaults to fit)
  }

  zFile.addEventListener('change', e=>{
    const f = e.target.files && e.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = ev=>{
      img = new Image();
      img.onload = ()=>attach(img);
      img.src = ev.target.result;
    };
    r.readAsDataURL(f);
  });

  // Compute the *fit* scale so the entire image is visible inside the zoom pane
  function fitScale(){
    if(!img) return 1;
    const sx = zoom.clientWidth  / img.naturalWidth;
    const sy = zoom.clientHeight / img.naturalHeight;
    return Math.min(sx, sy);
  }

  // Position the background so the clicked point is centered (when possible)
  function render(){
    if(!img){ zoom.style.backgroundImage=''; return; }
    const f = parseFloat(factor.value)||1;
    setFactorLabel();

    // Always set the background image
    zoom.style.backgroundImage = `url(${img.src})`;
    zoom.style.backgroundRepeat = 'no-repeat';

    if(f === 1){
      // No zoom: fit-to-window, ignore lastPoint
      zoom.style.backgroundSize     = 'contain';
      zoom.style.backgroundPosition = 'center center';
      return;
    }

    // >1× : magnify relative to the "fit" size
    const scaleFit = fitScale();
    const scale    = scaleFit * f;

    const bgW = img.naturalWidth  * scale;
    const bgH = img.naturalHeight * scale;

    zoom.style.backgroundSize = `${bgW}px ${bgH}px`;

    // target point (in background pixel space)
    const cx = lastPoint.x * bgW;
    const cy = lastPoint.y * bgH;

    // center the chosen point in the zoom pane, clamp within bounds
    const halfW = zoom.clientWidth  / 2;
    const halfH = zoom.clientHeight / 2;

    let bx = Math.max(0, Math.min(bgW - zoom.clientWidth,  cx - halfW));
    let by = Math.max(0, Math.min(bgH - zoom.clientHeight, cy - halfH));

    zoom.style.backgroundPosition = `-${bx}px -${by}px`;
  }

  // Click in left viewer to set the focus point (normalized)
  view.addEventListener('click', e=>{
    if(!img) return;
    const rect = view.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top)  / rect.height;
    // clamp 0..1
    lastPoint.x = Math.max(0, Math.min(1, x));
    lastPoint.y = Math.max(0, Math.min(1, y));
    render();
  });

  // Factor changes: update label + render
  factor.addEventListener('input', render);

  // Keep things correct on resize (mobile rotations, pane resizes, etc.)
  const ro = new ResizeObserver(render);
  ro.observe(zoom);
  window.addEventListener('resize', render);

  // Initial label
  setFactorLabel();
}
