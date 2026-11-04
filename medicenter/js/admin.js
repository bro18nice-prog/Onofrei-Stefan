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

  function login() {
    var live = MC.store.live;
    var a = MC.adm.auth;
    var head = '<section class="admin-login">' + MC.swirl() + '<form class="card form" id="adm-login" data-mode="' + a + '" novalidate>' +
      '<img class="login-logo" src="img/logo.png" alt="Medicenter Clinic">';
    var foot = '</form></section>';

    if (MC.store.isRecovery()) {
      return head + '<h1>Parolă nouă</h1><p class="muted">Alege parola cu care vei intra în agendă.</p>' +
        '<label for="adm-pass">Parola nouă</label><input id="adm-pass" type="password" autocomplete="new-password" minlength="6" required>' +
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
        '<label for="adm-pass">Alege o parolă</label><input id="adm-pass" type="password" autocomplete="new-password" minlength="6" required>' +
        '<p class="form-error" id="adm-error" role="alert" hidden></p>' +
        '<button class="btn primary block" type="submit">Creează contul</button>' +
        '<button type="button" class="link-btn" data-action="adm-auth" data-to="login">Am deja cont</button>' + foot;
    }
    return head + '<h1>Agenda clinicii</h1><p class="muted">Acces doar pentru personalul clinicii.</p>' +
      (live ? '<label for="adm-email">Email</label><input id="adm-email" type="email" autocomplete="email" required>' : '') +
      '<label for="adm-pass">Parolă</label><input id="adm-pass" type="password" autocomplete="current-password" required>' +
      '<p class="form-error" id="adm-error" role="alert" hidden></p>' +
      '<button class="btn primary block" type="submit">Intră în cont</button>' +
      (live
        ? '<div class="login-links"><button type="button" class="link-btn" data-action="adm-auth" data-to="forgot">Am uitat parola</button>' +
          '<button type="button" class="link-btn" data-action="adm-auth" data-to="signup">Prima dată aici? Creează cont</button></div>'
        : '<p class="demo-note">Versiune demo · parola este <b>medicenter</b></p>') +
      foot;
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
        '</nav>' +
        '<div class="adm-bar-right">' +
          (MC.store.email() ? '<span class="who">' + MC.esc(MC.store.email()) + '</span>' : '') +
          '<a class="btn ghost small" href="#acasa">Vezi site-ul</a>' +
          '<button class="btn ghost small" data-action="adm-logout">Ieși</button></div>' +
      '</div></header>' + inner + '</div>';
  }

  /* ---------- agenda ---------- */

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

    var toolbar = '<div class="adm-toolbar">' +
      '<div class="tb-group"><button class="icon-btn" data-action="adm-week" data-dir="-1" aria-label="Săptămâna anterioară">‹</button>' +
      '<button class="btn ghost small" data-action="adm-week" data-dir="0">Azi</button>' +
      '<button class="icon-btn" data-action="adm-week" data-dir="1" aria-label="Săptămâna următoare">›</button>' +
      '<h1 class="adm-title">' + range + '</h1></div>' +
      '<div class="tb-group">' +
        '<label class="sr" for="adm-filter">Secția</label>' +
        '<select id="adm-filter" data-change="adm-filter">' +
          '<option value="toate"' + (a.filter === 'toate' ? ' selected' : '') + '>Toate secțiile</option>' +
          MC.CATS.map(function (c) { return '<option value="' + c.id + '"' + (a.filter === c.id ? ' selected' : '') + '>' + c.name + '</option>'; }).join('') +
        '</select>' +
        '<button class="btn primary small" data-action="adm-new">+ Programare</button>' +
      '</div></div>';

    var legend = '<div class="adm-legend">' + MC.CATS.map(function (c) {
      return '<span><i style="background:' + c.color + '"></i>' + c.short + '</span>';
    }).join('') +
      (a.filter !== 'toate'
        ? '<span class="cap-info">Capacitate ' + MC.catById(a.filter).short + ': <b>' + s.capacity[a.filter] + ' pacienți / oră</b></span>'
        : '<span class="cap-info">Alege o secție ca să vezi locurile libere pe fiecare oră</span>') +
      '</div>';

    var dayTabs = narrow() ? '<div class="day-tabs">' + days.map(function (d, i) {
      return '<button class="' + (i === a.dayIdx ? 'on' : '') + (MC.ymd(d) === todayYmd ? ' today' : '') + '" data-action="adm-day" data-idx="' + i + '">' +
        MC.DAYS_SHORT[d.getDay()] + '<b>' + d.getDate() + '</b></button>';
    }).join('') + '</div>' : '';

    var cols = 'grid-template-columns:56px repeat(' + shown.length + ', minmax(0,1fr))';
    var grid = '<div class="ag-scroll"><div class="ag" style="' + cols + '"><div class="ag-corner"></div>';
    shown.forEach(function (d) {
      grid += '<div class="ag-day' + (MC.ymd(d) === todayYmd ? ' today' : '') + '">' + MC.DAYS_SHORT[d.getDay()] + '<b>' + d.getDate() + '</b></div>';
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
    var s = MC.store.settings();
    var list = MC.store.bookingsOn(date).filter(function (b) {
      return hour >= b.hour && hour < b.hour + b.hours && (a.filter === 'toate' || b.cat === a.filter);
    }).sort(function (x, y) { return x.cat < y.cat ? -1 : x.cat > y.cat ? 1 : x.name.localeCompare(y.name); });

    var badge = '';
    var lvl = '';
    if (a.filter !== 'toate') {
      var cap = s.capacity[a.filter];
      var n = list.length;
      lvl = n >= cap ? 'full' : n >= cap - 1 && cap > 1 ? 'mid' : n > 0 ? 'lo' : '';
      badge = '<span class="cnt ' + (lvl || 'empty') + '">' + n + '/' + cap + '</span>';
    } else if (list.length) {
      badge = '<span class="cnt neutral">' + list.length + '</span>';
    }
    var sel = a.panel.mode === 'new' && a.panel.date === date && a.panel.hour === hour;
    var html = '<div class="ag-cell' + (past ? ' past' : '') + (lvl ? ' lvl-' + lvl : '') + (sel ? ' picked' : '') +
      '" data-cell="1" data-date="' + date + '" data-hour="' + hour + '"><div class="cell-top">' + badge + '</div>';
    list.forEach(function (b) {
      var c = MC.catById(b.cat);
      var svc = MC.serviceById(b.serviceId);
      var start = b.hour === hour;
      var on = a.panel.mode === 'booking' && a.panel.id === b.id;
      html += '<div role="button" tabindex="0" class="bchip' + (start ? '' : ' cont') + (on ? ' on' : '') + '" style="--cat:' + c.color + '"' +
        (start ? ' draggable="true"' : '') + ' data-action="adm-open" data-id="' + b.id + '" title="' + MC.esc(b.name + (svc ? ' · ' + svc.name : '')) + '">' +
        '<span class="bn">' + (start ? '' : '↳ ') + MC.esc(b.name) + '</span>' +
        '<span class="bs">' + MC.esc(svc ? shortSvc(svc) : c.short) + '</span></div>';
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

  function panel() {
    var p = MC.adm.panel;
    if (p.mode === 'booking') return panelBooking(MC.store.get(p.id));
    if (p.mode === 'new') return panelNew();
    return panelIdle();
  }

  function panelIdle() {
    var s = MC.store.settings();
    var t = MC.ymd(MC.today());
    var today = MC.store.bookingsOn(t);
    var hasDemo = MC.store.bookings().some(function (b) { return b.demo; });
    return '<div class="card"><h2 class="card-title">Azi, ' + MC.fmtDate(t) + '</h2>' +
      (s.days.indexOf(MC.today().getDay()) < 0 ? '<p class="muted">Clinica nu lucrează azi.</p>' :
        '<div class="kv"><span>Programări azi</span><b>' + today.length + '</b></div>' +
        MC.CATS.map(function (c) {
          var n = today.filter(function (b) { return b.cat === c.id; }).length;
          return '<div class="kv"><span><i class="dot" style="background:' + c.color + '"></i>' + c.short + '</span><b>' + n + '</b></div>';
        }).join('')) +
      '</div>' +
      '<div class="card help"><h3>Cum folosești agenda</h3><ul>' +
        '<li>Apasă pe un pacient ca să vezi detaliile, să muți sau să anulezi programarea.</li>' +
        '<li>Trage un pacient în altă oră ca să-l muți. Pe telefon folosește butonul <b>Mută</b>.</li>' +
        '<li>Apasă pe o oră goală ca să adaugi un pacient care a sunat.</li>' +
        '<li>Alege o secție din listă ca să vezi câte locuri mai sunt pe fiecare oră.</li>' +
      '</ul></div>' +
      (hasDemo ? '<p class="demo-note">Agenda conține programări de test, marcate „test”. Le poți șterge din Setări.</p>' : '');
  }

  function panelBooking(b) {
    if (!b) { MC.adm.panel = { mode: 'idle' }; return panelIdle(); }
    var svc = MC.serviceById(b.serviceId);
    var c = MC.catById(b.cat);
    var cfm = MC.adm.confirm === 'cancel';
    var endMin = b.hour * 60 + ((svc && svc.dur) || 60);
    var tag = b.demo ? '<span class="tag">test</span>'
      : '<span class="tag ' + (b.source === 'online' ? 'online' : 'phone') + '">' + (b.source === 'online' ? 'programat online' : 'adăugat de clinică') + '</span>';
    return '<div class="card"><div class="panel-head"><h2 class="card-title">' + MC.esc(b.name) + '</h2>' +
      '<button class="icon-btn" data-action="adm-close" aria-label="Închide">×</button></div>' + tag +
      '<div class="kv"><span>Telefon</span><b>' + MC.esc(b.phone) + '</b></div>' +
      '<div class="kv"><span>Serviciu</span><b>' + MC.esc(svc ? svc.name : '—') + '</b></div>' +
      '<div class="kv"><span>Secția</span><b><i class="dot" style="background:' + c.color + '"></i>' + c.short + '</b></div>' +
      '<div class="kv"><span>Data</span><b>' + MC.cap(MC.fmtDate(b.date)) + '</b></div>' +
      '<div class="kv"><span>Ora</span><b>' + MC.hourLabel(b.hour) + ' – ' + MC.pad(Math.floor(endMin / 60)) + ':' + MC.pad(endMin % 60) + '</b></div>' +
      (b.note ? '<div class="note-box">' + MC.esc(b.note) + '</div>' : '') +
      '</div>' +
      '<form class="card form" id="adm-move" novalidate><h3>Mută programarea</h3>' +
        '<div class="row2"><div><label for="mv-date">Ziua</label><input type="date" id="mv-date" value="' + b.date + '" required></div>' +
        '<div><label for="mv-hour">Ora</label><select id="mv-hour">' + hourOptions(b.hour) + '</select></div></div>' +
        '<p class="form-error" id="mv-error" role="alert" hidden></p>' +
        '<button class="btn primary block" type="submit">Mută</button>' +
      '</form>' +
      '<div class="card">' + (cfm
        ? '<p><b>Anulezi programarea lui ' + MC.esc(b.name) + '?</b><br><span class="muted small">Locul devine liber pentru alți pacienți.</span></p>' +
          '<div class="row2"><button class="btn danger" data-action="adm-cancel-yes">Da, anulează</button><button class="btn ghost" data-action="adm-cancel-no">Nu</button></div>'
        : '<button class="btn danger-ghost block" data-action="adm-cancel">Anulează programarea</button>') +
      '</div>';
  }

  function panelNew() {
    var p = MC.adm.panel;
    var date = p.date || MC.ymd(MC.today());
    var firstOfCat = MC.adm.filter !== 'toate' ? MC.SERVICES.find(function (s) { return s.cat === MC.adm.filter; }).id : 'k01';
    return '<form class="card form" id="adm-add" novalidate><div class="panel-head"><h2 class="card-title">Programare nouă</h2>' +
      '<button type="button" class="icon-btn" data-action="adm-close" aria-label="Închide">×</button></div>' +
      '<label for="ad-svc">Serviciu</label><select id="ad-svc" required>' + serviceOptions(p.serviceId || firstOfCat) + '</select>' +
      '<div class="row2"><div><label for="ad-date">Ziua</label><input type="date" id="ad-date" value="' + date + '" required></div>' +
      '<div><label for="ad-hour">Ora</label><select id="ad-hour">' + hourOptions(p.hour != null ? p.hour : MC.store.settings().open) + '</select></div></div>' +
      '<label for="ad-name">Nume și prenume</label><input id="ad-name" required>' +
      '<label for="ad-phone">Telefon</label><input id="ad-phone" type="tel" inputmode="tel" placeholder="07xx xxx xxx">' +
      '<label for="ad-note">Observații</label><textarea id="ad-note" rows="2"></textarea>' +
      '<p class="form-error" id="ad-error" role="alert" hidden></p>' +
      '<button class="btn primary block" type="submit">Adaugă în agendă</button>' +
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
    return shell('<div class="adm-settings wrap">' +
      '<form class="card form" id="adm-settings" novalidate>' +
        '<h1 class="adm-title">Setări</h1>' +
        '<h3>Capacitate pe oră</h3><p class="muted small">Câți pacienți pot fi programați în aceeași oră, pe fiecare secție.</p>' +
        '<div class="cap-grid">' + MC.CATS.map(function (c) {
          return '<label for="cap-' + c.id + '"><i class="dot" style="background:' + c.color + '"></i>' + c.name + '</label>' +
            '<input type="number" id="cap-' + c.id + '" min="1" max="30" value="' + s.capacity[c.id] + '">';
        }).join('') + '</div>' +
        '<h3>Program</h3>' +
        '<div class="row2"><div><label for="st-open">Prima programare</label><select id="st-open">' + opts(6, 14, s.open) + '</select></div>' +
        '<div><label for="st-close">Închidere</label><select id="st-close">' + opts(12, 23, s.close) + '</select></div></div>' +
        '<fieldset class="days"><legend>Zile lucrătoare</legend>' + dayOrder.map(function (d) {
          return '<label><input type="checkbox" id="st-day-' + d + '" value="' + d + '"' + (s.days.indexOf(d) >= 0 ? ' checked' : '') + '>' + MC.cap(MC.DAYS_LONG[d]) + '</label>';
        }).join('') + '</fieldset>' +
        '<label for="st-ahead">Pacienții se pot programa cu maximum</label>' +
        '<div class="inline"><input type="number" id="st-ahead" min="7" max="365" value="' + s.maxDaysAhead + '"> <span>zile înainte</span></div>' +
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

  /* ---------- pagina ---------- */

  MC.pages.admin = function () {
    document.body.classList.add('is-admin');
    if (!MC.store.role() || MC.store.isRecovery()) return login();
    if (MC.adm.tab === 'setari' && MC.store.role() === 'admin') return settings();
    return agenda();
  };

  function showErr(id, msg) {
    var e = document.getElementById(id);
    if (e) { e.textContent = msg; e.hidden = false; }
  }

  function doMove(id, date, hour, errId) {
    var b = MC.store.get(id);
    return run(MC.store.move(id, date, hour), b.name + ' a fost mutat(ă) ' + MC.fmtDate(date) + ', ora ' + MC.hourLabel(hour) + '.', errId)
      .then(function () { MC.adm.panel = { mode: 'booking', id: id }; MC.render(); }, function () {
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
    'adm-open': function (el) { MC.adm.panel = { mode: 'booking', id: el.dataset.id }; MC.adm.confirm = null; MC.render(); focusPanel(); },
    'adm-close': function () { MC.adm.panel = { mode: 'idle' }; MC.adm.confirm = null; MC.render(); },
    'adm-cancel': function () { MC.adm.confirm = 'cancel'; MC.render(); },
    'adm-cancel-no': function () { MC.adm.confirm = null; MC.render(); },
    'adm-cancel-yes': function () {
      if (MC.adm.busy) return;
      var b = MC.store.get(MC.adm.panel.id);
      run(MC.store.remove(b.id), 'Programarea lui ' + b.name + ' a fost anulată.').then(function () {
        MC.adm.panel = { mode: 'idle' }; MC.adm.confirm = null; MC.render();
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
    MC.adm.panel = { mode: 'new', date: cellEl.dataset.date, hour: +cellEl.dataset.hour };
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
      if ((mode === 'signup' || mode === 'recovery') && pass.length < 6) { showErr('adm-error', 'Parola trebuie să aibă cel puțin 6 caractere.'); return true; }
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
        run(MC.store.signIn(email, pass), null, 'adm-error').then(MC.render, function () {});
      }
      return true;
    }
    if (form.id === 'adm-move') {
      doMove(MC.adm.panel.id, val('mv-date'), +val('mv-hour'), 'mv-error');
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
      var data = { serviceId: svc.id, date: date, hour: hour, name: name, phone: phone || '—', note: val('ad-note'), source: 'clinica' };
      MC.store.loadRange(date, date).then(function () {
        return run(MC.store.add(data), name.trim() + ' a fost adăugat(ă) în agendă.', 'ad-error');
      }).then(function (b) {
        MC.adm.panel = { mode: 'booking', id: b.id };
        gotoWeek(MC.weekStart(MC.parseYmd(date)));
      }, function () {});
      return true;
    }
    if (form.id === 'adm-settings') {
      var s = JSON.parse(JSON.stringify(MC.store.settings()));
      MC.CATS.forEach(function (c) {
        s.capacity[c.id] = Math.max(1, Math.min(30, parseInt(val('cap-' + c.id), 10) || 1));
      });
      s.open = +val('st-open');
      s.close = +val('st-close');
      s.days = [0, 1, 2, 3, 4, 5, 6].filter(function (d) { return document.getElementById('st-day-' + d).checked; });
      s.maxDaysAhead = Math.max(7, Math.min(365, parseInt(val('st-ahead'), 10) || 60));
      if (s.close - s.open < 1) { showErr('st-error', 'Ora de închidere trebuie să fie după prima programare.'); return true; }
      if (!s.days.length) { showErr('st-error', 'Bifează cel puțin o zi lucrătoare.'); return true; }
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
      var ok = MC.store.check(b.cat, c.dataset.date, +c.dataset.hour, b.hours, dragId).ok;
      root.querySelectorAll('.drop-ok,.drop-bad').forEach(function (el) { if (el !== c) el.classList.remove('drop-ok', 'drop-bad'); });
      c.classList.add(ok ? 'drop-ok' : 'drop-bad');
    });
    root.addEventListener('drop', function (e) {
      var c = e.target.closest && e.target.closest('.ag-cell');
      if (!c || !dragId) return;
      e.preventDefault();
      var id = dragId; dragId = null;
      var b = MC.store.get(id);
      var chk = MC.store.check(b.cat, c.dataset.date, +c.dataset.hour, b.hours, id);
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
