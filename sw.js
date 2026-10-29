/* 오프라인 동작용 서비스 워커
   - 앱 파일(index.html, manifest, 아이콘)은 설치 때 미리 저장
   - tesseract(OCR) 같은 외부 파일은 한 번 받으면 저장해 두고 다음부턴 저장본 사용
   수정할 때마다 아래 VERSION 숫자를 올리면 폰에 새 버전이 적용됩니다. */
const VERSION = 'v17';
const APP_CACHE = 'vocab-app-' + VERSION;
const RUNTIME_CACHE = 'vocab-runtime';
const APP_FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(APP_CACHE).then(c => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k.startsWith('vocab-app-') && k !== APP_CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const sameOrigin = new URL(req.url).origin === self.location.origin;

  if (sameOrigin) {
    // 앱 파일: 네트워크 먼저, 안 되면 저장본
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(APP_CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
  } else {
    // 외부 파일(OCR 엔진 등): 저장본 먼저, 없으면 네트워크에서 받아 저장
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then(c => c.put(req, copy));
        }
        return res;
      }))
    );
  }
});
