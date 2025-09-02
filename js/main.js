// main.js
import { $, $$ } from './utils.js';
import { mountQuickTools, mountColorLab } from './color.js';
import { mountConvert } from './convert.js';
import { mountStudio } from './studio.js';
import { mountPalette } from './palette.js';
import { mountAnalyze } from './analyze.js';
import { mountFrames } from './frames.js';
import { mountZoom } from './zoom.js';
import { mountPresets } from './presets.js';
import { mountConvertImg } from './convert_images.js';
import { mountGradient } from './gradient.js';

// --- Spectral intro (load animation) --------------------------------
(function spectralIntro(){
  const d = document.documentElement;

  // Respect reduced motion early
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    d.classList.remove('intro-start');
    d.classList.add('intro-done');
    return;
  }

  // Ensure curtain exists (we'll inject if not in HTML)
  let curtain = document.getElementById('spectralCurtain');
  if (!curtain) {
    curtain = document.createElement('div');
    curtain.id = 'spectralCurtain';
    // prepend so it paints before main content
    document.addEventListener('DOMContentLoaded', () => document.body.prepend(curtain), { once:true });
  }

  // Kick off on next frame so CSS transitions can see the initial state
  const play = () => {
    d.classList.add('intro-play');
    // End after ~1.2s (curtain reveal + content rise)
    setTimeout(() => {
      d.classList.add('intro-done');
      // Remove curtain when its fade completes
      const finish = () => curtain && curtain.remove();
      curtain && curtain.addEventListener('transitionend', finish, { once:true });
      // Fallback in case transitionend doesn’t fire
      setTimeout(finish, 700);
      // Clean initial class
      d.classList.remove('intro-start');
    }, 1200);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(play), { once:true });
  } else {
    requestAnimationFrame(play);
  }
})();

// Tabs
const tabs = $('#tabs');
tabs.addEventListener('click', e=>{
  if(e.target.tagName!=='BUTTON') return;
  const name=e.target.dataset.tab;
  $$('#tabs button').forEach(b=>{ b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
  e.target.classList.add('active'); e.target.setAttribute('aria-selected','true');
  $$('main section').forEach(s=>{ s.classList.add('hidden'); s.setAttribute('aria-hidden','true'); });
  const section = document.querySelector(`#tab-${name}`);
  section.classList.remove('hidden'); section.setAttribute('aria-hidden','false');
});

// Mount
mountQuickTools(document.querySelector('#quickMount'));
mountStudio(document.querySelector('#studioMount'));
mountColorLab(document.querySelector('#colorMount'));
mountConvert(document.querySelector('#convertMount'));
mountPalette(document.querySelector('#paletteMount'));
mountPresets(document.querySelector('#presetsMount'));
mountAnalyze(document.querySelector('#analyzeMount'));
mountFrames(document.querySelector('#framesMount'));
mountZoom(document.querySelector('#zoomMount'));
mountConvertImg(document.querySelector('#convertImgMount'));
mountGradient(document.querySelector('#gradientMount'));