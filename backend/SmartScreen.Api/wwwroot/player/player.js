/*
 * Smart Screen Player
 * Shkruar në ES5 (pa let/const/arrow/fetch/Promise) që të punojë edhe në shfletuesit
 * e vjetër të Smart TV-ve: LG webOS 3+, Samsung Tizen 2.4+, Android TV, Sony Bravia.
 *
 * Rrjedha:
 *  1. POST /api/player/register  -> merr deviceKey (ruhet në localStorage) + kodin e çiftimit
 *  2. GET  /api/player/{key}/content çdo 15s -> nëse ndryshon "version", playlist-a e re
 *     aplikohet në fund të slide-it aktual. Përmbajtja ruhet lokalisht për punë offline.
 *
 * Parametra opsionalë në URL: ?server=http://ip:5080  ?device=<key>  ?preview=1
 *
 * Dizajni (markup-i) është në index.html + player.css. Këtu nuk ka tekste apo ngjyra statike:
 * emri i biznesit, logo, ngjyrat dhe të gjitha tekstet ("settings.labels") vijnë nga databaza
 * dhe ruhen lokalisht që ekrani të duket njësoj edhe kur nuk ka rrjet.
 */
(function () {
  'use strict';

  var POLL_MS = 15000;
  var RETRY_MS = 10000;
  var FADE_MS = 800;
  var MAX_VIDEO_MS = 10 * 60 * 1000; // mbrojtje nëse video "ngec" dhe nuk mbaron kurrë

  var params = parseQuery(location.search);
  var isPreview = params.preview === '1';
  var SERVER = (params.server || window.SMART_SCREEN_SERVER || '').replace(/\/+$/, '');

  var root = $('root');
  var layers = [$('layerA'), $('layerB')];
  var overlay = $('overlay');
  var templates = $('templates');
  var activeLayer = 0;

  var state = {
    deviceKey: params.device || store('ss_device_key'),
    content: null,     // përmbajtja që po luhet
    pending: null,     // përmbajtje e re që pret fundin e slide-it
    version: null,
    commandVersion: null,
    index: -1,
    timer: null,
    online: true,
    settings: readJson('ss_settings') // markë + tekste nga serveri (e fundit e njohur)
  };

  // ------------------------------------------------------------------ nisja

  function boot() {
    applySettings(state.settings);
    startClock();
    window.onresize = function () { if (state.content) applyOrientation(state.content); };

    if (isPreview) {
      showOverlay('viewPreview');
      window.addEventListener('message', function (e) {
        if (e.origin !== location.origin || !e.data || e.data.type !== 'smartscreen-preview') return;
        state.pending = null;
        start(e.data.content);
      });
      return;
    }

    var c = readJson('ss_content');
    if (c && c.paired) start(c);
    if (!state.content) showOverlay('viewConnecting');

    register();
  }

  function register() {
    request('POST', '/api/player/register', {
      deviceKey: state.deviceKey,
      width: screenWidth(),
      height: screenHeight(),
      userAgent: navigator.userAgent
    }, function (err, res) {
      if (err || !res) { setOnline(false); setTimeout(register, RETRY_MS); return; }
      setOnline(true);
      state.deviceKey = res.deviceKey;
      store('ss_device_key', res.deviceKey);
      applySettings(res.settings);
      poll();
    });
  }

  function poll() {
    var url = '/api/player/' + encodeURIComponent(state.deviceKey) + '/content?w=' + screenWidth() + '&h=' + screenHeight();
    request('GET', url, null, function (err, res, status) {
      if (status === 404) {
        // Ekrani u fshi nga admini -> regjistrohu nga e para (merr kod të ri çiftimi)
        state.deviceKey = null;
        store('ss_device_key', null);
        store('ss_content', null);
        stopPlayback();
        register();
        return;
      }
      if (err) setOnline(false);
      else { setOnline(true); handleContent(res); }
      setTimeout(poll, POLL_MS);
    });
  }

  function handleContent(c) {
    if (!c) return;
    applySettings(c.settings);

    if (!c.paired) {
      stopPlayback();
      store('ss_content', null);
      showPairing(c.pairingCode);
      return;
    }

    // Admini klikoi "Rifresko" -> ringarko faqen (merr edhe versionin e ri të player-it)
    if (state.commandVersion !== null && c.commandVersion !== state.commandVersion) {
      location.reload();
      return;
    }
    state.commandVersion = c.commandVersion;

    if (c.version === state.version && state.content) return;
    store('ss_content', JSON.stringify(c));

    if (!state.content) start(c);
    else state.pending = c;
  }

  // ------------------------------------------------------------------ luajtja

  function start(c) {
    clearTimeout(state.timer);
    state.content = c;
    state.version = c.version;
    state.index = -1;
    applySettings(c.settings);
    hideOverlay();
    applyChrome(c);
    next();
  }

  function stopPlayback() {
    clearTimeout(state.timer);
    state.content = null;
    state.version = null;
    state.pending = null;
    clearLayer(layers[0]);
    clearLayer(layers[1]);
    layers[0].className = layers[1].className = 'layer';
    $('ticker').className = 'hidden';
    $('clock').className = 'hidden';
    root.className = '';
  }

  function next() {
    clearTimeout(state.timer);

    if (state.pending) {
      var p = state.pending;
      state.pending = null;
      state.content = p;
      state.version = p.version;
      state.index = -1;
      applySettings(p.settings);
      applyChrome(p);
    }
    if (!state.content) return;

    var slides = (state.content.playlist && state.content.playlist.slides) || [];
    if (!slides.length) {
      showIdle(state.content.settings);
      state.timer = setTimeout(next, RETRY_MS);
      return;
    }
    hideOverlay();

    state.index = (state.index + 1) % slides.length;
    show(slides[state.index], slides.length === 1);
    preload(slides[(state.index + 1) % slides.length]);
  }

  function show(slide, isOnlySlide) {
    var incoming = layers[1 - activeLayer];
    var outgoing = layers[activeLayer];
    var built = buildSlide(slide, state.content.settings);

    clearLayer(incoming);
    incoming.appendChild(built.el);

    // Crossfade
    setTimeout(function () {
      incoming.className = 'layer visible';
      outgoing.className = 'layer';
    }, 30);
    setTimeout(function () {
      if (outgoing !== layers[activeLayer]) clearLayer(outgoing);
    }, FADE_MS + 100);
    activeLayer = 1 - activeLayer;

    if (built.video) {
      var video = built.video;
      var done = false;
      var finish = function () { if (!done) { done = true; next(); } };
      video.onerror = function () { setTimeout(finish, 1000); };
      if (slide.duration > 0) {
        state.timer = setTimeout(finish, slide.duration * 1000);
        video.loop = true;
      } else {
        video.onended = finish;
        video.loop = false;
        state.timer = setTimeout(finish, MAX_VIDEO_MS);
      }
      // Nëse është i vetmi slide, video luhet në loop pa ndërprerje
      if (isOnlySlide && slide.duration === 0) { video.loop = true; video.onended = null; clearTimeout(state.timer); }
      playVideo(video);
    } else {
      state.timer = setTimeout(next, Math.max(3, slide.duration || 10) * 1000);
    }
  }

  function playVideo(video) {
    try {
      var p = video.play();
      if (p && typeof p['catch'] === 'function') p['catch'](function () { /* autoplay i bllokuar */ });
    } catch (e) { /* shfletues i vjetër */ }
  }

  function clearLayer(layer) {
    var videos = layer.getElementsByTagName('video');
    for (var i = 0; i < videos.length; i++) {
      try { videos[i].pause(); videos[i].removeAttribute('src'); videos[i].load(); } catch (e) { /* ignore */ }
    }
    layer.innerHTML = '';
  }

  function preload(slide) {
    if (!slide) return;
    if (slide.type === 'Image' && slide.mediaUrl) new Image().src = abs(slide.mediaUrl);
    if (slide.type === 'Menu' && slide.menu) {
      for (var i = 0; i < slide.menu.products.length; i++) {
        if (slide.menu.products[i].imageUrl) new Image().src = abs(slide.menu.products[i].imageUrl);
      }
    }
  }

  // ------------------------------------------------------------------ ndërtimi i slide-ve

  function buildSlide(slide, settings) {
    var el = div('slide');
    var video = null;
    if (slide.fit === 'Contain') el.className += ' fit-contain';
    if (slide.backgroundColor) el.style.backgroundColor = slide.backgroundColor;
    if (slide.textColor) el.style.color = slide.textColor;

    switch (slide.type) {
      case 'Image':
        var img = document.createElement('img');
        img.className = 'media';
        img.src = abs(slide.mediaUrl);
        el.appendChild(img);
        addCaption(el, slide);
        break;

      case 'Video':
        video = document.createElement('video');
        video.className = 'media';
        video.muted = true;
        video.setAttribute('muted', '');
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.autoplay = true;
        video.preload = 'auto';
        video.src = abs(slide.mediaUrl);
        el.appendChild(video);
        addCaption(el, slide);
        break;

      case 'Text':
        el.className += ' text';
        if (!slide.backgroundColor) el.style.backgroundColor = settings.primaryColor;
        var t = tpl('text');
        fill(t, '.text-title', slide.title);
        fill(t, '.text-body', slide.text);
        el.appendChild(t);
        break;

      case 'WebPage':
        var frame = document.createElement('iframe');
        frame.src = slide.url;
        frame.setAttribute('scrolling', 'no');
        el.appendChild(frame);
        break;

      case 'Menu':
        buildMenu(el, slide, settings);
        break;
    }
    return { el: el, video: video };
  }

  function addCaption(el, slide) {
    if (!slide.title && !slide.text) return;
    var cap = tpl('caption');
    fill(cap, '.caption-title', slide.title);
    fill(cap, '.caption-text', slide.text);
    el.appendChild(cap);
  }

  function buildMenu(el, slide, settings) {
    el.className += ' menu';
    if (!slide.backgroundColor) el.style.backgroundColor = settings.primaryColor;

    var header = tpl('menuHeader');
    var logo = q(header, '.menu-logo');
    if (settings.logoUrl) logo.src = abs(settings.logoUrl);
    else hide(logo);
    fill(header, '.menu-title', slide.menu.title);
    el.appendChild(header);

    var products = slide.menu.products;
    var n = products.length;
    var portrait = isPortrait();
    var cols;
    if (portrait) cols = n <= 2 ? 1 : n <= 6 ? 2 : 3;
    else cols = n <= 4 ? n : n <= 8 ? 4 : n <= 10 ? 5 : 6;
    var rows = Math.ceil(n / cols);

    var grid = div('menu-grid' + (rows * cols > 12 ? ' dense' : ''));
    var w = (100 / cols) + '%';
    var h = (100 / rows) + '%';

    for (var i = 0; i < n; i++) {
      var p = products[i];
      var cell = tpl('product');
      cell.style.width = w;
      cell.style.height = h;

      var card = q(cell, '.product');
      if (!p.isAvailable) card.className += ' soldout';

      var imgBox = q(cell, '.product-img');
      if (p.imageUrl) imgBox.style.backgroundImage = 'url("' + abs(p.imageUrl) + '")';
      else { imgBox.className += ' no-img'; imgBox.appendChild(document.createTextNode(p.name.charAt(0))); }

      fill(cell, '.product-name', p.name);
      fill(cell, '.product-desc', p.description);

      var onSale = p.oldPrice && p.oldPrice > p.price;
      q(cell, '.product-price').style.color = settings.primaryColor;
      fill(cell, '.old', onSale ? formatPrice(p.oldPrice, settings.currency) : null);
      fill(cell, '.now', formatPrice(p.price, settings.currency));

      var badge = q(cell, '.badge');
      var soldOut = q(cell, '.soldout-label');
      if (p.isAvailable) hide(soldOut);

      var badgeText = null;
      if (p.isAvailable && onSale) badgeText = '-' + Math.round((1 - p.price / p.oldPrice) * 100) + '%';
      else if (p.isAvailable && p.isFeatured) badgeText = label('product.featured');
      fill(cell, '.badge', badgeText);
      badge.style.backgroundColor = settings.accentColor;
      badge.style.color = settings.accentTextColor;

      grid.appendChild(cell);
    }
    el.appendChild(grid);
  }

  // ------------------------------------------------------------------ ora, shiriti, orientimi

  function applyChrome(c) {
    var s = c.settings || {};
    var ticker = $('ticker');
    if (s.showTicker && s.tickerText) {
      $('tickerText').textContent = s.tickerText;
      ticker.style.backgroundColor = s.accentColor || '';
      ticker.style.color = s.accentTextColor || '';
      ticker.className = '';
      // Shpejtësi konstante pavarësisht gjatësisë së tekstit
      var secs = Math.max(15, Math.round(s.tickerText.length / 5));
      var track = ticker.firstChild;
      track.style.webkitAnimationDuration = secs + 's';
      track.style.animationDuration = secs + 's';
    } else {
      ticker.className = 'hidden';
    }
    $('clock').className = s.showClock ? '' : 'hidden';
    applyOrientation(c);
  }

  function applyOrientation(c) {
    var wantPortrait = c.screen && c.screen.orientation === 'Portrait';
    var cls = [];
    if (wantPortrait && window.innerWidth > window.innerHeight) cls.push('rotated');
    var s = c.settings || {};
    if (s.showTicker && s.tickerText) cls.push('with-ticker');
    root.className = cls.join(' ');
  }

  function isPortrait() {
    return root.className.indexOf('rotated') >= 0 || window.innerHeight > window.innerWidth;
  }

  function startClock() {
    var el = $('clock');
    var tick = function () {
      var d = new Date();
      el.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());
    };
    tick();
    setInterval(tick, 10000);
  }

  // ------------------------------------------------------------------ ekranet e sistemit

  function showPairing(code) {
    $('pairingCode').textContent = code || '';
    $('pairingMeta').textContent = detectPlatform() + ' \u00b7 ' + screenWidth() + '\u00d7' + screenHeight();
    showOverlay('viewPairing');
  }

  function showIdle(settings) {
    applySettings(settings);
    showOverlay('viewIdle');
  }

  var VIEWS = ['viewConnecting', 'viewPreview', 'viewPairing', 'viewIdle'];

  function showOverlay(view) {
    for (var i = 0; i < VIEWS.length; i++) $(VIEWS[i]).className = 'view' + (VIEWS[i] === view ? '' : ' hidden');
    overlay.className = view;
  }

  function hideOverlay() { overlay.className = 'hidden'; }

  // ------------------------------------------------------------------ marka + tekstet nga databaza

  /** Aplikon emrin, logon, ngjyrat dhe tekstet (gjuha e zgjedhur nga admini) në të gjithë faqen. */
  function applySettings(s) {
    if (!s) return;
    state.settings = s;
    store('ss_settings', JSON.stringify(s));

    if (s.language) document.documentElement.setAttribute('lang', s.language);
    document.title = s.businessName || '';

    var labels = document.querySelectorAll('[data-label]');
    for (var i = 0; i < labels.length; i++) labels[i].textContent = label(labels[i].getAttribute('data-label'));

    var binds = document.querySelectorAll('[data-bind]');
    for (var j = 0; j < binds.length; j++) {
      var v = s[binds[j].getAttribute('data-bind')];
      binds[j].textContent = v || '';
      binds[j].className = binds[j].className.replace(/\s*hidden/g, '') + (v ? '' : ' hidden');
    }

    var logo = $('brandLogo');
    if (s.logoUrl) { logo.src = abs(s.logoUrl); logo.className = 'brand-logo'; }
    else { logo.removeAttribute('src'); logo.className = 'brand-logo hidden'; }

    overlay.style.backgroundColor = s.backgroundColor || '';
    var tag = q(overlay, '.brand-tag');
    if (tag) tag.style.color = s.accentColor || '';
    $('netStatus').setAttribute('title', label('offline'));
  }

  function label(key) {
    var l = state.settings && state.settings.labels;
    return (l && l[key]) || '';
  }

  function setOnline(online) {
    state.online = online;
    $('netStatus').className = online ? 'hidden' : '';
  }

  // ------------------------------------------------------------------ ndihmëse

  function request(method, path, body, cb) {
    var xhr = new XMLHttpRequest();
    var called = false;
    var done = function (err, data, status) { if (!called) { called = true; cb(err, data, status); } };
    xhr.open(method, SERVER + path, true);
    xhr.timeout = 15000;
    xhr.setRequestHeader('Accept', 'application/json');
    if (body) xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        var data = null;
        try { data = JSON.parse(xhr.responseText); } catch (e) { done(e, null, xhr.status); return; }
        done(null, data, xhr.status);
      } else {
        done(new Error('HTTP ' + xhr.status), null, xhr.status);
      }
    };
    xhr.ontimeout = function () { done(new Error('timeout'), null, 0); };
    xhr.onerror = function () { done(new Error('network'), null, 0); };
    xhr.send(body ? JSON.stringify(body) : null);
  }

  function store(key, value) {
    try {
      if (arguments.length === 1) return window.localStorage.getItem(key);
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch (e) { /* localStorage i padisponueshëm */ }
    return null;
  }

  function detectPlatform() {
    var ua = navigator.userAgent.toLowerCase();
    if (ua.indexOf('web0s') >= 0 || ua.indexOf('webos') >= 0) return 'LG webOS';
    if (ua.indexOf('tizen') >= 0) return 'Samsung Tizen';
    if (ua.indexOf('bravia') >= 0 || ua.indexOf('sony') >= 0) return 'Sony Bravia';
    if (ua.indexOf('android') >= 0) return 'Android TV';
    return label('platform.browser');
  }

  function screenWidth() { return Math.round(window.innerWidth * (window.devicePixelRatio || 1)); }
  function screenHeight() { return Math.round(window.innerHeight * (window.devicePixelRatio || 1)); }

  function abs(url) {
    if (!url) return '';
    return /^https?:\/\//i.test(url) ? url : SERVER + url;
  }

  function formatPrice(value, currency) {
    var n = Number(value);
    var s = n % 1 === 0 ? String(n) : n.toFixed(2);
    return s + ' ' + (currency || '');
  }

  function parseQuery(q) {
    var out = {};
    q.replace(/^\?/, '').split('&').forEach(function (pair) {
      if (!pair) return;
      var i = pair.indexOf('=');
      var k = decodeURIComponent(i < 0 ? pair : pair.slice(0, i));
      out[k] = i < 0 ? '' : decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' '));
    });
    return out;
  }

  function readJson(key) {
    var raw = store(key);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; /* cache e prishur */ }
  }

  /** Klonon një shabllon nga #templates në index.html. */
  function tpl(name) {
    return q(templates, '[data-tpl="' + name + '"]').cloneNode(true);
  }

  /** Vendos tekstin në elementin brenda "parent"; e fsheh nëse teksti mungon. */
  function fill(parent, selector, text) {
    var e = q(parent, selector);
    if (!e) return;
    e.textContent = text || '';
    if (!text) hide(e);
  }

  function hide(e) { if (e.className.indexOf('hidden') < 0) e.className += ' hidden'; }
  function q(parent, selector) { return parent.querySelector(selector); }

  function div(cls) { var d = document.createElement('div'); d.className = cls; return d; }
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function $(id) { return document.getElementById(id); }

  boot();
})();
