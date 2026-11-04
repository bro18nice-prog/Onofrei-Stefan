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

  /* ---------- elemente comune ---------- */

  /* Liniile decorative inspirate din logo. */
  MC.swirl = function (cls) {
    return '<svg class="swirl ' + (cls || '') + '" viewBox="0 0 600 400" fill="none" aria-hidden="true">' +
      '<ellipse cx="300" cy="200" rx="250" ry="120" transform="rotate(-18 300 200)"/>' +
      '<ellipse cx="290" cy="210" rx="200" ry="150" transform="rotate(24 290 210)"/>' +
      '<path d="M40 300c120-80 260 40 380-30s120-90 150-60"/>' +
      '<path d="M90 120c80 40 120 160 230 150s170-120 230-90"/></svg>';
  };
  function icon(name) { return '<span class="ico">' + MC.ICONS[name] + '</span>'; }
  function pageHero(eyebrow, title, lead) {
    return '<section class="page-hero"><div class="wrap">' + MC.swirl() +
      '<p class="eyebrow">' + eyebrow + '</p><h1>' + title + '</h1>' + (lead ? '<p class="lead">' + lead + '</p>' : '') +
      '</div></section>';
  }

  /* ---------- Acasă ---------- */

  function home() {
    var free = nextFree(4);
    var examples = { kineto: ['k01', 'k04', 'k05'], masaj: ['m06', 'm01', 'm11'], fizio: ['f05', 'f06', 'f02'], neuro: ['n06', 'n12', 'n05'] };
    var methods = ['RPG', 'Schroth', 'Tecar', 'Deep Oscillation', 'Neurofeedback', 'Brainmap', 'EEG', 'Kinesio taping',
      'Drenaj limfatic', 'Reflexoterapie', 'Laserterapie', 'Magnetoterapie', 'Ultrasunete', 'Recuperare ATM'];
    return '' +
      '<section class="hero">' + MC.swirl('hero-swirl') +
        '<div class="wrap hero-in">' +
          '<div class="hero-text anim">' +
            '<p class="eyebrow light">Recuperare medicală · Suceava</p>' +
            '<h1>Recuperare, terapie și neurologie, <em>în centrul Sucevei.</em></h1>' +
            '<p class="lead">Kinetoterapie, masaj terapeutic, fizioterapie, neurofeedback și consultații de neurologie și psihiatrie, într-un singur loc.</p>' +
            '<div class="hero-cta">' +
              '<a class="btn sand big" href="#programare">Programează-te online ' + MC.ICONS.arrow + '</a>' +
              '<a class="btn outline-light big" href="' + C.phoneHref + '">' + MC.ICONS.phone + C.phone + '</a>' +
            '</div>' +
            '<ul class="facts">' +
              '<li>' + icon('pin') + '<span><small>Adresă</small>' + C.address + '</span></li>' +
              '<li>' + icon('clock') + '<span><small>Program</small>' + C.hours + '</span></li>' +
            '</ul>' +
          '</div>' +
          '<div class="hero-visual anim d2">' +
            '<div class="photo hero-photo">' + MC.swirl() + '<span class="photo-icons">' +
              MC.CATS.map(function (c) { return '<i style="--cat:' + c.color + '">' + MC.ICONS[c.icon] + '</i>'; }).join('') + '</span></div>' +
            '<span class="float-badge">' + MC.ICONS.check + 'Programări online non-stop</span>' +
            '<aside class="nextfree" aria-label="Primele ore libere">' +
              '<h2>Primele ore libere</h2>' +
              '<ul>' + free.map(function (x) {
                var c = MC.catById(x.cat);
                return '<li><button class="nf" style="--cat:' + c.color + '" data-action="quick-book" data-svc="' + x.svc.id + '" data-date="' + x.date + '" data-hour="' + x.hour + '">' +
                  '<span class="nf-ico">' + MC.ICONS[c.icon] + '</span>' +
                  '<span class="nf-main"><b>' + c.short + '</b><small>' + MC.cap(MC.fmtDate(x.date)) + '</small></span>' +
                  '<span class="nf-time">' + MC.hourLabel(x.hour) + '</span></button></li>';
              }).join('') + '</ul>' +
            '</aside>' +
          '</div>' +
        '</div>' +
      '</section>' +

      '<section class="stats"><div class="wrap stats-in">' +
        '<div><b>' + MC.SERVICES.length + '</b><span>servicii și pachete</span></div>' +
        '<div><b>' + MC.CATS.length + '</b><span>secții medicale</span></div>' +
        '<div><b>09–20</b><span>program zilnic</span></div>' +
        '<div><b>1 min</b><span>durează programarea</span></div>' +
      '</div></section>' +

      '<section class="sec"><div class="wrap">' +
        '<div class="sec-head rv"><p class="eyebrow">Servicii</p><h2>Cu ce te putem ajuta</h2>' +
          '<p class="muted">Patru secții, de la recuperare după accidentări până la evaluări neurologice.</p></div>' +
        '<div class="cats">' + MC.CATS.map(function (c) {
          return '<article class="cat rv" style="--cat:' + c.color + '">' +
            '<div class="photo cat-photo">' + MC.swirl() + '<span class="cat-ico">' + MC.ICONS[c.icon] + '</span></div>' +
            '<div class="cat-body"><h3>' + c.name + '</h3><p>' + c.blurb + '</p>' +
            '<ul class="cat-list">' + examples[c.id].map(function (id) {
              var sv = MC.serviceById(id);
              return '<li><span>' + MC.esc(sv.name.replace(/\s*\(.*\)/, '')) + (sv.durLabel ? ' · ' + sv.durLabel : '') + '</span><b>' + sv.price.replace(/ \/ .*/, '') + '</b></li>';
            }).join('') + '</ul>' +
            '<a class="cat-link" href="#servicii" data-action="goto-cat" data-cat="' + c.id + '">Toate cele ' +
              MC.SERVICES.filter(function (s) { return s.cat === c.id; }).length + ' servicii ' + MC.ICONS.arrow + '</a></div>' +
          '</article>';
        }).join('') + '</div>' +
      '</div></section>' +

      '<section class="sec methods-sec"><div class="wrap methods rv">' +
        '<div><p class="eyebrow">Metode și aparatură</p><h2>Ce folosim în terapie</h2></div>' +
        '<ul class="method-chips">' + methods.map(function (m, i) {
          return '<li style="--cat:' + MC.CATS[i % 4].color + '">' + m + '</li>';
        }).join('') + '</ul>' +
      '</div></section>' +

      '<section class="sec"><div class="wrap">' +
        '<div class="sec-head rv"><p class="eyebrow">Programare online</p><h2>Simplu, în 3 pași</h2></div>' +
        '<ol class="steps-list">' +
          '<li class="rv"><b>Alegi serviciul</b><span>Din lista de terapii și consultații, cu durata și prețul afișate.</span></li>' +
          '<li class="rv"><b>Alegi ziua și ora</b><span>Vezi doar orele cu locuri libere, actualizate în timp real.</span></li>' +
          '<li class="rv"><b>Lași numele și telefonul</b><span>Programarea apare imediat în agenda clinicii.</span></li>' +
        '</ol>' +
      '</div></section>' +

      ctaBand();
  }

  function ctaBand() {
    return '<section class="cta-band">' + MC.swirl() + '<div class="wrap cta-in rv">' +
      '<div><h2>Programează-te acum</h2><p>Alegi ora care ți se potrivește, fără apeluri și fără așteptare.</p></div>' +
      '<div class="hero-cta"><a class="btn sand big" href="#programare">Programează-te online ' + MC.ICONS.arrow + '</a>' +
      '<a class="btn outline-light big" href="' + C.phoneHref + '">' + MC.ICONS.phone + C.phone + '</a></div>' +
      '</div></section>';
  }

  /* ---------- Servicii și prețuri ---------- */

  function services() {
    var active = MC.ui.servicesCat || 'toate';
    var tabs = [{ id: 'toate', short: 'Toate', color: '#50677a' }].concat(MC.CATS);
    var cats = active === 'toate' ? MC.CATS : [MC.catById(active)];
    return pageHero('Listă de prețuri', 'Servicii și prețuri', 'Pachetele se plătesc integral, iar fiecare ședință din pachet se programează separat.') +
      '<section class="wrap page">' +
      '<div class="chips" role="tablist">' + tabs.map(function (t) {
        return '<button class="chip' + (t.id === active ? ' on' : '') + '" style="--cat:' + t.color + '" data-action="svc-tab" data-cat="' + t.id + '">' +
          (t.icon ? '<span class="chip-ico">' + MC.ICONS[t.icon] + '</span>' : '') + t.short + '</button>';
      }).join('') + '</div>' +
      cats.map(function (c) {
        var list = MC.SERVICES.filter(function (s) { return s.cat === c.id; });
        var single = list.filter(function (s) { return !s.pkg; });
        var pk = list.filter(function (s) { return s.pkg; });
        return '<div class="pricelist rv" style="--cat:' + c.color + '"><div class="pl-head"><span class="pl-ico">' + MC.ICONS[c.icon] + '</span><h2>' + c.name + '</h2></div>' +
          rows(single) + (pk.length ? '<h3 class="pk-title">Pachete</h3>' + rows(pk) : '') + '</div>';
      }).join('') +
      '</section>' + ctaBand();
  }
  function rows(list) {
    return '<ul class="prices">' + list.map(function (s) {
      return '<li><div class="p-name">' + MC.esc(s.name) + (s.durLabel ? '<small>' + s.durLabel + '</small>' : '') + '</div>' +
        '<div class="p-price">' + s.price + '</div>' +
        '<button class="btn small soft" data-action="book-svc" data-svc="' + s.id + '">Programează</button></li>';
    }).join('') + '</ul>';
  }

  /* ---------- Contact ---------- */

  function contact() {
    return pageHero('Contact', 'Ne găsești în centrul Sucevei', '') +
      '<section class="wrap page"><div class="contact-grid">' +
        '<div class="info-card rv">' + MC.swirl() +
          '<div class="info-row">' + icon('pin') + '<div><small>Adresă</small><p>' + C.address + '<br>' + MC.cap(C.area) + '</p></div></div>' +
          '<div class="info-row">' + icon('phone') + '<div><small>Telefon</small><p class="big"><a href="' + C.phoneHref + '">' + C.phone + '</a></p></div></div>' +
          '<div class="info-row">' + icon('clock') + '<div><small>Program</small><p class="big">' + C.hours + '</p></div></div>' +
          '<a class="btn sand big" href="#programare">Programează-te online ' + MC.ICONS.arrow + '</a>' +
        '</div>' +
        '<a class="map-card rv" href="' + C.mapsUrl + '" target="_blank" rel="noopener">' +
          '<svg class="map-art" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
            '<rect width="400" height="300" class="m-bg"/>' +
            '<path class="m-park" d="M250 30h110v80H250z"/>' +
            '<path class="m-road big" d="M-10 190L410 130"/><path class="m-road" d="M120 -10L170 310"/>' +
            '<path class="m-road" d="M290 -10L250 310"/><path class="m-road thin" d="M-10 80L410 60"/><path class="m-road thin" d="M-10 260L410 240"/>' +
          '</svg>' +
          '<span class="map-pin">' + MC.ICONS.pin + '</span>' +
          '<span class="map-label"><b>Str. Vasile Alecsandri nr. 10</b><span>Deschide în Google Maps ' + MC.ICONS.arrow + '</span></span>' +
        '</a>' +
      '</div></section>';
  }

  /* ---------- Programare online ---------- */

  MC.bk = { step: 1, cat: 'kineto', serviceId: null, date: null, hour: null, month: null, name: '', phone: '', note: '', gdpr: false, done: null, sending: false };

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
    return pageHero('Programare online', 'Programează-te', 'Alege serviciul, ziua și ora. Durează mai puțin de un minut.') +
      '<section class="wrap page booking">' + steps +
      '<div class="bk-grid"><div class="bk-main">' + body + '</div>' + summary(svc) + '</div></section>';
  }

  function stepService() {
    var b = MC.bk;
    var list = MC.SERVICES.filter(function (s) { return s.cat === b.cat; });
    return '<div class="card"><h2 class="card-title">Ce serviciu dorești?</h2>' +
      '<div class="chips">' + MC.CATS.map(function (c) {
        return '<button class="chip' + (c.id === b.cat ? ' on' : '') + '" style="--cat:' + c.color + '" data-action="bk-cat" data-cat="' + c.id + '">' +
          '<span class="chip-ico">' + MC.ICONS[c.icon] + '</span>' + c.short + '</button>';
      }).join('') + '</div>' +
      '<ul class="svc-pick">' + list.map(function (s) {
        return '<li><button class="svc' + (s.id === b.serviceId ? ' on' : '') + '" style="--cat:' + MC.catById(s.cat).color + '" data-action="bk-svc" data-svc="' + s.id + '">' +
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
      '<input id="bk-name" name="name" autocomplete="name" maxlength="120" required value="' + MC.esc(b.name) + '">' +
      '<label for="bk-phone">Telefon</label>' +
      '<input id="bk-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="07xx xxx xxx" required value="' + MC.esc(b.phone) + '">' +
      '<label for="bk-note">Observații <span class="muted">(opțional)</span></label>' +
      '<textarea id="bk-note" name="note" rows="3" maxlength="500" placeholder="Ex.: prima ședință. Te rugăm să nu scrii detalii medicale.">' + MC.esc(b.note) + '</textarea>' +
      '<label class="check" for="bk-gdpr"><input type="checkbox" id="bk-gdpr" name="gdpr"' + (b.gdpr ? ' checked' : '') + '>' +
      '<span>Sunt de acord ca Medicenter Clinic să folosească aceste date pentru gestionarea programării. <a href="#confidentialitate" target="_blank">Politica de confidențialitate</a></span></label>' +
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
        '<span class="done-check">' + MC.ICONS.check + '</span>' +
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
    if (b.sending) return;
    b.name = form.name.value; b.phone = form.phone.value; b.note = form.note.value; b.gdpr = form.gdpr.checked;
    var err = '';
    if (b.name.trim().length < 3) err = 'Scrie numele și prenumele.';
    else if (!MC.validPhone(b.phone)) err = 'Numărul de telefon nu pare corect. Folosește formatul 07xx xxx xxx.';
    else if (!b.gdpr) err = 'Bifează acordul pentru folosirea datelor ca să putem înregistra programarea.';
    var box = document.getElementById('bk-error');
    if (err) { box.textContent = err; box.hidden = false; return; }

    var btn = form.querySelector('button[type=submit]');
    b.sending = true;
    btn.disabled = true;
    btn.textContent = 'Se trimite…';
    MC.store.add({ serviceId: b.serviceId, date: b.date, hour: b.hour, name: b.name, phone: b.phone, note: b.note, source: 'online' })
      .then(function (done) {
        b.sending = false;
        b.done = done;
        MC.render();
        window.scrollTo(0, 0);
      }, function (e) {
        b.sending = false;
        // ora s-a ocupat între timp: reîncărcăm locurile și ne întoarcem la alegerea orei
        if (/complet|trecut|lucrează|programului/.test(e.message)) {
          MC.toast('Între timp ora aleasă s-a ocupat. Alege altă oră.', 'bad');
          b.hour = null; b.step = 2;
          MC.store.refresh().then(MC.render, MC.render);
          return;
        }
        btn.disabled = false;
        btn.textContent = 'Confirmă programarea';
        box.textContent = e.message;
        box.hidden = false;
      });
  }

  function resetBooking() {
    MC.bk = { step: 1, cat: 'kineto', serviceId: null, date: null, hour: null, month: null, name: '', phone: '', note: '', gdpr: false, done: null, sending: false };
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

  /* ---------- Politica de confidențialitate ---------- */

  function privacy() {
    var op = C.company ? C.company : C.name;
    return pageHero('GDPR', 'Politica de confidențialitate', 'Cum folosim datele pe care ni le lași când te programezi.') +
      '<section class="wrap page"><div class="card legal">' +
        '<h2>Cine suntem</h2><p>' + MC.esc(op) + ', ' + C.address + ', telefon ' + C.phone + '. Noi decidem cum sunt folosite datele din programări.</p>' +
        '<h2>Ce date colectăm</h2><p>La programarea online: numele, numărul de telefon, serviciul, ziua și ora alese și, dacă le scrii, observațiile. ' +
          'Te rugăm să nu scrii detalii medicale în câmpul de observații; le discutăm la clinică.</p>' +
        '<h2>De ce le folosim</h2><p>Doar ca să înregistrăm programarea și să te putem contacta dacă trebuie mutată sau anulată. ' +
          'Temeiul este acordul tău (bifat în formular) și pașii necesari înaintea unei prestări de servicii (art. 6 alin. (1) lit. a) și b) din GDPR).</p>' +
        '<h2>Cine are acces</h2><p>Doar personalul clinicii, din agenda protejată prin parolă. Datele sunt găzduite de furnizorul bazei de date (Supabase), pe servere din Uniunea Europeană. ' +
          'Nu vindem și nu dăm datele mai departe în scop de marketing.</p>' +
        '<h2>Cât le păstrăm</h2><p>Cât este nevoie pentru gestionarea programărilor și cel mult ' + C.retentionMonths + ' luni după data programării, apoi le ștergem.</p>' +
        '<h2>Drepturile tale</h2><p>Poți cere oricând să vezi, să corectezi sau să ștergi datele tale și îți poți retrage acordul, sunând la ' + C.phone + ' sau venind la clinică. ' +
          'Dacă ești nemulțumit, poți depune o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (www.dataprotection.ro).</p>' +
      '</div></section>';
  }

  MC.pages = { acasa: home, servicii: services, programare: booking, contact: contact, confidentialitate: privacy };
})();
