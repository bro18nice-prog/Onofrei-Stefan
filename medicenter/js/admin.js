/* Panoul personalului: autentificare, agenda săptămânală, mutare/anulare/adăugare, setări, lista personalului. */
window.MC = window.MC || {};

(function () {
  MC.adm = {
    tab: 'agenda', week: MC.weekStart(MC.today()), filter: 'toate', dayIdx: null,
    panel: { mode: 'idle' }, confirm: null,
    auth: 'login',    // login | forgot | signup | sent
    sentMsg: '',
    staff: null,      // lista personalului, încărcată la cerere
    busy: false
  };

  function narrow() { return window.innerWidth < 760; }

  function weekDays() {
    var s = MC.store.settings();
    var out = [];
    for (var i = 0; i < 7; i++) {
      var d = MC.addDays(MC.adm.week, i);
      if (s.days.indexOf(d.getDay()) >= 0) out.push(d);
    }
    return out;
  }

  /* Rulează o modificare: blochează dublu-clickul, arată eroarea în `errId` sau ca notificare. */
  function run(promise, okMsg, errId) {
    MC.adm.busy = true;
    document.body.classList.add('busy');
    return promise.then(function (r) {
      if (okMsg) MC.toast(okMsg, 'ok');
      return r;
    }, function (e) {
      if (errId && document.getElementById(errId)) showErr(errId, e.message);
      else MC.toast(e.message, 'bad');
      throw e;
    }).finally(function () {
      MC.adm.busy = false;
      document.body.classList.remove('busy');
    });
  }

  /* ---------- autentificare ---------- */

  /* Emailul se completează singur: din linkul trimis medicilor (?email=…) sau ultimul folosit pe acest telefon. */
  function knownEmail() {
    var m = /[?&]email=([^&#]+)/.exec(location.search);
    if (m) { try { return decodeURIComponent(m[1]); } catch (e) { return ''; } }
    try { return localStorage.getItem('medicenter-email') || ''; } catch (e) { return ''; }
  }

  function login() {
    var live = MC.store.live;
    var a = MC.adm.auth;
    var head = '<section class="admin-login">' + MC.swirl() + '<form class="card form" id="adm-login" data-mode="' + a + '" novalidate>' +
      '<img class="login-logo" src="img/logo.png" alt="Medicenter Clinic">';
    var foot = '</form></section>';

    if (MC.store.isRecovery()) {
      return head + '<h1>Parolă nouă</h1><p class="muted">Alege parola cu care vei intra în agendă.</p>' +
        '<label for="adm-pass">Parola nouă</label><input id="adm-pass" type="password" autocomplete="new-password" minlength="8" required>' +
        '<p class="form-error" id="adm-error" role="alert" hidden></p>' +
        '<button class="btn primary block" type="submit">Salvează parola</button>' + foot;
    }
    if (a === 'sent') {
      return head + '<h1>Verifică emailul</h1><p>' + MC.adm.sentMsg + '</p>' +
        '<button type="button" class="btn ghost block" data-action="adm-auth" data-to="login">Înapoi la intrare</button>' + foot;
    }
    if (a === 'forgot') {
      return head + '<h1>Ai uitat parola?</h1><p class="muted">Primești pe email un link pentru o parolă nouă.</p>' +
        '<label for="adm-email">Email</label><input id="adm-email" type="email" autocomplete="email" required>' +
        '<p class="form-error" id="adm-error" role="alert" hidden></p>' +
        '<button class="btn primary block" type="submit">Trimite linkul</button>' +
        '<button type="button" class="link-btn" data-action="adm-auth" data-to="login">Înapoi la intrare</button>' + foot;
    }
    if (a === 'signup') {
      return head + '<h1>Cont nou pentru personal</h1><p class="muted">Folosește emailul trecut de administrator în lista personalului.</p>' +
        '<label for="adm-email">Email</label><input id="adm-email" type="email" autocomplete="email" required>' +
        '<label for="adm-pass">Alege o parolă</label><input id="adm-pass" type="password" autocomplete="new-password" minlength="8" required>' +
        '<p class="form-error" id="adm-error" role="alert" hidden></p>' +
        '<button class="btn primary block" type="submit">Creează contul</button>' +
        '<button type="button" class="link-btn" data-action="adm-auth" data-to="login">Am deja cont</button>' + foot;
    }
    return head + '<h1>Agenda clinicii</h1><p class="muted">Acces doar pentru personalul clinicii.</p>' +
      (live ? '<label for="adm-email">Email</label><input id="adm-email" type="email" autocomplete="email" required value="' + MC.esc(knownEmail()) + '">' : '') +
      '<label for="adm-pass">Parolă</label><input id="adm-pass" type="password" autocomplete="current-password" required>' +
      '<p class="form-error" id="adm-error" role="alert" hidden></p>' +
      '<button class="btn primary block" type="submit">Intră în cont</button>' +
      (live
        ? '<div class="login-links"><button type="button" class="link-btn" data-action="adm-auth" data-to="forgot">Am uitat parola</button></div>'
        : '<p class="demo-note">Versiune demo · parola este <b>medicenter</b></p>') +
      '</form>' + (standalone() ? '' : '<div class="card login-install"><h2>Pune agenda pe telefon</h2>' + installHelp() + '</div>') + '</section>';
  }

  /* ---------- structură ---------- */

  function shell(inner) {
    var t = MC.adm.tab;
    var admin = MC.store.role() === 'admin';
    return '<div class="admin">' +
      '<header class="adm-bar"><div class="adm-bar-in">' +
        '<a href="#acasa" class="adm-brand"><img src="img/logo-light.png" alt="Medicenter Clinic"></a>' +
        '<nav class="adm-tabs">' +
          '<button class="' + (t === 'agenda' ? 'on' : '') + '" data-action="adm-tab" data-tab="agenda">Agenda</button>' +
          (admin ? '<button class="' + (t === 'setari' ? 'on' : '') + '" data-action="adm-tab" data-tab="setari">Setări</button>' : '') +
          '<button class="' + (t === 'cont' ? 'on' : '') + '" data-action="adm-tab" data-tab="cont">Cont și telefon</button>' +
        '</nav>' +
        '<div class="adm-bar-right">' +
          (MC.store.email() ? '<span class="who">' + MC.esc(MC.store.email()) + '</span>' : '') +
          '<a class="btn ghost small" href="#acasa">Vezi site-ul</a>' +
          '<button class="btn ghost small" data-action="adm-logout">Ieși</button></div>' +
      '</div></header>' + inner + installBanner() + '</div>';
  }

  var SHARE_ICON = '<svg class="share-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
  /* Bara de jos care îi arată medicului, pe telefonul lui, cum pune agenda pe ecran. */
  function installBanner() {
    var d = device();
    var off = false;
    try { off = localStorage.getItem('medicenter-banner-off') === '1'; } catch (e) { /* opțional */ }
    if (d !== 'desktop' && standalone() && MC.adm.tab !== 'cont' && pushAvailable() && MC.adm.push === 'off') {
      var offP = false;
      try { offP = localStorage.getItem('medicenter-push-banner-off') === '1'; } catch (e) { /* opțional */ }
      if (!offP) return '<div class="install-banner" role="note"><span class="ib-text"><b>Afli imediat de cererile noi:</b> activează notificările pe acest telefon.</span>' +
        '<button class="btn sand small" data-action="adm-push-on">🔔 Activează</button><button class="ib-close" data-action="adm-push-banner-off" aria-label="Închide">×</button></div>';
    }
    if (d === 'desktop' || standalone() || off || MC.adm.tab === 'cont') return '';
    var body;
    if (d === 'android') {
      body = MC.adm.installEvt
        ? '<span class="ib-text"><b>Pune agenda pe ecranul telefonului</b></span><button class="btn sand small" data-action="adm-install">📲 Instalează</button>'
        : '<span class="ib-text"><b>Pune agenda pe ecran:</b> apasă <b>⋮</b> (sus, dreapta), apoi <b>Instalează aplicația</b>.</span>';
    } else {
      body = '<span class="ib-text"><b>Pune agenda pe ecran:</b> apasă ' + SHARE_ICON + ' <b>Partajează</b> (lângă adresa site-ului; dacă nu îl vezi, întâi <b>⋯</b>), apoi <b>Adaugă pe ecranul principal</b>.</span>';
    }
    return '<div class="install-banner" role="note">' + body +
      '<button class="ib-close" data-action="adm-banner-off" aria-label="Închide">×</button></div>';
  }

  /* ---------- agenda ---------- */

  var I = {
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    unlock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/></svg>',
    day: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M9.5 14.5l5 5M14.5 14.5l-5 5"/></svg>',
    dayok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M9 16l2 2 4-4"/></svg>',
    seats: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 14.5c3 0 6 1.8 6 5.5"/></svg>',
    move: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M9 15h6M13 13l2 2-2 2"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    redo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v4h4"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l1.5-4A8 8 0 1 1 9 19.5L4 20z"/></svg>'
  };
  /* Un buton mare din grila de acțiuni. */
  function act(icon, label, attrs, cls) {
    return '<button type="button" class="act ' + (cls || '') + '" ' + attrs + '>' + icon + '<span>' + label + '</span></button>';
  }
  function actLink(icon, label, href, cls) {
    return '<a class="act ' + (cls || '') + '" href="' + MC.esc(href) + '"' + (/^https/.test(href) ? ' target="_blank" rel="noopener"' : '') + '>' + icon + '<span>' + label + '</span></a>';
  }

  var STATUS_LABEL = { pending: 'în așteptare', confirmed: 'confirmată', rejected: 'refuzată', cancelled: 'anulată' };

  function agenda() {
    var a = MC.adm;
    var s = MC.store.settings();
    var days = weekDays();
    var todayYmd = MC.ymd(MC.today());
    if (narrow() && (a.dayIdx == null || a.dayIdx >= days.length)) {
      var ti = days.findIndex(function (d) { return MC.ymd(d) === todayYmd; });
      a.dayIdx = ti >= 0 ? ti : 0;
    }
    var shown = narrow() ? [days[a.dayIdx]].filter(Boolean) : days;
    var last = days[days.length - 1] || a.week;
    var range = days.length ? days[0].getDate() + ' – ' + last.getDate() + ' ' + MC.MONTHS[last.getMonth()] + ' ' + last.getFullYear() : '';
    var nPending = MC.store.pending().length;

    var toolbar = '<div class="adm-toolbar">' +
      '<div class="tb-group"><button class="icon-btn" data-action="adm-week" data-dir="-1" aria-label="Săptămâna anterioară">‹</button>' +
      '<button class="btn ghost small" data-action="adm-week" data-dir="0">Azi</button>' +
      '<button class="icon-btn" data-action="adm-week" data-dir="1" aria-label="Săptămâna următoare">›</button>' +
      '<h1 class="adm-title">' + range + '</h1></div>' +
      '<div class="tb-group">' +
        '<button class="btn small pending-btn' + (nPending ? ' has' : '') + '" data-action="adm-requests">Cereri noi <b>' + nPending + '</b></button>' +
        '<label class="sr" for="adm-filter">Secția</label>' +
        '<select id="adm-filter" data-change="adm-filter">' +
          '<option value="toate"' + (a.filter === 'toate' ? ' selected' : '') + '>Toate secțiile</option>' +
          '<optgroup label="Secția">' + MC.CATS.map(function (c) { return '<option value="' + c.id + '"' + (a.filter === c.id ? ' selected' : '') + '>' + c.name + '</option>'; }).join('') + '</optgroup>' +
          (!MC.store.supports('therapist') ? '' : '<optgroup label="Terapeutul">' + MC.staffNames().map(function (n) { return '<option value="t:' + MC.esc(n) + '"' + (a.filter === 't:' + n ? ' selected' : '') + '>' + MC.esc(n) + '</option>'; }).join('') + '</optgroup>') +
        '</select>' +
        '<button class="btn primary small" data-action="adm-new">+ Programare</button>' +
      '</div></div>';

    var legend = '<div class="adm-legend">' + MC.CATS.map(function (c) {
      return '<span><i style="background:' + c.color + '"></i>' + c.short + '</span>';
    }).join('') +
      '<span class="lg-pending">în așteptare</span>' +
      '<span class="cap-info">Apasă pe o programare sau pe o oră: apar butoanele cu tot ce poți face</span>' +
      '</div>';

    var dayTabs = narrow() ? '<div class="day-tabs">' + days.map(function (d, i) {
      return '<button class="' + (i === a.dayIdx ? 'on' : '') + (MC.ymd(d) === todayYmd ? ' today' : '') + '" data-action="adm-day" data-idx="' + i + '">' +
        MC.DAYS_SHORT[d.getDay()] + '<b>' + d.getDate() + '</b></button>';
    }).join('') + '</div>' : '';

    var cols = 'grid-template-columns:56px repeat(' + shown.length + ', minmax(0,1fr))';
    var grid = '<div class="ag-scroll"><div class="ag" style="' + cols + '"><div class="ag-corner"></div>';
    shown.forEach(function (d) {
      var bd = MC.store.supports('caps') ? blockedCats(MC.ymd(d), dayHours()) : [];
      var shut = bd.indexOf('*') >= 0;
      grid += '<div class="ag-day' + (MC.ymd(d) === todayYmd ? ' today' : '') + (shut ? ' shut' : bd.length ? ' part' : '') + '">' + MC.DAYS_SHORT[d.getDay()] + '<b>' + d.getDate() + '</b>' +
        (shut ? '<small>închis</small>' : bd.length ? '<small>închis: ' + MC.esc(blockedLabel(bd)) + '</small>' : '') + '</div>';
    });
    var now = new Date();
    for (var h = s.open; h < s.close; h++) {
      grid += '<div class="ag-hour">' + MC.hourLabel(h) + '</div>';
      shown.forEach(function (d) {
        var ymd = MC.ymd(d);
        grid += cell(ymd, h, ymd < todayYmd || (ymd === todayYmd && h < now.getHours()));
      });
    }
    grid += '</div></div>';

    return shell('<div class="adm-body">' +
      '<div class="adm-main">' + toolbar + legend + dayTabs + grid + '</div>' +
      '<aside class="adm-panel" id="adm-panel">' + panel() + '</aside>' +
      '</div>');
  }

  function cell(date, hour, past) {
    var a = MC.adm;
    var byT = a.filter.indexOf('t:') === 0 ? a.filter.slice(2) : null;
    var list = MC.store.bookingsOn(date).filter(function (b) {
      return hour >= b.hour && hour < b.hour + b.hours && (a.filter === 'toate' || (byT ? b.therapist === byT : b.cat === a.filter));
    }).sort(function (x, y) { return x.cat < y.cat ? -1 : x.cat > y.cat ? 1 : x.name.localeCompare(y.name); });
    var nPend = list.filter(function (b) { return b.status === 'pending'; }).length;
    var badge = list.length ? '<span class="cnt neutral">' + list.length + '</span>' : '';
    if (nPend) badge = '<span class="cnt pend" title="cereri în așteptare">' + nPend + '?</span>' + badge;
    var catF = MC.catById(a.filter) ? a.filter : '*';
    var capM = MC.store.slotCap(date, hour, catF);
    var anyCat = catF === '*' && MC.CATS.some(function (c) { return MC.store.slotCap(date, hour, c.id) != null; });
    if (capM != null) badge = '<span class="cnt capo" title="locuri setate manual">' + (capM === 0 ? 'închis' : 'max ' + capM) + '</span>' + badge;
    else if (anyCat) {
      var set = MC.CATS.filter(function (c) { return MC.store.slotCap(date, hour, c.id) != null; });
      var zero = set.filter(function (c) { return MC.store.slotCap(date, hour, c.id) === 0; }).map(function (c) { return c.id; });
      var lbl = zero.length === set.length ? blockedLabel(zero) + ' închis'
        : set.length === 1 ? set[0].short + ' max ' + MC.store.slotCap(date, hour, set[0].id) : 'locuri setate';
      badge = '<span class="cnt capo" title="locuri setate pe secții">' + lbl + '</span>' + badge;
    }
    var sel = (a.panel.mode === 'new' || a.panel.mode === 'slot') && a.panel.date === date && a.panel.hour === hour;
    var html = '<div class="ag-cell' + (past ? ' past' : '') + (sel ? ' picked' : '') + (capM === 0 ? ' closed' : '') +
      '" data-cell="1" data-date="' + date + '" data-hour="' + hour + '"><div class="cell-top">' + badge + '</div>';
    list.forEach(function (b) {
      var c = MC.catById(b.cat);
      var svc = MC.serviceById(b.serviceId);
      var start = b.hour === hour;
      var on = a.panel.mode === 'booking' && a.panel.id === b.id;
      var who = b.childName ? b.childName + ' (copil)' : b.name;
      html += '<div role="button" tabindex="0" class="bchip' + (start ? '' : ' cont') + (on ? ' on' : '') + (b.status === 'pending' ? ' pending' : '') +
        '" style="--cat:' + c.color + '"' + (start ? ' draggable="true"' : '') + ' data-action="adm-open" data-id="' + b.id + '"' +
        ' title="' + MC.esc(who + (svc ? ' · ' + svc.name : '') + (b.status === 'pending' ? ' · în așteptare' : '')) + '">' +
        '<span class="bn">' + (start ? '' : '↳ ') + (b.status === 'pending' ? '? ' : '') + MC.esc(who) + '</span>' +
        '<span class="bs">' + MC.esc(svc ? shortSvc(svc) : c.short) + '</span>' +
        (b.therapist ? '<span class="bt">' + MC.esc(MC.nick(b.therapist)) + '</span>' : '') + '</div>';
    });
    return html + '</div>';
  }

  function shortSvc(svc) {
    return svc.name.replace(/ – \d+ ședințe/, ' (pachet)').replace(/\s*\(.*?\)\s*$/, function (m) { return m.length > 18 ? '' : m; });
  }

  /* ---------- panoul din dreapta ---------- */

  function hourOptions(selected) {
    var s = MC.store.settings();
    var o = '';
    for (var h = s.open; h < s.close; h++) o += '<option value="' + h + '"' + (h === selected ? ' selected' : '') + '>' + MC.hourLabel(h) + '</option>';
    return o;
  }
  function serviceOptions(selected) {
    return MC.CATS.map(function (c) {
      return '<optgroup label="' + c.name + '">' + MC.SERVICES.filter(function (s) { return s.cat === c.id; }).map(function (s) {
        return '<option value="' + s.id + '"' + (s.id === selected ? ' selected' : '') + '>' + MC.esc(s.name) + (s.durLabel ? ' · ' + s.durLabel : '') + '</option>';
      }).join('') + '</optgroup>';
    }).join('');
  }

  function therapistOptions(selected) {
    return '<option value="">— nealocat —</option>' + MC.TEAM_GROUPS.map(function (g) {
      var names = MC.TEAM.filter(function (p) { return p.group === g.id; }).map(function (p) { return p.name; });
      return '<optgroup label="' + MC.esc(g.name) + '">' + names.map(function (n) {
        return '<option value="' + MC.esc(n) + '"' + (n === selected ? ' selected' : '') + '>' + MC.esc(n) + '</option>';
      }).join('') + '</optgroup>';
    }).join('');
  }

  /* Ce se poate bloca: toată clinica, toată recuperarea, o secție (după secțiile din baza de date). */
  var BLOCK_GROUPS = [
    { id: '*', label: 'Toată clinica', cats: ['*'] },
    { id: 'rec', label: 'Recuperare medicală', hint: 'kinetoterapie, masaj, fizioterapie', cats: ['kineto', 'masaj', 'fizio'] },
    { id: 'kineto', label: 'Kinetoterapie', cats: ['kineto'] },
    { id: 'masaj', label: 'Masaj', cats: ['masaj'] },
    { id: 'fizio', label: 'Fizioterapie', cats: ['fizio'] },
    { id: 'neuro', label: 'Neurologie, psihiatrie, neurofeedback', cats: ['neuro'] }
  ];
  function groupById(id) { return BLOCK_GROUPS.find(function (g) { return g.id === id; }); }
  function dayHours() {
    var s = MC.store.settings(), out = [];
    for (var h = s.open; h < s.close; h++) out.push(h);
    return out;
  }
  function blocked(date, hours, cats) {
    return hours.every(function (h) { return cats.every(function (c) { return MC.store.slotCap(date, h, c) === 0; }); });
  }
  /* Secțiile blocate (0 locuri) la o oră sau toată ziua; '*' = toată clinica. */
  function blockedCats(date, hours) {
    return ['*'].concat(MC.CATS.map(function (c) { return c.id; })).filter(function (c) { return blocked(date, hours, [c]); });
  }
  function blockedLabel(list) {
    if (!list.length) return '';
    if (list.indexOf('*') >= 0) return 'Toată clinica';
    var names = [];
    var rec = ['kineto', 'masaj', 'fizio'].every(function (c) { return list.indexOf(c) >= 0; });
    if (rec) names.push('Recuperare');
    list.forEach(function (c) { if (!(rec && ['kineto', 'masaj', 'fizio'].indexOf(c) >= 0)) names.push(MC.catById(c).short); });
    return names.join(', ');
  }
  function dayClosed(date) { return blocked(date, dayHours(), ['*']); }

  /* Alegerea a ce se blochează: la ora selectată sau toată ziua. */
  function blockChooser(date, hour, scope) {
    var hours = scope === 'day' ? dayHours() : [hour];
    var rows = BLOCK_GROUPS.map(function (g) {
      var isB = blocked(date, hours, g.cats);
      return '<button type="button" class="block-opt' + (isB ? ' is-blocked' : '') + '" data-action="adm-block" data-scope="' + scope + '" data-group="' + g.id + '">' +
        (isB ? I.unlock : I.lock) + '<span class="bo-txt"><b>' + g.label + '</b>' + (g.hint ? '<small>' + g.hint + '</small>' : '') +
        (isB ? '<small class="bo-hint">Apasă ca să deblochezi</small>' : '') + '</span>' +
        '<span class="bo-tag">' + (isB ? 'Blocat' : 'Blochează') + '</span></button>';
    }).join('');
    return '<div class="sub-form block-card"><h3>' + (scope === 'day' ? 'Ce blochezi toată ziua (' + MC.fmtDate(date) + ')?' : 'Ce blochezi la ora ' + MC.hourLabel(hour) + '?') + '</h3>' +
      '<p class="muted small">Pacienții nu mai pot alege online ce e blocat. Programările deja făcute rămân în agendă.</p>' +
      '<div class="block-opts">' + rows + '</div>' +
      '<button type="button" class="btn ghost block" data-action="adm-cancel-no">Gata</button></div>';
  }

  /* Câte locuri sunt la o anumită oră: setate manual pe secție sau pe toată clinica. */
  function capsCard(date, hour) {
    var rowsH = [{ id: '*', short: 'Toată clinica', color: '#50677a' }].concat(MC.CATS).map(function (c) {
      var v = MC.store.slotCap(date, hour, c.id);
      var used = MC.store.countWhere(date, hour, null, c.id === '*' ? null : c.id);
      return '<div class="cap-row"><label for="cap-' + (c.id === '*' ? 'all' : c.id) + '-h"><i class="dot" style="background:' + c.color + '"></i>' + c.short +
        '<small>' + used + ' ocupate</small></label>' +
        '<input type="number" min="0" max="50" inputmode="numeric" id="cap-' + (c.id === '*' ? 'all' : c.id) + '-h" data-cat="' + c.id + '" placeholder="normal" value="' + (v == null ? '' : v) + '"></div>';
    }).join('');
    return '<form class="form sub-form caps-card" id="adm-caps" data-date="' + date + '" data-hour="' + hour + '" novalidate>' +
      '<h3>Locuri la ora ' + MC.hourLabel(hour) + ', ' + MC.fmtDate(date) + '</h3>' +
      '<p class="muted small">Gol = normal (după Setări). 0 = închis la ora asta. Pacienții văd online doar orele cu locuri.</p>' + rowsH +
      '<p class="form-error" id="caps-error" role="alert" hidden></p>' +
      '<button class="btn primary block" type="submit">Salvează locurile</button>' +
      '<button type="button" class="btn ghost block" data-action="adm-cancel-no">Renunță</button></form>';
  }

  /* Click pe o oră: butoane pentru programare nouă, blocare oră/zi și locuri. */
  function panelSlot() {
    var p = MC.adm.panel, date = p.date, hour = p.hour, sub = MC.adm.confirm;
    var used = MC.store.countWhere(date, hour, null, null);
    var all = MC.store.slotCap(date, hour, '*');
    var caps = MC.store.supports('caps');
    var bHour = caps ? blockedCats(date, [hour]) : [], bDay = caps ? blockedCats(date, dayHours()) : [];
    var others = MC.CATS.filter(function (c) { var v = MC.store.slotCap(date, hour, c.id); return v != null && v > 0; });
    var state = (bDay.length ? 'Blocat toată ziua: ' + blockedLabel(bDay) + '.' : '') +
      (bHour.length && blockedLabel(bHour) !== blockedLabel(bDay) ? (bDay.length ? ' ' : '') + 'Blocat la ora asta: ' + blockedLabel(bHour) + '.' : '') +
      (all != null && all > 0 ? ' Maximum ' + all + ' pacienți la ora asta (toată clinica).' : '') +
      (others.length ? ' Locuri setate: ' + others.map(function (c) { return c.short + ' ' + MC.store.slotCap(date, hour, c.id); }).join(', ') + '.' : '');
    if (!state) state = 'Totul este deschis, cu locurile normale (după Setări).';
    var on = function (k) { return sub === k ? ' on' : ''; };
    var grid = act(I.plus, 'Programare nouă', 'data-action="adm-sub" data-sub="add"', 'ok' + on('add')) + (!caps ? '' :
      act(I.lock, bHour.length ? 'Blocare la ora asta' : 'Blochează ora', 'data-action="adm-sub" data-sub="block-hour"', 'bad' + on('block-hour')) +
      act(I.seats, 'Locuri la ora asta', 'data-action="adm-sub" data-sub="caps"', on('caps')) +
      act(I.day, bDay.length ? 'Blocare toată ziua' : 'Blochează ziua', 'data-action="adm-sub" data-sub="block-day"', 'bad' + on('block-day')));
    var shutDay = bDay.indexOf('*') >= 0;
    var form = sub === 'add' ? addForm(date, hour) : sub === 'caps' ? capsCard(date, hour)
      : sub === 'block-hour' ? blockChooser(date, hour, 'hour') : sub === 'block-day' ? blockChooser(date, hour, 'day') : '';
    return '<div class="card"><div class="panel-head"><h2 class="card-title">' + MC.cap(MC.fmtDate(date)) + ', ora ' + MC.hourLabel(hour) + '</h2>' +
      '<button class="icon-btn" data-action="adm-close" aria-label="Închide">×</button></div>' +
      '<p class="slot-state' + (bHour.length || bDay.length ? ' shut' : '') + '">' + state + '<br><span class="muted small">' + used + (used === 1 ? ' programare' : ' programări') + ' la ora asta</span></p>' +
      '<h3 class="act-title">Ce vrei să faci?</h3><div class="act-grid">' + grid + '</div>' +
      '<p class="form-error" id="slot-error" role="alert" hidden></p>' + form + '</div>';
  }

  function panel() {
    var p = MC.adm.panel;
    if (p.mode === 'slot') return panelSlot();
    if (p.mode === 'booking') return panelBooking(MC.store.get(p.id));
    if (p.mode === 'new') return panelNew();
    if (p.mode === 'requests') return panelRequests();
    return panelIdle();
  }

  function panelIdle() {
    var s = MC.store.settings();
    var t = MC.ymd(MC.today());
    var today = MC.store.bookingsOn(t);
    var hasDemo = MC.store.bookings().some(function (b) { return b.demo; });
    var nPending = MC.store.pending().length;
    return (nPending ? '<button class="card pending-card" data-action="adm-requests"><b>' + nPending + (nPending === 1 ? ' cerere nouă' : ' cereri noi') +
        '</b><span>așteaptă confirmare</span>' + MC.ICONS.arrow + '</button>' : '') +
      '<div class="card"><h2 class="card-title">Azi, ' + MC.fmtDate(t) + '</h2>' +
      (s.days.indexOf(MC.today().getDay()) < 0 ? '<p class="muted">Clinica nu lucrează azi.</p>' :
        '<div class="kv"><span>Programări azi</span><b>' + today.length + '</b></div>' +
        MC.CATS.map(function (c) {
          var n = today.filter(function (b) { return b.cat === c.id; }).length;
          return '<div class="kv"><span><i class="dot" style="background:' + c.color + '"></i>' + c.short + '</span><b>' + n + '</b></div>';
        }).join('')) +
      '</div>' +
      '<div class="card help"><h3>Cum folosești agenda</h3><ul>' +
        '<li>Cererile noi apar cu „?” și chenar punctat. Apasă pe ele ca să le confirmi, să le muți sau să le refuzi.</li>' +
        '<li>După confirmare, apasă „Trimite pe WhatsApp”: mesajul pentru pacient e scris deja.</li>' +
        '<li>Trage un pacient în altă oră ca să-l muți. Pe telefon folosește butonul <b>Mută</b>.</li>' +
        '<li>Apasă pe o oră goală ca să adaugi un pacient care a sunat.</li>' +
      '</ul></div>' +
      (hasDemo ? '<p class="demo-note">Agenda conține programări de test, marcate „test”. Le poți șterge din Setări.</p>' : '');
  }

  function panelRequests() {
    var list = MC.store.pending();
    return '<div class="card"><div class="panel-head"><h2 class="card-title">Cereri în așteptare</h2>' +
      '<button class="icon-btn" data-action="adm-close" aria-label="Închide">×</button></div>' +
      (list.length ? '<ul class="req-list">' + list.map(function (b) {
        var svc = MC.serviceById(b.serviceId);
        var c = MC.catById(b.cat);
        return '<li><button class="req" style="--cat:' + c.color + '" data-action="adm-open" data-id="' + b.id + '">' +
          '<b>' + MC.esc(b.childName ? b.childName + ' (copil)' : b.name) + (b.newPatient ? ' · pacient nou' : '') + '</b>' +
          '<span>' + MC.esc(svc ? svc.name : c.short) + '</span>' +
          '<small>' + MC.cap(MC.fmtDate(b.date)) + ', ' + MC.hourLabel(b.hour) + (b.evalDeclared ? ' · verifică evaluarea' : '') + '</small></button></li>';
      }).join('') + '</ul>' : '<p class="muted">Nu sunt cereri noi.</p>') +
      '</div>';
  }

  /* Mesajul pentru pacient, gata de trimis pe WhatsApp. */
  function patientMessage(b) {
    var svc = MC.serviceById(b.serviceId);
    var C = MC.CLINIC;
    var forWho = b.childName ? ' pentru ' + b.childName : '';
    var when = MC.fmtDate(b.date) + ', ora ' + MC.hourLabel(b.hour);
    if (b.status === 'confirmed') {
      return 'Bună ziua! Programarea' + forWho + ' la ' + (svc ? svc.name : 'Medicenter') + ' este confirmată: ' + when +
        '. Adresa: ' + C.address + '. Vă așteptăm! ' + C.name;
    }
    if (b.status === 'rejected' || b.status === 'cancelled') {
      return 'Bună ziua! Din păcate programarea' + forWho + ' din ' + when + ' nu poate avea loc' +
        (b.staffNote ? ' (' + b.staffNote + ')' : '') + '. Vă rugăm să ne sunați la ' + C.phone + ' pentru altă oră. ' + C.name;
    }
    return 'Bună ziua! Am primit cererea' + forWho + ' pentru ' + when + '. Revenim cu confirmarea. ' + C.name;
  }
  function waLink(phone, text) {
    var d = String(phone).replace(/\D/g, '');
    if (d.indexOf('0040') === 0) d = d.slice(2);
    else if (d.indexOf('0') === 0) d = '4' + d;
    return 'https://wa.me/' + d + '?text=' + encodeURIComponent(text);
  }

  function panelBooking(b) {
    if (!b) { MC.adm.panel = { mode: 'idle' }; return panelIdle(); }
    var svc = MC.serviceById(b.serviceId);
    var c = MC.catById(b.cat);
    var cfm = MC.adm.confirm;
    var endMin = b.hour * 60 + ((svc && svc.dur) || 60);
    var pending = b.status === 'pending';
    var activeB = MC.store.active(b);
    var tag = b.demo ? '<span class="tag">test</span> ' : '';
    tag += '<span class="tag st-' + (b.status || 'confirmed') + '">' + STATUS_LABEL[b.status || 'confirmed'] + '</span> ' +
      '<span class="tag ' + (b.source === 'online' ? 'online' : 'phone') + '">' + (b.source === 'online' ? 'cerere online' : 'adăugată de clinică') + '</span>' +
      (b.newPatient ? ' <span class="tag new">pacient nou</span>' : '');
    var ev = MC.store.evalFor(b.serviceId);
    var hasPhone = MC.validPhone(b.phone);

    var sub = cfm;
    var on = function (k) { return sub === k ? ' on' : ''; };
    var grid = '';
    if (pending) {
      grid += act(MC.ICONS.check, 'Confirmă', 'data-action="adm-confirm"', 'ok') +
        act(I.x, 'Refuză', 'data-action="adm-sub" data-sub="reject"', 'bad' + on('reject')) +
        act(I.move, 'Altă oră', 'data-action="adm-sub" data-sub="move"', on('move'));
    } else if (activeB) {
      grid += act(I.move, 'Mută', 'data-action="adm-sub" data-sub="move"', on('move'));
    } else {
      grid += act(I.redo, 'Reactivează', 'data-action="adm-reactivate"', 'ok');
    }
    grid += act(I.edit, 'Modifică datele', 'data-action="adm-sub" data-sub="edit"', on('edit'));
    if (hasPhone) grid += actLink(I.chat, 'WhatsApp', waLink(b.phone, patientMessage(b)), 'wa') + actLink(MC.ICONS.phone, 'Sună', 'tel:' + b.phone.replace(/\s/g, ''));
    if (activeB && !pending) grid += act(I.trash, 'Anulează', 'data-action="adm-sub" data-sub="cancel"', 'bad' + on('cancel'));

    var form = '';
    if (sub === 'reject') {
      form = '<form class="form sub-form" id="adm-reject" novalidate><h3>Refuzi cererea?</h3><label for="rj-note">Motivul (îl vede pacientul)</label>' +
        '<input id="rj-note" maxlength="200" placeholder="ex.: ora e ocupată, vă rugăm sunați-ne">' +
        '<div class="row2"><button class="btn danger" type="submit">Da, refuză</button><button class="btn ghost" type="button" data-action="adm-cancel-no">Renunță</button></div></form>';
    } else if (sub === 'cancel') {
      form = '<div class="sub-form"><h3>Anulezi programarea?</h3><p class="muted small">Locul devine liber pentru alți pacienți. Anunță apoi pacientul pe WhatsApp.</p>' +
        '<div class="row2"><button class="btn danger" data-action="adm-cancel-yes">Da, anulează</button><button class="btn ghost" data-action="adm-cancel-no">Renunță</button></div></div>';
    } else if (sub === 'move') {
      form = '<form class="form sub-form" id="adm-move" novalidate><h3>' + (pending ? 'Propune altă oră (și confirmă)' : 'Mută programarea') + '</h3>' +
        '<div class="row2"><div><label for="mv-date">Ziua</label><input type="date" id="mv-date" value="' + b.date + '" required></div>' +
        '<div><label for="mv-hour">Ora</label><select id="mv-hour">' + hourOptions(b.hour) + '</select></div></div>' +
        '<p class="form-error" id="mv-error" role="alert" hidden></p>' +
        '<div class="row2"><button class="btn primary" type="submit">' + (pending ? 'Mută și confirmă' : 'Mută') + '</button><button class="btn ghost" type="button" data-action="adm-cancel-no">Renunță</button></div>' +
        '<p class="muted small">Pe calculator poți și trage programarea direct în altă oră.</p></form>';
    } else if (sub === 'edit') {
      form = '<form class="form sub-form" id="adm-edit" novalidate><h3>Modifică datele</h3>' +
        '<label for="ed-name">Nume și prenume' + (b.childName ? ' (părintele)' : '') + '</label><input id="ed-name" maxlength="120" value="' + MC.esc(b.name) + '">' +
        '<label for="ed-phone">Telefon</label><input id="ed-phone" type="tel" inputmode="tel" maxlength="40" value="' + MC.esc(b.phone) + '">' +
        '<div class="row2"><div><label for="ed-child">Copil (opțional)</label><input id="ed-child" maxlength="120" value="' + MC.esc(b.childName || '') + '"></div>' +
        '<div><label for="ed-age">Vârsta copilului</label><input id="ed-age" type="number" min="0" max="17" value="' + (b.childAge == null ? '' : b.childAge) + '"></div></div>' +
        '<label for="ed-note">Observații</label><textarea id="ed-note" rows="2" maxlength="500">' + MC.esc(b.note || '') + '</textarea>' +
        '<p class="form-error" id="ed-error" role="alert" hidden></p>' +
        '<div class="row2"><button class="btn primary" type="submit">Salvează</button><button class="btn ghost" type="button" data-action="adm-cancel-no">Renunță</button></div>' +
        '<p class="muted small">Pentru alt serviciu: anulează și adaugă o programare nouă.</p></form>';
    }
    var actions = '<div class="card"><h3 class="act-title">Ce vrei să faci?</h3><div class="act-grid">' + grid + '</div>' + form + '</div>';

    return '<div class="card"><div class="panel-head"><h2 class="card-title">' + MC.esc(b.childName || b.name) + '</h2>' +
      '<button class="icon-btn" data-action="adm-close" aria-label="Închide">×</button></div>' +
      '<div class="tags">' + tag + '</div>' +
      (b.childName ? '<div class="kv"><span>Copil</span><b>' + MC.esc(b.childName) + (b.childAge != null ? ', ' + b.childAge + ' ani' : '') + '</b></div>' +
        '<div class="kv"><span>Părinte</span><b>' + MC.esc(b.name) + '</b></div>' : '') +
      '<div class="kv"><span>Telefon</span><b>' + (hasPhone ? '<a href="tel:' + MC.esc(b.phone.replace(/\s/g, '')) + '">' + MC.esc(b.phone) + '</a>' : MC.esc(b.phone)) + '</b></div>' +
      '<div class="kv"><span>Serviciu</span><b>' + MC.esc(svc ? svc.name : '—') + '</b></div>' +
      '<div class="kv"><span>Secția</span><b><i class="dot" style="background:' + c.color + '"></i>' + c.short + '</b></div>' +
      '<div class="kv"><span>' + (pending ? 'Data cerută' : 'Data') + '</span><b>' + MC.cap(MC.fmtDate(b.date)) + '</b></div>' +
      '<div class="kv"><span>Ora</span><b>' + MC.hourLabel(b.hour) + ' – ' + MC.pad(Math.floor(endMin / 60)) + ':' + MC.pad(endMin % 60) + '</b></div>' +
      (b.availability ? '<div class="kv"><span>Poate veni</span><b>' + MC.esc(b.availability) + '</b></div>' : '') +
      (!MC.store.supports('therapist') ? '' : '<div class="kv kv-select"><label for="bk-ther">Terapeut</label><select id="bk-ther" data-change="adm-therapist" data-id="' + b.id + '">' + therapistOptions(b.therapist) + '</select></div>') +
      (ev ? '<div class="eval-box' + (b.evalDeclared ? '' : ' warn') + '">' + (b.evalDeclared
        ? 'Pacientul declară că a făcut <b>' + MC.esc(MC.serviceById(ev).name) + '</b>. Verifică înainte de confirmare.'
        : 'Terapia cere <b>' + MC.esc(MC.serviceById(ev).name) + '</b> înainte.') + '<div id="eval-history"></div></div>' : '') +
      (b.note ? '<div class="note-box">' + MC.esc(b.note) + '</div>' : '') +
      (b.staffNote ? '<div class="note-box"><b>Mesaj către pacient:</b> ' + MC.esc(b.staffNote) + '</div>' : '') +
      '<div id="history-box" class="history"></div>' +
      '</div>' +
      actions;
  }

  /* Istoricul pacientului după telefon: vizite anterioare și dacă a făcut evaluarea. */
  function loadHistory(b) {
    if (!b || !MC.validPhone(b.phone)) return;
    MC.store.history(b.phone).then(function (list) {
      var box = document.getElementById('history-box');
      if (!box || MC.adm.panel.id !== b.id) return;
      var others = list.filter(function (x) { return x.id !== b.id; });
      var ev = MC.store.evalFor(b.serviceId);
      var evalDone = ev && others.find(function (x) { return x.serviceId === ev && x.status === 'confirmed' && x.date <= MC.ymd(MC.today()); });
      var evBox = document.getElementById('eval-history');
      if (evBox && ev) {
        evBox.innerHTML = evalDone
          ? '<p class="ok-line">' + MC.ICONS.check + 'Evaluare găsită în agendă: ' + MC.fmtDate(evalDone.date) + '</p>'
          : '<p class="warn-line">Nu am găsit evaluarea în agendă pe acest telefon.</p>';
      }
      if (!others.length) { box.innerHTML = '<p class="muted small">Pacient nou: nicio altă programare pe acest telefon.</p>'; return; }
      box.innerHTML = '<h3>Istoric (' + others.length + ')</h3><ul>' + others.slice(0, 8).map(function (x) {
        var s2 = MC.serviceById(x.serviceId);
        return '<li><span>' + MC.fmtDate(x.date) + ', ' + MC.hourLabel(x.hour) + '</span><b>' + MC.esc(s2 ? shortSvc(s2) : '') + '</b>' +
          '<em>' + STATUS_LABEL[x.status || 'confirmed'] + '</em></li>';
      }).join('') + '</ul>';
    }, function () {});
  }

  function addForm(date, hour) {
    var firstOfCat = MC.catById(MC.adm.filter) ? MC.SERVICES.find(function (s) { return s.cat === MC.adm.filter; }).id : 'k01';
    return '<form class="form sub-form" id="adm-add" novalidate><h3>Programare nouă (confirmată)</h3>' +
      '<label for="ad-svc">Serviciu</label><select id="ad-svc" required>' + serviceOptions(firstOfCat) + '</select>' +
      '<div class="row2"><div><label for="ad-date">Ziua</label><input type="date" id="ad-date" value="' + date + '" required></div>' +
      '<div><label for="ad-hour">Ora</label><select id="ad-hour">' + hourOptions(hour) + '</select></div></div>' +
      '<label for="ad-name">Nume și prenume (părintele, pentru copii)</label><input id="ad-name" required>' +
      '<div class="row2"><div><label for="ad-child">Copil (opțional)</label><input id="ad-child" maxlength="120"></div>' +
      '<div><label for="ad-age">Vârsta copilului</label><input id="ad-age" type="number" min="0" max="17"></div></div>' +
      '<label for="ad-phone">Telefon</label><input id="ad-phone" type="tel" inputmode="tel" placeholder="07xx xxx xxx">' +
      (MC.store.supports('therapist') ? '<label for="ad-ther">Terapeut</label><select id="ad-ther">' + therapistOptions(MC.adm.filter.indexOf('t:') === 0 ? MC.adm.filter.slice(2) : '') + '</select>' : '') +
      '<label for="ad-note">Observații</label><textarea id="ad-note" rows="2"></textarea>' +
      '<p class="form-error" id="ad-error" role="alert" hidden></p>' +
      '<div class="row2"><button class="btn primary" type="submit">Adaugă în agendă</button><button class="btn ghost" type="button" data-action="adm-cancel-no">Renunță</button></div></form>';
  }

  function panelNew() {
    var p = MC.adm.panel;
    var date = p.date || MC.ymd(MC.today());
    var firstOfCat = MC.catById(MC.adm.filter) ? MC.SERVICES.find(function (s) { return s.cat === MC.adm.filter; }).id : 'k01';
    return '<form class="card form" id="adm-add" novalidate><div class="panel-head"><h2 class="card-title">Programare nouă</h2>' +
      '<button type="button" class="icon-btn" data-action="adm-close" aria-label="Închide">×</button></div>' +
      '<label for="ad-svc">Serviciu</label><select id="ad-svc" required>' + serviceOptions(p.serviceId || firstOfCat) + '</select>' +
      '<div class="row2"><div><label for="ad-date">Ziua</label><input type="date" id="ad-date" value="' + date + '" required></div>' +
      '<div><label for="ad-hour">Ora</label><select id="ad-hour">' + hourOptions(p.hour != null ? p.hour : MC.store.settings().open) + '</select></div></div>' +
      '<label for="ad-name">Nume și prenume (părintele, pentru copii)</label><input id="ad-name" required>' +
      '<div class="row2"><div><label for="ad-child">Copil (opțional)</label><input id="ad-child" maxlength="120"></div>' +
      '<div><label for="ad-age">Vârsta copilului</label><input id="ad-age" type="number" min="0" max="17"></div></div>' +
      '<label for="ad-phone">Telefon</label><input id="ad-phone" type="tel" inputmode="tel" placeholder="07xx xxx xxx">' +
      (MC.store.supports('therapist') ? '<label for="ad-ther">Terapeut</label><select id="ad-ther">' + therapistOptions(MC.adm.filter.indexOf('t:') === 0 ? MC.adm.filter.slice(2) : '') + '</select>' : '') +
      '<label for="ad-note">Observații</label><textarea id="ad-note" rows="2"></textarea>' +
      '<p class="form-error" id="ad-error" role="alert" hidden></p>' +
      '<button class="btn primary block" type="submit">Adaugă în agendă (confirmată)</button>' +
      '</form>';
  }

  /* ---------- setări (doar administratori) ---------- */

  function settings() {
    var s = MC.store.settings();
    var cfm = MC.adm.confirm;
    var hasDemo = MC.store.bookings().some(function (b) { return b.demo; });
    var dayOrder = [1, 2, 3, 4, 5, 6, 0];
    var opts = function (from, to, sel) {
      var o = ''; for (var h = from; h <= to; h++) o += '<option value="' + h + '"' + (h === sel ? ' selected' : '') + '>' + MC.hourLabel(h) + '</option>'; return o;
    };
    var evalChoices = MC.SERVICES.filter(function (x) { return /evaluare|consulta/i.test(x.name); });
    return shell('<div class="adm-settings wrap">' +
      '<form class="card form" id="adm-settings" novalidate>' +
        '<h1 class="adm-title">Setări</h1>' +
        '<h3>Program</h3>' +
        '<div class="row2"><div><label for="st-open">Prima programare</label><select id="st-open">' + opts(6, 14, s.open) + '</select></div>' +
        '<div><label for="st-close">Închidere</label><select id="st-close">' + opts(12, 23, s.close) + '</select></div></div>' +
        '<fieldset class="days"><legend>Zile lucrătoare</legend>' + dayOrder.map(function (d) {
          return '<label><input type="checkbox" id="st-day-' + d + '" value="' + d + '"' + (s.days.indexOf(d) >= 0 ? ' checked' : '') + '>' + MC.cap(MC.DAYS_LONG[d]) + '</label>';
        }).join('') + '</fieldset>' +
        '<label for="st-ahead">Pacienții pot cere programări cu maximum</label>' +
        '<div class="inline"><input type="number" id="st-ahead" min="7" max="365" value="' + s.maxDaysAhead + '"> <span>zile înainte</span></div>' +
        '<h3>Terapii: locuri pe oră și evaluare obligatorie</h3>' +
        '<p class="muted small">„Locuri” = câți pacienți pot face aceeași terapie în aceeași oră (1 = individual). ' +
          'Bifează „Evaluare înainte” la terapiile care cer o evaluare făcută la clinică, înainte de prima ședință, ' +
          'și „Pacienți noi” la evaluările și consultațiile pe care le poate alege un pacient nou sau fără trimitere.</p>' +
        MC.CATS.map(function (c) {
          return '<details class="svc-set" style="--cat:' + c.color + '"><summary><i class="dot" style="background:' + c.color + '"></i>' + c.name + '</summary>' +
            '<div class="svc-rows">' + MC.SERVICES.filter(function (x) { return x.cat === c.id; }).map(function (x) {
              var ev = s.evalRequired[x.id] || '';
              return '<div class="svc-row"><span class="svc-row-name">' + MC.esc(x.name) + '</span>' +
                '<label class="cap-in">Locuri <input type="number" min="1" max="30" id="cap-' + x.id + '" value="' + MC.store.capOf(x.id) + '"></label>' +
                '<label class="ev-in"><input type="checkbox" id="ev-' + x.id + '"' + (ev ? ' checked' : '') + '> Evaluare înainte</label>' +
                '<label class="ev-in"><input type="checkbox" id="np-' + x.id + '"' + (MC.store.forNewPatients(x.id) ? ' checked' : '') + '> Pacienți noi</label>' +
                '<select id="evs-' + x.id + '" aria-label="Evaluarea cerută">' + evalChoices.map(function (e) {
                  return '<option value="' + e.id + '"' + ((ev || 'k06') === e.id ? ' selected' : '') + '>' + MC.esc(e.name) + '</option>';
                }).join('') + '</select></div>';
            }).join('') + '</div></details>';
        }).join('') +
        '<p class="form-error" id="st-error" role="alert" hidden></p>' +
        '<button class="btn primary" type="submit">Salvează setările</button>' +
      '</form>' +
      (MC.store.live ? staffCard() : '') +
      (!MC.store.live ? '<div class="card"><h3>Date de test</h3>' +
        (hasDemo
          ? (cfm === 'clear'
            ? '<p>Ștergi toate programările de test? Cele făcute de pacienți sau de voi rămân.</p><div class="row2"><button class="btn danger" data-action="adm-clear-yes">Da, șterge</button><button class="btn ghost" data-action="adm-cancel-no">Nu</button></div>'
            : '<p class="muted small">Agenda conține programări de test, folosite ca exemplu în demo.</p><button class="btn danger-ghost" data-action="adm-clear">Șterge programările de test</button>')
          : '<p class="muted small">Nu mai există programări de test în agendă.</p>') +
        '</div>' : '') +
      '</div>');
  }

  function staffCard() {
    var list = MC.adm.staff;
    if (!list) {
      MC.store.staffList().then(function (l) { MC.adm.staff = l; MC.render(); }, function (e) { MC.toast(e.message, 'bad'); });
      return '<div class="card"><h3>Personal</h3><p class="muted">Se încarcă…</p></div>';
    }
    var me = (MC.store.email() || '').toLowerCase();
    return '<div class="card staff-card"><h3>Personal cu acces la agendă</h3>' +
      '<p class="muted small">Adaugă emailul colegului aici. Apoi colegul deschide agenda, apasă „Prima dată aici? Creează cont” și își alege parola.</p>' +
      '<ul class="staff-list">' + list.map(function (p) {
        var cfm = MC.adm.confirm === 'staff:' + p.email;
        return '<li><div><b>' + MC.esc(p.name || p.email) + '</b><small>' + MC.esc(p.email) + ' · ' + (p.role === 'admin' ? 'administrator' : 'personal') + '</small></div>' +
          (p.email === me ? '<span class="muted small">tu</span>'
            : cfm ? '<span class="row-actions"><button class="btn danger small" data-action="adm-staff-del-yes" data-email="' + MC.esc(p.email) + '">Scoate</button>' +
                    '<button class="btn ghost small" data-action="adm-cancel-no">Nu</button></span>'
              : '<button class="btn danger-ghost small" data-action="adm-staff-del" data-email="' + MC.esc(p.email) + '">Scoate accesul</button>') +
          '</li>';
      }).join('') + '</ul>' +
      '<form class="form staff-add" id="adm-staff" novalidate>' +
        '<div class="row2"><div><label for="sf-name">Nume</label><input id="sf-name" placeholder="ex. Andreea Popescu"></div>' +
        '<div><label for="sf-email">Email</label><input id="sf-email" type="email" required></div></div>' +
        '<label class="check" for="sf-admin"><input type="checkbox" id="sf-admin"><span>Administrator (poate schimba setările și lista personalului)</span></label>' +
        '<p class="form-error" id="sf-error" role="alert" hidden></p>' +
        '<button class="btn primary" type="submit">Adaugă în personal</button>' +
      '</form></div>';
  }

  /* ---------- cont: parolă și instalare pe telefon ---------- */

  /* Chrome pe Android anunță că aplicația se poate instala; păstrăm evenimentul pentru butonul „Instalează”. */
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); MC.adm.installEvt = e; if (document.body.classList.contains('is-admin')) MC.render(); });
  function standalone() {
    return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  }
  function device() {
    var ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    return 'desktop';
  }
  /* Instrucțiuni de instalare, doar pentru telefonul folosit acum (pe calculator: codul QR). */
  function installHelp() {
    if (standalone()) return '<p class="info-box ok">Agenda este instalată pe acest telefon.</p>';
    var d = device();
    if (d === 'android') {
      return (MC.adm.installEvt ? '<button class="btn primary block big-install" data-action="adm-install">📲 Instalează agenda pe telefon</button>' +
          '<p class="muted small center-text">Apasă butonul, apoi „Instalează”. Gata.</p>' : '') +
        '<ol class="big-steps">' + (MC.adm.installEvt ? '<li class="muted small">Dacă butonul nu apare:</li>' : '') +
          '<li>Apasă <b>⋮</b> (cele 3 puncte, sus în dreapta)</li>' +
          '<li>Apasă <b>Instalează aplicația</b> sau <b>Adaugă pe ecranul de pornire</b></li></ol>';
    }
    if (d === 'ios') {
      var other = /CriOS|FxiOS|EdgiOS|GSA|FBAN|FBAV|Instagram/.test(navigator.userAgent);
      return '<p class="info-box">Pe iPhone nu există buton de descărcare: Apple permite doar „Adaugă pe ecranul principal”, din Safari.</p>' +
        (other ? '<p class="info-box warn">Ai deschis pagina în alt browser. Copiază adresa de mai jos și deschide-o în <b>Safari</b>:<br><b>' +
          MC.esc(location.origin + location.pathname) + '</b></p>' : '') +
        '<ol class="big-steps">' +
        '<li>Deschide pagina în <b>Safari</b> (busola albastră)</li>' +
        '<li>Apasă ' + SHARE_ICON + ' <b>Partajează</b>: pătratul cu săgeată, lângă adresa site-ului (sus sau jos). Dacă nu îl vezi, apasă întâi <b>⋯</b></li>' +
        '<li>Derulează lista și apasă <b>Adaugă pe ecranul principal</b></li>' +
        '<li>Apasă <b>Adaugă</b> (sus, în dreapta)</li></ol>';
    }
    return '<div class="qr-box"><img src="img/qr-agenda.png" alt="Cod QR pentru agenda Medicenter" width="180" height="180">' +
      '<p>Scanează codul cu <b>camera telefonului</b>. Se deschide agenda, iar pe telefon apar pașii de instalare.</p></div>';
  }
  /* ---------- notificări pe telefon (cereri noi) ---------- */
  function pushAvailable() {
    return MC.store.live && MC.CONFIG && MC.CONFIG.vapidPublicKey && MC.store.supports('push');
  }
  function b64ToU8(b64) {
    var pad = '='.repeat((4 - b64.length % 4) % 4);
    var raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  /* 'on' | 'off' | 'denied' | 'need-install' (iPhone, din browser) | 'unsupported' */
  MC.refreshPush = function () {
    var before = MC.adm.push;
    var done = function (st) { MC.adm.push = st; if (st !== before && document.body.classList.contains('is-admin')) MC.render(); };
    if (!pushAvailable()) return done('unsupported');
    if (device() === 'ios' && !standalone()) return done('need-install');
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return done('unsupported');
    if (Notification.permission === 'denied') return done('denied');
    navigator.serviceWorker.getRegistration().then(function (reg) {
      return reg ? reg.pushManager.getSubscription() : null;
    }).then(function (sub) { done(sub ? 'on' : 'off'); }, function () { done('off'); });
  };
  function pushOn() {
    if (!('Notification' in window)) return Promise.reject(new Error('Telefonul nu permite notificări din browser.'));
    return Notification.requestPermission().then(function (perm) {
      if (perm !== 'granted') throw new Error('Notificările nu au fost permise. Le poți activa din setările telefonului.');
      return navigator.serviceWorker.register('sw.js').then(function () { return navigator.serviceWorker.ready; });
    }).then(function (reg) {
      return reg.pushManager.getSubscription().then(function (old) {
        return old || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(MC.CONFIG.vapidPublicKey) });
      }).then(function (sub) {
        return MC.store.savePush(sub.toJSON()).then(function () {
          reg.showNotification('Notificările sunt active', { body: 'Vei primi aici fiecare cerere nouă de programare.', icon: 'img/icon-192.png', tag: 'medicenter-test' });
        });
      });
    });
  }
  function pushOff() {
    return navigator.serviceWorker.getRegistration().then(function (reg) { return reg && reg.pushManager.getSubscription(); }).then(function (sub) {
      if (!sub) return;
      var ep = sub.endpoint;
      return sub.unsubscribe().then(function () { return MC.store.removePush(ep); });
    });
  }
  function pushCard() {
    if (!pushAvailable()) return '';
    var st = MC.adm.push;
    var body = st === 'on' ? '<p class="info-box ok">Notificările sunt active pe acest dispozitiv: primești un mesaj la fiecare cerere nouă de pe site.</p>' +
        '<button class="btn ghost" data-action="adm-push-off">Oprește notificările aici</button>'
      : st === 'need-install' ? '<p class="info-box">Pe iPhone, notificările merg doar din <b>aplicația Agenda</b> pusă pe ecran (pașii de mai sus). Deschide-o de acolo și revino aici.</p>'
      : st === 'denied' ? '<p class="info-box warn">Notificările sunt blocate pentru acest site. Le permiți din setările telefonului (Notificări → browserul sau Agenda), apoi revii aici.</p>'
      : st === 'unsupported' ? '<p class="muted">Acest browser nu primește notificări. Pe Android folosește Chrome, pe iPhone aplicația Agenda de pe ecran.</p>'
      : '<p class="muted">Primești un mesaj pe telefon la fiecare cerere nouă de programare, chiar dacă agenda e închisă. Fără numele pacientului.</p>' +
        '<button class="btn primary big-install" data-action="adm-push-on">🔔 Activează notificările</button>';
    return '<div class="card form"><h3>Notificări pentru cererile noi</h3>' + body + '</div>';
  }

  function account() {
    return shell('<div class="adm-settings wrap">' +
      '<div class="card form install-card">' +
        '<h1 class="adm-title">Agenda pe telefon</h1>' + installHelp() +
        '<p class="muted small">Pe ecran apare iconița <b>Agenda</b>. Se deschide ca o aplicație și rămâi conectat.</p>' +
      '</div>' + pushCard() +
      '<form class="card form" id="adm-pass-form" novalidate>' +
        '<h3>Schimbă parola</h3>' +
        '<p class="muted small">Contul: ' + MC.esc(MC.store.email() || '') + '. Dacă folosiți un cont comun, după schimbare anunță colegii parola nouă.</p>' +
        '<div class="row2"><div><label for="np-1">Parola nouă</label><input id="np-1" type="password" autocomplete="new-password" minlength="8"></div>' +
        '<div><label for="np-2">Scrie-o din nou</label><input id="np-2" type="password" autocomplete="new-password" minlength="8"></div></div>' +
        '<p class="form-error" id="np-error" role="alert" hidden></p>' +
        '<button class="btn primary" type="submit">Salvează parola</button>' +
      '</form></div>');
  }

  /* ---------- pagina ---------- */

  MC.pages.admin = function () {
    document.body.classList.add('is-admin');
    if (!MC.store.role() || MC.store.isRecovery()) return login();
    if (MC.adm.push == null) { MC.adm.push = 'checking'; setTimeout(MC.refreshPush, 0); }
    if (MC.adm.tab === 'setari' && MC.store.role() === 'admin') return settings();
    if (MC.adm.tab === 'cont') return account();
    return agenda();
  };

  function showErr(id, msg) {
    var e = document.getElementById(id);
    if (e) { e.textContent = msg; e.hidden = false; }
  }

  function doMove(id, date, hour, errId, confirm) {
    var b = MC.store.get(id);
    return run(MC.store.move(id, date, hour, confirm), (b.childName || b.name) + ' a fost mutat(ă) ' + MC.fmtDate(date) + ', ora ' + MC.hourLabel(hour) +
        (confirm ? ' și confirmat(ă). Trimite mesajul pe WhatsApp.' : '.'), errId)
      .then(function () {
        MC.adm.panel = { mode: 'booking', id: id }; MC.adm.confirm = null;
        if (date < MC.ymd(MC.adm.week) || date > MC.ymd(MC.addDays(MC.adm.week, 6))) MC.adm.week = MC.weekStart(MC.parseYmd(date));
        MC.render(); loadHistory(b);
      }, function () {
        if (MC.store.live) MC.store.refresh().then(MC.render);
      });
  }

  function gotoWeek(week) {
    MC.adm.week = week;
    MC.adm.dayIdx = null;
    MC.store.loadRange(MC.ymd(week), MC.ymd(MC.addDays(week, 6))).then(MC.render, function (e) { MC.toast(e.message, 'bad'); MC.render(); });
  }

  MC.adminActions = {
    'adm-tab': function (el) { MC.adm.tab = el.dataset.tab; MC.adm.confirm = null; MC.render(); },
    'adm-sub': function (el) {
      MC.adm.confirm = MC.adm.confirm === el.dataset.sub ? null : el.dataset.sub;
      MC.render();
      var f = document.querySelector('#adm-panel .sub-form');
      if (f) { f.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); var i = f.querySelector('input,select,textarea'); if (i && !narrow()) i.focus(); }
    },
    'adm-block': function (el) {
      var p = MC.adm.panel, g = groupById(el.dataset.group), day = el.dataset.scope === 'day';
      var hours = day ? dayHours() : [p.hour];
      var isB = blocked(p.date, hours, g.cats);
      var what = g.label + (day ? ', toată ziua de ' + MC.fmtDate(p.date) : ', ora ' + MC.hourLabel(p.hour));
      var left = isB ? 0 : MC.store.bookingsOn(p.date).filter(function (b) {
        return (g.cats[0] === '*' || g.cats.indexOf(b.cat) >= 0) && (day || (p.hour >= b.hour && p.hour < b.hour + b.hours));
      }).length;
      run(MC.store.setSlotCaps(p.date, hours, g.cats, isB ? null : 0),
        (isB ? 'Deblocat: ' : 'Blocat: ') + what + '.' + (left ? ' Atenție: ' + left + (left === 1 ? ' programare rămâne' : ' programări rămân') + ' în agendă.' : ''), 'slot-error')
        .then(MC.render, function () {});
    },
    'adm-push-on': function () {
      run(pushOn(), 'Notificările sunt active pe acest telefon.', null).then(function () { MC.adm.push = 'on'; MC.render(); }, function () { MC.refreshPush(); });
    },
    'adm-push-off': function () {
      run(pushOff(), 'Notificările au fost oprite pe acest dispozitiv.', null).then(function () { MC.adm.push = 'off'; MC.render(); }, function () {});
    },
    'adm-push-banner-off': function () {
      try { localStorage.setItem('medicenter-push-banner-off', '1'); } catch (e) { /* opțional */ }
      MC.render();
    },
    'adm-banner-off': function () {
      try { localStorage.setItem('medicenter-banner-off', '1'); } catch (e) { /* opțional */ }
      MC.render();
    },
    'adm-install': function () {
      var e = MC.adm.installEvt;
      if (!e) return;
      e.prompt();
      e.userChoice.then(function () { MC.adm.installEvt = null; MC.render(); });
    },
    'adm-auth': function (el) { MC.adm.auth = el.dataset.to; MC.render(); },
    'adm-logout': function () {
      MC.store.signOut().then(function () {
        MC.adm.panel = { mode: 'idle' }; MC.adm.tab = 'agenda'; MC.adm.staff = null; MC.adm.auth = 'login';
        MC.go('admin');
      });
    },
    'adm-week': function (el) {
      var d = +el.dataset.dir;
      gotoWeek(d === 0 ? MC.weekStart(MC.today()) : MC.addDays(MC.adm.week, 7 * d));
    },
    'adm-day': function (el) { MC.adm.dayIdx = +el.dataset.idx; MC.render(); },
    'adm-new': function () { MC.adm.panel = { mode: 'new' }; MC.adm.confirm = null; MC.render(); focusPanel(); },
    'adm-open': function (el) {
      var b = MC.store.get(el.dataset.id);
      MC.adm.panel = { mode: 'booking', id: el.dataset.id }; MC.adm.confirm = null;
      // cererea dintr-o altă săptămână: agenda sare la săptămâna ei
      if (b && (b.date < MC.ymd(MC.adm.week) || b.date > MC.ymd(MC.addDays(MC.adm.week, 6)))) MC.adm.week = MC.weekStart(MC.parseYmd(b.date));
      MC.render(); loadHistory(b); focusPanel();
    },
    'adm-requests': function () { MC.adm.panel = { mode: 'requests' }; MC.adm.confirm = null; MC.render(); focusPanel(); },
    'adm-confirm': function () {
      if (MC.adm.busy) return;
      var b = MC.store.get(MC.adm.panel.id);
      run(MC.store.setStatus(b.id, 'confirmed', ''), 'Confirmată. Trimite mesajul pe WhatsApp.').then(function () { MC.render(); loadHistory(b); }, function () {});
    },
    'adm-reject': function () { MC.adm.confirm = 'reject'; MC.render(); },
    'adm-reactivate': function () {
      var b = MC.store.get(MC.adm.panel.id);
      run(MC.store.setStatus(b.id, 'confirmed', ''), 'Programarea este din nou activă.').then(function () { MC.render(); loadHistory(b); }, function () {});
    },
    'adm-close': function () { MC.adm.panel = { mode: 'idle' }; MC.adm.confirm = null; MC.render(); },
    'adm-cancel': function () { MC.adm.confirm = 'cancel'; MC.render(); },
    'adm-cancel-no': function () { MC.adm.confirm = null; MC.render(); },
    'adm-cancel-yes': function () {
      if (MC.adm.busy) return;
      var b = MC.store.get(MC.adm.panel.id);
      run(MC.store.setStatus(b.id, 'cancelled', ''), 'Programarea a fost anulată. Anunță pacientul pe WhatsApp.').then(function () {
        MC.adm.confirm = null; MC.render(); loadHistory(b);
      }, function () {});
    },
    'adm-clear': function () { MC.adm.confirm = 'clear'; MC.render(); },
    'adm-clear-yes': function () {
      run(MC.store.clearDemo(), 'Programările de test au fost șterse.').then(function () { MC.adm.confirm = null; MC.render(); }, function () {});
    },
    'adm-staff-del': function (el) { MC.adm.confirm = 'staff:' + el.dataset.email; MC.render(); },
    'adm-staff-del-yes': function (el) {
      run(MC.store.staffRemove(el.dataset.email), 'Accesul a fost scos.').then(function () {
        MC.adm.staff = null; MC.adm.confirm = null; MC.render();
      }, function () {});
    }
  };

  /* Click pe spațiul liber al unei ore = programare nouă în acea oră. */
  MC.adminCellClick = function (cellEl) {
    MC.adm.panel = { mode: 'slot', date: cellEl.dataset.date, hour: +cellEl.dataset.hour };
    MC.adm.confirm = null;
    MC.render();
    focusPanel();
  };

  function focusPanel() {
    if (!narrow()) return;
    var p = document.getElementById('adm-panel');
    if (p) p.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  MC.adminChange = function (el) {
    if (el.dataset.change === 'adm-filter') { MC.adm.filter = el.value; MC.render(); return true; }
    if (el.dataset.change === 'adm-therapist') {
      var tn = el.value;
      run(MC.store.setTherapist(el.dataset.id, tn), tn ? 'Terapeut: ' + tn + '.' : 'Terapeutul a fost scos.').then(MC.render, function () {});
      return true;
    }
    return false;
  };

  function val(id) { var e = document.getElementById(id); return e ? e.value : ''; }

  MC.adminSubmit = function (form) {
    if (MC.adm.busy) return true;
    if (form.id === 'adm-login') {
      var mode = MC.store.isRecovery() ? 'recovery' : form.dataset.mode;
      var email = val('adm-email');
      var pass = val('adm-pass');
      if (mode !== 'recovery' && MC.store.live && !/^\S+@\S+\.\S+$/.test(email)) { showErr('adm-error', 'Scrie o adresă de email corectă.'); return true; }
      if ((mode === 'signup' || mode === 'recovery') && (pass.length < 8 || !/\d/.test(pass) || !/[a-zA-Z]/.test(pass))) {
        showErr('adm-error', 'Parola trebuie să aibă cel puțin 8 caractere, cu litere și cifre.'); return true;
      }
      if (mode === 'recovery') {
        run(MC.store.updatePassword(pass), 'Parola a fost salvată.', 'adm-error').then(function () {
          history.replaceState(null, '', location.pathname + '#admin'); MC.render();
        }, function () {});
      } else if (mode === 'forgot') {
        run(MC.store.resetPassword(email), null, 'adm-error').then(function () {
          MC.adm.auth = 'sent';
          MC.adm.sentMsg = 'Dacă ' + MC.esc(email) + ' are cont, ai primit un link pentru o parolă nouă. Deschide-l pe acest dispozitiv.';
          MC.render();
        }, function () {});
      } else if (mode === 'signup') {
        run(MC.store.signUp(email, pass), null, 'adm-error').then(function () {
          MC.adm.auth = 'sent';
          MC.adm.sentMsg = 'Am trimis un email de confirmare la ' + MC.esc(email) + '. Apasă pe linkul din email, apoi intră în agendă cu parola aleasă.';
          MC.render();
        }, function () {});
      } else {
        run(MC.store.signIn(email, pass), null, 'adm-error').then(function () {
          try { localStorage.setItem('medicenter-email', email.trim()); } catch (e) { /* opțional */ }
          MC.render();
        }, function () {});
      }
      return true;
    }
    if (form.id === 'adm-pass-form') {
      var p1 = val('np-1'), p2 = val('np-2');
      if (p1.length < 8 || !/\d/.test(p1) || !/[a-zA-Z]/.test(p1)) { showErr('np-error', 'Parola trebuie să aibă cel puțin 8 caractere, cu litere și cifre.'); return true; }
      if (p1 !== p2) { showErr('np-error', 'Cele două parole nu sunt la fel.'); return true; }
      if (!MC.store.live) { MC.toast('În demo parola nu se schimbă.', 'ok'); return true; }
      document.getElementById('np-error').hidden = true;
      run(MC.store.updatePassword(p1), 'Parola a fost schimbată.', 'np-error').then(function () { form.reset(); }, function () {});
      return true;
    }
    if (form.id === 'adm-move') {
      var mb = MC.store.get(MC.adm.panel.id);
      doMove(mb.id, val('mv-date'), +val('mv-hour'), 'mv-error', mb.status === 'pending');
      return true;
    }
    if (form.id === 'adm-reject') {
      var rb = MC.store.get(MC.adm.panel.id);
      run(MC.store.setStatus(rb.id, 'rejected', val('rj-note')), 'Cererea a fost refuzată. Anunță pacientul pe WhatsApp.').then(function () {
        MC.adm.confirm = null; MC.render(); loadHistory(rb);
      }, function () {});
      return true;
    }
    if (form.id === 'adm-edit') {
      var eb = MC.store.get(MC.adm.panel.id);
      var en = val('ed-name').trim(), ep = val('ed-phone').trim(), ec = val('ed-child').trim(), ea = val('ed-age');
      if (en.length < 2) { showErr('ed-error', 'Scrie numele pacientului.'); return true; }
      if (ep && ep !== '—' && !MC.validPhone(ep)) { showErr('ed-error', 'Numărul de telefon nu pare corect.'); return true; }
      var fields = { name: en, phone: ep || '—', childName: ec, childAge: ec && ea !== '' ? Math.max(0, Math.min(17, +ea)) : null, note: val('ed-note').trim() };
      run(MC.store.updateBooking(eb.id, fields), 'Datele au fost salvate.', 'ed-error').then(function () { MC.adm.confirm = null; MC.render(); loadHistory(eb); }, function () {});
      return true;
    }
    if (form.id === 'adm-caps') {
      var cd = form.dataset.date, ch = +form.dataset.hour;
      var jobs = [];
      Array.prototype.forEach.call(form.querySelectorAll('input[data-cat]'), function (inp) {
        var raw = inp.value.trim();
        var v = raw === '' ? null : Math.max(0, Math.min(50, parseInt(raw, 10) || 0));
        if (v !== MC.store.slotCap(cd, ch, inp.dataset.cat)) jobs.push([inp.dataset.cat, v]);
      });
      if (!jobs.length) { MC.toast('Nimic de schimbat.', 'ok'); return true; }
      var chain = jobs.reduce(function (pr, j) { return pr.then(function () { return MC.store.setSlotCap(cd, ch, j[0], j[1]); }); }, Promise.resolve());
      run(chain, 'Locurile pentru ora ' + MC.hourLabel(ch) + ' au fost salvate.', 'caps-error').then(MC.render, function () {});
      return true;
    }
    if (form.id === 'adm-add') {
      var svc = MC.serviceById(val('ad-svc'));
      var date = val('ad-date');
      var hour = +val('ad-hour');
      var name = val('ad-name');
      var phone = val('ad-phone');
      if (name.trim().length < 3) { showErr('ad-error', 'Scrie numele pacientului.'); return true; }
      if (phone.trim() && !MC.validPhone(phone)) { showErr('ad-error', 'Numărul de telefon nu pare corect.'); return true; }
      if (!date) { showErr('ad-error', 'Alege ziua.'); return true; }
      var age = val('ad-age');
      var data = { serviceId: svc.id, date: date, hour: hour, name: name, phone: phone || '—', note: val('ad-note'), source: 'clinica',
        childName: val('ad-child'), childAge: val('ad-child').trim() && age !== '' ? Math.max(0, Math.min(17, +age)) : null };
      MC.store.loadRange(date, date).then(function () {
        var ther = val('ad-ther');
        return run(MC.store.add(data).then(function (b) {
          return ther ? MC.store.setTherapist(b.id, ther).then(function () { return b; }) : b;
        }), name.trim() + ' a fost adăugat(ă) în agendă.', 'ad-error');
      }).then(function (b) {
        MC.adm.panel = { mode: 'booking', id: b.id }; MC.adm.confirm = null;
        gotoWeek(MC.weekStart(MC.parseYmd(date)));
      }, function () {});
      return true;
    }
    if (form.id === 'adm-settings') {
      var s = JSON.parse(JSON.stringify(MC.store.settings()));
      s.serviceCapacity = {};
      s.evalRequired = {};
      s.newPatient = [];
      MC.SERVICES.forEach(function (x) {
        s.serviceCapacity[x.id] = Math.max(1, Math.min(30, parseInt(val('cap-' + x.id), 10) || 1));
        if (document.getElementById('ev-' + x.id).checked && val('evs-' + x.id) !== x.id) s.evalRequired[x.id] = val('evs-' + x.id);
        if (document.getElementById('np-' + x.id).checked) s.newPatient.push(x.id);
      });
      s.open = +val('st-open');
      s.close = +val('st-close');
      s.days = [0, 1, 2, 3, 4, 5, 6].filter(function (d) { return document.getElementById('st-day-' + d).checked; });
      s.maxDaysAhead = Math.max(7, Math.min(365, parseInt(val('st-ahead'), 10) || 60));
      if (s.close - s.open < 1) { showErr('st-error', 'Ora de închidere trebuie să fie după prima programare.'); return true; }
      if (!s.days.length) { showErr('st-error', 'Bifează cel puțin o zi lucrătoare.'); return true; }
      if (!s.newPatient.length) { showErr('st-error', 'Bifează „Pacienți noi” la cel puțin o evaluare sau consultație.'); return true; }
      run(MC.store.saveSettings(s), 'Setările au fost salvate.', 'st-error').then(MC.render, function () {});
      return true;
    }
    if (form.id === 'adm-staff') {
      var em = val('sf-email').trim();
      if (!/^\S+@\S+\.\S+$/.test(em)) { showErr('sf-error', 'Scrie o adresă de email corectă.'); return true; }
      run(MC.store.staffAdd(em, val('sf-name'), document.getElementById('sf-admin').checked ? 'admin' : 'staff'),
        em + ' a fost adăugat. Spune-i să își creeze contul din pagina agendei.', 'sf-error')
        .then(function () { MC.adm.staff = null; MC.render(); }, function () {});
      return true;
    }
    return false;
  };

  /* ---------- drag & drop în agendă ---------- */

  MC.initAdminDnD = function (root) {
    var dragId = null;
    root.addEventListener('dragstart', function (e) {
      var chip = e.target.closest && e.target.closest('.bchip[draggable="true"]');
      if (!chip) return;
      dragId = chip.dataset.id;
      chip.classList.add('dragging');
      try { e.dataTransfer.setData('text/plain', dragId); e.dataTransfer.effectAllowed = 'move'; } catch (x) { /* ignore */ }
    });
    root.addEventListener('dragend', function () {
      dragId = null;
      root.querySelectorAll('.drop-ok,.drop-bad,.dragging').forEach(function (el) { el.classList.remove('drop-ok', 'drop-bad', 'dragging'); });
    });
    root.addEventListener('dragover', function (e) {
      var c = e.target.closest && e.target.closest('.ag-cell');
      if (!c || !dragId) return;
      e.preventDefault();
      var b = MC.store.get(dragId);
      var ok = MC.store.check(b.serviceId, c.dataset.date, +c.dataset.hour, b.hours, dragId).ok;
      root.querySelectorAll('.drop-ok,.drop-bad').forEach(function (el) { if (el !== c) el.classList.remove('drop-ok', 'drop-bad'); });
      c.classList.add(ok ? 'drop-ok' : 'drop-bad');
    });
    root.addEventListener('drop', function (e) {
      var c = e.target.closest && e.target.closest('.ag-cell');
      if (!c || !dragId) return;
      e.preventDefault();
      var id = dragId; dragId = null;
      var b = MC.store.get(id);
      var chk = MC.store.check(b.serviceId, c.dataset.date, +c.dataset.hour, b.hours, id);
      if (!chk.ok) { MC.toast(chk.reason, 'bad'); MC.render(); return; }
      doMove(id, c.dataset.date, +c.dataset.hour);
    });
  };

  /* Agenda se reîmprospătează singură la fiecare minut și când revii în aplicație. */
  MC.adminAutoRefresh = function (isAdminRoute) {
    if (!MC.store.live) return;
    function tick() {
      if (!isAdminRoute() || !MC.store.role() || MC.adm.busy || document.hidden) return;
      var a = document.activeElement;
      if (a && /INPUT|SELECT|TEXTAREA/.test(a.tagName)) return; // nu întrerupem pe cineva care scrie
      MC.store.refresh().then(function () {
        var w = MC.adm.week;
        return MC.store.loadRange(MC.ymd(w), MC.ymd(MC.addDays(w, 6)));
      }).then(MC.render, function () {});
    }
    setInterval(tick, 60000);
    document.addEventListener('visibilitychange', tick);
  };
})();
