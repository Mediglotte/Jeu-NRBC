/* NRBC : le jeu — service worker (fonctionnement hors-ligne) */
const CACHE = "nrbc-v13";

/* Fichiers indispensables : l'installation échoue si l'un d'eux manque. */
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png"
];

/* Fichiers optionnels : mis en cache s'ils existent, sans bloquer l'installation. */
const OPTIONAL = [
  "./NRBC_le_jeu_livret.pdf",
  "./CBRN_booklet_EN.pdf"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then(async (c) => {
      await c.addAll(CORE);
      await Promise.all(
        OPTIONAL.map((url) =>
          c.add(url).catch(() => console.warn("[SW] fichier optionnel absent :", url))
        )
      );
      await self.skipWaiting();
    })
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  /* Ouverture du jeu : on tente le réseau d'abord pour récupérer la dernière
     version, et on retombe sur le cache si hors-ligne. */
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  /* Tout le reste : cache d'abord, puis réseau. */
  e.respondWith(
    caches.match(req).then((hit) =>
      hit ||
      fetch(req).then((res) => {
        try {
          const url = new URL(req.url);
          if (url.origin === location.origin && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
        } catch (_) {}
        return res;
      }).catch(() => caches.match("./index.html"))
    )
  );
});
