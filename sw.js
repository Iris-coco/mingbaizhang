/* 明白账的离线缓存：页面网络优先，静态资源缓存优先。
   用相对 scope 拼路径，放在 /仓库名/ 子目录下也能用。 */
const BASE = new URL('./', self.location).pathname
const CACHE = 'mingbaizhang-v1'
const SHELL = [`${BASE}`, `${BASE}index.html`, `${BASE}manifest.webmanifest`, `${BASE}icon-192.png`]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // 页面：网络优先，断网时回退到缓存的首页
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(`${BASE}index.html`, copy))
          return response
        })
        .catch(() => caches.match(`${BASE}index.html`)),
    )
    return
  }

  // 静态资源：缓存优先
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
          return response
        }),
    ),
  )
})
