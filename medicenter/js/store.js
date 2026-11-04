/*
 * Stocarea programărilor, a setărilor și autentificarea personalului.
 *
 * Două moduri, cu aceeași interfață pentru restul site-ului:
 *  - demo: datele stau în browser (localStorage), cu programări de test;
 *  - live: baza de date Supabase (js/config.js completat), cu regulile din supabase/schema.sql.
 *
 * Citirile (settings, bookings, check…) sunt imediate, din memoria locală.
 * Modificările (add, move, remove, saveSettings…) întorc un Promise și actualizează memoria la final.
 */
window.MC = window.MC || {};

(function () {
  var cfg = MC.CONFIG || {};
  var LIVE = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
  var KEY = 'medicenter-demo-v1';

  var DEFAULT_SETTINGS = {
    open: 9, close: 20, days: [1, 2, 3, 4, 5], maxDaysAhead: 60,
    capacity: { kineto: 4, masaj: 2, fizio: 4, neuro: 1 }
  };
  var DEMO_PASSWORD = 'medicenter';

  /* Mesaje pentru erorile întoarse de baza de date. */
  var ERRORS = {
    FULL: 'Ora aleasă este completă pentru această secție.',
    CLOSED_DAY: 'Clinica nu lucrează în această zi.',
    OUT_OF_HOURS: 'Ora este în afara programului.',
    PAST: 'Ora aleasă a trecut deja.',
    TOO_FAR: 'Data este prea departe în viitor.',
    LIMIT: 'Există deja mai multe programări pe acest număr de telefon. Sună-ne pentru alte programări.',
    BUSY: 'Sunt multe programări în acest moment. Încearcă din nou peste câteva minute sau sună-ne.',
    BAD_PHONE: 'Numărul de telefon nu pare corect. Folosește formatul 07xx xxx xxx.',
    BAD_SERVICE: 'Serviciul ales nu este valid. Reîncarcă pagina și încearcă din nou.',
    BAD_INPUT: 'Verifică numele și observațiile (maximum 500 de caractere).',
    NOT_STAFF: 'Contul nu are acces la agendă.',
    NOT_FOUND: 'Programarea nu mai există.'
  };
  function friendly(err) {
    var m = (err && (err.message || err.error_description || String(err))) || 'Eroare necunoscută.';
    var code = Object.keys(ERRORS).find(function (k) { return m.indexOf(k) >= 0; });
    if (code) return ERRORS[code];
    if (/Invalid login credentials/i.test(m)) return 'Emailul sau parola nu sunt corecte.';
    if (/Email not confirmed/i.test(m)) return 'Emailul nu este confirmat încă. Deschide linkul primit pe email.';
    if (/User already registered/i.test(m)) return 'Există deja un cont cu acest email. Folosește „Am uitat parola”.';
    if (/Password should be/i.test(m)) return 'Parola trebuie să aibă cel puțin 8 caractere.';
    if (/fetch|network/i.test(m)) return 'Nu există conexiune la internet. Încearcă din nou.';
    return m;
  }
  function fail(err) { return Promise.reject(new Error(friendly(err))); }

  var state = {
    settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
    bookings: [],
    loaded: null,     // { from, to } interval încărcat
    role: null,       // 'admin' | 'staff' | null
    email: null,
    recovery: /type=recovery/.test(location.hash) // a venit din emailul „resetează parola”
  };

  /* ---------- reguli comune (folosite de ambele moduri) ---------- */

  function countAt(cat, date, hour, excludeId) {
    return state.bookings.filter(function (b) {
      return b.cat === cat && b.date === date && b.id !== excludeId && hour >= b.hour && hour < b.hour + b.hours;
    }).length;
  }

  function check(cat, date, hour, hours, excludeId) {
    var s = state.settings;
    var d = MC.parseYmd(date);
    if (s.days.indexOf(d.getDay()) < 0) return { ok: false, free: 0, reason: ERRORS.CLOSED_DAY };
    if (hour < s.open || hour + hours > s.close) return { ok: false, free: 0, reason: ERRORS.OUT_OF_HOURS };
    var cap = s.capacity[cat] || 1;
    var free = cap;
    for (var k = 0; k < hours; k++) free = Math.min(free, cap - countAt(cat, date, hour + k, excludeId));
    if (free <= 0) return { ok: false, free: 0, reason: 'Ora ' + MC.hourLabel(hour) + ' este completă pentru această secție.' };
    return { ok: true, free: free };
  }

  /* ---------- modul demo (browser) ---------- */

  var demo = (function () {
    var authed = false;
    try { authed = sessionStorage.getItem('medicenter-admin') === '1'; } catch (e) { /* doar în memorie */ }

    function save() {
      try { localStorage.setItem(KEY, JSON.stringify({ settings: state.settings, bookings: state.bookings })); } catch (e) { /* rămâne în memorie */ }
    }
    function seed() {
      var names = ['Ion Popescu', 'Elena Dinu', 'Radu Ene', 'Ana Stan', 'Ioana Marin', 'Vlad Sava',
        'Maria Ionescu', 'Gheorghe Tudor', 'Cristina Lungu', 'Laura Neagu', 'Mihai Barbu', 'Florin Avram',
        'Diana Cristea', 'Paul Ilie', 'Sorina Vlad', 'Mircea Oprea', 'Victor Roman', 'Andrei Coman',
        'Irina Moldovan', 'George Sima', 'Bianca Rusu', 'Alex Toma', 'Carmen Pavel', 'Dan Preda'];
      var byCat = {};
      MC.SERVICES.forEach(function (s) { if (MC.slotHours(s) === 1) (byCat[s.cat] = byCat[s.cat] || []).push(s); });
      var r = 7;
      function rnd(n) { r = (r * 9301 + 49297) % 233280; return Math.floor(r / 233280 * n); }
      var out = [];
      var settings = DEFAULT_SETTINGS;
      var start = MC.weekStart(MC.today());
      for (var i = 0; i < 14; i++) {
        var d = MC.addDays(start, i);
        if (settings.days.indexOf(d.getDay()) < 0) continue;
        for (var h = settings.open; h < settings.close; h++) {
          MC.CATS.forEach(function (c) {
            var cap = settings.capacity[c.id];
            var n = Math.max(0, Math.min(cap, rnd(cap + 2) - 1));
            for (var k = 0; k < n; k++) {
              var list = byCat[c.id];
              var s = list[rnd(list.length)];
              out.push({ id: MC.uid() + out.length, serviceId: s.id, cat: s.cat, date: MC.ymd(d), hour: h, hours: 1,
                name: names[rnd(names.length)], phone: '07xx xxx xxx', note: '', source: 'test', demo: true });
            }
          });
        }
      }
      return out;
    }

    return {
      init: function () {
        var data = null;
        try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { /* stocare indisponibilă */ }
        if (data && data.settings) {
          delete data.settings.adminPassword;
          state.settings = data.settings;
          state.bookings = data.bookings || [];
        } else {
          state.bookings = seed();
          save();
        }
        state.role = authed ? 'admin' : null;
        return Promise.resolve();
      },
      refresh: function () { return Promise.resolve(); },
      loadRange: function () { return Promise.resolve(); },
      add: function (data) {
        var svc = MC.serviceById(data.serviceId);
        var c = check(svc.cat, data.date, data.hour, MC.slotHours(svc));
        if (!c.ok) return fail(c.reason);
        var b = { id: MC.uid(), serviceId: svc.id, cat: svc.cat, date: data.date, hour: data.hour, hours: MC.slotHours(svc),
          name: data.name.trim(), phone: data.phone.trim(), note: (data.note || '').trim(), source: data.source || 'online',
          createdAt: new Date().toISOString() };
        state.bookings.push(b);
        save();
        return Promise.resolve(b);
      },
      move: function (id, date, hour) {
        var b = MC.store.get(id);
        if (!b) return fail('NOT_FOUND');
        var c = check(b.cat, date, hour, b.hours, id);
        if (!c.ok) return fail(c.reason);
        b.date = date; b.hour = hour;
        save();
        return Promise.resolve(b);
      },
      remove: function (id) {
        state.bookings = state.bookings.filter(function (b) { return b.id !== id; });
        save();
        return Promise.resolve();
      },
      saveSettings: function (s) { state.settings = s; save(); return Promise.resolve(); },
      clearDemo: function () {
        state.bookings = state.bookings.filter(function (b) { return !b.demo; });
        save();
        return Promise.resolve();
      },
      signIn: function (email, pass) {
        if (pass !== DEMO_PASSWORD) return fail('Parola nu este corectă.');
        authed = true; state.role = 'admin';
        try { sessionStorage.setItem('medicenter-admin', '1'); } catch (e) { /* doar în memorie */ }
        return Promise.resolve();
      },
      signOut: function () {
        authed = false; state.role = null;
        try { sessionStorage.removeItem('medicenter-admin'); } catch (e) { /* doar în memorie */ }
        return Promise.resolve();
      }
    };
  })();

  /* ---------- modul live (Supabase) ---------- */

  var live = (function () {
    if (!LIVE) return null;
    var sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    // Linkul din emailul de resetare a parolei deschide formularul „Parolă nouă”.
    sb.auth.onAuthStateChange(function (event) {
      if (event === 'PASSWORD_RECOVERY') state.recovery = true;
    });

    function fromRow(r) {
      return {
        id: r.id || (r.cat + r.date + r.hour + Math.random()), serviceId: r.service_id || null, cat: r.cat, date: r.date,
        hour: r.hour, hours: r.hours, name: r.name || '', phone: r.phone || '', note: r.note || '',
        source: r.source || 'online', createdAt: r.created_at
      };
    }
    function defaultRange() {
      var t = MC.today();
      return state.role
        ? { from: MC.ymd(MC.addDays(MC.weekStart(t), -7)), to: MC.ymd(MC.addDays(t, Math.max(70, state.settings.maxDaysAhead + 7))) }
        : { from: MC.ymd(t), to: MC.ymd(MC.addDays(t, state.settings.maxDaysAhead + 1)) };
    }
    function loadSettings() {
      return sb.from('settings').select('data').eq('id', 1).single().then(function (res) {
        if (res.error) throw res.error;
        state.settings = Object.assign({}, DEFAULT_SETTINGS, res.data.data);
      });
    }
    function loadRole() {
      return sb.auth.getSession().then(function (res) {
        var session = res.data && res.data.session;
        state.email = session ? session.user.email : null;
        if (!session) { state.role = null; return; }
        return sb.rpc('my_role').then(function (r) { state.role = r.error ? null : r.data; });
      });
    }
    function loadBookings(range) {
      var q = state.role
        ? sb.from('bookings').select('*').gte('date', range.from).lte('date', range.to)
        : sb.rpc('get_availability', { p_from: range.from, p_to: range.to });
      return q.then(function (res) {
        if (res.error) throw res.error;
        state.bookings = (res.data || []).map(fromRow);
        state.loaded = range;
      });
    }
    function reload() {
      return loadSettings().then(loadRole).then(function () { return loadBookings(defaultRange()); })
        .catch(function (e) { return fail(e); });
    }

    return {
      client: sb,
      init: reload,
      refresh: reload,
      /* Agenda cere alte săptămâni decât cele încărcate. */
      loadRange: function (from, to) {
        var L = state.loaded;
        if (L && from >= L.from && to <= L.to) return Promise.resolve();
        var range = { from: L && L.from < from ? L.from : from, to: L && L.to > to ? L.to : to };
        return loadBookings(range).catch(fail);
      },
      add: function (data) {
        var svc = MC.serviceById(data.serviceId);
        return sb.rpc('book', {
          p_service_id: svc.id, p_cat: svc.cat, p_date: data.date, p_hour: data.hour, p_hours: MC.slotHours(svc),
          p_name: data.name, p_phone: data.phone, p_note: data.note || '', p_source: data.source === 'clinica' ? 'clinica' : 'online'
        }).then(function (res) {
          if (res.error) return fail(res.error);
          var b = { id: res.data, serviceId: svc.id, cat: svc.cat, date: data.date, hour: data.hour, hours: MC.slotHours(svc),
            name: data.name.trim(), phone: data.phone.trim(), note: (data.note || '').trim(), source: data.source || 'online' };
          state.bookings.push(b);
          return b;
        });
      },
      move: function (id, date, hour) {
        return sb.rpc('move_booking', { p_id: id, p_date: date, p_hour: hour }).then(function (res) {
          if (res.error) return fail(res.error);
          var b = MC.store.get(id);
          if (b) { b.date = date; b.hour = hour; }
          return b;
        });
      },
      remove: function (id) {
        return sb.from('bookings').delete().eq('id', id).then(function (res) {
          if (res.error) return fail(res.error);
          state.bookings = state.bookings.filter(function (b) { return b.id !== id; });
        });
      },
      saveSettings: function (s) {
        return sb.from('settings').update({ data: s, updated_at: new Date().toISOString() }).eq('id', 1).select().then(function (res) {
          if (res.error) return fail(res.error);
          if (!res.data || !res.data.length) return fail('Doar administratorii pot schimba setările.');
          state.settings = s;
        });
      },
      clearDemo: function () { return Promise.resolve(); },
      signIn: function (email, pass) {
        return sb.auth.signInWithPassword({ email: email.trim(), password: pass }).then(function (res) {
          if (res.error) return fail(res.error);
          return reload().then(function () {
            if (!state.role) {
              return sb.auth.signOut().then(function () {
                return fail('Acest email nu este trecut în lista personalului. Cere administratorului să te adauge.');
              });
            }
          });
        });
      },
      signOut: function () { return sb.auth.signOut().then(reload); },
      signUp: function (email, pass) {
        var back = location.href.split('#')[0];
        return sb.auth.signUp({ email: email.trim(), password: pass, options: { emailRedirectTo: back } }).then(function (res) {
          if (res.error) return fail(res.error);
        });
      },
      resetPassword: function (email) {
        var back = location.href.split('#')[0];
        return sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: back }).then(function (res) {
          if (res.error) return fail(res.error);
        });
      },
      updatePassword: function (pass) {
        return sb.auth.updateUser({ password: pass }).then(function (res) {
          if (res.error) return fail(res.error);
          state.recovery = false;
          return reload();
        });
      },
      staffList: function () {
        return sb.from('staff').select('*').order('created_at').then(function (res) {
          if (res.error) return fail(res.error);
          return res.data;
        });
      },
      staffAdd: function (email, name, role) {
        return sb.from('staff').insert({ email: email.trim().toLowerCase(), name: name.trim(), role: role }).then(function (res) {
          if (res.error) return fail(/duplicate/i.test(res.error.message) ? 'Emailul este deja în listă.' : res.error);
        });
      },
      staffRemove: function (email) {
        return sb.from('staff').delete().eq('email', email).then(function (res) {
          if (res.error) return fail(res.error);
        });
      }
    };
  })();

  var impl = LIVE ? live : demo;

  MC.store = {
    live: LIVE,
    isRecovery: function () { return state.recovery; },
    init: impl.init,
    refresh: impl.refresh,
    loadRange: impl.loadRange,

    settings: function () { return state.settings; },
    bookings: function () { return state.bookings; },
    bookingsOn: function (date) { return state.bookings.filter(function (b) { return b.date === date; }); },
    get: function (id) { return state.bookings.find(function (b) { return b.id === id; }); },
    countAt: countAt,
    check: check,

    add: impl.add,
    move: impl.move,
    remove: impl.remove,
    saveSettings: impl.saveSettings,
    clearDemo: impl.clearDemo,

    role: function () { return state.role; },
    email: function () { return state.email; },
    signIn: impl.signIn,
    signOut: impl.signOut,
    signUp: impl.signUp,
    resetPassword: impl.resetPassword,
    updatePassword: impl.updatePassword,
    staffList: impl.staffList,
    staffAdd: impl.staffAdd,
    staffRemove: impl.staffRemove
  };
})();
