/* Panoul de administrare: autentificare, agenda săptămânală, mutare/anulare/adăugare, setări. */
window.MC = window.MC || {};

(function () {
  var AUTH_KEY = 'medicenter-admin';

  MC.adm = {
    tab: 'agenda', week: MC.weekStart(MC.today()), filter: 'toate', dayIdx: null,
    panel: { mode: 'idle' }, confirm: null
  };

  function authed() {
    try { return sessionStorage.getItem(AUTH_KEY) === '1'; } catch (e) { return !!MC.adm._authed; }
  }
  function setAuthed(v) {
    MC.adm._authed = v;
    try { if (v) sessionStorage.setItem(AUTH_KEY, '1'); else sessionStorage.removeItem(AUTH_KEY); } catch (e) { /* doar în memorie */ }
  }

  function narrow() { return window.innerWidth < 760; }

  /* Zilele lucrătoare din săptămâna afișată, începând cu luni. */
  function weekDays() {
    var s = MC.store.settings();
    var out = [];
    for (var i = 0; i < 7; i++) {
      var d = MC.addDays(MC.adm.week, i);
      if (s.days.indexOf(d.getDay()) >= 0) out.push(d);
    }
    return out;
  }

  /* ---------- login ---------- */

  function login() {
    return '<section class="admin-login"><form class="card form" id="adm-login" novalidate>' +
      '<img class="login-logo" src="img/logo.png" alt="Medicenter Clinic">' +
      '<h1>Panou de administrare</h1>' +
      '<p class="muted">Acces doar pentru personalul clinicii.</p>' +
      '<label for="adm-pass">Parolă</label>' +
      '<input id="adm-pass" type="password" autocomplete="current-password" required>' +
      '<p class="form-error" id="adm-error" role="alert" hidden></p>' +
      '<button class="btn primary block" type="submit">Intră în cont</button>' +
      '<p class="demo-note">Versiune demo · parola este <b>medicenter</b></p>' +
      '</form></section>';
  }

  /* ---------- structură ---------- */

  function shell(inner) {
    var t = MC.adm.tab;
    return '<div class="admin">' +
      '<header class="adm-bar"><div class="adm-bar-in">' +
        '<a href="#acasa" class="adm-brand"><img src="img/logo-light.png" alt="Medicenter Clinic"></a>' +
        '<nav class="adm-tabs">' +
          '<button class="' + (t === 'agenda' ? 'on' : '') + '" data-action="adm-tab" data-tab="agenda">Agenda</button>' +
          '<button class="' + (t === 'setari' ? 'on' : '') + '" data-action="adm-tab" data-tab="setari">Setări</button>' +
        '</nav>' +
        '<div class="adm-bar-right"><a class="btn ghost small" href="#acasa">Vezi site-ul</a>' +
        '<button class="btn ghost small" data-action="adm-logout">Ieși</button></div>' +
      '</div></header>' + inner + '</div>';
  }

  /* ---------- agenda ---------- */

  function agenda() {
    var a = MC.adm;
    var s = MC.store.settings();
    var days = weekDays();
    var todayYmd = MC.ymd(MC.today());
    if (narrow()) {
      if (a.dayIdx == null || a.dayIdx >= days.length) {
        var ti = days.findIndex(function (d) { return MC.ymd(d) === todayYmd; });
        a.dayIdx = ti >= 0 ? ti : 0;
      }
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
      return '<span><i style="background:' + c.color + '"></i>' + c.short + (a.filter === 'toate' ? '' : '') + '</span>';
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
    var grid = '<div class="ag-scroll"><div class="ag" style="' + cols + '">';
    grid += '<div class="ag-corner"></div>';
    shown.forEach(function (d) {
      var isT = MC.ymd(d) === todayYmd;
      grid += '<div class="ag-day' + (isT ? ' today' : '') + '">' + MC.DAYS_SHORT[d.getDay()] + '<b>' + d.getDate() + '</b></div>';
    });
    var now = new Date();
    for (var h = s.open; h < s.close; h++) {
      grid += '<div class="ag-hour">' + MC.hourLabel(h) + '</div>';
      shown.forEach(function (d) {
        var ymd = MC.ymd(d);
        var past = ymd < todayYmd || (ymd === todayYmd && h < now.getHours());
        grid += cell(ymd, h, past);
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
      '" data-cell="1" data-date="' + date + '" data-hour="' + hour + '">' +
      '<div class="cell-top">' + badge + '</div>';
    list.forEach(function (b) {
      var c = MC.catById(b.cat);
      var svc = MC.serviceById(b.serviceId);
      var start = b.hour === hour;
      var on = a.panel.mode === 'booking' && a.panel.id === b.id;
      html += '<div role="button" tabindex="0" class="bchip' + (start ? '' : ' cont') + (on ? ' on' : '') + '" style="--cat:' + c.color + '"' +
        (start ? ' draggable="true"' : '') + ' data-action="adm-open" data-id="' + b.id + '" title="' + MC.esc(b.name + ' · ' + svc.name) + '">' +
        '<span class="bn">' + (start ? '' : '↳ ') + MC.esc(b.name) + '</span>' +
        '<span class="bs">' + MC.esc(shortSvc(svc)) + '</span></div>';
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
    var endMin = b.hour * 60 + (svc.dur || 60);
    return '<div class="card"><div class="panel-head"><h2 class="card-title">' + MC.esc(b.name) + '</h2>' +
      '<button class="icon-btn" data-action="adm-close" aria-label="Închide">×</button></div>' +
      (b.demo ? '<span class="tag">test</span>' : '<span class="tag ' + (b.source === 'online' ? 'online' : 'phone') + '">' + (b.source === 'online' ? 'programat online' : 'adăugat de clinică') + '</span>') +
      '<div class="kv"><span>Telefon</span><b>' + MC.esc(b.phone) + '</b></div>' +
      '<div class="kv"><span>Serviciu</span><b>' + MC.esc(svc.name) + '</b></div>' +
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
    return '<form class="card form" id="adm-add" novalidate><div class="panel-head"><h2 class="card-title">Programare nouă</h2>' +
      '<button type="button" class="icon-btn" data-action="adm-close" aria-label="Închide">×</button></div>' +
      '<label for="ad-svc">Serviciu</label><select id="ad-svc" required>' + serviceOptions(p.serviceId || (MC.adm.filter !== 'toate' ? MC.SERVICES.find(function (s) { return s.cat === MC.adm.filter; }).id : 'k01')) + '</select>' +
      '<div class="row2"><div><label for="ad-date">Ziua</label><input type="date" id="ad-date" value="' + date + '" required></div>' +
      '<div><label for="ad-hour">Ora</label><select id="ad-hour">' + hourOptions(p.hour != null ? p.hour : MC.store.settings().open) + '</select></div></div>' +
      '<label for="ad-name">Nume și prenume</label><input id="ad-name" required>' +
      '<label for="ad-phone">Telefon</label><input id="ad-phone" type="tel" inputmode="tel" placeholder="07xx xxx xxx">' +
      '<label for="ad-note">Observații</label><textarea id="ad-note" rows="2"></textarea>' +
      '<p class="form-error" id="ad-error" role="alert" hidden></p>' +
      '<button class="btn primary block" type="submit">Adaugă în agendă</button>' +
      '</form>';
  }

  /* ---------- setări ---------- */

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
      '<div class="card"><h3>Date de test</h3>' +
        (hasDemo
          ? (cfm === 'clear'
            ? '<p>Ștergi toate programările de test? Cele făcute de pacienți sau de voi rămân.</p><div class="row2"><button class="btn danger" data-action="adm-clear-yes">Da, șterge</button><button class="btn ghost" data-action="adm-cancel-no">Nu</button></div>'
            : '<p class="muted small">Agenda conține programări de test, folosite ca exemplu în demo.</p><button class="btn danger-ghost" data-action="adm-clear">Șterge programările de test</button>')
          : '<p class="muted small">Nu mai există programări de test în agendă.</p>') +
      '</div>' +
      '</div>');
  }

  /* ---------- pagina ---------- */

  MC.pages.admin = function () {
    document.body.classList.add('is-admin');
    if (!authed()) return login();
    return MC.adm.tab === 'setari' ? settings() : agenda();
  };

  function showErr(id, msg) {
    var e = document.getElementById(id);
    if (e) { e.textContent = msg; e.hidden = false; }
  }

  function tryMove(id, date, hour) {
    var b = MC.store.get(id);
    var chk = MC.store.check(b.cat, date, hour, b.hours, id);
    if (!chk.ok) return chk.reason;
    MC.store.update(id, { date: date, hour: hour });
    MC.toast(b.name + ' a fost mutat(ă) ' + MC.fmtDate(date) + ', ora ' + MC.hourLabel(hour) + '.', 'ok');
    return null;
  }

  MC.adminActions = {
    'adm-tab': function (el) { MC.adm.tab = el.dataset.tab; MC.adm.confirm = null; MC.render(); },
    'adm-logout': function () { setAuthed(false); MC.go('admin'); },
    'adm-week': function (el) {
      var d = +el.dataset.dir;
      MC.adm.week = d === 0 ? MC.weekStart(MC.today()) : MC.addDays(MC.adm.week, 7 * d);
      MC.adm.dayIdx = null;
      MC.render();
    },
    'adm-day': function (el) { MC.adm.dayIdx = +el.dataset.idx; MC.render(); },
    'adm-new': function () { MC.adm.panel = { mode: 'new' }; MC.adm.confirm = null; MC.render(); focusPanel(); },
    'adm-open': function (el) { MC.adm.panel = { mode: 'booking', id: el.dataset.id }; MC.adm.confirm = null; MC.render(); focusPanel(); },
    'adm-close': function () { MC.adm.panel = { mode: 'idle' }; MC.adm.confirm = null; MC.render(); },
    'adm-cancel': function () { MC.adm.confirm = 'cancel'; MC.render(); },
    'adm-cancel-no': function () { MC.adm.confirm = null; MC.render(); },
    'adm-cancel-yes': function () {
      var b = MC.store.get(MC.adm.panel.id);
      MC.store.remove(b.id);
      MC.adm.panel = { mode: 'idle' }; MC.adm.confirm = null;
      MC.toast('Programarea lui ' + b.name + ' a fost anulată.', 'ok');
      MC.render();
    },
    'adm-clear': function () { MC.adm.confirm = 'clear'; MC.render(); },
    'adm-clear-yes': function () {
      MC.store.clearDemo(); MC.adm.confirm = null;
      MC.toast('Programările de test au fost șterse.', 'ok');
      MC.render();
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

  MC.adminSubmit = function (form) {
    if (form.id === 'adm-login') {
      var pass = document.getElementById('adm-pass').value;
      if (pass === MC.store.settings().adminPassword) { setAuthed(true); MC.render(); }
      else showErr('adm-error', 'Parola nu este corectă.');
      return true;
    }
    if (form.id === 'adm-move') {
      var err = tryMove(MC.adm.panel.id, document.getElementById('mv-date').value, +document.getElementById('mv-hour').value);
      if (err) showErr('mv-error', err); else MC.render();
      return true;
    }
    if (form.id === 'adm-add') {
      var svc = MC.serviceById(document.getElementById('ad-svc').value);
      var date = document.getElementById('ad-date').value;
      var hour = +document.getElementById('ad-hour').value;
      var name = document.getElementById('ad-name').value;
      var phone = document.getElementById('ad-phone').value;
      if (name.trim().length < 3) { showErr('ad-error', 'Scrie numele pacientului.'); return true; }
      if (phone.trim() && !MC.validPhone(phone)) { showErr('ad-error', 'Numărul de telefon nu pare corect.'); return true; }
      if (!date) { showErr('ad-error', 'Alege ziua.'); return true; }
      var chk = MC.store.check(svc.cat, date, hour, MC.slotHours(svc));
      if (!chk.ok) { showErr('ad-error', chk.reason); return true; }
      var b = MC.store.add({ serviceId: svc.id, date: date, hour: hour, name: name, phone: phone || '—', note: document.getElementById('ad-note').value, source: 'clinica' });
      MC.adm.panel = { mode: 'booking', id: b.id };
      MC.adm.week = MC.weekStart(MC.parseYmd(date));
      MC.toast(b.name + ' a fost adăugat(ă) în agendă.', 'ok');
      MC.render();
      return true;
    }
    if (form.id === 'adm-settings') {
      var s = JSON.parse(JSON.stringify(MC.store.settings()));
      MC.CATS.forEach(function (c) {
        s.capacity[c.id] = Math.max(1, Math.min(30, parseInt(document.getElementById('cap-' + c.id).value, 10) || 1));
      });
      s.open = +document.getElementById('st-open').value;
      s.close = +document.getElementById('st-close').value;
      s.days = [0, 1, 2, 3, 4, 5, 6].filter(function (d) { return document.getElementById('st-day-' + d).checked; });
      s.maxDaysAhead = Math.max(7, Math.min(365, parseInt(document.getElementById('st-ahead').value, 10) || 60));
      if (s.close - s.open < 1) { showErr('st-error', 'Ora de închidere trebuie să fie după prima programare.'); return true; }
      if (!s.days.length) { showErr('st-error', 'Bifează cel puțin o zi lucrătoare.'); return true; }
      MC.store.saveSettings(s);
      MC.toast('Setările au fost salvate.', 'ok');
      MC.render();
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
      var err = tryMove(id, c.dataset.date, +c.dataset.hour);
      if (err) MC.toast(err, 'bad');
      MC.adm.panel = { mode: 'booking', id: id };
      MC.render();
    });
  };
})();
