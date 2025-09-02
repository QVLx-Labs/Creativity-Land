// js/convertimg.js
import { $ } from './utils.js';

export function mountConvertImg(root){
  root.innerHTML = `
    <div class="stack">
      <div class="row">
        <input type="file" id="ciFile" accept="image/*">
        <select id="ciFormat">
          <option value="png" selected>PNG</option>
          <option value="jpg">JPG</option>
          <option value="webp">WebP</option>
          <option value="svg">SVG (raster wrapped)</option>
        </select>
        <div id="ciQWrap" style="display:flex;gap:8px;align-items:center">
          <label class="tiny">Quality</label>
          <input type="range" id="ciQuality" class="range" min="50" max="100" value="92" style="max-width:200px">
          <span class="tiny" id="ciQLbl">92%</span>
        </div>
        <button class="btn primary" id="ciGo">Convert & Download</button>
      </div>
      <div class="hint tiny">GIF encoding is not supported purely client-side without heavy libs; use PNG/WebP for web delivery. SVG option embeds your raster as a data URI.</div>
      <canvas id="ciCanvas" style="display:none"></canvas>
    </div>
  `;

  const file=$('#ciFile',root), fmt=$('#ciFormat',root), q=$('#ciQuality',root), qlbl=$('#ciQLbl',root), go=$('#ciGo',root), can=$('#ciCanvas',root);
  let img=null;

  q.addEventListener('input', ()=>{ qlbl.textContent = `${q.value}%`; });
  fmt.addEventListener('change', ()=>{ $('#ciQWrap',root).style.display = (fmt.value==='jpg' || fmt.value==='webp')?'flex':'none'; });
  fmt.dispatchEvent(new Event('change'));

  file.addEventListener('change', e=>{
    const f=e.target.files && e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=ev=>{
      img = new Image();
      img.onload=()=>{
        can.width = img.naturalWidth; can.height = img.naturalHeight;
        can.getContext('2d').drawImage(img,0,0);
      };
      img.src = ev.target.result;
    };
    r.readAsDataURL(f);
  });

  go.addEventListener('click', ()=>{
    if(!img){ alert('Upload an image first.'); return; }
    const ctx=can.getContext('2d');
    ctx.clearRect(0,0,can.width,can.height);
    ctx.drawImage(img,0,0);

    const ext = fmt.value;
    let blobURL = null, name = `converted.${ext}`;

    if(ext==='png'){
      blobURL = can.toDataURL('image/png');
    }else if(ext==='jpg'){
      const qv = (parseInt(q.value,10)||92)/100;
      blobURL = can.toDataURL('image/jpeg', qv);
    }else if(ext==='webp'){
      const qv = (parseInt(q.value,10)||92)/100;
      blobURL = can.toDataURL('image/webp', qv);
    }else if(ext==='svg'){
      const pngData = can.toDataURL('image/png');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${can.width}" height="${can.height}"><image href="${pngData}" width="${can.width}" height="${can.height}"/></svg>`;
      const blob = new Blob([svg], {type:'image/svg+xml'});
      blobURL = URL.createObjectURL(blob);
      name = 'converted.svg';
    }

    const a=document.createElement('a'); a.href=blobURL; a.download=name; document.body.appendChild(a); a.click(); a.remove();
    if(fmt.value==='svg'){ setTimeout(()=>URL.revokeObjectURL(blobURL), 2500); }
  });
}
