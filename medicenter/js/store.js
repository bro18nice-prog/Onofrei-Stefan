/*
 * Stocarea programărilor, a setărilor și autentificarea personalului.
 *
 * Două moduri, cu aceeași interfață pentru restul site-ului:
 *  - demo: datele stau în browser (localStorage), cu programări de test;
 *  - live: baza de date Supabase (js/config.js completat), cu regulile din supabase/schema.sql.
 *
 * Citirile (settings, bookings, check…) sunt imediate, din memoria locală.
 * Modificările (add, move, setStatus, saveSettings…) întorc un Promise și actualizează memoria la final.
 *
 * O programare are o stare: pending (cerere în așteptare), confirmed, rejected sau cancelled.
 * Cererile în așteptare și programările confirmate ocupă locuri; cele refuzate sau anulate nu.
 */
window.MC = window.MC || {};

(function () {
  var cfg = MC.CONFIG || {};
  var LIVE = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
  var KEY = 'medicenter-demo-v2';
  var MINE_KEY = 'medicenter-cererile-mele';

  var DEFAULT_SETTINGS = {
    open: 9, close: 20, days: [1, 2, 3, 4, 5], maxDaysAhead: 60,
    capacity: { kineto: 7, masaj: 7, fizio: 7, neuro: 7 },
    serviceCapacity: MC.DEFAULT_SERVICE_CAP,
    evalRequired: MC.DEFAULT_EVAL,
    newPatient: MC.DEFAULT_NEW_PATIENT
  };
  var DEMO_PASSWORD = 'medicenter';

  /* Mesaje pentru erorile întoarse de baza de date. */
  var ERRORS = {
    FULL: 'Ora aleasă este ocupată pentru această terapie.',
    CLOSED_DAY: 'Clinica nu lucrează în această zi.',
    OUT_OF_HOURS: 'Ora este în afara programului.',
    PAST: 'Ora aleasă a trecut deja.',
    TOO_FAR: 'Data este prea departe în viitor.',
    LIMIT: 'Există deja mai multe programări pe acest număr de telefon. Sună-ne pentru alte programări.',
    BUSY: 'Sunt multe programări în acest moment. Încearcă din nou peste câteva minute sau sună-ne.',
    BAD_PHONE: 'Numărul de telefon nu pare corect. Folosește formatul 07xx xxx xxx.',
    BAD_SERVICE: 'Serviciul ales nu este valid. Reîncarcă pagina și încearcă din nou.',
    BAD_INPUT: 'Verifică datele completate (nume, vârsta copilului, observații de maximum 500 de caractere).',
    EVAL_REQUIRED: 'Această terapie necesită întâi evaluarea la clinică.',
    NEW_PATIENT_ONLY: 'Pacienții noi pot programa întâi doar o evaluare sau o consultație.',
    NOT_STAFF: 'Contul nu are acces la agendă.',
    NOT_FOUND: 'Programarea nu mai există.'
  };
  function friendly(err) {
    var m = (err && (err.message || err.error_description || String(err))) || 'Eroare necunoscută.';
    var code = Object.keys(ERRORS).find(function (k) { return m.indexOf(k) >= 0; });
    if (code) return ERRORS[code];
    if (/Invalid login credentials/i.test(m)) return 'Emailul sau parola nu sunt corecte.';
    if (/Email not confirmed/i.test(m)) return 'Emailul nu este confirmat încă. Deschide linkul primit pe email.';
    if (/Email address not authorized|not authorized/i.test(m)) return 'Nu putem trimite email la această adresă. Cere administratorului să creeze contul din Supabase.';
    if (/rate limit|too many/i.test(m)) return 'Prea multe emailuri trimise în ultima oră. Încearcă din nou mai târziu.';
    if (/User already registered/i.test(m)) return 'Există deja un cont cu acest email. Folosește „Am uitat parola”.';
    if (/Password should be/i.test(m)) return 'Parola trebuie să aibă cel puțin 8 caractere.';
    if (/fetch|network/i.test(m)) return 'Nu există conexiune la internet. Încearcă din nou.';
    return m;
  }
  function fail(err) { return Promise.reject(new Error(friendly(err))); }

  var state = {
    settings: withDefaults({}),
    bookings: [],
    features: { caps: true, therapist: true, push: true }, // false cât timp baza de date nu are încă tabelele noi
    slotCaps: [],     // locuri setate manual: { date, hour, cat ('*' = toată clinica), cap }
    loaded: null,     // { from, to } interval încărcat
    role: null,       // 'admin' | 'staff' | null
    email: null,
    recovery: /type=recovery/.test(location.hash) // a venit din emailul „resetează parola”
  };

  /* Completează setările salvate cu valorile implicite care lipsesc (ex. terapii noi). */
  function withDefaults(s) {
    var out = Object.assign({}, DEFAULT_SETTINGS, s || {});
    out.capacity = Object.assign({}, DEFAULT_SETTINGS.capacity, (s && s.capacity) || {});
    out.serviceCapacity = Object.assign({}, DEFAULT_SETTINGS.serviceCapacity, (s && s.serviceCapacity) || {});
    out.evalRequired = Object.assign({}, (s && s.evalRequired) || DEFAULT_SETTINGS.evalRequired);
    out.newPatient = ((s && s.newPatient) || DEFAULT_SETTINGS.newPatient).slice();
    return out;
  }

  /* ---------- reguli comune (folosite de ambele moduri) ---------- */

  function active(b) { return !b.status || b.status === 'pending' || b.status === 'confirmed'; }

  function capOf(serviceId) {
    var s = state.settings;
    var svc = MC.serviceById(serviceId);
    var v = s.serviceCapacity[serviceId];
    if (v == null && svc) v = s.capacity[svc.cat];
    return v || 1;
  }

  /* Câte programări active are terapia `serviceId` în ora `hour` din ziua `date`. */
  function countAt(serviceId, date, hour, excludeId) {
    return state.bookings.filter(function (b) {
      return active(b) && b.serviceId === serviceId && b.date === date && b.id !== excludeId &&
        hour >= b.hour && hour < b.hour + b.hours;
    }).length;
  }

  /* Locurile setate manual din agendă pentru o oră (pe secție sau '*' = toată clinica), sau null. */
  function slotCap(date, hour, cat) {
    var x = state.slotCaps.find(function (c) { return c.date === date && c.hour === hour && c.cat === cat; });
    return x ? x.cap : null;
  }
  function countWhere(date, hour, excludeId, cat) {
    return state.bookings.filter(function (b) {
      return active(b) && b.date === date && b.id !== excludeId && (!cat || b.cat === cat) &&
        hour >= b.hour && hour < b.hour + b.hours;
    }).length;
  }

  /* Poate începe terapia la ora `hour`? Întoarce { ok, free, reason }. */
  function check(serviceId, date, hour, hours, excludeId) {
    var s = state.settings;
    var d = MC.parseYmd(date);
    if (s.days.indexOf(d.getDay()) < 0) return { ok: false, free: 0, reason: ERRORS.CLOSED_DAY };
    if (hour < s.open || hour + hours > s.close) return { ok: false, free: 0, reason: ERRORS.OUT_OF_HOURS };
    var cap = capOf(serviceId);
    var free = cap;
    var cat = (MC.serviceById(serviceId) || {}).cat;
    for (var k = 0; k < hours; k++) {
      free = Math.min(free, cap - countAt(serviceId, date, hour + k, excludeId));
      var cc = slotCap(date, hour + k, cat);
      if (cc != null) free = Math.min(free, cc - countWhere(date, hour + k, excludeId, cat));
      var ac = slotCap(date, hour + k, '*');
      if (ac != null) free = Math.min(free, ac - countWhere(date, hour + k, excludeId, null));
    }
    if (free <= 0) return { ok: false, free: 0, reason: 'Ora ' + MC.hourLabel(hour) + ' este ocupată pentru această terapie.' };
    return { ok: true, free: free };
  }

  function evalFor(serviceId) { return state.settings.evalRequired[serviceId] || null; }
  function forNewPatients(serviceId) { return state.settings.newPatient.indexOf(serviceId) >= 0; }

  /* Cererile trimise de pe acest dispozitiv (doar token-uri), ca pacientul să le regăsească. */
  function mine() {
    try { return JSON.parse(localStorage.getItem(MINE_KEY) || '[]'); } catch (e) { return []; }
  }
  function rememberMine(token) {
    try {
      var list = mine().filter(function (t) { return t !== token; });
      list.unshift(token);
      localStorage.setItem(MINE_KEY, JSON.stringify(list.slice(0, 10)));
    } catch (e) { /* doar în memorie */ }
  }

  /* ---------- modul demo (browser) ---------- */

  var demo = (function () {
    var authed = false;
    try { authed = sessionStorage.getItem('medicenter-admin') === '1'; } catch (e) { /* doar în memorie */ }

    function save() {
      try { localStorage.setItem(KEY, JSON.stringify({ settings: state.settings, bookings: state.bookings, slotCaps: state.slotCaps })); } catch (e) { /* rămâne în memorie */ }
    }
    function seed() {
      var names = ['Ion Popescu', 'Elena Dinu', 'Radu Ene', 'Ana Stan', 'Ioana Marin', 'Vlad Sava',
        'Maria Ionescu', 'Gheorghe Tudor', 'Cristina Lungu', 'Laura Neagu', 'Mihai Barbu', 'Florin Avram',
        'Diana Cristea', 'Paul Ilie', 'Sorina Vlad', 'Mircea Oprea', 'Victor Roman', 'Andrei Coman',
        'Irina Moldovan', 'George Sima', 'Bianca Rusu', 'Alex Toma', 'Carmen Pavel', 'Dan Preda'];
      var kids = ['Matei', 'Sofia', 'David', 'Ilinca', 'Luca', 'Ana'];
      var pool = MC.SERVICES.filter(function (s) { return MC.slotHours(s) === 1; });
      var r = 7;
      function rnd(n) { r = (r * 9301 + 49297) % 233280; return Math.floor(r / 233280 * n); }
      var start = MC.weekStart(MC.today());
      var todayYmd = MC.ymd(MC.today());
      for (var i = 0; i < 14; i++) {
        var d = MC.addDays(start, i);
        if (state.settings.days.indexOf(d.getDay()) < 0) continue;
        var ymd = MC.ymd(d);
        for (var h = state.settings.open; h < state.settings.close; h++) {
          var n = rnd(5);
          for (var k = 0; k < n; k++) {
            var svc = pool[rnd(pool.length)];
            if (!check(svc.id, ymd, h, 1).ok) continue;
            var child = rnd(4) === 0;
            state.bookings.push({
              id: MC.uid() + state.bookings.length, token: MC.uid(), serviceId: svc.id, cat: svc.cat, date: ymd, hour: h, hours: 1,
              name: names[rnd(names.length)], phone: '07xx xxx xxx', note: '', source: 'test', demo: true,
              status: ymd > todayYmd && rnd(5) === 0 ? 'pending' : 'confirmed',
              childName: child ? kids[rnd(kids.length)] : '', childAge: child ? 4 + rnd(10) : null,
              availability: child ? 'după 16:00' : '', evalDeclared: !!evalFor(svc.id), staffNote: ''
            });
          }
        }
      }
    }
    function find(id) { return state.bookings.find(function (b) { return b.id === id; }); }

    return {
      init: function () {
        var data = null;
        try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { /* stocare indisponibilă */ }
        if (data && data.settings) {
          state.settings = withDefaults(data.settings);
          state.bookings = data.bookings || [];
          state.slotCaps = data.slotCaps || [];
        } else {
          state.settings = withDefaults({});
          state.bookings = [];
          seed();
          save();
        }
        state.role = authed ? 'admin' : null;
        return Promise.resolve();
      },
      refresh: function () { return Promise.resolve(); },
      loadRange: function () { return Promise.resolve(); },
      setSlotCap: function (date, hour, cat, cap) {
        state.slotCaps = state.slotCaps.filter(function (c) { return !(c.date === date && c.hour === hour && c.cat === cat); });
        if (cap != null) state.slotCaps.push({ date: date, hour: hour, cat: cat, cap: cap });
        save(); return Promise.resolve();
      },
      setSlotCaps: function (date, hours, cats, cap) {
        hours.forEach(function (h) { cats.forEach(function (c) {
          var cur = slotCap(date, h, c);
          if (cap == null && cur !== 0) return;
          state.slotCaps = state.slotCaps.filter(function (x) { return !(x.date === date && x.hour === h && x.cat === c); });
          if (cap != null) state.slotCaps.push({ date: date, hour: h, cat: c, cap: cap });
        }); });
        save(); return Promise.resolve();
      },
      setTherapist: function (id, name) {
        var b = find(id); if (b) b.therapist = name || '';
        save(); return Promise.resolve();
      },
      updateBooking: function (id, f) {
        var b = find(id); if (b) Object.assign(b, f);
        save(); return Promise.resolve();
      },
      savePush: function () { return Promise.resolve(); },
      removePush: function () { return Promise.resolve(); },
      add: function (data) {
        var svc = MC.serviceById(data.serviceId);
        var staff = data.source === 'clinica';
        if (!staff && evalFor(svc.id) && !data.evalDeclared) return fail('EVAL_REQUIRED');
        if (!staff && data.newPatient && !forNewPatients(svc.id)) return fail('NEW_PATIENT_ONLY');
        var c = check(svc.id, data.date, data.hour, MC.slotHours(svc));
        if (!c.ok) return fail(c.reason);
        var b = { id: MC.uid(), token: MC.uid() + MC.uid(), serviceId: svc.id, cat: svc.cat, date: data.date, hour: data.hour,
          hours: MC.slotHours(svc), name: data.name.trim(), phone: data.phone.trim(), note: (data.note || '').trim(),
          source: staff ? 'clinica' : 'online', status: staff ? 'confirmed' : 'pending',
          childName: (data.childName || '').trim(), childAge: data.childAge == null || data.childAge === '' ? null : +data.childAge,
          availability: (data.availability || '').trim(), evalDeclared: !!data.evalDeclared, newPatient: !!data.newPatient, staffNote: '',
          createdAt: new Date().toISOString() };
        state.bookings.push(b);
        if (!staff) rememberMine(b.token);
        save();
        return Promise.resolve(b);
      },
      move: function (id, date, hour, confirm) {
        var b = find(id);
        if (!b) return fail('NOT_FOUND');
        var c = check(b.serviceId, date, hour, b.hours, id);
        if (!c.ok) return fail(c.reason);
        b.date = date; b.hour = hour;
        if (confirm || !active(b)) b.status = 'confirmed';
        save();
        return Promise.resolve(b);
      },
      setStatus: function (id, status, note) {
        var b = find(id);
        if (!b) return fail('NOT_FOUND');
        if (status === 'confirmed' && !active(b)) {
          var c = check(b.serviceId, b.date, b.hour, b.hours, id);
          if (!c.ok) return fail(c.reason);
        }
        b.status = status; b.staffNote = (note || '').trim();
        save();
        return Promise.resolve(b);
      },
      getStatus: function (token) {
        var b = state.bookings.find(function (x) { return x.token === token; });
        return Promise.resolve(b ? { serviceId: b.serviceId, date: b.date, hour: b.hour, hours: b.hours,
          status: b.status || 'confirmed', staffNote: b.staffNote || '', childName: b.childName || '' } : null);
      },
      history: function (phone) {
        var key = String(phone).replace(/\D/g, '');
        return Promise.resolve(state.bookings.filter(function (b) {
          return key.length >= 9 && String(b.phone).replace(/\D/g, '') === key;
        }));
      },
      saveSettings: function (s) { state.settings = withDefaults(s); save(); return Promise.resolve(); },
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
        id: r.id || (r.service_id + r.date + r.hour + Math.random()), token: r.token || null,
        serviceId: r.service_id, cat: r.cat, date: r.date, hour: r.hour, hours: r.hours,
        name: r.name || '', phone: r.phone || '', note: r.note || '', source: r.source || 'online',
        status: r.status || 'confirmed', childName: r.child_name || '', childAge: r.child_age == null ? null : r.child_age,
        availability: r.availability || '', evalDeclared: !!r.eval_declared, newPatient: !!r.new_patient, staffNote: r.staff_note || '',
        therapist: r.therapist || '',
        createdAt: r.created_at
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
        state.settings = withDefaults(res.data.data);
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
      var caps = sb.from('slot_caps').select('date,hour,cat,cap').gte('date', range.from).lte('date', range.to);
      var probe = state.role ? sb.from('bookings').select('therapist').limit(1) : Promise.resolve({ error: null });
      var probePush = state.role ? sb.from('push_subscriptions').select('endpoint').limit(1) : Promise.resolve({ error: null });
      return Promise.all([q, caps, probe, probePush]).then(function (all) {
        var res = all[0], rc = all[1];
        if (res.error) throw res.error;
        state.features = { caps: !rc.error, therapist: !all[2].error, push: !all[3].error };
        state.bookings = (res.data || []).map(fromRow);
        // dacă tabelul nu există încă (baza neactualizată), site-ul merge mai departe fără locuri manuale
        state.slotCaps = rc.error ? [] : (rc.data || []).map(function (c) { return { date: c.date, hour: +c.hour, cat: c.cat, cap: +c.cap }; });
        state.loaded = range;
      });
    }
    function reload() {
      return loadSettings().then(loadRole).then(function () { return loadBookings(defaultRange()); })
        .catch(function (e) { return fail(e); });
    }
    function local(id) { return state.bookings.find(function (b) { return b.id === id; }); }

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
      setSlotCap: function (date, hour, cat, cap) {
        var q = cap == null
          ? sb.from('slot_caps').delete().eq('date', date).eq('hour', hour).eq('cat', cat)
          : sb.from('slot_caps').upsert({ date: date, hour: hour, cat: cat, cap: cap, updated_at: new Date().toISOString() });
        return q.then(function (res) {
          if (res.error) return fail(res.error);
          state.slotCaps = state.slotCaps.filter(function (c) { return !(c.date === date && c.hour === hour && c.cat === cat); });
          if (cap != null) state.slotCaps.push({ date: date, hour: hour, cat: cat, cap: cap });
        });
      },
      /* Blochează (cap 0) sau deblochează (null) mai multe ore/secții dintr-o zi, dintr-o singură cerere. */
      setSlotCaps: function (date, hours, cats, cap) {
        var q;
        if (cap == null) {
          q = sb.from('slot_caps').delete().eq('date', date).in('hour', hours).in('cat', cats).eq('cap', 0);
        } else {
          var now = new Date().toISOString(), rows = [];
          hours.forEach(function (h) { cats.forEach(function (c) { rows.push({ date: date, hour: h, cat: c, cap: cap, updated_at: now }); }); });
          q = sb.from('slot_caps').upsert(rows);
        }
        return q.then(function (res) {
          if (res.error) return fail(res.error);
          hours.forEach(function (h) { cats.forEach(function (c) {
            var cur = slotCap(date, h, c);
            if (cap == null && cur !== 0) return;
            state.slotCaps = state.slotCaps.filter(function (x) { return !(x.date === date && x.hour === h && x.cat === c); });
            if (cap != null) state.slotCaps.push({ date: date, hour: h, cat: c, cap: cap });
          }); });
        });
      },
      setTherapist: function (id, name) {
        return sb.from('bookings').update({ therapist: name || '', updated_at: new Date().toISOString() }).eq('id', id).then(function (res) {
          if (res.error) return fail(res.error);
          var b = local(id); if (b) b.therapist = name || '';
        });
      },
      savePush: function (sub) {
        var k = sub.keys || {};
        return sb.from('push_subscriptions').upsert({ endpoint: sub.endpoint, p256dh: k.p256dh, auth: k.auth, email: state.email || '' })
          .then(function (res) { if (res.error) return fail(res.error); });
      },
      removePush: function (endpoint) {
        return sb.from('push_subscriptions').delete().eq('endpoint', endpoint).then(function (res) { if (res.error) return fail(res.error); });
      },
      updateBooking: function (id, f) {
        return sb.from('bookings').update({ name: f.name, phone: f.phone, child_name: f.childName, child_age: f.childAge, note: f.note,
          updated_at: new Date().toISOString() }).eq('id', id).then(function (res) {
          if (res.error) return fail(res.error);
          var b = local(id); if (b) Object.assign(b, f);
        });
      },
      add: function (data) {
        var svc = MC.serviceById(data.serviceId);
        var staff = data.source === 'clinica';
        return sb.rpc('book', {
          p_service_id: svc.id, p_cat: svc.cat, p_date: data.date, p_hour: data.hour, p_hours: MC.slotHours(svc),
          p_name: data.name, p_phone: data.phone, p_note: data.note || '', p_source: staff ? 'clinica' : 'online',
          p_child_name: data.childName || '', p_child_age: data.childAge === '' || data.childAge == null ? null : +data.childAge,
          p_availability: data.availability || '', p_eval_declared: !!data.evalDeclared, p_new_patient: !!data.newPatient
        }).then(function (res) {
          if (res.error) return fail(res.error);
          var b = { id: res.data.id, token: res.data.token, serviceId: svc.id, cat: svc.cat, date: data.date, hour: data.hour,
            hours: MC.slotHours(svc), name: data.name.trim(), phone: data.phone.trim(), note: (data.note || '').trim(),
            source: staff ? 'clinica' : 'online', status: res.data.status,
            childName: (data.childName || '').trim(), childAge: data.childAge === '' || data.childAge == null ? null : +data.childAge,
            availability: (data.availability || '').trim(), evalDeclared: !!data.evalDeclared, newPatient: !!data.newPatient, staffNote: '' };
          state.bookings.push(b);
          if (!staff) rememberMine(b.token);
          return b;
        });
      },
      move: function (id, date, hour, confirm) {
        return sb.rpc('move_booking', { p_id: id, p_date: date, p_hour: hour, p_confirm: !!confirm }).then(function (res) {
          if (res.error) return fail(res.error);
          var b = local(id);
          if (b) { b.date = date; b.hour = hour; if (confirm || !active(b)) b.status = 'confirmed'; }
          return b;
        });
      },
      setStatus: function (id, status, note) {
        return sb.rpc('set_booking_status', { p_id: id, p_status: status, p_note: note || '' }).then(function (res) {
          if (res.error) return fail(res.error);
          var b = local(id);
          if (b) { b.status = status; b.staffNote = (note || '').trim(); }
          return b;
        });
      },
      getStatus: function (token) {
        if (!/^[0-9a-f-]{36}$/i.test(token)) return Promise.resolve(null);
        return sb.rpc('get_booking_status', { p_token: token }).then(function (res) {
          if (res.error) return fail(res.error);
          var r = res.data && res.data[0];
          return r ? { serviceId: r.service_id, date: r.date, hour: r.hour, hours: r.hours, status: r.status,
            staffNote: r.staff_note || '', childName: r.child_name || '' } : null;
        });
      },
      history: function (phone) {
        var p = String(phone).trim();
        if (p.replace(/\D/g, '').length < 9) return Promise.resolve([]);
        return sb.from('bookings').select('*').eq('phone', p).order('date', { ascending: false }).limit(30).then(function (res) {
          if (res.error) return fail(res.error);
          return (res.data || []).map(fromRow);
        });
      },
      saveSettings: function (s) {
        return sb.from('settings').update({ data: s, updated_at: new Date().toISOString() }).eq('id', 1).select().then(function (res) {
          if (res.error) return fail(res.error);
          if (!res.data || !res.data.length) return fail('Doar administratorii pot schimba setările.');
          state.settings = withDefaults(s);
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
    /* Programările active (în așteptare sau confirmate) dintr-o zi. */
    bookingsOn: function (date) { return state.bookings.filter(function (b) { return b.date === date && active(b); }); },
    pending: function () {
      return state.bookings.filter(function (b) { return b.status === 'pending'; })
        .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.hour - b.hour; });
    },
    get: function (id) { return state.bookings.find(function (b) { return b.id === id; }); },
    active: active,
    capOf: capOf,
    countAt: countAt,
    check: check,
    slotCap: slotCap,
    supports: function (name) { return !!state.features[name]; },
    countWhere: countWhere,
    setSlotCap: impl.setSlotCap,
    setSlotCaps: impl.setSlotCaps,
    setTherapist: impl.setTherapist,
    updateBooking: impl.updateBooking,
    savePush: impl.savePush,
    removePush: impl.removePush,
    evalFor: evalFor,
    forNewPatients: forNewPatients,
    mine: mine,

    add: impl.add,
    move: impl.move,
    setStatus: impl.setStatus,
    getStatus: impl.getStatus,
    history: impl.history,
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
