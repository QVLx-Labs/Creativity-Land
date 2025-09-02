const CACHE = 'creativity-land-v1';
const ASSETS = [
  './', 'index.html',
  'css/styles.css',
  'assets/logo.svg',
  'js/main.js','js/utils.js','js/color.js','js/convert.js','js/studio.js','js/palette.js','js/analyze.js','js/frames.js','js/zoom.js'
];
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
});
self.addEventListener('fetch', e=>{
  const url = new URL(e.request.url);
  if (url.origin === location.origin) {
    e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request)));
  }
});
