/* Pornirea aplicației: navigare pe secțiuni (#acasa, #servicii, …) și evenimente. */
window.MC = window.MC || {};

(function () {
  MC.ui = { servicesCat: 'toate' };
  var ROUTES = ['acasa', 'servicii', 'programare', 'contact', 'admin'];

  function route() {
    var h = (location.hash || '').replace('#', '');
    return ROUTES.indexOf(h) >= 0 ? h : (document.body.dataset.home || 'acasa');
  }

  MC.go = function (name) {
    if (location.hash === '#' + name) MC.render();
    else location.hash = name;
    window.scrollTo(0, 0);
  };

  MC.render = function () {
    var r = route();
    document.body.classList.remove('is-admin');
    var app = document.getElementById('app');
    app.innerHTML = MC.pages[r]();
    document.querySelectorAll('.nav a').forEach(function (a) {
      a.classList.toggle('on', a.getAttribute('href') === '#' + r);
    });
    var titles = { acasa: 'Medicenter Clinic', servicii: 'Servicii și prețuri', programare: 'Programare online', contact: 'Contact', admin: 'Agenda clinicii' };
    document.title = titles[r] + (r === 'acasa' ? ' · Suceava' : ' · Medicenter Clinic');
    document.getElementById('menu').classList.remove('open');
    reveal();
  };

  /* Secțiile urcă ușor în pagină când ajung pe ecran. Conținutul rămâne vizibil și fără animație. */
  var io = null;
  function reveal() {
    var els = document.querySelectorAll('.rv');
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
        });
      }, { threshold: 0.12 });
    }
    els.forEach(function (el, i) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight) return; // deja pe ecran: fără animație
      el.classList.add('pre');
      el.style.transitionDelay = (i % 4) * 0.08 + 's';
      io.observe(el);
    });
  }

  function init() {
    var app = document.getElementById('app');

    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-action]');
      if (el) {
        var a = el.dataset.action;
        var fn = (MC.siteActions && MC.siteActions[a]) || (MC.adminActions && MC.adminActions[a]);
        if (fn) { fn(el, e); return; }
        if (a === 'menu') { document.getElementById('menu').classList.toggle('open'); return; }
      }
      var c = e.target.closest('.ag-cell');
      if (c && !e.target.closest('.bchip')) MC.adminCellClick(c);
    });

    /* Enter / Space pe elementele cu role="button" (pacienții din agendă). */
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"][data-action]')) {
        e.preventDefault();
        e.target.click();
      }
    });

    app.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!MC.siteSubmit(e.target)) MC.adminSubmit(e.target);
    });
    app.addEventListener('change', function (e) {
      if (e.target.dataset && e.target.dataset.change) MC.adminChange(e.target);
    });

    MC.initAdminDnD(app);

    var wasNarrow = window.innerWidth < 760;
    window.addEventListener('resize', function () {
      var n = window.innerWidth < 760;
      if (n !== wasNarrow && route() === 'admin') { wasNarrow = n; MC.render(); }
      wasNarrow = n;
    });

    window.addEventListener('hashchange', function () { MC.render(); window.scrollTo(0, 0); });
    MC.render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
