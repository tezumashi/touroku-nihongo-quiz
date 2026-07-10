const CACHE = "tnq-cache-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./js/app.js",
  "./js/router.js",
  "./js/storage.js",
  "./js/srs.js",
  "./js/quiz-engine.js",
  "./js/session.js",
  "./js/gamify.js",
  "./js/charts.js",
  "./js/dom.js",
  "./js/views/onboarding.js",
  "./js/views/dashboard.js",
  "./js/views/quizSession.js",
  "./js/views/category.js",
  "./js/views/review.js",
  "./js/views/mock.js",
  "./js/views/stats.js",
  "./js/views/achievements.js",
  "./js/views/settings.js",
  "./data/curriculum.js",
  "./data/questions.js",
  "./data/questions_bu1.js",
  "./data/questions_bu2.js",
  "./data/questions_bu3.js",
  "./data/questions_bu4.js",
  "./data/questions_bu5.js",
  "./icons/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((res) => {
          if (res.ok) caches.open(CACHE).then((cache) => cache.put(event.request, res.clone()));
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
