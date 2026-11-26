// 📶 JJ 갤러리 오프라인 도우미 (서비스 워커)
//  - 화면(html)·데이터(json): 인터넷 먼저 → 안 되면 저장해 둔 것
//  - 그림·썸네일·글씨체: 저장해 둔 것 먼저 (뒤에서 새로 받아 두기)
const V = 'agjj-v5', IMG = 'agjj-img-v1', MAX_IMG = 260;
const CORE = ['./', 'index.html', 'thumbs/index.json', 'thumbs/mosaic.webp', 'puzzle.html', 'cube.html', 'balance.html', 'nunchi.html', 'hidden.html', 'study.html', 'catch.html', 'squishy.html', 'malang.html', 'paint-icon.js', 'luckyball.js', 'tama.html'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== IMG).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
async function trim() { const c = await caches.open(IMG), ks = await c.keys(); for (let i = 0; i < ks.length - MAX_IMG; i++) await c.delete(ks[i]); }
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.hostname.includes('firebase') || u.hostname.includes('googleapis') || u.hostname.includes('gstatic') || u.pathname.includes('/api/')) return;
  const isImg = /\.(webp|jpe?g|png|gif|woff2?|ttf)$/i.test(u.pathname) || (u.hostname === 'raw.githubusercontent.com' && /\.(jpe?g|png|webp)$/i.test(u.pathname));
  if (isImg) {
    e.respondWith(caches.open(IMG).then(async c => {
      const hit = await c.match(r);
      const net = fetch(r).then(res => { if (res && res.ok) { c.put(r, res.clone()); trim(); } return res; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (u.origin === location.origin && (r.mode === 'navigate' || /\.(html|json|js|css)$/i.test(u.pathname) || u.pathname.endsWith('/'))) {
    e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; })
      .catch(() => caches.match(r, { ignoreSearch: true }).then(h => h || caches.match('index.html'))));
  }
});
