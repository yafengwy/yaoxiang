// 离线缓存：本站页面先用手机里存的（马上打开），同时在后台下载新版，下次打开生效；
// 检查更新（带 ?v=）一律走网络。字体和 Firebase 脚本优先用缓存。
// 缓存名不要改：改了会清掉已经存好的 Firebase 脚本，国内没 VPN 时就再也下载不了。
const CACHE = 'yaoxiang-v5';
const CORE = ['./', './index.html', './manifest.json', './icon-180.png', './icon-192.png', './icon-512.png'];
const CDN = ['www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

function fromNet(req, key) {
  return fetch(req).then(res => {
    if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key || req, copy)); }
    return res;
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (url.searchParams.has('v')) return;             // 检查更新：直接走网络
    const key = req.mode === 'navigate' ? './index.html' : req;
    e.respondWith(
      caches.match(key, { ignoreSearch: req.mode === 'navigate' }).then(hit => {
        const net = fromNet(req, key);
        if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
        return net.catch(() => caches.match('./index.html'));
      })
    );
  } else if (CDN.includes(url.hostname) && !url.pathname.includes('/v1/')) {
    e.respondWith(caches.match(req).then(hit => hit || fromNet(req)));
  }
});
