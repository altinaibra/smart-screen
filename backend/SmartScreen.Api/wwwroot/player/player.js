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
 * Pa rrjet: përmbajtja (me oraret dhe të gjitha playlist-at e ekranit) merret nga localStorage,
 * playlist-a sipas orarit zgjidhet këtu me orën e pajisjes, dhe foto/videot vijnë nga cache-i
 * i pajisjes (Service Worker sw.js në shfletues/PC, ose cache-i në disk i aplikacionit Android).
 *
 * Parametra opsionalë në URL: ?server=http://ip:5080  ?device=<key>  ?preview=1
 */
(function () {
  'use strict';

  var POLL_MS = 15000;
  var OFFLINE_CHECK_MS = 30000; // sa shpesh kontrollohen oraret kur s'ka rrjet
  var RETRY_MS = 10000;
  var FADE_MS = 800;
  var MAX_VIDEO_MS = 10 * 60 * 1000; // mbrojtje nëse video "ngec" dhe nuk mbaron kurrë
  var BRAND = '<div class="brand"><img src="logo.svg" alt=""><div><div class="brand-title">Smart Screen</div>' +
              '<div class="brand-tag">DIGITAL SIGNAGE</div></div></div>';

  // Tekstet që shfaqen në TV (gjuha dhe lloji i biznesit zgjidhen te Cilësimet).
  // "order_barber" etj. zëvendësojnë "order" sipas llojit të biznesit.
  var LABELS = {
    sq: { open: 'Hapur', closed: 'Mbyllur', only: 'Vetëm', prices: 'Çmimet në {c}', vat: 'TVSH e përfshirë',
          hours: 'Orari', order: 'Porosi', order_barber: 'Rezervo', order_shop: 'Kontakt',
          follow: 'Ndiqni', soldOut: 'E mbaruar', soldOut_barber: 'Jo sot', photo: 'Foto' },
    en: { open: 'Open', closed: 'Closed', only: 'Only', prices: 'Prices in {c}', vat: 'VAT included',
          hours: 'Hours', order: 'Order', order_barber: 'Book', order_shop: 'Contact',
          follow: 'Follow', soldOut: 'Sold out', soldOut_barber: 'Not today', photo: 'Photo' }
  };
  var CREAM = '#f3e9d8';
  var INK = '#1a1411';

  var params = parseQuery(location.search);
  var isPreview = params.preview === '1';
  var SERVER = (params.server || window.SMART_SCREEN_SERVER || '').replace(/\/+$/, '');

  var root = $('root');
  var layers = [$('layerA'), $('layerB')];
  var overlay = $('overlay');
  var activeLayer = 0;

  var state = {
    deviceKey: params.device || store('ss_device_key'),
    content: null,     // përmbajtja që po luhet
    pending: null,     // përmbajtje e re që pret fundin e slide-it
    version: null,
    commandVersion: null,
    index: -1,
    timer: null,
    online: true
  };

  // ------------------------------------------------------------------ nisja

  function boot() {
    // Ekrani vetëm shfaq: pa menu konteksti, pa përzgjedhje teksti, pa tërheqje elementësh.
    document.oncontextmenu = function () { return false; };
    document.onselectstart = function () { return false; };
    document.ondragstart = function () { return false; };
    startClock();
    if (!isPreview) registerServiceWorker();
    setInterval(function () { if (!state.online) applyOfflineSchedule(); }, OFFLINE_CHECK_MS);
    window.onresize = function () { if (state.content) applyOrientation(state.content); };

    if (isPreview) {
      showOverlay('<div class="label">Duke pritur preview...</div>');
      window.addEventListener('message', function (e) {
        if (e.origin !== location.origin || !e.data || e.data.type !== 'smartscreen-preview') return;
        state.pending = null;
        start(e.data.content);
      });
      return;
    }

    var cached = store('ss_content');
    if (cached) {
      try {
        var c = JSON.parse(cached);
        if (c && c.paired) start(c);
      } catch (e) { /* cache e prishur */ }
    }
    if (!state.content) showOverlay('' + BRAND + '<div class="label">Duke u lidhur me serverin...</div>');

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
    cacheMedia(c);

    if (!state.content) start(c);
    else state.pending = c;
  }

  // ------------------------------------------------------------------ luajtja

  function start(c) {
    clearTimeout(state.timer);
    state.content = c;
    state.version = c.version;
    state.index = -1;
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
    $('header').className = 'hidden';
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
    var slideCount = ((state.content.playlist && state.content.playlist.slides) || []).length;
    setProgress(state.index, slideCount, built.video && !(slide.duration > 0) ? 0 : Math.max(3, slide.duration || 10) * 1000);

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
      if (!(slide.duration > 0)) {
        video.onloadedmetadata = function () {
          if (video.duration && isFinite(video.duration)) setProgress(state.index, slideCount, video.duration * 1000);
        };
      }
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
    if ((slide.type === 'Image' || slide.type === 'Promo' || slide.type === 'Combo') && slide.mediaUrl) new Image().src = abs(slide.mediaUrl);
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
        if (slide.title) el.appendChild(textEl('h1', slide.title));
        if (slide.text) el.appendChild(textEl('p', slide.text));
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

      case 'Promo':
        buildPromo(el, slide, settings);
        break;

      case 'Combo':
        buildCombo(el, slide, settings);
        break;

      case 'Brand':
        buildBrand(el, settings);
        break;
    }
    return { el: el, video: video };
  }

  function addCaption(el, slide) {
    if (!slide.title && !slide.text) return;
    var cap = div('media-caption');
    if (slide.title) cap.appendChild(textEl('h2', slide.title));
    if (slide.text) cap.appendChild(textEl('p', slide.text));
    el.appendChild(cap);
  }

  /** Produkt / ofertë: etiketë, titull i madh në dy ngjyra, përshkrim, foto rrethore dhe çmim. */
  function buildPromo(el, slide, settings) {
    el.className += ' hero promo';
    var left = div('hero-left');
    if (slide.badge) {
      var pill = textEl('div', slide.badge, 'pill');
      pill.style.backgroundColor = settings.primaryColor;
      left.appendChild(pill);
    }
    left.appendChild(heroTitle(slide.title, slide.textColor || CREAM, settings.primaryColor));
    if (slide.text) left.appendChild(textEl('p', slide.text, 'hero-desc'));
    el.appendChild(left);
    el.appendChild(heroPhoto(slide, settings, settings.primaryColor));
  }

  /** Ofertë me listë (p.sh. menu familjare) mbi sfondin e ngjyrës kryesore. */
  function buildCombo(el, slide, settings) {
    el.className += ' hero combo';
    if (!slide.backgroundColor) el.style.backgroundColor = settings.primaryColor;
    var left = div('hero-left');
    if (slide.badge) left.appendChild(textEl('div', slide.badge, 'kicker'));
    left.appendChild(heroTitle(slide.title, CREAM, slide.textColor || INK));
    var lines = String(slide.text || '').split(/\r?\n/);
    var list = document.createElement('ul');
    list.className = 'hero-items';
    for (var i = 0, n = 0; i < lines.length; i++) {
      var line = lines[i].replace(/^\s*[-•*◆]\s*/, '').trim();
      if (!line) continue;
      var li = textEl('li', line);
      li.style.webkitAnimationDelay = li.style.animationDelay = (0.5 + n * 0.45) + 's';
      list.appendChild(li);
      n++;
    }
    if (list.childNodes.length) left.appendChild(list);
    el.appendChild(left);
    el.appendChild(heroPhoto(slide, settings, null));
  }

  function heroTitle(title, color1, color2) {
    var parts = splitTitle(title);
    var h = document.createElement('h1');
    h.className = 'hero-title';
    var longest = Math.max(parts[0].length, parts[1].length, 4);
    // Titulli i gjatë zvogëlohet që të mos dalë nga gjysma e ekranit.
    var size = Math.min(isPortrait() ? 15 : 17, (isPortrait() ? 88 : 78) / (longest * 0.5));
    h.style.fontSize = size.toFixed(1) + 'vmin';
    var a = textEl('span', parts[0]); a.style.color = color1; h.appendChild(a);
    if (parts[1]) { var b = textEl('span', parts[1]); b.style.color = color2; h.appendChild(b); }
    return h;
  }

  /** "Double Smash" -> ["Double", "Smash"]; rreshti i ri në tekst ndan me dorë. */
  function splitTitle(title) {
    var t = String(title || '').replace(/\r/g, '');
    if (t.indexOf('\n') >= 0) {
      var i = t.indexOf('\n');
      return [t.slice(0, i).trim(), t.slice(i + 1).replace(/\n/g, ' ').trim()];
    }
    var words = t.split(/\s+/);
    if (words.length < 2) return [t, ''];
    var half = Math.ceil(words.length / 2);
    return [words.slice(0, half).join(' '), words.slice(half).join(' ')];
  }

  function heroPhoto(slide, settings, ringColor) {
    var right = div('hero-right');
    var ring = div('photo-ring');
    if (ringColor) {
      var line = div('ring');
      line.style.borderColor = ringColor;
      ring.appendChild(line);
    }
    var circle;
    if (slide.mediaUrl) {
      circle = div('photo-circle');
      var img = document.createElement('img');
      img.src = abs(slide.mediaUrl);
      circle.appendChild(img);
    } else {
      circle = textEl('div', label(settings, 'photo'), 'photo-circle placeholder');
    }
    ring.appendChild(circle);
    if (slide.price !== null && slide.price !== undefined) {
      var bubble = div('price-bubble');
      bubble.style.backgroundColor = settings.accentColor || '#f2b632';
      bubble.appendChild(textEl('div', label(settings, 'only'), 'only'));
      bubble.appendChild(priceEl(slide.price, settings.currency));
      ring.appendChild(bubble);
    }
    right.appendChild(ring);
    return right;
  }

  /** Çmimi me simbolin e vogël majtas dhe decimalet sipër: €5.90 */
  function priceEl(value, currency, oldValue) {
    var box = div('price');
    if (oldValue) box.appendChild(textEl('span', formatPrice(oldValue, currency), 'old'));
    var n = Number(value);
    var whole = Math.floor(n);
    var cents = Math.round((n - whole) * 100);
    if (currency) box.appendChild(textEl('span', currency, 'cur'));
    box.appendChild(textEl('span', String(whole), 'int'));
    if (cents > 0) box.appendChild(textEl('span', '.' + (cents < 10 ? '0' : '') + cents, 'dec'));
    return box;
  }

  function buildMenu(el, slide, settings) {
    el.className += ' menu';

    var head = div('menu-head');
    head.appendChild(textEl('h1', slide.menu.title));
    var note = settings.currencyName
      ? label(settings, 'prices').replace('{c}', settings.currencyName) + ' · ' + label(settings, 'vat')
      : label(settings, 'vat');
    head.appendChild(textEl('div', note, 'menu-note'));
    el.appendChild(head);

    var products = slide.menu.products;
    var n = products.length;
    var portrait = isPortrait();
    var cols;
    if (portrait) cols = n <= 4 ? 1 : 2;
    else cols = n <= 2 ? n : n <= 6 ? 3 : 4;
    var rows = Math.ceil(n / cols);

    var grid = div('menu-grid' + (rows > 3 || (portrait && rows > 5) ? ' dense' : ''));
    var w = (100 / cols) + '%';
    var h = (100 / rows) + '%';

    for (var i = 0; i < n; i++) {
      var p = products[i];
      var cell = div('card-cell');
      cell.style.width = w;
      cell.style.height = h;

      var card = div('card' + (p.isAvailable ? '' : ' soldout'));
      if (p.isFeatured && p.isAvailable) card.style.borderColor = settings.primaryColor;

      var photo;
      if (p.imageUrl) {
        photo = div('card-photo');
        photo.style.backgroundImage = 'url("' + abs(p.imageUrl) + '")';
      } else {
        photo = textEl('div', label(settings, 'photo'), 'card-photo placeholder');
      }
      card.appendChild(photo);

      var info = div('card-info');
      info.appendChild(textEl('div', p.name, 'card-name'));
      if (p.description) info.appendChild(textEl('div', p.description, 'card-desc'));
      var price = priceEl(p.price, settings.currency, p.oldPrice && p.oldPrice > p.price ? p.oldPrice : null);
      price.className += ' card-price';
      price.style.color = settings.primaryColor;
      info.appendChild(price);
      card.appendChild(info);

      if (!p.isAvailable) {
        card.appendChild(textEl('div', label(settings, 'soldOut'), 'sold-label'));
      } else if (p.oldPrice && p.oldPrice > p.price) {
        var off = textEl('div', '-' + Math.round((1 - p.price / p.oldPrice) * 100) + '%', 'off-label');
        off.style.backgroundColor = settings.accentColor || '#f2b632';
        card.appendChild(off);
      }

      cell.appendChild(card);
      grid.appendChild(cell);
      fitPhoto(photo);
    }
    el.appendChild(grid);
  }

  // Foto katrore sa lartësia e kartës (pa CSS aspect-ratio, që mungon në TV-të e vjetër).
  function fitPhoto(photo) {
    if (isPortrait()) return; // vertikal: foto sipër, e gjithë gjerësia (CSS)
    setTimeout(function () {
      var h = photo.offsetHeight;
      if (h) photo.style.width = h + 'px';
    }, 0);
  }

  /** Logo, emri, slogani dhe orari / telefoni / rrjeti social nga Cilësimet. */
  function buildBrand(el, settings) {
    el.className += ' brand';
    el.appendChild(logoCircle(settings, 'logo-circle brand-logo'));
    el.appendChild(textEl('h1', settings.businessName || '', 'brand-name'));
    if (settings.slogan) el.appendChild(textEl('div', settings.slogan, 'brand-slogan'));

    var cols = [];
    var hours = hoursText(settings);
    if (hours) cols.push([label(settings, 'hours'), hours]);
    if (settings.phone) cols.push([label(settings, 'order'), settings.phone]);
    if (settings.socialHandle) cols.push([label(settings, 'follow'), settings.socialHandle]);
    if (cols.length) {
      var info = div('brand-info');
      for (var i = 0; i < cols.length; i++) {
        var col = div('col');
        var l = textEl('div', cols[i][0], 'label');
        l.style.color = settings.primaryColor;
        col.appendChild(l);
        col.appendChild(textEl('div', cols[i][1], 'value'));
        info.appendChild(col);
      }
      el.appendChild(info);
    }
  }

  function logoCircle(settings, cls) {
    var c = div(cls);
    c.style.backgroundColor = settings.primaryColor;
    if (settings.logoUrl) {
      var img = document.createElement('img');
      img.src = abs(settings.logoUrl);
      c.appendChild(img);
    } else {
      c.appendChild(document.createTextNode(String(settings.businessName || 'S').charAt(0)));
    }
    return c;
  }

  // ------------------------------------------------------------------ ora, shiriti, orientimi

  function applyChrome(c) {
    var s = c.settings || {};

    // Kreu: logo, emri, teksti anash, orari
    var logo = $('hLogo');
    logo.parentNode.replaceChild(logoCircleWithId(s), logo);
    $('hName').textContent = s.businessName || '';
    $('hTagline').textContent = s.tagline || '';
    $('header').className = '';
    updateStatus();

    // Shiriti poshtë: fjalitë ndahen me • ose rresht të ri dhe shfaqen me ◆ mes tyre.
    var ticker = $('ticker');
    var items = String(s.tickerText || '').split(/\s*(?:•|\n|\|)\s*/);
    var clean = [];
    for (var i = 0; i < items.length; i++) if (items[i].trim()) clean.push(items[i].trim());
    if (s.showTicker && clean.length) {
      var track = $('tickerTrack');
      track.innerHTML = '';
      // Dy kopje njëra pas tjetrës që lëvizja të duket pa fund.
      for (var copy = 0; copy < 2; copy++) {
        for (var j = 0; j < clean.length; j++) {
          track.appendChild(textEl('span', clean[j]));
          track.appendChild(textEl('span', '◆', 'sep'));
        }
      }
      ticker.style.backgroundColor = s.primaryColor;
      ticker.className = '';
      var secs = Math.max(20, Math.round(clean.join('   ').length / 3.5));
      track.style.webkitAnimationDuration = secs + 's';
      track.style.animationDuration = secs + 's';
    } else {
      ticker.className = 'hidden';
    }
    $('clock').className = s.showClock ? 'h-clock' : 'h-clock hidden';
    document.documentElement.lang = s.screenLanguage === 'en' ? 'en' : 'sq';
    applyOrientation(c);
  }

  function logoCircleWithId(s) {
    var c = logoCircle(s, 'logo-circle');
    c.id = 'hLogo';
    return c;
  }

  function hasTicker(s) {
    return !!(s && s.showTicker && String(s.tickerText || '').replace(/[\s•|]/g, ''));
  }

  function applyOrientation(c) {
    var wantPortrait = c.screen && c.screen.orientation === 'Portrait';
    var cls = ['with-header'];
    var rotated = wantPortrait && window.innerWidth > window.innerHeight;
    if (rotated) cls.push('rotated');
    if (rotated || window.innerHeight > window.innerWidth) cls.push('portrait');
    if (hasTicker(c.settings)) cls.push('with-ticker');
    root.className = cls.join(' ');
  }

  function isPortrait() {
    return root.className.indexOf('portrait') >= 0 || window.innerHeight > window.innerWidth;
  }

  // Shiritat e progresit në krye: një për çdo slide, i aktivi mbushet gjatë kohëzgjatjes.
  function setProgress(index, count, ms) {
    var box = $('progress');
    if (count < 2) { box.innerHTML = ''; return; }
    if (box.childNodes.length !== count) {
      box.innerHTML = '';
      for (var i = 0; i < count; i++) { var seg = div('seg'); seg.appendChild(document.createElement('i')); box.appendChild(seg); }
    }
    for (var k = 0; k < count; k++) {
      var fill = box.childNodes[k].firstChild;
      fill.style.webkitTransition = fill.style.transition = 'none';
      fill.style.width = '0';
    }
    if (!ms) return;
    var active = box.childNodes[index].firstChild;
    setTimeout(function () {
      active.style.webkitTransition = active.style.transition = 'width ' + ms + 'ms linear';
      active.style.width = '100%';
    }, 50);
  }

  function hoursText(s) {
    if (!s.openingTime || !s.closingTime) return '';
    return s.openingTime + ' – ' + s.closingTime;
  }

  // "HAPUR · 10:00 – 24:00" sipas orës së pajisjes (orari mund të kalojë mesnatën).
  function updateStatus() {
    var s = (state.content && state.content.settings) || {};
    var box = $('hStatus');
    var hours = hoursText(s);
    if (!hours) { box.className = 'h-status hidden'; return; }
    var now = new Date();
    var t = now.getHours() * 60 + now.getMinutes();
    var open = toMinutes(s.openingTime);
    var close = toMinutes(s.closingTime);
    var isOpen = open <= close ? (t >= open && t < close) : (t >= open || t < close);
    box.className = 'h-status' + (isOpen ? '' : ' closed');
    $('hStatusText').textContent = label(s, isOpen ? 'open' : 'closed') + ' · ' + hours;
  }

  function label(settings, key) {
    var lang = settings && settings.screenLanguage === 'en' ? 'en' : 'sq';
    var typed = LABELS[lang][key + '_' + (settings && settings.businessType)];
    return typed || LABELS[lang][key];
  }

  function startClock() {
    var el = $('clock');
    var tick = function () {
      var d = new Date();
      el.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());
      updateStatus();
    };
    tick();
    setInterval(tick, 10000);
  }

  // ------------------------------------------------------------------ ekranet e sistemit

  function showPairing(code) {
    var platform = detectPlatform();
    showOverlay(
      BRAND +
      '<div class="label">Kodi i çiftimit</div>' +
      '<div class="code">' + escapeHtml(code || '------') + '</div>' +
      '<div class="hint">Hapni panelin e administrimit &rarr; <b>Ekranet</b> &rarr; <b>Shto ekran</b> dhe vendosni këtë kod.</div>' +
      '<div class="meta">' + escapeHtml(platform) + ' &middot; ' + screenWidth() + '&times;' + screenHeight() + '</div>'
    );
  }

  function showIdle(settings) {
    settings = settings || {};
    var html = '';
    if (settings.logoUrl) html += '<img class="idle-logo" src="' + escapeHtml(abs(settings.logoUrl)) + '">';
    html += '<h1>' + escapeHtml(settings.businessName || 'Smart Screen') + '</h1>';
    if (settings.slogan) html += '<div class="hint" style="margin-top:2vmin">' + escapeHtml(settings.slogan) + '</div>';
    showOverlay(html);
  }

  function showOverlay(html) {
    overlay.style.backgroundColor = '';
    overlay.innerHTML = html;
    overlay.className = '';
  }

  function hideOverlay() { overlay.className = 'hidden'; }

  function setOnline(online) {
    var wasOnline = state.online;
    state.online = online;
    $('netStatus').className = online ? 'hidden' : '';
    if (wasOnline && !online) applyOfflineSchedule();
  }

  // ------------------------------------------------------------------ puna pa rrjet

  function registerServiceWorker() {
    try {
      // Vetëm në "secure context" (HTTPS, localhost ose PC me Player-in për Windows).
      if (!('serviceWorker' in navigator) || window.isSecureContext === false) return;
      navigator.serviceWorker.register('sw.js').then(function () {
        var cached = state.content || parseJson(store('ss_content'));
        if (cached) cacheMedia(cached);
      }, function () { /* pa Service Worker: përdoret cache-i i zakonshëm i shfletuesit */ });
    } catch (e) { /* shfletues i vjetër */ }
  }

  // I thotë pajisjes cilat foto/video duhen ruajtur (dhe cilat mund të fshihen).
  function cacheMedia(c) {
    var urls = mediaUrls(c);
    try {
      if (window.SmartScreenNative && window.SmartScreenNative.cacheMedia) {
        window.SmartScreenNative.cacheMedia(JSON.stringify(urls));
      }
    } catch (e) { /* ignore */ }
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(function (reg) {
          if (reg.active) reg.active.postMessage({ type: 'cache-media', urls: urls });
        });
      }
    } catch (e) { /* ignore */ }
  }

  function mediaUrls(c) {
    var seen = {};
    var out = [];
    var add = function (u) { if (u && !seen[u]) { seen[u] = true; out.push(abs(u)); } };
    var lists = (c.offline && c.offline.playlists) || (c.playlist ? [c.playlist] : []);
    if (c.settings) add(c.settings.logoUrl);
    for (var i = 0; i < lists.length; i++) {
      var slides = lists[i].slides || [];
      for (var j = 0; j < slides.length; j++) {
        add(slides[j].mediaUrl);
        if (slides[j].menu) {
          for (var k = 0; k < slides[j].menu.products.length; k++) add(slides[j].menu.products[k].imageUrl);
        }
      }
    }
    return out;
  }

  // Pa rrjet, zgjidh playlist-ën sipas orareve me orën e pajisjes (si serveri).
  function applyOfflineSchedule() {
    var base = state.pending || state.content;
    if (!base || !base.offline || isPreview) return;
    var wantedId = resolveOfflinePlaylistId(base.offline, new Date());
    var currentId = base.playlist ? base.playlist.id : null;
    if (wantedId === currentId) return;

    var playlist = null;
    for (var i = 0; i < base.offline.playlists.length; i++) {
      if (base.offline.playlists[i].id === wantedId) playlist = base.offline.playlists[i];
    }
    var c = {};
    for (var key in base) if (base.hasOwnProperty(key)) c[key] = base[key];
    c.playlist = playlist;
    // Version tjetër, që kur kthehet rrjeti të aplikohet sërish përmbajtja e serverit.
    c.version = String(base.version).split(':')[0] + ':offline:' + wantedId;
    if (state.content) state.pending = c; else start(c);
  }

  function resolveOfflinePlaylistId(offline, now) {
    var best = null;
    var schedules = offline.schedules || [];
    for (var i = 0; i < schedules.length; i++) {
      var s = schedules[i];
      if (!isScheduleActive(s, now)) continue;
      if (!best || s.priority > best.priority || (s.priority === best.priority && s.startTime > best.startTime)) best = s;
    }
    return best ? best.playlistId : (offline.defaultPlaylistId === undefined ? null : offline.defaultPlaylistId);
  }

  function isScheduleActive(s, now) {
    var t = now.getHours() * 60 + now.getMinutes();
    var start = toMinutes(s.startTime);
    var end = toMinutes(s.endTime);
    var dayOn = function (d) { return (s.daysOfWeek & (1 << d)) !== 0; };
    var today = now.getDay();
    if (start <= end) return dayOn(today) && t >= start && t < end;
    // Kalon mesnatën (p.sh. 22:00–02:00): pjesa pas mesnate i përket ditës së mëparshme.
    if (t >= start) return dayOn(today);
    if (t < end) return dayOn((today + 6) % 7);
    return false;
  }

  function toMinutes(hhmm) {
    var parts = String(hhmm || '0:0').split(':');
    return Number(parts[0]) * 60 + Number(parts[1] || 0);
  }

  function parseJson(text) {
    try { return text ? JSON.parse(text) : null; } catch (e) { return null; }
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
    return 'Shfletues';
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

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function div(cls) { var d = document.createElement('div'); d.className = cls; return d; }
  function textEl(tag, text, cls) { var e = document.createElement(tag); e.textContent = text; if (cls) e.className = cls; return e; }
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function $(id) { return document.getElementById(id); }

  boot();
})();
