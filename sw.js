/* Guarda o app no celular pra abrir sem internet (academia com sinal ruim).
   Ao publicar uma versão nova, sobe o número de VERSAO: o celular baixa tudo de novo. */
const VERSAO = "jorge-v5";
const ARQUIVOS = ["./", "index.html", "app.css", "dados.js", "app.js", "manifest.webmanifest",
  "icones/icone-180.png", "icones/icone-192.png", "icones/icone-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS.map(u => new Request(u, {cache: "reload"})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
/* com internet: busca a versão nova e atualiza a cópia; sem internet: usa a cópia */
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request, {cache: "no-cache"})
      .then(r => { const copia = r.clone(); caches.open(VERSAO).then(c => c.put(e.request, copia)); return r; })
      .catch(() => caches.match(e.request, {ignoreSearch: true}))
  );
});
