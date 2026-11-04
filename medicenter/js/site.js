/* Paginile publice: Acasă, Servicii și prețuri, Programare online, Contact. */
window.MC = window.MC || {};

(function () {
  var C = MC.CLINIC;

  /* ---------- disponibilitate ---------- */

  /* Orele în care poate începe serviciul în ziua `date`, cu locurile libere. */
  MC.slotsFor = function (svc, date) {
    var s = MC.store.settings();
    var hours = MC.slotHours(svc);
    var now = new Date();
    var isToday = date === MC.ymd(MC.today());
    var out = [];
    for (var h = s.open; h + hours <= s.close; h++) {
      if (isToday && h <= now.getHours()) continue;
      var r = MC.store.check(svc.cat, date, h, hours);
      out.push({ hour: h, free: r.ok ? r.free : 0 });
    }
    return out;
  };

  function dateBookable(svc, d) {
    var s = MC.store.settings();
    var t = MC.today();
    if (d < t || d > MC.addDays(t, s.maxDaysAhead)) return 'off';
    if (s.days.indexOf(d.getDay()) < 0) return 'off';
    var slots = MC.slotsFor(svc, MC.ymd(d));
    return slots.some(function (x) { return x.free > 0; }) ? 'free' : 'full';
  }

  /* Primele ore libere, pentru widgetul de pe prima pagină. */
  function nextFree(limit) {
    var s = MC.store.settings();
    var res = [];
    var probe = { k: 'k01', m: 'm05', f: 'f01', n: 'n03' };
    for (var i = 0; i < 14 && res.length < limit; i++) {
      var d = MC.addDays(MC.today(), i);
      if (s.days.indexOf(d.getDay()) < 0) continue;
      MC.CATS.forEach(function (c) {
        if (res.length >= limit || res.some(function (x) { return x.cat === c.id; })) return;
        var svc = MC.serviceById(probe[c.id.charAt(0)]);
        var slot = MC.slotsFor(svc, MC.ymd(d)).find(function (x) { return x.free > 0; });
        if (slot) res.push({ cat: c.id, svc: svc, date: MC.ymd(d), hour: slot.hour, free: slot.free });
      });
    }
    return res;
  }

  function fromPrice(cat) {
    var min = Infinity;
    MC.SERVICES.forEach(function (s) {
      if (s.cat !== cat || s.pkg) return;
      var m = s.price.match(/\d+/);
      if (m) min = Math.min(min, +m[0]);
    });
    return min;
  }

  /* ---------- Acasă ---------- */

  function home() {
    var free = nextFree(4);
    return '' +
      '<section class="hero wrap">' +
        '<div class="hero-text">' +
          '<p class="eyebrow">Recuperare medicală · Suceava</p>' +
          '<h1>Recuperare, terapie și neurologie, în centrul Sucevei.</h1>' +
          '<p class="lead">Kinetoterapie, masaj terapeutic, fizioterapie, neurofeedback și consultații de neurologie și psihiatrie. ' +
          'Alegi serviciul, ziua și ora, iar programarea e gata în mai puțin de un minut.</p>' +
          '<div class="hero-cta">' +
            '<a class="btn primary" href="#programare">Programează-te online</a>' +
            '<a class="btn ghost" href="#servicii">Vezi serviciile și prețurile</a>' +
          '</div>' +
          '<dl class="facts">' +
            '<div><dt>Adresă</dt><dd>' + C.address + '</dd></div>' +
            '<div><dt>Program</dt><dd>' + C.hours + '</dd></div>' +
            '<div><dt>Telefon</dt><dd><a href="' + C.phoneHref + '">' + C.phone + '</a></dd></div>' +
          '</dl>' +
        '</div>' +
        '<aside class="nextfree" aria-label="Primele ore libere">' +
          '<h2>Primele ore libere</h2>' +
          '<ul>' + free.map(function (x) {
            var c = MC.catById(x.cat);
            return '<li><button class="nf" data-action="quick-book" data-svc="' + x.svc.id + '" data-date="' + x.date + '" data-hour="' + x.hour + '">' +
              '<span class="dot" style="background:' + c.color + '"></span>' +
              '<span class="nf-main"><b>' + c.short + '</b><small>' + MC.cap(MC.fmtDate(x.date)) + '</small></span>' +
              '<span class="nf-time">' + MC.hourLabel(x.hour) + '</span></button></li>';
          }).join('') + '</ul>' +
          '<p class="small muted">Apasă pe o oră ca să te programezi direct.</p>' +
        '</aside>' +
      '</section>' +

      '<section class="band"><div class="wrap">' +
        '<h2 class="section-title">Ce tratăm</h2>' +
        '<div class="cats">' + MC.CATS.map(function (c) {
          var n = MC.SERVICES.filter(function (s) { return s.cat === c.id; }).length;
          return '<a class="cat" href="#servicii" data-action="goto-cat" data-cat="' + c.id + '" style="--cat:' + c.color + '">' +
            '<h3>' + c.name + '</h3><p>' + c.blurb + '</p>' +
            '<span class="cat-meta">' + n + ' servicii · de la ' + fromPrice(c.id) + ' lei</span></a>';
        }).join('') + '</div>' +
      '</div></section>' +

      '<section class="wrap how">' +
        '<h2 class="section-title">Cum te programezi</h2>' +
        '<ol class="steps-list">' +
          '<li><b>Alegi serviciul</b><span>Din lista de terapii și consultații, cu durata și prețul afișate.</span></li>' +
          '<li><b>Alegi ziua și ora</b><span>Vezi doar orele cu locuri libere, actualizate în timp real.</span></li>' +
          '<li><b>Lași numele și telefonul</b><span>Programarea apare imediat în agenda clinicii.</span></li>' +
        '</ol>' +
        '<a class="btn primary" href="#programare">Începe programarea</a>' +
      '</section>';
  }

  /* ---------- Servicii și prețuri ---------- */

  function services() {
    var active = MC.ui.servicesCat || 'toate';
    var tabs = [{ id: 'toate', short: 'Toate' }].concat(MC.CATS);
    var cats = active === 'toate' ? MC.CATS : [MC.catById(active)];
    return '<section class="wrap page">' +
      '<p class="eyebrow">Listă de prețuri</p>' +
      '<h1>Servicii și prețuri</h1>' +
      '<p class="lead">Pachetele se plătesc integral, iar fiecare ședință din pachet se programează separat.</p>' +
      '<div class="chips" role="tablist">' + tabs.map(function (t) {
        return '<button class="chip' + (t.id === active ? ' on' : '') + '" data-action="svc-tab" data-cat="' + t.id + '">' + t.short + '</button>';
      }).join('') + '</div>' +
      cats.map(function (c) {
        var list = MC.SERVICES.filter(function (s) { return s.cat === c.id; });
        var single = list.filter(function (s) { return !s.pkg; });
        var pk = list.filter(function (s) { return s.pkg; });
        return '<div class="pricelist" style="--cat:' + c.color + '"><h2>' + c.name + '</h2>' +
          rows(single) + (pk.length ? '<h3 class="pk-title">Pachete</h3>' + rows(pk) : '') + '</div>';
      }).join('') +
      '</section>';
  }
  function rows(list) {
    return '<ul class="prices">' + list.map(function (s) {
      return '<li><div class="p-name">' + MC.esc(s.name) + (s.durLabel ? '<small>' + s.durLabel + '</small>' : '') + '</div>' +
        '<div class="p-price">' + s.price + '</div>' +
        '<button class="btn small" data-action="book-svc" data-svc="' + s.id + '">Programează</button></li>';
    }).join('') + '</ul>';
  }

  /* ---------- Contact ---------- */

  function contact() {
    return '<section class="wrap page contact">' +
      '<p class="eyebrow">Contact</p><h1>Ne găsești în centrul Sucevei</h1>' +
      '<div class="contact-grid">' +
        '<div class="card"><h3>Adresă</h3><p>' + C.address + '<br><span class="muted">' + MC.cap(C.area) + '</span></p>' +
          '<a class="btn ghost small" href="' + C.mapsUrl + '" target="_blank" rel="noopener">Deschide în Google Maps</a></div>' +
        '<div class="card"><h3>Telefon</h3><p class="big"><a href="' + C.phoneHref + '">' + C.phone + '</a></p>' +
          '<p class="muted small">Pentru întrebări sau dacă preferi să te programezi telefonic.</p></div>' +
        '<div class="card"><h3>Program</h3><p class="big">' + C.hours + '</p></div>' +
      '</div>' +
      '<a class="btn primary" href="#programare">Programează-te online</a>' +
      '</section>';
  }

  /* ---------- Programare online ---------- */

  MC.bk = { step: 1, cat: 'kineto', serviceId: null, date: null, hour: null, month: null, name: '', phone: '', note: '', gdpr: false, done: null };

  function booking() {
    var b = MC.bk;
    if (b.done) return bookingDone();
    var svc = b.serviceId && MC.serviceById(b.serviceId);
    var labels = ['Serviciul', 'Data și ora', 'Datele tale'];
    var steps = '<ol class="stepper">' + labels.map(function (l, i) {
      var n = i + 1;
      var cls = n < b.step ? 'done' : n === b.step ? 'on' : '';
      var can = n < b.step;
      return '<li class="' + cls + '">' + (can ? '<button data-action="bk-step" data-step="' + n + '">' : '<span>') +
        '<i>' + (n < b.step ? '✓' : n) + '</i>' + l + (can ? '</button>' : '</span>') + '</li>';
    }).join('') + '</ol>';

    var body = b.step === 1 ? stepService() : b.step === 2 ? stepDate(svc) : stepDetails(svc);
    return '<section class="wrap page booking">' +
      '<p class="eyebrow">Programare online</p><h1>Programează-te</h1>' + steps +
      '<div class="bk-grid"><div class="bk-main">' + body + '</div>' + summary(svc) + '</div></section>';
  }

  function stepService() {
    var b = MC.bk;
    var list = MC.SERVICES.filter(function (s) { return s.cat === b.cat; });
    return '<div class="card"><h2 class="card-title">Ce serviciu dorești?</h2>' +
      '<div class="chips">' + MC.CATS.map(function (c) {
        return '<button class="chip' + (c.id === b.cat ? ' on' : '') + '" data-action="bk-cat" data-cat="' + c.id + '">' + c.short + '</button>';
      }).join('') + '</div>' +
      '<ul class="svc-pick">' + list.map(function (s) {
        return '<li><button class="svc' + (s.id === b.serviceId ? ' on' : '') + '" data-action="bk-svc" data-svc="' + s.id + '">' +
          '<span class="svc-name">' + MC.esc(s.name) + (s.durLabel ? '<small>' + s.durLabel + '</small>' : '') + '</span>' +
          '<span class="svc-price">' + s.price + '</span></button></li>';
      }).join('') + '</ul></div>';
  }

  function stepDate(svc) {
    var b = MC.bk;
    var t = MC.today();
    if (!b.month) b.month = new Date(t.getFullYear(), t.getMonth(), 1);
    var m = b.month;
    var first = new Date(m.getFullYear(), m.getMonth(), 1);
    var startOffset = (first.getDay() + 6) % 7;
    var daysIn = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    var canPrev = m > new Date(t.getFullYear(), t.getMonth(), 1);
    var maxD = MC.addDays(t, MC.store.settings().maxDaysAhead);
    var canNext = new Date(m.getFullYear(), m.getMonth() + 1, 1) <= maxD;

    var cells = '';
    ['L', 'Ma', 'Mi', 'J', 'V', 'S', 'D'].forEach(function (x) { cells += '<span class="dn">' + x + '</span>'; });
    for (var i = 0; i < startOffset; i++) cells += '<span></span>';
    for (var d = 1; d <= daysIn; d++) {
      var date = new Date(m.getFullYear(), m.getMonth(), d);
      var st = dateBookable(svc, date);
      var ymd = MC.ymd(date);
      var sel = ymd === b.date ? ' sel' : '';
      if (st === 'free') cells += '<button class="d free' + sel + '" data-action="bk-date" data-date="' + ymd + '" aria-label="' + MC.fmtDate(date) + '">' + d + '</button>';
      else cells += '<span class="d ' + st + '" aria-label="' + (st === 'full' ? 'complet' : 'indisponibil') + '">' + d + '</span>';
    }

    var slotsHtml = '<p class="muted">Alege o zi din calendar ca să vezi orele libere.</p>';
    if (b.date) {
      var slots = MC.slotsFor(svc, b.date);
      slotsHtml = slots.length ? '<div class="slots">' + slots.map(function (x) {
        if (x.free <= 0) return '<span class="slot full">' + MC.hourLabel(x.hour) + '<small>Complet</small></span>';
        var few = x.free === 1 ? ' few' : '';
        return '<button class="slot' + few + (x.hour === b.hour ? ' sel' : '') + '" data-action="bk-hour" data-hour="' + x.hour + '">' +
          MC.hourLabel(x.hour) + '<small>' + (x.free === 1 ? '1 loc liber' : x.free + ' locuri libere') + '</small></button>';
      }).join('') + '</div>' : '<p class="muted">Nu mai sunt ore disponibile în această zi.</p>';
    }

    return '<div class="date-grid">' +
      '<div class="card"><div class="cal-head"><h2 class="card-title">' + MC.cap(MC.MONTHS[m.getMonth()]) + ' ' + m.getFullYear() + '</h2>' +
        '<div class="cal-nav"><button class="icon-btn" data-action="bk-month" data-dir="-1"' + (canPrev ? '' : ' disabled') + ' aria-label="Luna anterioară">‹</button>' +
        '<button class="icon-btn" data-action="bk-month" data-dir="1"' + (canNext ? '' : ' disabled') + ' aria-label="Luna următoare">›</button></div></div>' +
        '<div class="cal">' + cells + '</div>' +
        '<div class="legend"><span><i class="lg free"></i>Ore libere</span><span><i class="lg sel"></i>Ziua aleasă</span><span><i class="lg full"></i>Complet / închis</span></div>' +
      '</div>' +
      '<div class="card"><h2 class="card-title">' + (b.date ? MC.cap(MC.fmtDate(b.date)) : 'Ora') + '</h2>' + slotsHtml + '</div>' +
      '</div>' +
      '<div class="bk-actions"><button class="btn ghost" data-action="bk-step" data-step="1">Înapoi</button>' +
      '<button class="btn primary" data-action="bk-next"' + (b.date && b.hour != null ? '' : ' disabled') + '>Continuă</button></div>';
  }

  function stepDetails() {
    var b = MC.bk;
    return '<form class="card form" id="bk-form" novalidate>' +
      '<h2 class="card-title">Datele tale</h2>' +
      '<label for="bk-name">Nume și prenume</label>' +
      '<input id="bk-name" name="name" autocomplete="name" required value="' + MC.esc(b.name) + '">' +
      '<label for="bk-phone">Telefon</label>' +
      '<input id="bk-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="07xx xxx xxx" required value="' + MC.esc(b.phone) + '">' +
      '<label for="bk-note">Observații <span class="muted">(opțional)</span></label>' +
      '<textarea id="bk-note" name="note" rows="3" placeholder="Ex.: prima ședință, recomandare medicală">' + MC.esc(b.note) + '</textarea>' +
      '<label class="check" for="bk-gdpr"><input type="checkbox" id="bk-gdpr" name="gdpr"' + (b.gdpr ? ' checked' : '') + '>' +
      '<span>Sunt de acord ca Medicenter Clinic să folosească aceste date pentru gestionarea programării.</span></label>' +
      '<p class="form-error" id="bk-error" role="alert" hidden></p>' +
      '<div class="bk-actions"><button type="button" class="btn ghost" data-action="bk-step" data-step="2">Înapoi</button>' +
      '<button type="submit" class="btn primary">Confirmă programarea</button></div>' +
      '</form>';
  }

  function summary(svc) {
    var b = MC.bk;
    function row(k, v) { return '<div class="sum-row"><span>' + k + '</span><b>' + (v || '—') + '</b></div>'; }
    var end = '';
    if (svc && b.hour != null) {
      var mins = b.hour * 60 + (svc.dur || 60);
      end = MC.hourLabel(b.hour) + ' – ' + MC.pad(Math.floor(mins / 60)) + ':' + MC.pad(mins % 60);
    }
    return '<aside class="card summary"><h2 class="card-title">Rezumat</h2>' +
      row('Serviciu', svc && MC.esc(svc.name)) +
      row('Preț', svc && svc.price) +
      row('Data', b.date && MC.cap(MC.fmtDate(b.date, true))) +
      row('Ora', end) +
      (b.step === 1 ? '<button class="btn primary block" data-action="bk-next"' + (svc ? '' : ' disabled') + '>Continuă</button>' : '') +
      '</aside>';
  }

  function bookingDone() {
    var d = MC.bk.done;
    var svc = MC.serviceById(d.serviceId);
    return '<section class="wrap page booking done">' +
      '<div class="card done-card">' +
        '<p class="eyebrow">Programare înregistrată</p>' +
        '<h1>Te așteptăm ' + MC.fmtDate(d.date) + ', la ' + MC.hourLabel(d.hour) + '.</h1>' +
        '<div class="sum-row"><span>Serviciu</span><b>' + MC.esc(svc.name) + '</b></div>' +
        '<div class="sum-row"><span>Preț</span><b>' + svc.price + '</b></div>' +
        '<div class="sum-row"><span>Nume</span><b>' + MC.esc(d.name) + '</b></div>' +
        '<div class="sum-row"><span>Telefon</span><b>' + MC.esc(d.phone) + '</b></div>' +
        '<p class="muted">Adresa: ' + C.address + '. Dacă nu mai poți ajunge, sună-ne la ' +
          '<a href="' + C.phoneHref + '">' + C.phone + '</a>.</p>' +
        '<div class="bk-actions"><a class="btn ghost" href="#acasa">Înapoi la prima pagină</a>' +
        '<button class="btn primary" data-action="bk-new">Fă altă programare</button></div>' +
      '</div></section>';
  }

  function submitBooking(form) {
    var b = MC.bk;
    b.name = form.name.value; b.phone = form.phone.value; b.note = form.note.value; b.gdpr = form.gdpr.checked;
    var err = '';
    if (b.name.trim().length < 3) err = 'Scrie numele și prenumele.';
    else if (!MC.validPhone(b.phone)) err = 'Numărul de telefon nu pare corect. Folosește formatul 07xx xxx xxx.';
    else if (!b.gdpr) err = 'Bifează acordul pentru folosirea datelor ca să putem înregistra programarea.';
    var svc = MC.serviceById(b.serviceId);
    if (!err) {
      var chk = MC.store.check(svc.cat, b.date, b.hour, MC.slotHours(svc));
      if (!chk.ok) {
        err = 'Între timp ora aleasă s-a ocupat. Alege altă oră.';
        b.hour = null; b.step = 2;
        MC.toast(err, 'bad');
        MC.render();
        return;
      }
    }
    var box = document.getElementById('bk-error');
    if (err) { box.textContent = err; box.hidden = false; return; }
    b.done = MC.store.add({ serviceId: b.serviceId, date: b.date, hour: b.hour, name: b.name, phone: b.phone, note: b.note, source: 'online' });
    MC.render();
    window.scrollTo(0, 0);
  }

  function resetBooking() {
    MC.bk = { step: 1, cat: 'kineto', serviceId: null, date: null, hour: null, month: null, name: '', phone: '', note: '', gdpr: false, done: null };
  }

  /* ---------- evenimente ---------- */

  MC.siteActions = {
    'quick-book': function (el) {
      resetBooking();
      var svc = MC.serviceById(el.dataset.svc);
      var d = MC.parseYmd(el.dataset.date);
      Object.assign(MC.bk, { cat: svc.cat, serviceId: svc.id, date: el.dataset.date, hour: +el.dataset.hour, step: 2,
        month: new Date(d.getFullYear(), d.getMonth(), 1) });
      MC.go('programare');
    },
    'goto-cat': function (el, ev) { ev.preventDefault(); MC.ui.servicesCat = el.dataset.cat; MC.go('servicii'); },
    'svc-tab': function (el) { MC.ui.servicesCat = el.dataset.cat; MC.render(); },
    'book-svc': function (el) {
      resetBooking();
      var svc = MC.serviceById(el.dataset.svc);
      Object.assign(MC.bk, { cat: svc.cat, serviceId: svc.id, step: 2 });
      MC.go('programare');
    },
    'bk-cat': function (el) { MC.bk.cat = el.dataset.cat; MC.render(); },
    'bk-svc': function (el) {
      if (MC.bk.serviceId !== el.dataset.svc) { MC.bk.date = null; MC.bk.hour = null; }
      MC.bk.serviceId = el.dataset.svc; MC.render();
    },
    'bk-next': function () {
      if (MC.bk.step === 1 && !MC.bk.serviceId) return;
      MC.bk.step++; MC.render(); window.scrollTo(0, 0);
    },
    'bk-step': function (el) { MC.bk.step = +el.dataset.step; MC.render(); },
    'bk-month': function (el) {
      var m = MC.bk.month;
      MC.bk.month = new Date(m.getFullYear(), m.getMonth() + (+el.dataset.dir), 1);
      MC.render();
    },
    'bk-date': function (el) { MC.bk.date = el.dataset.date; MC.bk.hour = null; MC.render(); },
    'bk-hour': function (el) { MC.bk.hour = +el.dataset.hour; MC.render(); },
    'bk-new': function () { resetBooking(); MC.render(); window.scrollTo(0, 0); }
  };
  MC.siteSubmit = function (form) {
    if (form.id === 'bk-form') { submitBooking(form); return true; }
    return false;
  };

  MC.pages = { acasa: home, servicii: services, programare: booking, contact: contact };
})();
