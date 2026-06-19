/* Uzonova — shared site chrome (reusable header + footer), blog index
   (featured scroller + filterable grid), home "latest posts" teaser, scroll-reveal.
   Pages include <script src="js/site.js" defer></script> (posts use ../js/site.js)
   plus the relevant containers: #latest-posts (home), #featured-scroller/#posts-grid
   /#filters (blog index), #related-posts (post). */
(function () {
  var BRAND = 'Uzonova';
  var TAGLINE = 'Turn complex technology into clear business outcomes.';
  var SITE = 'https://uzonova.com/';
  var inPosts = location.pathname.indexOf('/posts/') !== -1;
  var base = inPosts ? '../' : '';
  var file = (location.pathname.split('/').pop() || 'index.html');
  var nav = [
    { label: 'Home', href: base + 'index.html', match: ['', 'index.html'] },
    { label: 'Blog', href: base + 'blog.html', match: ['blog.html'] },
    { label: 'About', href: base + 'about.html', match: ['about.html'] },
    { label: 'Services', href: base + 'services.html', match: ['services.html'] }
  ];
  var BADGE = { 'Platform': 'badge-platform', 'Getting Started': 'badge-getting-started', 'How-To': 'badge-how-to', 'Strategy': 'badge-strategy' };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function active(m) { return m.indexOf(file) !== -1; }

  function header() {
    var links = nav.map(function (n) { return '<a href="' + n.href + '"' + (active(n.match) ? ' class="active"' : '') + '>' + n.label + '</a>'; }).join('');
    return '<header class="site-header"><div class="inner">' +
      '<a class="logo" href="' + base + 'index.html"><span class="dot"></span>' + BRAND + '</a>' +
      '<button class="nav-toggle" aria-label="Menu">&#9776;</button>' +
      '<nav id="site-nav">' + links +
      '<a class="cta" href="' + SITE + '" target="_blank" rel="noopener">Visit ' + BRAND + '</a></nav>' +
      '</div></header>';
  }
  function footer() {
    var col = function (h, items) { return '<div><h4>' + h + '</h4><ul>' + items.join('') + '</ul></div>'; };
    var li = function (label, href, ext) { return '<li><a href="' + href + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + label + '</a></li>'; };
    return '<footer class="site-footer"><div class="inner">' +
      '<div><div class="logo"><span class="dot"></span>' + BRAND + '</div><p>' + TAGLINE + '</p></div>' +
      col('Explore', [li('Home', base + 'index.html'), li('Blog', base + 'blog.html'), li('About', base + 'about.html'), li('Services', base + 'services.html')]) +
      col('Company', [li('uzonova.com', SITE, true)]) +
      '<div class="copy">&copy; <span id="yr"></span> ' + BRAND + '. All rights reserved.</div>' +
      '</div></footer>';
  }
  function mount(id, html, where) { var el = document.getElementById(id); if (el) { el.outerHTML = html; return; } document.body.insertAdjacentHTML(where, html); }

  function cardHTML(p) {
    var href = (inPosts ? '' : 'posts/') + encodeURIComponent(p.slug) + '.html';
    return '<article class="card reveal">' +
      '<span class="badge ' + (BADGE[p.category] || '') + '">' + esc(p.category || 'Article') + '</span>' +
      '<h3><a href="' + href + '">' + esc(p.title) + '</a></h3>' +
      '<p class="excerpt">' + esc(p.excerpt || '') + '</p>' +
      '<div class="card-meta"><span>' + esc(p.publishedAt || '') + '</span><span>&middot;</span><span>' + esc(p.readTime || '') + '</span></div>' +
      '</article>';
  }
  function renderBlog(posts) {
    var grid = document.getElementById('posts-grid'), related = document.getElementById('related-posts'),
        scroller = document.getElementById('featured-scroller'), empty = document.getElementById('empty-state'),
        filters = document.getElementById('filters'), latest = document.getElementById('latest-posts'),
        latestEmpty = document.getElementById('latest-empty');
    var sorted = (posts || []).slice().sort(function (a, b) { return new Date(b.publishedAt) - new Date(a.publishedAt); });

    // Home page teaser — top 3, no filters.
    if (latest) {
      var top = sorted.slice(0, 3);
      if (top.length) latest.innerHTML = top.map(cardHTML).join('');
      else if (latestEmpty) latestEmpty.style.display = 'block';
    }
    // Blog index — featured scroller.
    if (scroller) {
      var feat = sorted.slice(0, 8);
      if (feat.length) scroller.innerHTML = feat.map(cardHTML).join('');
      else { var sw = scroller.closest('.blog-featured'); if (sw) sw.style.display = 'none'; }
    }
    // Blog index — filterable grid.
    if (grid) {
      if (!sorted.length) { if (empty) empty.style.display = 'block'; }
      else {
        var activeF = 'All';
        var cats = ['All'].concat(Array.from(new Set(sorted.map(function (p) { return p.category; }).filter(Boolean))).sort());
        function draw() { var list = activeF === 'All' ? sorted : sorted.filter(function (p) { return p.category === activeF; }); grid.innerHTML = list.map(cardHTML).join(''); observe(); }
        if (filters && cats.length > 1) {
          filters.innerHTML = cats.map(function (c) { return '<button class="filter-btn' + (c === activeF ? ' active' : '') + '" data-c="' + esc(c) + '">' + esc(c) + '</button>'; }).join('');
          filters.querySelectorAll('.filter-btn').forEach(function (b) { b.addEventListener('click', function () { activeF = b.dataset.c; filters.querySelectorAll('.filter-btn').forEach(function (x) { x.classList.toggle('active', x === b); }); draw(); }); });
        }
        draw();
      }
    }
    // Post page — related.
    if (related) {
      var rel = sorted.filter(function (p) { return p.slug !== file.replace('.html', ''); }).slice(0, 3);
      if (rel.length) related.innerHTML = rel.map(cardHTML).join('');
      else { var rp = related.closest('.related-posts'); if (rp) rp.style.display = 'none'; }
    }
  }
  var io;
  function observe() {
    if (!('IntersectionObserver' in window)) { document.querySelectorAll('.reveal').forEach(function (e) { e.classList.add('in'); }); return; }
    if (!io) io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: .12 });
    document.querySelectorAll('.reveal:not(.in)').forEach(function (e) { io.observe(e); });
  }
  function wire() {
    var t = document.querySelector('.nav-toggle'), n = document.getElementById('site-nav');
    if (t && n) t.addEventListener('click', function () { n.classList.toggle('open'); });
    document.querySelectorAll('[data-scroll]').forEach(function (btn) {
      btn.addEventListener('click', function () { var s = document.getElementById('featured-scroller'); if (!s) return; s.scrollBy({ left: (btn.dataset.scroll === 'next' ? 1 : -1) * Math.min(s.clientWidth * .9, 720), behavior: 'smooth' }); });
    });
    var y = document.getElementById('yr'); if (y) y.textContent = new Date().getFullYear();
  }
  function init() {
    mount('site-header', header(), 'afterbegin');
    mount('site-footer', footer(), 'beforeend');
    wire();
    if (document.getElementById('posts-grid') || document.getElementById('related-posts') || document.getElementById('featured-scroller') || document.getElementById('latest-posts')) {
      fetch(base + 'posts-data.json').then(function (r) { return r.json(); }).then(renderBlog).then(observe).catch(function () { renderBlog([]); observe(); });
    } else observe();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
