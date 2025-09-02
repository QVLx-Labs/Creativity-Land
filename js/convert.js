// js/convert.js
import { $ } from './utils.js';

export function mountConvert(root){
  root.innerHTML = `
    <div class="stack">
      <div class="row">
        <input type="file" id="cvFile" accept="image/*">
        <select id="cvFmt">
          <option value="png">PNG</option>
          <option value="jpeg">JPG</option>
          <option value="webp">WebP</option>
          <!-- SVG export will wrap the raster bitmap in an <image> tag -->
          <option value="svg">SVG (raster-wrapped)</option>
        </select>
        <button class="btn primary" id="cvGo">Convert & Download</button>
      </div>
      <canvas id="cvCanvas" width="0" height="0" class="hidden"></canvas>
      <div class="tiny">All conversions are done client-side.</div>
    </div>
  `;

  const fileEl=$('#cvFile',root), fmtEl=$('#cvFmt',root), can=$('#cvCanvas',root), ctx=can.getContext('2d');
  let img=null;

  fileEl.addEventListener('change', e=>{
    const f=e.target.files[0]; if(!f) return;
    const fr=new FileReader();
    fr.onload = ev=>{
      img=new Image();
      img.onload=()=>{ can.width=img.naturalWidth; can.height=img.naturalHeight; ctx.drawImage(img,0,0); };
      img.src=ev.target.result;
    };
    fr.readAsDataURL(f);
  });

  $('#cvGo',root).addEventListener('click', ()=>{
    if(!img){ alert('Upload an image first.'); return; }
    const fmt = fmtEl.value;
    if(fmt==='svg'){
      // Wrap as SVG <image> preserving intrinsic size
      const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${img.naturalWidth}" height="${img.naturalHeight}" viewBox="0 0 ${img.naturalWidth} ${img.naturalHeight}">
  <image href="${can.toDataURL('image/png')}" width="${img.naturalWidth}" height="${img.naturalHeight}" />
</svg>`;
      const blob=new Blob([svg.trim()],{type:'image/svg+xml'});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='converted.svg'; a.click(); URL.revokeObjectURL(a.href);
      return;
    }
    const mime = `image/${fmt}`;
    can.width=img.naturalWidth; can.height=img.naturalHeight; ctx.drawImage(img,0,0);
    can.toBlob((blob)=>{
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`converted.${fmt==='jpeg'?'jpg':fmt}`; a.click(); URL.revokeObjectURL(a.href);
    }, mime, fmt==='jpeg'?0.92:0.95);
  });
}
