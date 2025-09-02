// utils.js
export const $ = (sel, el=document) => el.querySelector(sel);
export const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));
export const clamp = (v,min,max)=>Math.min(max,Math.max(min,v));
export const lerp = (a,b,t)=>a+(b-a)*t;
export const toHex2 = n => n.toString(16).padStart(2,'0');
export const copyText = async (text)=>{
  try{ await navigator.clipboard.writeText(text); }
  catch(e){ console.warn('Clipboard failed', e); }
};

export function hexToRgb(hex){
  if(!hex) return null;
  hex = hex.trim();
  if(/^#?[0-9a-f]{3}$/i.test(hex)){
    if(hex[0] !== '#') hex = '#'+hex;
    const r = parseInt(hex[1]+hex[1],16);
    const g = parseInt(hex[2]+hex[2],16);
    const b = parseInt(hex[3]+hex[3],16);
    return {r,g,b};
  }
  const m = hex.match(/^#?([0-9a-f]{6})$/i);
  if(!m) return null;
  const int = parseInt(m[1],16);
  return {r:(int>>16)&255,g:(int>>8)&255,b:int&255};
}

export function rgbToHex({r,g,b}){ return '#'+toHex2(r)+toHex2(g)+toHex2(b); }

export function rgbToHsl({r,g,b}){
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b);
  let h,s,l=(max+min)/2;
  if(max===min){ h=s=0; }
  else{
    const d=max-min;
    s = l>0.5 ? d/(2-max-min) : d/(max+min);
    switch(max){
      case r: h=(g-b)/d + (g<b?6:0); break;
      case g: h=(b-r)/d + 2; break;
      case b: h=(r-g)/d + 4; break; // ✅ fixed here
    }
    h*=60;
  }
  return {h:Math.round(h), s:Math.round(s*100), l:Math.round(l*100)};
}

export function hslToRgb({h,s,l}){
  h = (h%360+360)%360; s/=100; l/=100;
  const C = (1-Math.abs(2*l-1))*s;
  const X = C*(1-Math.abs((h/60)%2-1));
  const m = l - C/2;
  let r=0,g=0,b=0;
  if(h<60){ r=C; g=X; b=0; }
  else if(h<120){ r=X; g=C; b=0; }
  else if(h<180){ r=0; g=C; b=X; }
  else if(h<240){ r=0; g=X; b=C; }
  else if(h<300){ r=X; g=0; b=C; }
  else { r=C; g=0; b=X; }
  return {r:Math.round((r+m)*255), g:Math.round((g+m)*255), b:Math.round((b+m)*255)};
}

export function parseRGB(str){
  const m=str.match(/rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/i);
  if(!m) return null;
  const r=+m[1], g=+m[2], b=+m[3];
  if([r,g,b].some(v=>v<0||v>255)) return null;
  return {r,g,b};
}

export function parseHSL(str){
  const m=str.match(/hsl\(\s*(\-?\d{1,3})\s*(?:,|\s)\s*(\d{1,3})%\s*(?:,|\s)\s*(\d{1,3})%\s*\)/i);
  if(!m) return null;
  let h=+m[1], s=+m[2], l=+m[3];
  if(s<0||s>100||l<0||l>100) return null;
  return {h,s,l};
}

export function relLuminance({r,g,b}){
  const f = v=>{
    v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055, 2.4);
  };
  const R=f(r), G=f(g), B=f(b);
  return 0.2126*R + 0.7152*G + 0.0722*B;
}

export function contrastRatio(rgb1,rgb2){
  const L1=relLuminance(rgb1), L2=relLuminance(rgb2);
  const [a,b]=L1>L2?[L1,L2]:[L2,L1];
  return (a+0.05)/(b+0.05);
}

export function okFlag(ok){ return `<span style="color:${ok? 'var(--ok)':'var(--bad)'}">${ok? 'Pass':'Fail'}</span>`; }

export function rotateHue(h,deg){ return (h+deg+360)%360; }

export function hexFromHsl(h,s,l){ return rgbToHex(hslToRgb({h,s,l})); }

export function randomHex(){
  const n = Math.floor(Math.random()*0xffffff);
  return '#' + n.toString(16).padStart(6,'0');
}

export function clampHSL({h,s,l}){
  h = ((h%360)+360)%360;
  s = Math.max(0, Math.min(100, s));
  l = Math.max(0, Math.min(100, l));
  return {h,s,l};
}

