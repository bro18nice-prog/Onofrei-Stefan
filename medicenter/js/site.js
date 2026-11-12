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
      var r = MC.store.check(svc.id, date, h, hours);
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

      teamPreview() +
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
          '<li class="rv"><b>Primești confirmarea</b><span>Clinica verifică cererea și te contactează telefonic sau pe WhatsApp.</span></li>' +
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

  var AVAIL = [
    { id: 'dim', label: 'Dimineața (9–12)' },
    { id: 'pranz', label: 'La prânz (12–16)' },
    { id: 'dupa16', label: 'După 16:00' },
    { id: 'oricand', label: 'Oricând' }
  ];
  function freshBooking() {
    return { step: 1, cat: 'kineto', serviceId: null, date: null, hour: null, month: null,
      evalAnswer: null, newPatient: false, forChild: false, childName: '', childAge: '', name: '', phone: '',
      avail: [], availText: '', note: '', gdpr: false, done: null, sending: false };
  }
  MC.bk = freshBooking();

  /* Ce evaluare cere terapia aleasă (sau null). */
  function needsEval(svc) {
    var id = svc && MC.store.evalFor(svc.id);
    return id ? MC.serviceById(id) : null;
  }

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

    var body = b.step === 1 ? stepService(svc) : b.step === 2 ? stepDate(svc) : stepDetails(svc);
    return pageHero('Programare online', 'Programează-te', 'Alege serviciul și ora dorită. Clinica îți confirmă programarea.') +
      '<section class="wrap page booking">' + steps +
      '<div class="bk-grid"><div class="bk-main">' + body + '</div>' + summary(svc) + '</div></section>';
  }

  function stepService(svc) {
    var b = MC.bk;
    var cats = b.newPatient ? MC.CATS.filter(function (c) {
      return MC.SERVICES.some(function (s) { return s.cat === c.id && MC.store.forNewPatients(s.id); });
    }) : MC.CATS;
    if (!cats.some(function (c) { return c.id === b.cat; }) && cats.length) b.cat = cats[0].id;
    var list = MC.SERVICES.filter(function (s) { return s.cat === b.cat && (!b.newPatient || MC.store.forNewPatients(s.id)); });
    var ev = b.newPatient ? null : needsEval(svc);
    return '<label class="new-patient' + (b.newPatient ? ' on' : '') + '" for="bk-new">' +
        '<input type="checkbox" id="bk-new" data-change="bk-new"' + (b.newPatient ? ' checked' : '') + '>' +
        '<span><b>Sunt pacient nou / nu am trimitere</b><small>Bifează dacă vii prima dată la Medicenter. Prima programare este o evaluare sau o consultație cu medicul, care stabilește apoi terapia.</small></span>' +
      '</label>' +
      '<div class="card"><h2 class="card-title">' + (b.newPatient ? 'Alege evaluarea sau consultația' : 'Ce serviciu dorești?') + '</h2>' +
      '<div class="chips">' + cats.map(function (c) {
        return '<button class="chip' + (c.id === b.cat ? ' on' : '') + '" style="--cat:' + c.color + '" data-action="bk-cat" data-cat="' + c.id + '">' +
          '<span class="chip-ico">' + MC.ICONS[c.icon] + '</span>' + c.short + '</button>';
      }).join('') + '</div>' +
      '<ul class="svc-pick">' + list.map(function (s) {
        return '<li><button class="svc' + (s.id === b.serviceId ? ' on' : '') + '" style="--cat:' + MC.catById(s.cat).color + '" data-action="bk-svc" data-svc="' + s.id + '">' +
          '<span class="svc-name">' + MC.esc(s.name) + (s.durLabel ? '<small>' + s.durLabel + '</small>' : '') +
          (!b.newPatient && MC.store.evalFor(s.id) ? '<small class="eval-tag">necesită evaluare înainte</small>' : '') + '</span>' +
          '<span class="svc-price">' + s.price + '</span></button></li>';
      }).join('') + '</ul></div>' +
      (ev ? '<div class="card eval-card">' +
        '<h3>Înainte de această terapie este necesară o evaluare cu medicul</h3>' +
        '<p>Evaluarea (<b>' + MC.esc(ev.name) + '</b>, ' + ev.price + ') se face o singură dată, la clinică, înainte de prima ședință.</p>' +
        '<div class="eval-choices">' +
          '<button class="choice' + (b.evalAnswer === 'yes' ? ' on' : '') + '" data-action="bk-eval" data-v="yes">' + MC.ICONS.check +
            '<span><b>Am făcut deja evaluarea la Medicenter</b><small>Medicul verifică acest lucru la confirmare.</small></span></button>' +
          '<button class="choice" data-action="bk-eval-book" data-svc="' + ev.id + '">' + MC.ICONS.arrow +
            '<span><b>Nu am făcut-o încă</b><small>Programează întâi evaluarea.</small></span></button>' +
        '</div></div>' : '');
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
        if (x.free <= 0) return '<span class="slot full">' + MC.hourLabel(x.hour) + '<small>Ocupat</small></span>';
        var few = x.free === 1 ? ' few' : '';
        return '<button class="slot' + few + (x.hour === b.hour ? ' sel' : '') + '" data-action="bk-hour" data-hour="' + x.hour + '">' +
          MC.hourLabel(x.hour) + '<small>' + (x.free === 1 ? 'liber' : x.free + ' locuri libere') + '</small></button>';
      }).join('') + '</div>' : '<p class="muted">Nu mai sunt ore disponibile în această zi.</p>';
    }

    return '<div class="date-grid">' +
      '<div class="card"><div class="cal-head"><h2 class="card-title">' + MC.cap(MC.MONTHS[m.getMonth()]) + ' ' + m.getFullYear() + '</h2>' +
        '<div class="cal-nav"><button class="icon-btn" data-action="bk-month" data-dir="-1"' + (canPrev ? '' : ' disabled') + ' aria-label="Luna anterioară">‹</button>' +
        '<button class="icon-btn" data-action="bk-month" data-dir="1"' + (canNext ? '' : ' disabled') + ' aria-label="Luna următoare">›</button></div></div>' +
        '<div class="cal">' + cells + '</div>' +
        '<div class="legend"><span><i class="lg free"></i>Ore libere</span><span><i class="lg sel"></i>Ziua aleasă</span><span><i class="lg full"></i>Ocupat / închis</span></div>' +
      '</div>' +
      '<div class="card"><h2 class="card-title">' + (b.date ? MC.cap(MC.fmtDate(b.date)) : 'Ora dorită') + '</h2>' + slotsHtml +
        '<p class="muted small slot-note">Ora aleasă este o cerere. Clinica o confirmă sau îți propune altă oră.</p></div>' +
      '</div>' +
      '<div class="bk-actions"><button class="btn ghost" data-action="bk-step" data-step="1">Înapoi</button>' +
      '<button class="btn primary" data-action="bk-next"' + (b.date && b.hour != null ? '' : ' disabled') + '>Continuă</button></div>';
  }

  function stepDetails(svc) {
    var b = MC.bk;
    var ages = '<option value="">Alege</option>';
    for (var a = 0; a <= 17; a++) ages += '<option value="' + a + '"' + (String(b.childAge) === String(a) ? ' selected' : '') + '>' + (a === 0 ? 'sub 1 an' : a + (a === 1 ? ' an' : ' ani')) + '</option>';
    return '<form class="card form" id="bk-form" novalidate>' +
      '<h2 class="card-title">Datele tale</h2>' +
      '<p class="info-box">Programarea devine sigură după confirmarea clinicii. Te contactăm telefonic sau pe WhatsApp.</p>' +
      '<fieldset class="who"><legend>Pentru cine este programarea?</legend>' +
        '<label class="pill"><input type="radio" name="who" value="self" data-change="bk-who"' + (b.forChild ? '' : ' checked') + '><span>Pentru mine</span></label>' +
        '<label class="pill"><input type="radio" name="who" value="child" data-change="bk-who"' + (b.forChild ? ' checked' : '') + '><span>Pentru copilul meu</span></label>' +
      '</fieldset>' +
      '<div id="bk-child-fields" class="row2"' + (b.forChild ? '' : ' hidden') + '>' +
        '<div><label for="bk-child">Numele copilului</label><input id="bk-child" name="child" maxlength="120" value="' + MC.esc(b.childName) + '"></div>' +
        '<div><label for="bk-age">Vârsta copilului</label><select id="bk-age" name="age">' + ages + '</select></div>' +
      '</div>' +
      '<label for="bk-name" id="bk-name-label">' + (b.forChild ? 'Numele părintelui' : 'Nume și prenume') + '</label>' +
      '<input id="bk-name" name="name" autocomplete="name" maxlength="120" required value="' + MC.esc(b.name) + '">' +
      '<label for="bk-phone">Telefon (WhatsApp, dacă ai)</label>' +
      '<input id="bk-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="07xx xxx xxx" required value="' + MC.esc(b.phone) + '">' +
      '<fieldset class="avail"><legend>Când poți veni de obicei?</legend>' +
        AVAIL.map(function (o) {
          return '<label class="pill"><input type="checkbox" name="avail" value="' + o.id + '"' + (b.avail.indexOf(o.id) >= 0 ? ' checked' : '') + '><span>' + o.label + '</span></label>';
        }).join('') +
        '<input id="bk-avail" name="availText" maxlength="150" placeholder="Alte detalii (ex.: doar marți și joi, după școală)" value="' + MC.esc(b.availText) + '">' +
      '</fieldset>' +
      '<label for="bk-note">Observații <span class="muted">(opțional)</span></label>' +
      '<textarea id="bk-note" name="note" rows="3" maxlength="500" placeholder="Ex.: prima ședință. Te rugăm să nu scrii detalii medicale.">' + MC.esc(b.note) + '</textarea>' +
      (b.newPatient ? '<p class="info-box">Pacient nou: după evaluare, medicul îți recomandă terapia și numărul de ședințe.</p>' : '') +
      (!b.newPatient && needsEval(svc) ? '<p class="info-box ok">Ai declarat că ai făcut evaluarea la Medicenter. Medicul verifică la confirmare.</p>' : '') +
      '<label class="check" for="bk-gdpr"><input type="checkbox" id="bk-gdpr" name="gdpr"' + (b.gdpr ? ' checked' : '') + '>' +
      '<span>Sunt de acord ca Medicenter Clinic să folosească aceste date pentru gestionarea programării. <a href="#confidentialitate" target="_blank">Politica de confidențialitate</a></span></label>' +
      '<p class="form-error" id="bk-error" role="alert" hidden></p>' +
      '<div class="bk-actions"><button type="button" class="btn ghost" data-action="bk-step" data-step="2">Înapoi</button>' +
      '<button type="submit" class="btn primary">Trimite cererea</button></div>' +
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
    var ev = b.newPatient ? null : needsEval(svc);
    var canGo = svc && (!ev || b.evalAnswer === 'yes') && (!b.newPatient || MC.store.forNewPatients(svc.id));
    return '<aside class="card summary"><h2 class="card-title">Rezumat</h2>' +
      row('Serviciu', svc && MC.esc(svc.name)) +
      row('Preț', svc && svc.price) +
      row('Data dorită', b.date && MC.cap(MC.fmtDate(b.date, true))) +
      row('Ora dorită', end) +
      '<p class="sum-note">Se confirmă de clinică</p>' +
      (b.step === 1 ? '<button class="btn primary block" data-action="bk-next"' + (canGo ? '' : ' disabled') + '>Continuă</button>' : '') +
      '</aside>';
  }

  MC.statusUrl = function (token) {
    return location.origin + location.pathname + '?cerere=' + encodeURIComponent(token) + '#status';
  };

  function bookingDone() {
    var d = MC.bk.done;
    var svc = MC.serviceById(d.serviceId);
    var url = MC.statusUrl(d.token);
    return '<section class="wrap page booking done">' +
      '<div class="card done-card">' +
        '<span class="done-check wait">' + MC.ICONS.clock + '</span>' +
        '<p class="eyebrow">Cerere trimisă</p>' +
        '<h1>Am primit cererea pentru ' + MC.fmtDate(d.date) + ', ora ' + MC.hourLabel(d.hour) + '.</h1>' +
        '<p>Clinica o verifică și te contactează telefonic sau pe WhatsApp pentru confirmare. Dacă ora nu e potrivită, îți propunem alta.</p>' +
        '<div class="sum-row"><span>Serviciu</span><b>' + MC.esc(svc.name) + '</b></div>' +
        (d.childName ? '<div class="sum-row"><span>Pentru</span><b>' + MC.esc(d.childName) + '</b></div>' : '') +
        '<div class="sum-row"><span>Preț</span><b>' + svc.price + '</b></div>' +
        '<div class="sum-row"><span>Telefon</span><b>' + MC.esc(d.phone) + '</b></div>' +
        '<div class="status-link"><b>Starea cererii o vezi oricând aici:</b>' +
          '<input id="status-url" readonly value="' + MC.esc(url) + '">' +
          '<div class="row-actions"><button class="btn small soft" data-action="copy-status">Copiază linkul</button>' +
          '<a class="btn small primary" href="' + MC.esc(url) + '">Vezi starea cererii</a></div></div>' +
        '<p class="muted small">Adresa: ' + C.address + '. Pentru întrebări: <a href="' + C.phoneHref + '">' + C.phone + '</a>.</p>' +
        '<div class="bk-actions"><a class="btn ghost" href="#acasa">Înapoi la prima pagină</a>' +
        '<button class="btn primary" data-action="bk-new">Altă cerere</button></div>' +
      '</div></section>';
  }

  /* Citește formularul în MC.bk, ca valorile să nu se piardă la re-randare. */
  function grab(form) {
    var b = MC.bk;
    if (!form) return;
    b.forChild = form.querySelector('input[name=who]:checked').value === 'child';
    b.childName = form.child.value; b.childAge = form.age.value;
    b.name = form.name.value; b.phone = form.phone.value; b.note = form.note.value; b.gdpr = form.gdpr.checked;
    b.avail = [].slice.call(form.querySelectorAll('input[name=avail]:checked')).map(function (x) { return x.value; });
    b.availText = form.availText.value;
  }

  function submitBooking(form) {
    var b = MC.bk;
    if (b.sending) return;
    grab(form);
    var err = '';
    if (b.forChild && b.childName.trim().length < 2) err = 'Scrie numele copilului.';
    else if (b.forChild && b.childAge === '') err = 'Alege vârsta copilului.';
    else if (b.name.trim().length < 3) err = b.forChild ? 'Scrie numele părintelui.' : 'Scrie numele și prenumele.';
    else if (!MC.validPhone(b.phone)) err = 'Numărul de telefon nu pare corect. Folosește formatul 07xx xxx xxx.';
    else if (!b.gdpr) err = 'Bifează acordul pentru folosirea datelor ca să putem înregistra cererea.';
    var box = document.getElementById('bk-error');
    if (err) { box.textContent = err; box.hidden = false; return; }

    var availability = AVAIL.filter(function (o) { return b.avail.indexOf(o.id) >= 0; })
      .map(function (o) { return o.label; }).concat(b.availText.trim() ? [b.availText.trim()] : []).join('; ');
    var btn = form.querySelector('button[type=submit]');
    b.sending = true;
    btn.disabled = true;
    btn.textContent = 'Se trimite…';
    MC.store.add({
      serviceId: b.serviceId, date: b.date, hour: b.hour, name: b.name, phone: b.phone, note: b.note, source: 'online',
      childName: b.forChild ? b.childName : '', childAge: b.forChild ? b.childAge : null,
      availability: availability.slice(0, 300), evalDeclared: !b.newPatient && b.evalAnswer === 'yes', newPatient: b.newPatient
    }).then(function (done) {
      b.sending = false;
      b.done = done;
      MC.render();
      window.scrollTo(0, 0);
    }, function (e) {
      b.sending = false;
      // ora s-a ocupat între timp: reîncărcăm locurile și ne întoarcem la alegerea orei
      if (/ocupat|trecut|lucrează|programului/.test(e.message)) {
        MC.toast('Între timp ora aleasă s-a ocupat. Alege altă oră.', 'bad');
        b.hour = null; b.step = 2;
        MC.store.refresh().then(MC.render, MC.render);
        return;
      }
      btn.disabled = false;
      btn.textContent = 'Trimite cererea';
      box.textContent = e.message;
      box.hidden = false;
    });
  }

  function resetBooking() { MC.bk = freshBooking(); }

  /* ---------- Starea cererii (link primit de pacient) ---------- */

  var STATUS_TEXT = {
    pending: ['În așteptare', 'Clinica verifică cererea și te contactează pentru confirmare.'],
    confirmed: ['Confirmată', 'Te așteptăm la clinică.'],
    rejected: ['Neconfirmată', 'Ora cerută nu a putut fi confirmată. Sună-ne pentru altă oră.'],
    cancelled: ['Anulată', 'Programarea a fost anulată.']
  };

  function statusPage() {
    var token = new URLSearchParams(location.search).get('cerere') || MC.ui.statusToken || '';
    var tokens = (token ? [token] : []).concat(MC.store.mine().filter(function (t) { return t !== token; }));
    setTimeout(function () { loadStatuses(tokens); }, 0);
    return pageHero('Programare online', 'Starea cererilor tale', 'Aici vezi dacă programarea a fost confirmată sau mutată.') +
      '<section class="wrap page"><div id="status-list" class="status-list">' +
        (tokens.length ? '<div class="loading small"><span></span>Se încarcă…</div>'
          : '<div class="card"><p>Nu am găsit nicio cerere pe acest dispozitiv. Deschide linkul primit după programare sau sună-ne la ' +
            '<a href="' + C.phoneHref + '">' + C.phone + '</a>.</p></div>') +
      '</div><a class="btn primary" href="#programare">Fă o cerere nouă</a></section>';
  }

  function loadStatuses(tokens) {
    if (!tokens.length) return;
    Promise.all(tokens.map(function (t) { return MC.store.getStatus(t).catch(function () { return null; }); })).then(function (list) {
      var box = document.getElementById('status-list');
      if (!box) return;
      var html = list.map(function (r) {
        if (!r) return '';
        var svc = MC.serviceById(r.serviceId);
        var t = STATUS_TEXT[r.status] || STATUS_TEXT.pending;
        return '<div class="card status-card st-' + r.status + '">' +
          '<span class="st-badge">' + t[0] + '</span>' +
          '<h2 class="card-title">' + MC.esc(svc ? svc.name : 'Programare') + (r.childName ? ' · ' + MC.esc(r.childName) : '') + '</h2>' +
          '<div class="sum-row"><span>Data</span><b>' + MC.cap(MC.fmtDate(r.date, true)) + '</b></div>' +
          '<div class="sum-row"><span>Ora</span><b>' + MC.hourLabel(r.hour) + '</b></div>' +
          '<p>' + t[1] + '</p>' +
          (r.staffNote ? '<p class="note-box"><b>Mesaj de la clinică:</b> ' + MC.esc(r.staffNote) + '</p>' : '') +
          '</div>';
      }).join('');
      box.innerHTML = html || '<div class="card"><p>Cererea nu a fost găsită. Verifică linkul sau sună-ne la <a href="' + C.phoneHref + '">' + C.phone + '</a>.</p></div>';
    });
  }

  /* ---------- evenimente ---------- */

  MC.siteActions = {
    'quick-book': function (el) {
      resetBooking();
      var svc = MC.serviceById(el.dataset.svc);
      var d = MC.parseYmd(el.dataset.date);
      Object.assign(MC.bk, { cat: svc.cat, serviceId: svc.id, date: el.dataset.date, hour: +el.dataset.hour, step: needsEval(svc) ? 1 : 2,
        month: new Date(d.getFullYear(), d.getMonth(), 1) });
      MC.go('programare');
    },
    'goto-cat': function (el, ev) { ev.preventDefault(); MC.ui.servicesCat = el.dataset.cat; MC.go('servicii'); },
    'svc-tab': function (el) { MC.ui.servicesCat = el.dataset.cat; MC.render(); },
    'book-svc': function (el) {
      resetBooking();
      var svc = MC.serviceById(el.dataset.svc);
      Object.assign(MC.bk, { cat: svc.cat, serviceId: svc.id, step: needsEval(svc) ? 1 : 2 });
      MC.go('programare');
    },
    'bk-cat': function (el) { MC.bk.cat = el.dataset.cat; MC.render(); },
    'bk-svc': function (el) {
      if (MC.bk.serviceId !== el.dataset.svc) { MC.bk.date = null; MC.bk.hour = null; MC.bk.evalAnswer = null; }
      MC.bk.serviceId = el.dataset.svc; MC.render();
    },
    'bk-eval': function () { MC.bk.evalAnswer = 'yes'; MC.render(); },
    'bk-eval-book': function (el) {
      var ev = MC.serviceById(el.dataset.svc);
      Object.assign(MC.bk, { cat: ev.cat, serviceId: ev.id, evalAnswer: null, date: null, hour: null });
      MC.toast('Am ales evaluarea. După ea poți programa terapia.', 'ok');
      MC.render();
    },
    'bk-next': function () {
      var b = MC.bk;
      var svc = b.serviceId && MC.serviceById(b.serviceId);
      if (b.step === 1 && (!svc || (!b.newPatient && needsEval(svc) && b.evalAnswer !== 'yes') ||
        (b.newPatient && !MC.store.forNewPatients(svc.id)))) return;
      b.step++; MC.render(); window.scrollTo(0, 0);
    },
    'bk-step': function (el) {
      grab(document.getElementById('bk-form'));
      MC.bk.step = +el.dataset.step; MC.render();
    },
    'bk-month': function (el) {
      var m = MC.bk.month;
      MC.bk.month = new Date(m.getFullYear(), m.getMonth() + (+el.dataset.dir), 1);
      MC.render();
    },
    'bk-date': function (el) { MC.bk.date = el.dataset.date; MC.bk.hour = null; MC.render(); },
    'bk-hour': function (el) { MC.bk.hour = +el.dataset.hour; MC.render(); },
    'bk-new': function () { resetBooking(); MC.render(); window.scrollTo(0, 0); },
    'copy-status': function () {
      var inp = document.getElementById('status-url');
      var done = function () { MC.toast('Linkul a fost copiat.', 'ok'); };
      try {
        navigator.clipboard.writeText(inp.value).then(done, function () { inp.select(); });
      } catch (e) { inp.select(); }
    }
  };
  MC.siteSubmit = function (form) {
    if (form.id === 'bk-form') { submitBooking(form); return true; }
    return false;
  };
  MC.siteChange = function (el) {
    if (el.dataset.change === 'bk-new') {
      var b = MC.bk;
      b.newPatient = el.checked;
      b.evalAnswer = null;
      if (b.newPatient && b.serviceId && !MC.store.forNewPatients(b.serviceId)) { b.serviceId = null; b.date = null; b.hour = null; }
      MC.render();
      return true;
    }
    if (el.dataset.change !== 'bk-who') return false;
    var child = el.value === 'child';
    document.getElementById('bk-child-fields').hidden = !child;
    document.getElementById('bk-name-label').textContent = child ? 'Numele părintelui' : 'Nume și prenume';
    MC.bk.forChild = child;
    return true;
  };

  /* ---------- Echipa ---------- */

  function initials(name) {
    return name.replace(/^Dr\.\s*/, '').split(/[\s-]+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join('');
  }
  function portrait(p, cls) {
    return p.photo
      ? '<img class="' + cls + '" src="' + p.photo + '" alt="' + MC.esc(p.name) + '" loading="lazy" width="600" height="800">'
      : '<span class="' + cls + ' monogram" aria-hidden="true">' + MC.esc(initials(p.name)) + '</span>';
  }
  function memberCard(p) {
    var svc = p.book && MC.serviceById(p.book);
    return '<article class="member rv">' + portrait(p, 'member-photo') +
      '<div class="member-body"><h3>' + MC.esc(p.name) + '</h3><p class="member-role">' + MC.esc(p.role) + '</p>' +
      p.bio.map(function (t) { return '<p>' + MC.esc(t) + '</p>'; }).join('') +
      (svc ? '<button class="btn small primary" data-action="book-svc" data-svc="' + svc.id + '">Programează o consultație</button>' : '') +
      '</div></article>';
  }

  function team() {
    return pageHero('Echipa', 'Echipa Medicenter Clinic', 'Profesionalism, empatie și dedicare pentru sănătatea fiecărui pacient.') +
      '<section class="wrap page team-page">' +
        '<div class="team-intro rv"><p>La Medicenter Clinic, credem că îngrijirea medicală de calitate începe cu oameni dedicați, pregătire profesională continuă și atenție acordată nevoilor fiecărui pacient.</p>' +
        '<p>Echipa noastră reunește medici specialiști, fizioterapeuți și asistenți medicali, oferind o abordare multidisciplinară în evaluarea, diagnosticarea și recuperarea pacienților.</p></div>' +
        MC.TEAM_GROUPS.map(function (g) {
          return '<div class="team-group"><h2 class="section-title">' + g.name + '</h2><div class="members">' +
            MC.TEAM.filter(function (p) { return p.group === g.id; }).map(memberCard).join('') + '</div></div>';
        }).join('') +
      '</section>' +
      '<section class="cta-band">' + MC.swirl() + '<div class="wrap cta-in rv">' +
        '<div><h2>O echipă multidisciplinară. O abordare personalizată. Grijă pentru fiecare pacient.</h2>' +
        '<p>Îmbinăm experiența profesională, metodele moderne de evaluare și recuperare și respectul față de fiecare persoană care ne trece pragul. ' +
        'Pentru noi, fiecare pacient este unic, iar sănătatea sa reprezintă prioritatea noastră.</p></div>' +
        '<div class="hero-cta"><a class="btn sand big" href="#programare">Programează-te online ' + MC.ICONS.arrow + '</a></div>' +
      '</div></section>';
  }

  /* Secțiunea „Echipa” de pe prima pagină: medicii, cu link spre toată echipa. */
  function teamPreview() {
    var docs = MC.TEAM.filter(function (p) { return p.group === 'medici'; });
    return '<section class="sec team-sec"><div class="wrap">' +
      '<div class="sec-head rv"><p class="eyebrow">Echipa</p><h2>Medici și terapeuți dedicați</h2>' +
        '<p class="muted">Medici specialiști, fizioterapeuți și asistenți medicali, într-o echipă multidisciplinară.</p></div>' +
      '<div class="doc-cards">' + docs.map(function (p) {
        return '<article class="doc rv">' + portrait(p, 'doc-photo') +
          '<div><h3>' + MC.esc(p.name) + '</h3><p>' + MC.esc(p.role) + '</p>' +
          '<button class="link-btn" data-action="book-svc" data-svc="' + p.book + '">Programează o consultație</button></div></article>';
      }).join('') + '</div>' +
      '<div class="center rv"><a class="btn ghost big" href="#echipa">Cunoaște toată echipa (' + MC.TEAM.length + ') ' + MC.ICONS.arrow + '</a></div>' +
      '</div></section>';
  }

  /* ---------- Politica de confidențialitate ---------- */

  function privacy() {
    var op = C.company ? C.company : C.name;
    return pageHero('GDPR', 'Politica de confidențialitate', 'Cum folosim datele pe care ni le lași când te programezi.') +
      '<section class="wrap page"><div class="card legal">' +
        '<h2>Cine suntem</h2><p>' + MC.esc(op) + ', ' + C.address + ', telefon ' + C.phone + '. Noi decidem cum sunt folosite datele din programări.</p>' +
        '<h2>Ce date colectăm</h2><p>La cererea de programare: numele, numărul de telefon, serviciul, ziua și ora dorite, intervalele în care poți veni și, dacă le scrii, observațiile. ' +
          'Pentru copii: numele și vârsta copilului, iar datele de contact sunt ale părintelui. ' +
          'Te rugăm să nu scrii detalii medicale în câmpul de observații; le discutăm la clinică.</p>' +
        '<h2>De ce le folosim</h2><p>Doar ca să înregistrăm și să confirmăm programarea și să te putem contacta, telefonic sau pe WhatsApp, dacă trebuie mutată sau anulată. ' +
          'Temeiul este acordul tău (bifat în formular) și pașii necesari înaintea unei prestări de servicii (art. 6 alin. (1) lit. a) și b) din GDPR).</p>' +
        '<h2>Cine are acces</h2><p>Doar personalul clinicii, din agenda protejată prin parolă. Datele sunt găzduite de furnizorul bazei de date (Supabase), pe servere din Uniunea Europeană. ' +
          'Nu vindem și nu dăm datele mai departe în scop de marketing.</p>' +
        '<h2>Cât le păstrăm</h2><p>Cât este nevoie pentru gestionarea programărilor și cel mult ' + C.retentionMonths + ' luni după data programării, apoi le ștergem.</p>' +
        '<h2>Drepturile tale</h2><p>Poți cere oricând să vezi, să corectezi sau să ștergi datele tale și îți poți retrage acordul, sunând la ' + C.phone + ' sau venind la clinică. ' +
          'Dacă ești nemulțumit, poți depune o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (www.dataprotection.ro).</p>' +
      '</div></section>';
  }

  MC.pages = { acasa: home, servicii: services, echipa: team, programare: booking, contact: contact, confidentialitate: privacy, status: statusPage };
})();
