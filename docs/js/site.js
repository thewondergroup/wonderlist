/* The Wonder List: page templates and behaviour.
   The same templates build the static pages (Node, see build.js) and run the hash-routed preview (browser). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.WL = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function slugify(s) {
    return String(s).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  function lower(s) { return s.charAt(0).toLowerCase() + s.slice(1); }
  function listWords(arr) {
    if (arr.length < 2) return arr.join('');
    return arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];
  }
  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  function makeCtx(mode, base) {
    base = base || '';
    return {
      mode: mode,
      base: base,
      img: function (name) { return base + 'img/' + name; },
      link: function (route, slug) {
        if (mode === 'app') {
          if (slug) return '#' + route + '-' + slug;
          return '#' + route;
        }
        if (route === 'home') return base + 'index.html';
        if (route === 'place') return base + 'places/' + slug + '.html';
        if (route === 'guide') return base + 'guides/' + slug + '.html';
        if (route === 'area' || route === 'occasion' || route === 'category') return base + 'london/' + slug + '.html';
        return base + route + '.html';
      }
    };
  }

  function logo() {
    return '<svg viewBox="0 0 1080 635" fill="currentColor" fill-rule="evenodd" aria-hidden="true"><path d="M318 632C316 630 308 618 287 582C272 555 255 525 249 516C238 497 229 480 216 459C213 452 205 439 200 430C195 421 188 409 185 404C181 398 153 348 120 292C88 237 60 187 56 182C53 176 46 164 41 155C20 118 16 112 9 100C5 93 1 87 1 86C1 85 13 85 35 85L68 86 L71 90C76 98 86 117 157 239C192 300 225 356 228 363C236 375 253 406 265 427C310 505 329 538 330 538C331 538 496 316 497 315C497 314 494 311 491 306C424 226 401 182 401 136C401 71 446 16 509 3C524 -0 556 -0 571 3C634 16 679 71 679 136C679 182 656 226 589 306C586 311 583 314 583 315C584 316 749 538 750 538C751 538 770 505 815 427C827 406 844 375 852 363C855 356 888 300 923 239C994 117 1004 98 1009 90L1012 86 L1045 85C1067 85 1079 85 1079 86C1079 87 1075 93 1071 100C1064 112 1060 118 1039 155C1034 164 1027 176 1024 182C1020 187 992 237 960 292C927 348 899 398 895 404C892 409 885 421 880 430C875 439 867 452 863 460C853 477 843 494 831 516C825 525 808 555 793 582C764 632 762 634 755 634C749 634 747 632 733 613C725 602 683 546 639 488C596 430 556 377 551 369C545 362 540 356 540 356C540 356 535 362 529 369C524 377 484 430 441 488C397 546 355 602 347 613C339 624 332 632 331 633C327 635 322 634 318 632ZM552 253C583 214 609 173 615 153C627 112 601 67 560 58C551 55 529 55 520 58C479 67 453 112 465 153C471 173 497 214 528 253C535 261 540 267 540 267C540 267 545 261 552 253Z"/></svg>';
  }

  /* ---------- data helpers ---------- */

  function byslug(list, slug) {
    for (var i = 0; i < list.length; i++) { if (list[i].slug === slug) return list[i]; }
    return null;
  }
  function catOf(data, id) {
    for (var i = 0; i < data.site.categories.length; i++) { if (data.site.categories[i].id === id) return data.site.categories[i]; }
    return { id: id, label: id, singular: id, slug: id };
  }
  function areaOf(data, name) {
    for (var i = 0; i < data.areas.length; i++) { if (data.areas[i].name === name) return data.areas[i]; }
    return { slug: slugify(name), name: name, intro: '' };
  }
  function liveAreas(data) {
    return data.areas.filter(function (a) { return data.places.some(function (p) { return p.area === a.name; }); });
  }
  function liveOccasions(data) {
    return data.site.occasions.filter(function (o) { return data.places.some(function (p) { return p.occasions.indexOf(o) >= 0; }); });
  }
  function fillers(count) {
    var n = (4 - (count % 4)) % 4, out = '';
    for (var i = 0; i < n; i++) out += '<div class="cell filler" aria-hidden="true"></div>';
    return out;
  }
  function names(list) { return listWords(list.map(function (p) { return p.name; })); }

  /* Questions and answers shown on the page and repeated in the page's structured data. */
  function placeFaq(data, p) {
    var cat = catOf(data, p.category), out = [];
    out.push({ q: 'Where is ' + p.name + '?', a: p.name + ' is a ' + cat.singular.toLowerCase() + ' in ' + p.area + ', ' + p.city + '.' });
    out.push({ q: 'What is ' + p.name + ' good for?', a: 'The Wonder List recommends ' + p.name + ' for these occasions: ' + listWords(p.occasions.map(lower)) + '. ' + p.verdict });
    if (p.order) out.push({ q: 'What should I order at ' + p.name + '?', a: p.order });
    if (p.perk) out.push({ q: 'Is there a Gold Card perk at ' + p.name + '?', a: 'Yes. Wonder List Gold Card members receive ' + lower(p.perk) + ' at ' + p.name + '.' });
    return out;
  }
  function listFaq(data, label, list) {
    var out = [], perks = list.filter(function (p) { return p.perk; });
    if (!list.length) return out;
    out.push({ q: 'Which ' + label + ' does The Wonder List recommend?', a: 'The Wonder List recommends ' + names(list) + '.' });
    if (perks.length) out.push({ q: 'Which of them have a Gold Card perk?', a: 'Gold Card members receive a perk at ' + names(perks) + '.' });
    return out;
  }

  /* ---------- shared pieces ---------- */

  function header(ctx, data, active) {
    function a(route, label, cls) {
      return '<a href="' + ctx.link(route) + '"' + (cls ? ' class="' + cls + '"' : '') + (active === route ? ' aria-current="page"' : '') + '>' + label + '</a>';
    }
    return '<header class="top"><div class="wrap top-in">' +
      '<nav class="nav nav-l" aria-label="Main">' + a('guides', 'Guides') + a('places', 'Places') + a('roulette', 'Roulette') + '</nav>' +
      '<a class="brand" href="' + ctx.link('home') + '" aria-label="The Wonder List home">' + logo() + '<span class="wordmark">The Wonder List</span></a>' +
      '<nav class="nav nav-r" aria-label="Membership">' + a('my-list', 'My List<span class="save-count" data-save-count></span>') + a('gold', 'Gold Card', 'is-gold') + '<a class="btn btn-sm" href="' + ctx.link('gold') + '">Join the list</a></nav>' +
      '</div></header>' +
      '<nav class="tabs" aria-label="Sections">' + a('guides', 'Guides') + a('places', 'Places') + a('roulette', 'Roulette') + a('my-list', 'My List') + a('gold', 'Gold', 'is-gold') + '</nav>';
  }

  function footer(ctx, data) {
    var s = data.site;
    return '<footer class="foot"><div class="wrap">' +
      '<div class="follow"><div><p class="kicker">Follow the list</p><h2>' + esc(s.followers) + ' people get our picks first</h2></div>' +
      '<div class="follow-actions"><a class="btn btn-fill" href="https://www.instagram.com/' + esc(s.instagram) + '/">Instagram</a>' +
      '<a class="btn" href="' + ctx.link('gold') + '">Join the list</a></div></div>' +
      '<div class="foot-in">' +
      '<div><a class="brand" href="' + ctx.link('home') + '">' + logo() + '<span class="wordmark">The Wonder List</span></a>' +
      '<p class="foot-about">' + esc(s.tagline) + '. Where to eat, drink and stay, chosen by people who go out for a living.</p></div>' +
      '<div><h3>Explore</h3><ul>' +
      '<li><a href="' + ctx.link('guides') + '">Guides</a></li>' +
      '<li><a href="' + ctx.link('places') + '">All places</a></li>' +
      '<li><a href="' + ctx.link('roulette') + '">Roulette</a></li>' +
      '<li><a href="' + ctx.link('gold') + '">Gold Card</a></li></ul></div>' +
      '<div><h3>' + esc(s.city) + '</h3><ul>' +
      s.categories.map(function (c) { return '<li><a href="' + ctx.link('category', c.slug) + '">' + esc(c.label) + '</a></li>'; }).join('') +
      liveAreas(data).slice(0, 3).map(function (a) { return '<li><a href="' + ctx.link('area', a.slug) + '">' + esc(a.name) + '</a></li>'; }).join('') +
      '</ul></div>' +
      '<div><h3>Contact</h3><ul>' +
      '<li><a href="https://www.instagram.com/' + esc(s.instagram) + '/">@' + esc(s.instagram) + '</a></li>' +
      '<li><a href="mailto:' + esc(s.email) + '">' + esc(s.email) + '</a></li>' +
      '<li><a href="' + ctx.link('links') + '">Links</a></li></ul></div>' +
      '</div>' +
      '<div class="legal"><span>Part of ' + esc(s.parent) + '</span><span>' + esc(s.sampleNotice) + '</span></div>' +
      '</div></footer>';
  }

  function crumbs(items) {
    return '<nav class="crumbs" aria-label="Breadcrumb">' + items.map(function (c, i) {
      return (i ? '<span aria-hidden="true">/</span>' : '') + (c.href && i < items.length - 1 ? '<a href="' + c.href + '">' + esc(c.name) + '</a>' : '<span>' + esc(c.name) + '</span>');
    }).join('') + '</nav>';
  }

  function faqBlock(faq) {
    if (!faq.length) return '';
    return '<section><div class="wrap"><div class="sec-head"><h2>Good to know</h2></div><div class="grid faq">' +
      faq.map(function (f) { return '<div class="cell span-2"><h3>' + esc(f.q) + '</h3><p>' + esc(f.a) + '</p></div>'; }).join('') +
      (faq.length % 2 ? '<div class="cell span-2 filler" aria-hidden="true"></div>' : '') + '</div></div></section>';
  }

  function saveButton(p) {
    return '<button type="button" class="save" data-save="' + esc(p.slug) + '" aria-pressed="false" aria-label="Save ' + esc(p.name) + ' to My List">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.600-7.5 10.200-7.500 10.200z"/></svg></button>';
  }
  function rChips(group, values, first) {
    return '<div class="chips">' + (first ? '<button type="button" class="chip" data-r="' + group + '" data-value="" aria-pressed="true">' + first + '</button>' : '') +
      values.map(function (v) {
        return '<button type="button" class="chip" data-r="' + group + '" data-value="' + esc(v) + '" aria-pressed="' + (group === 'occ' && v === 'Romantic') + '">' + esc(v) + '</button>';
      }).join('') + '</div>';
  }
  function perkPill(text) { return '<span class="perk-pill">' + logo() + '<span>' + esc(text) + '</span></span>'; }
  function num(i) { return (i < 9 ? '0' : '') + (i + 1); }

  function placeCard(ctx, data, p) {
    var text = [p.name, p.area, p.descriptor, p.cuisine].concat(p.tags, p.occasions).join(' ').toLowerCase();
    return '<div class="cell card" data-card data-category="' + esc(p.category) + '" data-area="' + esc(p.area) + '" data-price="' + esc(p.price) + '" data-perk="' + (p.perk ? 'yes' : '') + '" data-occasions="' + esc(p.occasions.join('|')) + '" data-text="' + esc(text) + '">' + saveButton(p) +
      '<a class="tile" href="' + ctx.link('place', p.slug) + '">' +
      '<div class="tile-img"><img src="' + ctx.img(p.image) + '" alt="' + esc(p.name) + ', ' + esc(p.descriptor.toLowerCase()) + ' in ' + esc(p.area) + '" loading="lazy">' +
      (p.perk ? '<span class="perk">' + logo() + '<span>' + esc(p.perk) + '</span></span>' : '') + '</div>' +
      '<h3>' + esc(p.name) + '</h3>' +
      '<p class="tile-sub">' + esc(p.descriptor) + '</p>' +
      '<div class="tile-meta"><span>' + esc(p.area) + '</span><span>' + esc(p.price || catOf(data, p.category).singular) + '</span></div>' +
      '</a></div>';
  }

  /* A reel: vertical 9:16 media from Instagram. Plays the video when one is set, otherwise shows the cover image. */
  function media(ctx, item, alt) {
    if (item.video) {
      return '<video src="' + ctx.base + 'video/' + esc(item.video) + '" poster="' + ctx.img(item.image) + '" autoplay muted loop playsinline preload="metadata" aria-label="' + esc(alt || '') + '"></video>';
    }
    return '<img src="' + ctx.img(item.image) + '" alt="' + esc(alt || '') + '">';
  }
  function reelTile(ctx, g, lead) {
    return '<a class="reel' + (lead ? ' reel-lead' : '') + '" href="' + ctx.link('guide', g.slug) + '">' + media(ctx, g, g.title) +
      '<span class="reel-text"><span class="kicker">' + esc(g.kicker) + '</span><span class="reel-title">' + esc(g.title) + '</span>' +
      '<span class="reel-meta">' + plural(g.places.length, 'place') + '</span></span></a>';
  }

  function guideTile(ctx, g) {
    return '<div class="cell card"><a class="tile guide-tile" href="' + ctx.link('guide', g.slug) + '">' +
      '<div class="tile-img reel-img"><img src="' + ctx.img(g.image) + '" alt="" loading="lazy"></div>' +
      '<p class="kicker">' + esc(g.kicker) + '</p>' +
      '<h3>' + esc(g.title) + '</h3>' +
      '<div class="tile-meta"><span>' + plural(g.places.length, 'place') + '</span></div>' +
      '</a></div>';
  }

  function rouletteBanner(ctx) {
    return '<a class="banner" href="' + ctx.link('roulette') + '">' +
      '<img src="' + ctx.img('terrace.jpg') + '" alt="" loading="lazy">' +
      '<div class="banner-in"><h2><small>Wonder List</small>Roulette</h2>' +
      '<p>Tired of scrolling? Tell us the mood and we will plan the evening.</p>' +
      '<span class="btn btn-fill">Spin</span></div></a>';
  }

  function waitlist() {
    return '<form class="waitlist" data-waitlist novalidate>' +
      '<label for="wl-email">Be first to hear when Gold Card membership opens.</label>' +
      '<div class="field"><input id="wl-email" name="email" type="email" autocomplete="email" placeholder="Email address" required>' +
      '<button class="btn btn-fill" type="submit">Join the list</button></div>' +
      '<p class="form-msg" role="status" aria-live="polite"></p></form>';
  }

  function goldBand(ctx, data) {
    var g = data.site.gold;
    return '<div class="grid gold-band">' +
      '<div class="cell span-4 gold-lead"><p class="kicker">Gold Card</p><h2>' + esc(g.title) + '</h2><p>' + esc(g.intro) + '</p>' +
      '<div><a class="btn btn-fill" href="' + ctx.link('gold') + '">Join the list</a></div></div>' +
      g.benefits.map(function (b) { return '<div class="cell"><h3>' + esc(b.title) + '</h3><p>' + esc(b.text) + '</p></div>'; }).join('') + '</div>';
  }

  function occasionLinks(ctx, data) {
    return '<div class="chips">' + liveOccasions(data).map(function (o) {
      return '<a class="chip" href="' + ctx.link('occasion', slugify(o)) + '">' + esc(o) + '</a>';
    }).join('') + '</div>';
  }

  /* ---------- pages ---------- */

  function home(ctx, data) {
    var feat = data.guides.filter(function (g) { return g.featured; })[0] || data.guides[0];
    var inEdit = feat.places.map(function (s) { return byslug(data.places, s); }).filter(Boolean);
    var others = data.guides.filter(function (x) { return x !== feat; }).slice(0, 4);
    var five = data.places.filter(function (p) { return p.trending; }).concat(data.places.filter(function (p) { return !p.trending; })).slice(0, 5);
    var more = data.places.filter(function (p) { return p.category !== 'restaurant'; }).slice(0, 3);
    var areas = liveAreas(data).slice(0, 4);
    var g = data.site.gold;
    function newsImage(n) {
      var item = n.route === 'place' ? byslug(data.places, n.slug) : n.route === 'guide' ? byslug(data.guides, n.slug) : null;
      return item ? item.image : 'terrace.jpg';
    }

    return '<section class="feature"><div class="feature-bg"><img src="' + ctx.img(feat.image) + '" alt=""></div>' +
      '<div class="wrap feature-in">' +
      '<div class="feature-text"><p class="kicker">' + esc(feat.kicker) + ' · ' + esc(data.site.city) + '</p>' +
      '<h1><a href="' + ctx.link('guide', feat.slug) + '">' + esc(feat.title) + '</a></h1>' +
      '<p class="standfirst">' + esc(feat.standfirst) + '</p>' +
      '<p class="byline">By ' + esc(feat.author) + ' · Updated ' + fmtDate(feat.updated) + '</p>' +
      '<div class="hero-actions"><a class="btn btn-fill" href="' + ctx.link('guide', feat.slug) + '">Read the edit</a><a class="text-link" href="' + ctx.link('guides') + '">All guides</a></div></div>' +
      '<a class="feature-reel" href="' + ctx.link('guide', feat.slug) + '">' + media(ctx, feat, feat.caption || feat.title) + '</a>' +
      '</div></section>' +

      '<section class="cover"><div class="wrap">' +
      '<ol class="edit-strip">' + inEdit.map(function (p, i) {
        return '<li><a href="' + ctx.link('place', p.slug) + '"><span class="edit-thumb"><img src="' + ctx.img(p.image) + '" alt="" loading="lazy"></span>' +
          '<span class="mini-num">' + num(i) + '</span><span class="mini-name">' + esc(p.name) + '</span><span class="mini-meta">' + esc(p.descriptor) + ' · ' + esc(p.area) + '</span></a></li>';
      }).join('') + '</ol></div></section>' +

      '<section class="rail-sec"><div class="wrap"><div class="sec-head"><h2>Five for this week</h2>' +
      '<div class="rail-nav"><button type="button" class="rail-btn" data-rail-prev aria-label="Previous places">&#8592;</button><button type="button" class="rail-btn" data-rail-next aria-label="More places">&#8594;</button>' +
      '<a class="text-link" href="' + ctx.link('places') + '">All places</a></div></div></div>' +
      '<div class="rail" data-rail tabindex="0" role="group" aria-label="Five places for this week">' + five.map(function (p, i) {
        return '<div class="rail-card">' + saveButton(p) + '<a href="' + ctx.link('place', p.slug) + '"><img src="' + ctx.img(p.image) + '" alt="' + esc(p.name) + '" loading="lazy">' +
          '<span class="rail-num">' + num(i) + '</span>' +
          '<span class="rail-text">' + (p.perk ? perkPill(p.perk) : '') + '<span class="rail-name">' + esc(p.name) + '</span>' +
          '<span class="rail-meta">' + esc(p.descriptor) + ' · ' + esc(p.area) + ' · ' + esc(p.price) + '</span>' +
          '<span class="rail-verdict">' + esc(p.verdict) + '</span></span></a></div>';
      }).join('') +
      '<a class="rail-card rail-more" href="' + ctx.link('places') + '"><span class="kicker">The full list</span><span class="rail-more-title">Browse all ' + data.places.length + ' places</span></a>' +
      '</div></section>' +

      '<section class="ideator" data-roulette><div class="wrap"><div class="ideator-box">' +
      '<div class="ideator-pic"><img src="' + ctx.img('terrace.jpg') + '" alt="A candlelit terrace restaurant at dusk" loading="lazy">' +
      '<div class="pic-title"><small>Wonder List</small><span>Roulette</span></div><p class="pic-sub">Let us plan the perfect evening</p></div>' +
      '<div class="ideator-controls"><h2>Tell us the mood. We will plan the evening.</h2><div><p class="label-sm">Where</p>' + rChips('area', liveAreas(data).map(function (a) { return a.name; }), 'Anywhere') + '</div>' +
      '<div><p class="label-sm">Occasion, pick one or two</p>' + rChips('occ', data.site.occasions) + '</div>' +
      '<div class="spin-row"><button type="button" class="btn btn-fill" data-spin>Spin</button><p class="muted" data-plan-note role="status" aria-live="polite"></p></div></div>' +
      '</div><div class="grid ideator-plan" data-plan></div></div></section>' +

      '<section class="cover cover-lists"><div class="wrap">' +
      '<div class="sec-head reels-head"><h2>Wonder Lists</h2><a class="text-link" href="' + ctx.link('guides') + '">All guides</a></div>' +
      '<div class="reels">' + others.map(function (r) { return reelTile(ctx, r, false); }).join('') + '</div>' +
      '</div></section>' +

      '<section><div class="wrap"><div class="pic-tiles">' +
      data.site.categories.map(function (c) {
        var inCat = data.places.filter(function (p) { return p.category === c.id; });
        return '<a class="pic-tile" href="' + ctx.link('category', c.slug) + '"><img src="' + ctx.img(inCat.length ? inCat[inCat.length > 1 ? 1 : 0].image : 'terrace.jpg') + '" alt="" loading="lazy">' +
          '<span class="pic-tile-text"><span class="index-word">' + esc(c.verb) + '</span><span class="index-sub">' + plural(inCat.length, lower(c.singular)) + '</span></span></a>';
      }).join('') +
      '<a class="pic-tile" href="' + ctx.link('roulette') + '"><img src="' + ctx.img('private-room.jpg') + '" alt="" loading="lazy">' +
      '<span class="pic-tile-text"><span class="index-word">Spin</span><span class="index-sub">Let us plan your evening</span></span></a>' +
      '</div></div></section>' +

      '<section><div class="wrap"><div class="sec-head"><h2>The latest</h2></div>' +
      '<div class="grid latest">' + (data.news || []).slice(0, 4).map(function (n) {
        return '<a class="cell latest-cell" href="' + (n.slug ? ctx.link(n.route, n.slug) : ctx.link(n.route)) + '"><span class="tile-img latest-img"><img src="' + ctx.img(newsImage(n)) + '" alt="" loading="lazy"></span>' +
          '<span class="kicker">' + esc(n.kicker) + '</span>' +
          '<span class="latest-title">' + esc(n.title) + '</span><span class="tile-sub">' + esc(n.text) + '</span><span class="latest-date">' + fmtDate(n.date) + '</span></a>';
      }).join('') + fillers((data.news || []).slice(0, 4).length) + '</div></div></section>' +

      '<section><div class="wrap"><div class="sec-head"><h2>Where in ' + esc(data.site.city) + '</h2><a class="text-link" href="' + ctx.link('places') + '">All places</a></div>' +
      '<div class="pic-tiles tall">' + areas.map(function (a) {
        var inArea = data.places.filter(function (p) { return p.area === a.name; });
        return '<a class="pic-tile" href="' + ctx.link('area', a.slug) + '"><img src="' + ctx.img(inArea[inArea.length - 1].image) + '" alt="" loading="lazy">' +
          '<span class="pic-tile-text"><span class="kicker">' + plural(inArea.length, 'place') + '</span><span class="area-name">' + esc(a.name) + '</span></span></a>';
      }).join('') + '</div>' +
      '<div class="occasion-row"><span class="caps">What kind of evening?</span>' + occasionLinks(ctx, data) + '</div></div></section>' +

      '<section><div class="wrap"><div class="sec-head"><h2>Bars and hotels</h2></div>' +
      '<div class="grid">' + more.map(function (p) { return placeCard(ctx, data, p); }).join('') +
      '<div class="cell card"><a class="tile cta-tile" href="' + ctx.link('places') + '"><p class="kicker">The full list</p>' +
      '<h3>Browse all ' + data.places.length + ' places</h3>' +
      '<p class="tile-sub">Search, or filter by area, price and occasion.</p></a></div>' +
      '</div></div></section>' +

      '<section class="gold-feature"><div class="wrap gold-feature-in">' +
      '<div class="gold-feature-pic"><img src="' + ctx.img('private-room.jpg') + '" alt="A private dining room set for dinner beneath a chandelier" loading="lazy"></div>' +
      '<div class="gold-feature-lead"><p class="kicker">The Gold Card</p><h2>' + esc(g.title) + '</h2><p>' + esc(g.intro) + '</p>' +
      waitlist() +
      '<div class="gold-benefits">' + g.benefits.map(function (b) { return '<div><h3>' + esc(b.title) + '</h3><p>' + esc(b.text) + '</p></div>'; }).join('') + '</div></div>' +
      '</div></section>';
  }

  function places(ctx, data) {
    function row(label, group, values) {
      return '<div class="filter-row"><span>' + label + '</span><div class="chips">' +
        '<button type="button" class="chip" data-filter="' + group + '" data-value="" aria-pressed="true">All</button>' +
        values.map(function (v) {
          return '<button type="button" class="chip" data-filter="' + group + '" data-value="' + esc(v.id) + '" aria-pressed="false">' + esc(v.label) + '</button>';
        }).join('') + '</div></div>';
    }
    return '<div class="wrap"><div class="page-head"><p class="kicker">The list · ' + esc(data.site.city) + '</p><h1>Places</h1>' +
      '<p class="lede">Every restaurant, bar and hotel on The Wonder List. Gold Card perks are marked on each place.</p></div>' +
      '<div class="filters" data-filters>' +
      '<div class="filter-row"><label for="place-search">Search</label><input id="place-search" class="search" type="search" placeholder="Name, area, cuisine or mood" data-search autocomplete="off"></div>' +
      row('Category', 'category', data.site.categories) +
      row('Area', 'area', liveAreas(data).map(function (a) { return { id: a.name, label: a.name }; })) +
      row('Occasion', 'occasions', liveOccasions(data).map(function (o) { return { id: o, label: o }; })) +
      row('Price', 'price', ['££', '£££', '££££'].map(function (v) { return { id: v, label: v }; })) +
      row('Gold perk', 'perk', [{ id: 'yes', label: 'With a Gold Card perk' }]) +
      '</div>' +
      '<p class="result-count" data-count role="status" aria-live="polite">' + plural(data.places.length, 'place') + '</p>' +
      '<div class="grid" data-cards>' + data.places.map(function (p) { return placeCard(ctx, data, p); }).join('') + '</div>' +
      '<p class="empty" data-empty hidden>No places match yet. Try clearing a filter.</p>' +
      '</div>';
  }

  function related(data, p) {
    return data.places.filter(function (q) { return q.slug !== p.slug; }).map(function (q) {
      var s = q.category === p.category ? 1 : 0;
      q.occasions.forEach(function (o) { if (p.occasions.indexOf(o) >= 0) s += 2; });
      if (q.area === p.area) s += 1;
      return { q: q, s: s };
    }).sort(function (a, b) { return b.s - a.s; }).slice(0, 4).map(function (x) { return x.q; });
  }

  function place(ctx, data, p, meta) {
    var cat = catOf(data, p.category), area = areaOf(data, p.area);
    var maps = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.name + ' ' + p.area + ' ' + p.city);
    var gal = p.gallery && p.gallery.length ? p.gallery : [p.image];
    meta.crumbs = [{ name: p.city, href: ctx.link('places') }, { name: p.area, href: ctx.link('area', area.slug) }, { name: p.name }];
    meta.faq = placeFaq(data, p);
    function fact(label, html) { return html ? '<div><dt>' + label + '</dt><dd>' + html + '</dd></div>' : ''; }
    var tips = [['What to order', p.order], ['The table to book', p.bestTable], ['When to go', p.when]].filter(function (x) { return x[1]; });
    return '<div class="wrap">' + crumbs(meta.crumbs) +
      '<header class="place-head"><p class="kicker">' + esc(cat.singular) + ' · ' + esc(p.area) + ', ' + esc(p.city) + '</p>' +
      '<h1>' + esc(p.name) + '</h1>' +
      '<div class="head-row"><div class="chips"><a class="chip" href="' + ctx.link('area', area.slug) + '">' + esc(p.area) + '</a><span class="chip">' + esc(p.descriptor) + '</span><span class="chip">' + esc(p.price) + '</span>' +
      (p.perk ? '<span class="perk-badge">' + logo() + '<span class="perk-badge-label">Gold Card perk</span><span class="perk-badge-text">' + esc(p.perk) + '</span></span>' : '') + '</div></div>' +
      '<p class="verdict">' + esc(p.verdict) + '</p>' +
      '<div><button type="button" class="btn btn-sm save-btn" data-save="' + esc(p.slug) + '" aria-pressed="false"><span data-save-label>Save to My List</span></button></div></header>' +
      '<div class="grid place-grid">' +
      '<div class="cell span-2 place-gallery"><div class="gal-main"><img data-gal-main src="' + ctx.img(gal[0]) + '" alt="' + esc(p.name) + '"></div>' +
      (gal.length > 1 ? '<div class="thumbs">' + gal.slice(0, 4).map(function (g, i) {
        return '<button type="button" data-gal="' + ctx.img(g) + '" aria-pressed="' + (i === 0) + '" aria-label="Photo ' + (i + 1) + ' of ' + esc(p.name) + '"><img src="' + ctx.img(g) + '" alt="" loading="lazy"></button>';
      }).join('') + '</div>' : '') + '</div>' +
      '<div class="cell span-2 place-info">' +
      '<div><p class="label-sm">Know before you go</p><dl class="facts">' +
      fact('Area', '<a href="' + ctx.link('area', area.slug) + '">' + esc(p.area) + '</a>, ' + esc(p.city)) +
      fact('Address', esc(p.address)) +
      fact('Nearest station', esc(p.station)) +
      fact('Type', '<a href="' + ctx.link('category', cat.slug) + '">' + esc(cat.singular) + '</a>' + (p.cuisine ? ', ' + esc(p.cuisine) : '')) +
      fact('Price', esc(p.price)) +
      fact('Open', esc(p.hours)) +
      fact('Dress', esc(p.dress)) +
      fact('Good for', p.occasions.map(function (o) { return '<a href="' + ctx.link('occasion', slugify(o)) + '">' + esc(o) + '</a>'; }).join(', ')) +
      fact('Gold Card perk', p.perk ? esc(p.perk) + '. Show your card when you arrive. <a href="' + ctx.link('gold') + '">Join the list</a>' : '') +
      '</dl></div>' +
      '<div><div class="actions" style="grid-template-columns:repeat(' + (p.phone ? 3 : 2) + ',1fr)">' +
      (p.bookingUrl ? '<a href="' + esc(p.bookingUrl) + '">Book</a>' : '<span>Book</span>') +
      (p.phone ? '<a href="tel:' + esc(p.phone.replace(/\s+/g, '')) + '">Call</a>' : '') +
      '<a href="' + maps + '">Directions</a></div>' +
      (p.bookingUrl ? '' : '<p class="note" style="margin-top:10px">Booking opens when The Wonder List launches.</p>') + '</div>' +
      '</div>' +
      '<div class="cell ' + (tips.length ? 'span-2' : 'span-4') + ' review"><p class="label-sm">The review</p>' +
      '<div class="prose dropcap">' + p.description.map(function (d) { return '<p>' + esc(d) + '</p>'; }).join('') + '</div>' +
      '<div class="chips">' + p.tags.map(function (tg) { return '<span class="chip">' + esc(tg) + '</span>'; }).join('') + '</div></div>' +
      (tips.length ? '<div class="cell span-2 insider"><p class="label-sm">From the editors</p>' + tips.map(function (x) {
        return '<div><h3>' + x[0] + '</h3><p>' + esc(x[1]) + '</p></div>';
      }).join('') + '</div>' : '') +
      '</div></div>' +
      faqBlock(meta.faq) +
      '<section><div class="wrap"><div class="sec-head"><h2>If you like this</h2><a class="text-link" href="' + ctx.link('area', area.slug) + '">More in ' + esc(p.area) + '</a></div>' +
      '<div class="grid">' + related(data, p).map(function (q) { return placeCard(ctx, data, q); }).join('') + '</div></div></section>' +
      '<section><div class="wrap">' + rouletteBanner(ctx) + '</div></section>';
  }

  function guides(ctx, data) {
    return '<div class="wrap"><div class="page-head"><p class="kicker">Guides</p><h1>Wonder Lists</h1>' +
      '<p class="lede">Monthly edits and lists for every kind of evening, chosen by The Wonder List.</p></div>' +
      '<div class="grid">' + data.guides.map(function (g) { return guideTile(ctx, g); }).join('') + fillers(data.guides.length) + '</div></div>';
  }

  function fmtDate(iso) {
    var m = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var d = String(iso || '').split('-');
    return d.length === 3 ? parseInt(d[2], 10) + ' ' + m[parseInt(d[1], 10) - 1] + ' ' + d[0] : '';
  }

  function guide(ctx, data, g, meta) {
    var list = g.places.map(function (slug) { return byslug(data.places, slug); }).filter(Boolean);
    meta.crumbs = [{ name: 'Guides', href: ctx.link('guides') }, { name: g.title }];
    meta.list = list;
    var rows = list.map(function (p, i) {
      var pic = '<div class="cell span-2 guide-row' + (i % 2 ? ' flip' : '') + '"><a class="pic" href="' + ctx.link('place', p.slug) + '"><img src="' + ctx.img(p.image) + '" alt="' + esc(p.name) + '" loading="lazy">' +
        (p.perk ? '<span class="perk">' + logo() + '<span>' + esc(p.perk) + '</span></span>' : '') + '</a></div>';
      var text = '<div class="cell span-2 guide-row-text"><div class="guide-num"><span>' + num(i) + '</span><p class="kicker">' + esc(p.area) + ' · ' + esc(p.descriptor) + ' · ' + esc(p.price) + '</p></div>' +
        '<h2>' + esc(p.name) + '</h2><p class="verdict">' + esc(p.verdict) + '</p>' +
        '<p class="guide-body">' + esc(p.description[0]) + '</p>' +
        (p.order ? '<p class="note"><strong>Order</strong> ' + esc(p.order) + '</p>' : '') +
        '<div class="row"><a class="text-link" href="' + ctx.link('place', p.slug) + '">Read the review</a></div></div>';
      return i % 2 ? text + pic : pic + text;
    }).join('');
    var others = data.guides.filter(function (o) { return o.slug !== g.slug; }).slice(0, 4);
    return '<div class="wrap">' + crumbs(meta.crumbs) +
      '<div class="grid article-top">' +
      '<figure class="cell span-2 article-media">' + media(ctx, g, g.title) + (g.caption ? '<figcaption class="caption">' + esc(g.caption) + '</figcaption>' : '') + '</figure>' +
      '<div class="cell span-2 article-open"><p class="kicker">' + esc(g.kicker) + '</p><h1>' + esc(g.title) + '</h1><p class="standfirst">' + esc(g.standfirst) + '</p>' +
      '<p class="byline">By ' + esc(g.author) + ' · Updated ' + fmtDate(g.updated) + ' · ' + plural(list.length, 'place') + '</p>' +
      '<div class="prose dropcap">' + (g.intro || []).map(function (d) { return '<p>' + esc(d) + '</p>'; }).join('') + '</div></div>' +
      '<div class="cell span-4 glance"><p class="label-sm">At a glance</p><div class="table-wrap"><table><thead><tr><th></th><th>Place</th><th>Area</th><th>Type</th><th>Price</th><th>Good for</th><th>Gold perk</th></tr></thead><tbody>' +
      list.map(function (p, i) {
        return '<tr><td class="t-num">' + num(i) + '</td><td><a href="' + ctx.link('place', p.slug) + '">' + esc(p.name) + '</a></td><td>' + esc(p.area) + '</td><td>' + esc(p.descriptor) + '</td><td>' + esc(p.price) + '</td><td>' + esc(p.occasions.join(', ')) + '</td><td>' + (p.perk ? perkPill(p.perk) : '') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>' +
      '</div>' +
      '<div class="grid guide-list">' + rows + '</div></div>' +
      '<section><div class="wrap"><div class="sec-head"><h2>More Wonder Lists</h2></div>' +
      '<div class="grid">' + others.map(function (o) { return guideTile(ctx, o); }).join('') + fillers(others.length) + '</div></div></section>';
  }

  /* One template for the area, occasion and category landing pages. */
  function listing(ctx, data, meta, o) {
    meta.crumbs = [{ name: data.site.city, href: ctx.link('places') }, { name: o.crumb }];
    meta.list = o.list;
    meta.faq = listFaq(data, o.faqLabel, o.list);
    var inGuides = data.guides.filter(function (g) { return g.places.some(function (s) { return o.list.some(function (p) { return p.slug === s; }); }); }).slice(0, 4);
    return '<div class="wrap">' + crumbs(meta.crumbs) +
      '<div class="page-head guide-head"><p class="kicker">' + esc(o.kicker) + '</p><h1>' + esc(o.title) + '</h1><p class="lede">' + esc(o.intro) + '</p>' +
      '<p class="byline">' + plural(o.list.length, 'place') + ' on The Wonder List</p></div>' +
      '<div class="grid">' + o.list.map(function (p) { return placeCard(ctx, data, p); }).join('') + fillers(o.list.length) + '</div></div>' +
      faqBlock(meta.faq) +
      (inGuides.length ? '<section><div class="wrap"><div class="sec-head"><h2>Featured in</h2><a class="text-link" href="' + ctx.link('guides') + '">All guides</a></div>' +
        '<div class="grid">' + inGuides.map(function (g) { return guideTile(ctx, g); }).join('') + fillers(inGuides.length) + '</div></div></section>' : '') +
      '<section><div class="wrap"><div class="occasion-row"><span class="caps">More ways to browse</span><div class="chips">' +
      liveAreas(data).map(function (a) { return '<a class="chip" href="' + ctx.link('area', a.slug) + '">' + esc(a.name) + '</a>'; }).join('') +
      liveOccasions(data).map(function (oc) { return '<a class="chip" href="' + ctx.link('occasion', slugify(oc)) + '">' + esc(oc) + '</a>'; }).join('') +
      '</div></div></div></section>';
  }

  function roulette(ctx, data) {
    return '<div class="wrap" data-roulette><div class="page-head"><p class="kicker">Wonder List</p><h1>Roulette</h1>' +
      '<p class="lede">Tired of scrolling? Give us a couple of prompts and we will plan your evening: a first drink, dinner and somewhere to end the night.</p></div>' +
      '<div class="grid">' +
      '<div class="cell span-2 roulette-pic"><img src="' + ctx.img('dining-room-tables.jpg') + '" alt="Tables set for dinner, lit by small red lamps">' +
      '<div class="pic-title"><small>Wonder List</small><span>Roulette</span></div><p class="pic-sub">Let us plan the perfect evening</p></div>' +
      '<div class="cell span-2 roulette-panel">' +
      '<div><h2>Choose your location</h2>' + rChips('area', liveAreas(data).map(function (a) { return a.name; }), 'Anywhere') + '</div>' +
      '<div><h2>Choose your occasion</h2>' + rChips('occ', data.site.occasions) + '<p class="note" style="margin-top:10px">Pick one or two.</p></div>' +
      '<div class="spin-row"><button type="button" class="btn" data-spin>Spin</button></div>' +
      '</div></div>' +
      '<div class="results-head"><h2>Your evening</h2><p class="muted" data-plan-note role="status" aria-live="polite"></p></div>' +
      '<div class="grid" data-plan></div></div>';
  }

  function gold(ctx, data) {
    var g = data.site.gold;
    return '<div class="wrap"><div class="page-head"><p class="kicker">Membership</p><h1>The Gold Card</h1>' +
      '<p class="lede">Anyone can read the guide. Gold Card members are looked after when they arrive.</p></div>' +
      '<div class="grid gold-band">' +
      '<div class="cell span-2 gold-lead"><p class="kicker">Gold Card</p><h2>' + esc(g.title) + '</h2><p>' + esc(g.intro) + '</p>' + waitlist() + '</div>' +
      '<div class="cell span-2 roulette-pic"><img src="' + ctx.img('terrace.jpg') + '" alt="A candlelit terrace restaurant looking out over the coast at dusk"></div>' +
      g.benefits.map(function (b) { return '<div class="cell"><h3>' + esc(b.title) + '</h3><p>' + esc(b.text) + '</p></div>'; }).join('') +
      '</div></div>' +
      '<section><div class="wrap"><div class="sec-head"><h2>Where your card works</h2><a class="text-link" href="' + ctx.link('places') + '">All places</a></div>' +
      '<div class="grid">' + data.places.filter(function (p) { return p.perk; }).slice(0, 4).map(function (p) { return placeCard(ctx, data, p); }).join('') + '</div></div></section>';
  }

  /* The page to put in the Instagram bio. */
  function links(ctx, data) {
    var feat = data.guides.filter(function (g) { return g.featured; })[0] || data.guides[0];
    var rest = data.guides.filter(function (g) { return g !== feat; }).slice(0, 3);
    function item(href, kicker, title) { return '<a class="link-item" href="' + href + '"><span class="kicker">' + esc(kicker) + '</span><span class="link-title">' + esc(title) + '</span></a>'; }
    return '<div class="wrap links-page"><div class="page-head"><p class="kicker">@' + esc(data.site.instagram) + '</p><h1>Start here</h1></div>' +
      '<div class="link-list">' +
      item(ctx.link('guide', feat.slug), feat.kicker, feat.title) +
      item(ctx.link('roulette'), 'Roulette', 'Let us plan your evening') +
      rest.map(function (g) { return item(ctx.link('guide', g.slug), g.kicker, g.title); }).join('') +
      item(ctx.link('places'), 'The full list', 'Browse all ' + data.places.length + ' places') +
      item(ctx.link('gold'), 'Gold Card', 'Become a member') +
      '</div></div>';
  }

  function mylist(ctx, data) {
    return '<div class="wrap"><div class="page-head"><p class="kicker">Saved on this device</p><h1>My List</h1>' +
      '<p class="lede">Tap the heart on any place to keep it here for later.</p></div>' +
      '<p class="result-count" data-mylist-count role="status" aria-live="polite"></p>' +
      '<div class="grid" data-mylist></div>' +
      '<div class="empty-list" data-mylist-empty><p class="standfirst">Nothing saved yet.</p>' +
      '<div class="hero-actions"><a class="btn btn-fill" href="' + ctx.link('places') + '">Browse places</a><a class="text-link" href="' + ctx.link('roulette') + '">Or spin the roulette</a></div></div></div>';
  }

  function notFound(ctx) {
    return '<div class="wrap"><div class="page-head"><p class="kicker">Not found</p><h1>That page is not on the list</h1>' +
      '<p class="lede"><a class="text-link" href="' + ctx.link('home') + '">Back to the homepage</a></p></div></div>';
  }

  /* ---------- routing and rendering ---------- */

  var PREFIXES = ['place', 'guide', 'area', 'occasion', 'category'];
  function parse(hash) {
    var h = String(hash || '').replace(/^#/, '');
    if (!h || h === 'home') return { name: 'home' };
    for (var i = 0; i < PREFIXES.length; i++) {
      if (h.indexOf(PREFIXES[i] + '-') === 0) return { name: PREFIXES[i], slug: h.slice(PREFIXES[i].length + 1) };
    }
    return { name: h };
  }

  function render(ctx, data, route) {
    var s = data.site, body, title, desc = s.description, active = route.name, item = null, meta = { crumbs: [], faq: [], list: [], kind: route.name };
    if (route.name === 'home') { body = home(ctx, data); title = s.name + ': ' + lower(s.tagline); active = 'home'; }
    else if (route.name === 'places') { body = places(ctx, data); title = 'Places in ' + s.city + ' | ' + s.name; desc = 'Every restaurant, bar and hotel on The Wonder List, with Gold Card perks.'; }
    else if (route.name === 'guides') { body = guides(ctx, data); title = 'Guides | ' + s.name; desc = 'Monthly edits and lists for every kind of evening.'; }
    else if (route.name === 'roulette') { body = roulette(ctx, data); title = 'Roulette | ' + s.name; desc = 'Tell us the mood and The Wonder List will plan your evening.'; }
    else if (route.name === 'gold') { body = gold(ctx, data); title = 'The Gold Card | ' + s.name; desc = s.gold.intro; }
    else if (route.name === 'my-list') { body = mylist(ctx, data); title = 'My List | ' + s.name; desc = 'Places you have saved on The Wonder List.'; }
    else if (route.name === 'links') { body = links(ctx, data); title = 'Start here | ' + s.name; active = ''; }
    else if (route.name === 'place' && (item = byslug(data.places, route.slug))) {
      body = place(ctx, data, item, meta); title = item.name + ', ' + item.area + ': review and Gold Card perk | ' + s.name; desc = item.verdict; active = 'places';
    }
    else if (route.name === 'guide' && (item = byslug(data.guides, route.slug))) {
      body = guide(ctx, data, item, meta); title = item.title + ' | ' + s.name; desc = item.standfirst; active = 'guides';
    }
    else if (route.name === 'area' && (item = byslug(data.areas, route.slug))) {
      var inArea = data.places.filter(function (p) { return p.area === item.name; });
      body = listing(ctx, data, meta, { crumb: item.name, kicker: s.city, title: 'The best places in ' + item.name, intro: item.intro, list: inArea, faqLabel: 'places in ' + item.name });
      title = 'The best restaurants, bars and hotels in ' + item.name + ' | ' + s.name; desc = item.intro; active = 'places';
    }
    else if (route.name === 'occasion' && liveOccasions(data).some(function (o) { return slugify(o) === route.slug; })) {
      var occ = liveOccasions(data).filter(function (o) { return slugify(o) === route.slug; })[0];
      var forOcc = data.places.filter(function (p) { return p.occasions.indexOf(occ) >= 0; });
      item = { name: occ, slug: route.slug };
      var occLabel = (s.occasionLabels && s.occasionLabels[occ]) || lower(occ) + ' places';
      var occTitle = occLabel.charAt(0).toUpperCase() + occLabel.slice(1) + ' in ' + s.city;
      body = listing(ctx, data, meta, { crumb: occ, kicker: 'What kind of evening?', title: occTitle, intro: s.occasionNotes[occ] || '', list: forOcc, faqLabel: occLabel + ' in ' + s.city });
      title = occTitle + ': restaurants, bars and hotels | ' + s.name; desc = s.occasionNotes[occ] || desc; active = 'places';
    }
    else if (route.name === 'category' && s.categories.some(function (c) { return c.slug === route.slug; })) {
      var cat = s.categories.filter(function (c) { return c.slug === route.slug; })[0];
      var ofCat = data.places.filter(function (p) { return p.category === cat.id; });
      item = { name: cat.label, slug: cat.slug };
      body = listing(ctx, data, meta, { crumb: cat.label, kicker: s.city, title: 'The best ' + lower(cat.label) + ' in ' + s.city, intro: 'Every ' + lower(cat.singular) + ' on The Wonder List, each one visited and chosen by our editors.', list: ofCat, faqLabel: lower(cat.label) + ' in ' + s.city });
      title = 'The best ' + lower(cat.label) + ' in ' + s.city + ' | ' + s.name; desc = 'The ' + lower(cat.label) + ' The Wonder List recommends in ' + s.city + ', with Gold Card perks.'; active = 'places';
    }
    else { body = notFound(ctx); title = 'Not found | ' + s.name; active = ''; meta.kind = 'missing'; }
    return {
      title: title, description: desc, item: item, meta: meta,
      html: header(ctx, data, active) + '<main>' + body + '</main>' + footer(ctx, data)
    };
  }

  /* ---------- roulette logic ---------- */

  function planEvening(data, area, occs, rnd) {
    rnd = rnd || Math.random;
    var used = [], exact = true;
    function score(p) {
      var sc = 0;
      if (area && p.area === area) sc += 2;
      occs.forEach(function (o) { if (p.occasions.indexOf(o) >= 0) sc += 3; });
      return sc;
    }
    function pick(cats) {
      var pool = data.places.filter(function (p) { return cats.indexOf(p.category) >= 0 && used.indexOf(p.slug) < 0; });
      if (!pool.length) pool = data.places.filter(function (p) { return used.indexOf(p.slug) < 0; });
      if (!pool.length) return null;
      var best = 0;
      pool.forEach(function (p) { best = Math.max(best, score(p)); });
      var top = pool.filter(function (p) { return score(p) >= best - 1; });
      if ((area || occs.length) && best === 0) exact = false;
      var choice = top[Math.floor(rnd() * top.length)];
      used.push(choice.slug);
      return choice;
    }
    var first = pick(['bar']), dinner = pick(['restaurant']), last = pick(['bar', 'hotel']);
    var stops = [];
    if (first) stops.push({ label: 'First drink', place: first });
    if (dinner) stops.push({ label: 'Dinner', place: dinner });
    if (last) stops.push({ label: last.category === 'hotel' ? 'Stay the night' : 'Last stop', place: last });
    return { stops: stops, exact: exact };
  }

  /* ---------- behaviour ---------- */

  var SAVED_FALLBACK = [];

  function mount(rootEl, data, ctx) {
    var each = function (sel, fn, scope) { Array.prototype.forEach.call((scope || rootEl).querySelectorAll(sel), fn); };

    // Saving places to My List (kept in this browser)
    var readSaved = function () { try { return JSON.parse(localStorage.getItem('wl-saved') || '[]'); } catch (e) { return SAVED_FALLBACK; } };
    var writeSaved = function (list) { SAVED_FALLBACK = list; try { localStorage.setItem('wl-saved', JSON.stringify(list)); } catch (e) { /* storage unavailable: keep for this visit only */ } };
    var paintSaved = function () {
      var saved = readSaved();
      each('[data-save]', function (b) {
        var on = saved.indexOf(b.getAttribute('data-save')) >= 0;
        b.setAttribute('aria-pressed', String(on));
        var label = b.querySelector('[data-save-label]');
        if (label) label.textContent = on ? 'Saved to My List' : 'Save to My List';
      });
      each('[data-save-count]', function (c) { c.textContent = saved.length ? String(saved.length) : ''; }, document);
      var listEl = rootEl.querySelector('[data-mylist]');
      if (listEl) {
        var places = saved.map(function (sl) { return byslug(data.places, sl); }).filter(Boolean);
        listEl.innerHTML = places.map(function (p) { return placeCard(ctx, data, p); }).join('');
        listEl.hidden = !places.length;
        rootEl.querySelector('[data-mylist-empty]').hidden = places.length > 0;
        rootEl.querySelector('[data-mylist-count]').textContent = places.length ? plural(places.length, 'place') + ' saved' : '';
        each('[data-save]', function (b) { b.setAttribute('aria-pressed', 'true'); }, listEl);
      }
    };
    if (!rootEl.__wlSave) {
      rootEl.__wlSave = true;
      rootEl.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('[data-save]') : null;
        if (!b) return;
        e.preventDefault();
        var slug = b.getAttribute('data-save'), saved = readSaved(), i = saved.indexOf(slug);
        if (i >= 0) saved.splice(i, 1); else saved.push(slug);
        writeSaved(saved);
        paintSaved();
      });
    }
    paintSaved();

    // Rails: sideways scrollers with buttons and arrow keys
    each('[data-rail]', function (rail) {
      var step = function (dir) {
        var card = rail.querySelector('.rail-card');
        rail.scrollBy({ left: dir * ((card ? card.offsetWidth : 320) + 16), behavior: 'smooth' });
      };
      var sec = rail.parentNode;
      var prev = sec.querySelector('[data-rail-prev]'), next = sec.querySelector('[data-rail-next]');
      if (prev) prev.addEventListener('click', function () { step(-1); });
      if (next) next.addEventListener('click', function () { step(1); });
      rail.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      });
    });

    // Place search and filters
    var filters = rootEl.querySelector('[data-filters]');
    if (filters) {
      var state = { category: '', area: '', occasions: '', price: '', perk: '', text: '' };
      var count = rootEl.querySelector('[data-count]'), empty = rootEl.querySelector('[data-empty]');
      var apply = function () {
        var shown = 0, words = state.text.toLowerCase().split(/\s+/).filter(Boolean);
        each('[data-card]', function (card) {
          var text = card.getAttribute('data-text') || '';
          var ok = (!state.category || card.getAttribute('data-category') === state.category) &&
            (!state.area || card.getAttribute('data-area') === state.area) &&
            (!state.price || card.getAttribute('data-price') === state.price) &&
            (!state.perk || card.getAttribute('data-perk') === state.perk) &&
            (!state.occasions || card.getAttribute('data-occasions').split('|').indexOf(state.occasions) >= 0) &&
            words.every(function (w) { return text.indexOf(w) >= 0; });
          card.hidden = !ok;
          if (ok) shown++;
        }, rootEl.querySelector('[data-cards]'));
        count.textContent = plural(shown, 'place');
        empty.hidden = shown > 0;
      };
      each('[data-filter]', function (btn) {
        btn.addEventListener('click', function () {
          var group = btn.getAttribute('data-filter');
          state[group] = btn.getAttribute('data-value');
          each('[data-filter="' + group + '"]', function (b) { b.setAttribute('aria-pressed', String(b === btn)); }, filters);
          apply();
        });
      }, filters);
      var search = filters.querySelector('[data-search]');
      if (search) search.addEventListener('input', function () { state.text = search.value; apply(); });
    }

    // Gallery
    var main = rootEl.querySelector('[data-gal-main]');
    if (main) {
      each('[data-gal]', function (btn) {
        btn.addEventListener('click', function () {
          main.src = btn.getAttribute('data-gal');
          each('[data-gal]', function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        });
      });
    }

    // Roulette
    var r = rootEl.querySelector('[data-roulette]');
    if (r) {
      var out = r.querySelector('[data-plan]'), note = r.querySelector('[data-plan-note]');
      var spin = function () {
        var areaBtn = r.querySelector('[data-r="area"][aria-pressed="true"]');
        var area = areaBtn ? areaBtn.getAttribute('data-value') : '';
        var occs = [];
        each('[data-r="occ"][aria-pressed="true"]', function (b) { occs.push(b.getAttribute('data-value')); }, r);
        var plan = planEvening(data, area, occs);
        out.innerHTML = plan.stops.map(function (s) {
          return placeCard(ctx, data, s.place).replace('<a class="tile"', '<p class="slot-label">' + s.label + '</p><a class="tile"');
        }).join('') +
          '<div class="cell card"><div class="tile cta-tile"><p class="kicker">Not quite right?</p>' +
          '<h3>Spin again for a new plan</h3>' +
          '<div><button type="button" class="btn btn-sm" data-again>Spin again</button></div></div></div>';
        note.textContent = (occs.length ? occs.join(' and ') : 'Any occasion') + (area ? ', starting in ' + area : ', anywhere in ' + data.site.city) +
          (plan.exact ? '' : '. Closest matches shown.');
        var again = out.querySelector('[data-again]');
        if (again) again.addEventListener('click', spin);
        paintSaved();
      };
      each('[data-r="area"]', function (btn) {
        btn.addEventListener('click', function () {
          each('[data-r="area"]', function (b) { b.setAttribute('aria-pressed', String(b === btn)); }, r);
        });
      }, r);
      each('[data-r="occ"]', function (btn) {
        btn.addEventListener('click', function () {
          var on = btn.getAttribute('aria-pressed') === 'true';
          if (!on && r.querySelectorAll('[data-r="occ"][aria-pressed="true"]').length >= 2) {
            r.querySelector('[data-r="occ"][aria-pressed="true"]').setAttribute('aria-pressed', 'false');
          }
          btn.setAttribute('aria-pressed', String(!on));
        });
      }, r);
      r.querySelector('[data-spin]').addEventListener('click', spin);
      spin();
    }

    // Waitlist: not connected to a mailing list yet
    each('[data-waitlist]', function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = form.querySelector('input'), msg = form.querySelector('.form-msg');
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.value.trim())) {
          msg.textContent = 'Please enter a valid email address.';
          input.focus();
          return;
        }
        msg.textContent = 'Thank you. This preview is not connected to the mailing list yet, so nothing has been sent.';
      });
    });
  }

  function start(data) {
    var ctx = makeCtx('app', ''), app = document.getElementById('app');
    function go() {
      var out = render(ctx, data, parse(location.hash));
      app.innerHTML = out.html;
      document.title = out.title;
      mount(app, data, ctx);
      window.scrollTo(0, 0);
    }
    window.addEventListener('hashchange', go);
    go();
  }

  return { makeCtx: makeCtx, render: render, parse: parse, mount: mount, start: start, planEvening: planEvening, slugify: slugify, liveAreas: liveAreas, liveOccasions: liveOccasions };
});
