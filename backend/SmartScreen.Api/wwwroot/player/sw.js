/*
 * Service Worker i player-it: ruan faqen e player-it dhe median (foto/video) në pajisje,
 * që TV-ja/PC të vazhdojë të luajë edhe pa rrjet, madje edhe pas rinisjes.
 *
 * - /player/*  -> rrjeti së pari (që përditësimet të vijnë menjëherë), cache kur s'ka rrjet
 * - /uploads/* -> cache së pari (emrat janë GUID dhe nuk ndryshojnë kurrë)
 * - /api/*     -> gjithmonë rrjeti (përmbajtja ruhet nga player.js në localStorage)
 *
 * Player-i dërgon {type:'cache-media', urls:[...]} sa herë merr përmbajtje të re:
 * shkarkohen ato që mungojnë dhe fshihen ato që nuk përdoren më.
 *
 * Kërkon "secure context": HTTPS, localhost, ose Edge/Chrome me
 * --unsafely-treat-insecure-origin-as-secure (e vendos Player-i për Windows).
 */
var SHELL_CACHE = 'ss-shell-v2';
var MEDIA_CACHE = 'ss-media-v1';
var SHELL = ['./', 'index.html', 'player.js', 'player.css', 'logo.svg', 'icon-192.png',
  'fonts/anton-latin-400-normal.woff2', 'fonts/space-mono-latin-400-normal.woff2', 'fonts/space-mono-latin-700-normal.woff2',
  'fonts/inter-latin-400-normal.woff2', 'fonts/inter-latin-600-normal.woff2'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(SHELL_CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== SHELL_CACHE && k !== MEDIA_CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.indexOf('/uploads/') === 0) {
    e.respondWith(mediaResponse(req, url));
  } else if (url.pathname.indexOf('/player/') === 0 || url.pathname === '/player') {
    e.respondWith(networkFirst(req));
  }
});

self.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'cache-media') e.waitUntil(syncMedia(e.data.urls || []));
});

function networkFirst(req) {
  return fetch(req).then(function (res) {
    if (res.ok) {
      var copy = res.clone();
      caches.open(SHELL_CACHE).then(function (c) { c.put(stripQuery(req.url), copy); });
    }
    return res;
  }).catch(function () {
    return caches.open(SHELL_CACHE).then(function (c) {
      return c.match(stripQuery(req.url)).then(function (hit) {
        return hit || c.match(new URL('index.html', self.registration.scope).href);
      });
    }).then(function (hit) { return hit || Response.error(); });
  });
}

// Cache së pari. Videot kërkojnë "Range" -> i presim nga skedari i ruajtur (206 Partial Content).
function mediaResponse(req, url) {
  var key = url.origin + url.pathname;
  return caches.open(MEDIA_CACHE).then(function (c) {
    return c.match(key).then(function (hit) {
      if (hit) return withRange(req, hit);
      // Mungon: merre nga rrjeti pa Range (skedari i plotë), ruaje dhe pastaj përgjigju.
      return fetch(key).then(function (res) {
        if (!res.ok) return res;
        return c.put(key, res.clone()).then(function () { return withRange(req, res); });
      }).catch(function () { return fetch(req); });
    });
  });
}

function withRange(req, res) {
  var range = req.headers.get('range');
  if (!range) return res;
  var m = /bytes=(\d*)-(\d*)/.exec(range);
  if (!m) return res;
  return res.blob().then(function (blob) {
    var size = blob.size;
    var start = m[1] === '' ? Math.max(0, size - Number(m[2])) : Number(m[1]);
    var end = m[1] !== '' && m[2] !== '' ? Math.min(Number(m[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
    }
    return new Response(blob.slice(start, end + 1), {
      status: 206,
      statusText: 'Partial Content',
      headers: {
        'Content-Type': res.headers.get('Content-Type') || blob.type || 'application/octet-stream',
        'Content-Range': 'bytes ' + start + '-' + end + '/' + size,
        'Content-Length': String(end - start + 1),
        'Accept-Ranges': 'bytes'
      }
    });
  });
}

function syncMedia(urls) {
  var wanted = {};
  urls.forEach(function (u) { var x = new URL(u, self.location.origin); wanted[x.origin + x.pathname] = true; });
  return caches.open(MEDIA_CACHE).then(function (c) {
    return c.keys().then(function (keys) {
      var have = {};
      var removals = keys.map(function (k) {
        have[k.url] = true;
        return wanted[k.url] ? null : c.delete(k);
      });
      // Një nga një, që TV-të me rrjet të dobët të mos mbingarkohen.
      var chain = Promise.all(removals);
      Object.keys(wanted).forEach(function (u) {
        if (have[u]) return;
        chain = chain.then(function () {
          return fetch(u).then(function (res) { if (res.ok) return c.put(u, res); }).catch(function () { /* provo herën tjetër */ });
        });
      });
      return chain;
    });
  });
}

function stripQuery(u) { var x = new URL(u); return x.origin + x.pathname; }
