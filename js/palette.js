// palette.js
import { $, clamp, rgbToHex } from './utils.js';
import { swatch } from './color.js';

export function mountPalette(root){
  root.innerHTML = `
    <div class="row">
      <input type="file" id="palFile" accept="image/*">
      <label class="tiny" style="align-self:center">Colors</label>
      <input type="number" id="palK" min="3" max="128" value="12" style="max-width:100px">
      <button class="btn" id="palGo">Extract</button>
    </div>
    <div class="row" style="margin-top:10px">
      <canvas id="palCanvas" width="640" height="360"></canvas>
      <div class="stack" style="min-width:260px">
        <h3>Results</h3>
        <div class="palette" id="palOut"></div>
        <div class="button-row">
          <button class="btn" id="palCopyHex">Copy HEX list</button>
          <button class="btn ghost" id="palCopyJson">Copy JSON</button>
        </div>
      </div>
    </div>
  `;

  const file=$('#palFile',root),
        kInp=$('#palK',root),
        go=$('#palGo',root),
        can=$('#palCanvas',root),
        out=$('#palOut',root);

  let hasImg=false;

  file.onchange = e=>{
    const fr=new FileReader();
    fr.onload=ev=>{
      const i=new Image();
      i.onload=()=>{
        hasImg=true;
        const ctx=can.getContext('2d');
        const scale=Math.min(can.width/i.width, can.height/i.height);
        const w=Math.round(i.width*scale), h=Math.round(i.height*scale);
        ctx.clearRect(0,0,can.width,can.height); // keep non-image pixels transparent
        ctx.drawImage(i, (can.width-w)/2, (can.height-h)/2, w, h);
      };
      i.src=ev.target.result;
    };
    fr.readAsDataURL(e.target.files[0]);
  };

  // Build a weighted color histogram by quantizing to 'levels' per channel (default 16 => max 4096 bins)
  function buildHistogram(levels=16){
    const ctx = can.getContext('2d');
    const {width:w, height:h} = can;
    const {data} = ctx.getImageData(0,0,w,h);

    const shift = 8 - Math.log2(levels); // e.g., levels=16 -> shift=4
    const bins = new Map(); // key -> { sumR,sumG,sumB,count }

    for(let i=0; i<data.length; i+=4){
      const a = data[i+3];
      if(a < 16) continue; // skip transparent
      const r = data[i], g = data[i+1], b = data[i+2];

      const ri = r >> shift, gi = g >> shift, bi = b >> shift;
      const key = (ri<<8) | (gi<<4) | bi;

      let bucket = bins.get(key);
      if(!bucket){
        bucket = { sumR:0, sumG:0, sumB:0, count:0 };
        bins.set(key, bucket);
      }
      bucket.sumR += r; bucket.sumG += g; bucket.sumB += b; bucket.count++;
    }

    // Convert to weighted points: [r,g,b,w]
    const points = [];
    for(const {sumR,sumG,sumB,count} of bins.values()){
      points.push([
        Math.round(sumR / count),
        Math.round(sumG / count),
        Math.round(sumB / count),
        count
      ]);
    }
    return points;
  }

  // Weighted k-means++ init (probability ∝ w * D^2)
  function kppInitWeighted(points, k){
    const centroids = [];
    const pickByWeight = () => {
      let totalW = 0;
      for(const p of points) totalW += p[3];
      let r = Math.random() * totalW;
      for(const p of points){
        r -= p[3];
        if(r <= 0) return p.slice(0,3);
      }
      return points[points.length-1].slice(0,3);
    };

    centroids.push(pickByWeight());
    const d2 = new Float64Array(points.length);

    while(centroids.length < k){
      let sum = 0;
      for(let i=0;i<points.length;i++){
        const p = points[i];
        let best = Infinity;
        for(const c of centroids){
          const dx=p[0]-c[0], dy=p[1]-c[1], dz=p[2]-c[2];
          const dist = dx*dx+dy*dy+dz*dz;
          if(dist < best) best = dist;
        }
        const val = best * p[3]; // weight by count
        d2[i] = val;
        sum += val;
      }
      if(sum === 0){ // all identical
        centroids.push(points[(Math.random()*points.length)|0].slice(0,3));
        continue;
      }
      let r = Math.random() * sum;
      let idx = 0;
      for(; idx<d2.length; idx++){
        r -= d2[idx];
        if(r <= 0) break;
      }
      centroids.push(points[Math.min(idx, points.length-1)].slice(0,3));
    }
    return centroids;
  }

  function kmeansWeighted(points, k, iters=12){
    if(points.length === 0) return [];
    k = Math.min(k, points.length); // can’t have more clusters than points

    let centroids = kppInitWeighted(points, k);

    const sums = new Array(k).fill(0).map(()=>[0,0,0,0]); // sumR,sumG,sumB,sumW
    const weightsPerCluster = new Array(k).fill(0);

    for(let t=0;t<iters;t++){
      // zero accumulators
      for(let i=0;i<k;i++){ sums[i][0]=sums[i][1]=sums[i][2]=sums[i][3]=0; weightsPerCluster[i]=0; }

      // assign
      for(const p of points){
        const w = p[3] || 1;
        let bi=0, best=Infinity;
        for(let i=0;i<k;i++){
          const c = centroids[i];
          const dx=p[0]-c[0], dy=p[1]-c[1], dz=p[2]-c[2];
          const d = dx*dx+dy*dy+dz*dz;
          if(d < best){ best = d; bi = i; }
        }
        sums[bi][0] += p[0] * w;
        sums[bi][1] += p[1] * w;
        sums[bi][2] += p[2] * w;
        sums[bi][3] += w;
        weightsPerCluster[bi] += w;
      }

      // update centroids (keep old if empty)
      for(let i=0;i<k;i++){
        const sw = sums[i][3];
        if(sw > 0){
          centroids[i] = [
            Math.round(sums[i][0] / sw),
            Math.round(sums[i][1] / sw),
            Math.round(sums[i][2] / sw)
          ];
        }
      }
    }

    // Return centroids sorted by assigned weight (dominance)
    const out = centroids
      .map((c,i)=>({ c, w: weightsPerCluster[i] }))
      .filter(x => x.w > 0)
      .sort((a,b)=> b.w - a.w)
      .map(x => x.c);

    return out;
  }

  function render(colors){
    out.innerHTML='';
    const hexes = colors.map(([r,g,b])=>rgbToHex({r,g,b}));
    hexes.forEach(hx=> out.append(swatch(hx,{big:true})) );
    window.__palette = hexes;
    $('#palCopyHex',root).onclick = ()=> navigator.clipboard.writeText(hexes.join(', '));
    $('#palCopyJson',root).onclick = ()=> navigator.clipboard.writeText(JSON.stringify(hexes));
  }

  $('#palGo',root).onclick = ()=>{
    if(!hasImg){ alert('Load an image first'); return; }

    const k = clamp(parseInt(kInp.value)||12, 3, 128);

    // 1) build a compact weighted histogram (fast)
    const points = buildHistogram(16); // 16 levels/channel => <=4096 points max

    // If someone asks for K > available points, clamp inside kmeansWeighted
    const cols = kmeansWeighted(points, k, 12);

    render(cols);
  };
}
