// gradient.js
import { $, hexToRgb, rgbToHex, rgbToHsl, hslToRgb, randomHex } from './utils.js';
import { swatch } from './color.js';

export function mountGradient(root){
  root.innerHTML = `
    <div class="two-col">
      <div class="stack">
        <div class="row">
          <input type="text" id="gC1" value="#3b82f6">
          <input type="text" id="gC2" value="#22d3ee">
          <button class="btn ghost" id="gRand">Random</button>
        </div>
        <div class="row">
          <select id="gType">
            <option value="linear" selected>Linear</option>
            <option value="radial">Radial</option>
            <option value="conic">Conic</option>
          </select>
          <input type="number" id="gAngle" value="45" placeholder="Rotation (deg)">
          <input type="number" id="gPos1" value="0" placeholder="C1 %">
          <input type="number" id="gPos2" value="100" placeholder="C2 %">
        </div>
        <div class="row">
          <button class="btn primary" id="gApply">Apply</button>
          <button class="btn" id="gCopyCSS">Copy CSS</button>
        </div>

        <h3>Presets</h3>
        <div class="sw-row" id="gPresets"></div>
      </div>

      <div class="stack">
        <div class="well">
          <div id="gPreview" style="height:280px;border-radius:12px;border:1px solid #1f2839"></div>
        </div>
        <div class="row">
          <div class="chip"><div class="chip-top"><div class="swatch" id="gSw1"></div></div></div>
          <div class="chip"><div class="chip-top"><div class="swatch" id="gSw2"></div></div></div>
        </div>
      </div>
    </div>
  `;

  const c1=$('#gC1',root), c2=$('#gC2',root), type=$('#gType',root), ang=$('#gAngle',root), p1=$('#gPos1',root), p2=$('#gPos2',root);
  const prev=$('#gPreview',root), sw1=$('#gSw1',root), sw2=$('#gSw2',root);

  function css(){
    const a=parseInt(ang.value)||0, s1=parseInt(p1.value)||0, s2=parseInt(p2.value)||100;
    const t=type.value;
    if(t==='linear') return `linear-gradient(${a}deg, ${c1.value} ${s1}%, ${c2.value} ${s2}%)`;
    if(t==='radial') return `radial-gradient(circle, ${c1.value} ${s1}%, ${c2.value} ${s2}%)`;
    return `conic-gradient(from ${a}deg, ${c1.value} ${s1}%, ${c2.value} ${s2}%)`;
  }
  function render(){
    prev.style.background = css();
    sw1.innerHTML=''; sw1.append(swatch(c1.value,{mini:true}));
    sw2.innerHTML=''; sw2.append(swatch(c2.value,{mini:true}));
  }
  render();

  $('#gApply',root).onclick = render;
  [c1,c2,type,ang,p1,p2].forEach(el=> el.addEventListener('input', render));
  $('#gCopyCSS',root).onclick = ()=> navigator.clipboard.writeText(`background: ${css()};`);

  $('#gRand',root).onclick = ()=>{
    c1.value = randomHex(); c2.value = randomHex(); render();
  };

  const presets=[
    ['#F72585','#4361EE',45],['#FF6B6B','#FFD166',35],['#00F5D4','#9B5DE5',60],
    ['#0EA5E9','#34D399',25],['#111827','#6B7280',15],['#FF9F1C','#2EC4B6',75]
  ];
  const gp=$('#gPresets',root);
  presets.forEach(([a,b,deg])=>{
    const card=document.createElement('div'); card.className='swatch'; card.style.background=`linear-gradient(${deg}deg, ${a}, ${b})`;
    const lab=document.createElement('div'); lab.className='slabel'; lab.style.color='#fff';
    lab.innerHTML = `<div class="shex">${a.toUpperCase()} → ${b.toUpperCase()}</div><div class="srgb">deg ${deg}</div>`;
    card.append(lab);
    card.onclick=()=>{ c1.value=a; c2.value=b; ang.value=deg; type.value='linear'; render(); };
    gp.append(card);
  });
}
