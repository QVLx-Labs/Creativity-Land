// bgremove.js
// Pure JavaScript background remover — robust border sampling + Lab distance + edge flood fill

export function removeBackgroundFromImage(image, opts = {}) {
  const {
    threshold = 28,     // ΔE (CIE76) distance in Lab; ~20-35 is typical
    feather = 2,        // blur radius for soft edges
    borderSize = 4,     // how thick the border sampling & flood-fill seeding is (px)
    morphPasses = 1,    // opening+closing passes on the mask
    smallArtifactPx = 0, // remove small isolated FG blobs below this area (0 disables)
    debug = false
  } = opts;

  const w = image.naturalWidth || image.width;
  const h = image.naturalHeight || image.height;

  // Draw to canvas
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = w;
  srcCanvas.height = h;
  const ctx = srcCanvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data; // RGBA

  // ---------- Helpers: sRGB -> Lab (D65) ----------
  function sRGBToLinear(u) {
    u /= 255;
    return (u <= 0.04045) ? (u / 12.92) : Math.pow((u + 0.055) / 1.055, 2.4);
  }
  function rgbToXyz(r, g, b) {
    // sRGB D65
    const R = sRGBToLinear(r), G = sRGBToLinear(g), B = sRGBToLinear(b);
    const X = R * 0.4124 + G * 0.3576 + B * 0.1805;
    const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
    const Z = R * 0.0193 + G * 0.1192 + B * 0.9505;
    return [X, Y, Z];
  }
  function xyzToLab(X, Y, Z) {
    // Reference white D65
    const Xn = 0.95047, Yn = 1.00000, Zn = 1.08883;
    function f(t) {
      return (t > 0.008856) ? Math.cbrt(t) : (7.787 * t + 16 / 116);
    }
    const fx = f(X / Xn), fy = f(Y / Yn), fz = f(Z / Zn);
    const L = 116 * fy - 16;
    const a = 500 * (fx - fy);
    const b = 200 * (fy - fz);
    return [L, a, b];
  }
  function rgbToLab(r, g, b) {
    const [X, Y, Z] = rgbToXyz(r, g, b);
    return xyzToLab(X, Y, Z);
  }
  function deltaE76(lab1, lab2) {
    const dL = lab1[0] - lab2[0];
    const da = lab1[1] - lab2[1];
    const db = lab1[2] - lab2[2];
    return Math.sqrt(dL * dL + da * da + db * db);
  }

  // ---------- Step 1: Robust background color in Lab (median of thick border) ----------
  const borderLabs = [];

  function pushLabAtIndex(i) {
    borderLabs.push(rgbToLab(data[i], data[i + 1], data[i + 2]));
  }

  // Accumulate all pixels within borderSize of each edge
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const onBorder = (x < borderSize) || (x >= w - borderSize) || (y < borderSize) || (y >= h - borderSize);
      if (onBorder) {
        const idx = (y * w + x) * 4;
        pushLabAtIndex(idx);
      }
    }
  }

  // Median in Lab (component-wise)
  function medianComponent(arr, comp) {
    const vals = arr.map(v => v[comp]).sort((a, b) => a - b);
    const m = vals.length >> 1;
    return (vals.length % 2) ? vals[m] : (0.5 * (vals[m - 1] + vals[m]));
  }
  const bgLab = (borderLabs.length > 0)
    ? [
        medianComponent(borderLabs, 0),
        medianComponent(borderLabs, 1),
        medianComponent(borderLabs, 2),
      ]
    : rgbToLab(255, 255, 255); // fallback

  // ---------- Step 2: Edge-seeded flood fill in Lab space ----------
  // Mark background by growing from image borders where ΔE <= threshold.
  const BG = 0, FG = 255;
  const mask = new Uint8ClampedArray(w * h); // 0 = bg, 255 = fg
  const visited = new Uint8Array(w * h);
  const qx = new Int32Array(w * h);
  const qy = new Int32Array(w * h);
  let qh = 0, qt = 0;

  function enqueue(x, y) {
    qx[qt] = x; qy[qt] = y; qt++;
  }
  function attemptSeed(x, y) {
    const idx = (y * w + x) << 2;
    const lab = rgbToLab(data[idx], data[idx + 1], data[idx + 2]);
    const dE = deltaE76(lab, bgLab);
    if (dE <= threshold) {
      const p = y * w + x;
      mask[p] = BG;
      visited[p] = 1;
      enqueue(x, y);
    }
  }

  // Seed from a border ring (thickness = borderSize)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < borderSize; x++) attemptSeed(x, y);                           // left
    for (let x = w - borderSize; x < w; x++) attemptSeed(x, y);                       // right
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < borderSize; y++) attemptSeed(x, y);                           // top
    for (let y = h - borderSize; y < h; y++) attemptSeed(x, y);                       // bottom
  }

  // Flood fill: grow background region from seeds
  const nbs = [[1,0],[-1,0],[0,1],[0,-1]];
  while (qh < qt) {
    const x = qx[qh], y = qy[qh]; qh++;
    for (let k = 0; k < 4; k++) {
      const nx = x + nbs[k][0], ny = y + nbs[k][1];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const p = ny * w + nx;
      if (visited[p]) continue;
      const idx = (p << 2);
      const lab = rgbToLab(data[idx], data[idx + 1], data[idx + 2]);
      const dE = deltaE76(lab, bgLab);
      if (dE <= threshold) {
        mask[p] = BG;
        visited[p] = 1;
        enqueue(nx, ny);
      } else {
        // not background by similarity; mark as candidate FG for now
        mask[p] = FG;
        visited[p] = 1;
      }
    }
  }

  // Any unvisited pixels (e.g. if border had no similar seeds) — classify by threshold
  for (let p = 0; p < mask.length; p++) {
    if (!visited[p]) {
      const idx = p << 2;
      const lab = rgbToLab(data[idx], data[idx + 1], data[idx + 2]);
      mask[p] = (deltaE76(lab, bgLab) <= threshold) ? BG : FG;
    }
  }

  // ---------- Step 3: Morphology (opening + closing) ----------
  function morphPass(input, type) {
    const out = new Uint8ClampedArray(input.length);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let v = (type === 'erode') ? 255 : 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const val = input[(y + ky) * w + (x + kx)];
            if (type === 'erode') v = Math.min(v, val);
            else v = Math.max(v, val);
          }
        }
        out[y * w + x] = v;
      }
    }
    input.set(out);
  }

  for (let i = 0; i < morphPasses; i++) {
    // Opening (erode FG then dilate FG) to remove thin residues
    morphPass(mask, 'erode');
    morphPass(mask, 'dilate');
    // Closing (dilate FG then erode FG) to fill small gaps along edges
    morphPass(mask, 'dilate');
    morphPass(mask, 'erode');
  }

  // ---------- Step 4: Optional removal of tiny FG islands ----------
  if (smallArtifactPx > 0) {
    const seen = new Uint8Array(mask.length);
    const q = new Int32Array(mask.length);
    for (let p0 = 0; p0 < mask.length; p0++) {
      if (seen[p0] || mask[p0] !== FG) continue;
      // BFS to measure component size
      let head = 0, tail = 0;
      q[tail++] = p0; seen[p0] = 1;
      let size = 0;
      const pixels = [];
      while (head < tail) {
        const p = q[head++]; pixels.push(p); size++;
        const x = p % w, y = (p / w) | 0;
        if (x > 0)   { const np = p - 1;   if (!seen[np] && mask[np] === FG) { seen[np] = 1; q[tail++] = np; } }
        if (x < w-1) { const np = p + 1;   if (!seen[np] && mask[np] === FG) { seen[np] = 1; q[tail++] = np; } }
        if (y > 0)   { const np = p - w;   if (!seen[np] && mask[np] === FG) { seen[np] = 1; q[tail++] = np; } }
        if (y < h-1) { const np = p + w;   if (!seen[np] && mask[np] === FG) { seen[np] = 1; q[tail++] = np; } }
      }
      if (size < smallArtifactPx) {
        // reclassify to background
        for (const p of pixels) mask[p] = BG;
      }
    }
  }

  // ---------- Step 5: Apply mask to alpha ----------
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    data[i + 3] = mask[p]; // alpha
  }
  ctx.putImageData(imgData, 0, 0);

  // ---------- Step 6: Feather edges ----------
  if (feather > 0) {
    const fctx = srcCanvas.getContext('2d');
    fctx.globalCompositeOperation = 'destination-in';
    fctx.filter = `blur(${feather}px)`;
    fctx.drawImage(srcCanvas, 0, 0);
    fctx.filter = 'none';
    fctx.globalCompositeOperation = 'source-over';
  }

  if (debug) {
    // Return mask visualization as well
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = w;
    maskCanvas.height = h;
    const mctx = maskCanvas.getContext('2d');
    const maskImg = mctx.createImageData(w, h);
    for (let i = 0, p = 0; i < maskImg.data.length; i += 4, p++) {
      const v = mask[p];
      maskImg.data[i] = v;
      maskImg.data[i + 1] = v;
      maskImg.data[i + 2] = v;
      maskImg.data[i + 3] = 255;
    }
    mctx.putImageData(maskImg, 0, 0);
    return { canvas: srcCanvas, maskCanvas };
  }

  return srcCanvas;
}
