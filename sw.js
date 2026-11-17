/* Service worker: guarda o app para uso offline. Não guarda dados pessoais nem dispara notificações. */
const VERSAO = 'bari-v1.0.2';
const ARQUIVOS = [
  './', './index.html', './css/app.css', './js/dados.js', './js/app.js', './manifest.webmanifest',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-512-maskable.png'
];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys()
    .then(nomes => Promise.all(nomes.filter(n => n !== VERSAO).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

// Cache primeiro; atualiza em segundo plano quando houver rede.
self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const rede = fetch(req).then(async resp => {
    if (resp && resp.ok && resp.type === 'basic') await (await caches.open(VERSAO)).put(req, resp.clone());
    return resp;
  }).catch(() => undefined);
  ev.waitUntil(rede);
  ev.respondWith((async () => {
    const cache = await caches.open(VERSAO);
    const guardado = await cache.match(req, { ignoreSearch: true }) ||
      (req.mode === 'navigate' ? await cache.match('./index.html') : undefined);
    if (guardado) return guardado;
    const resp = await rede;
    return resp || new Response('Sem conexão e arquivo não disponível offline.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
