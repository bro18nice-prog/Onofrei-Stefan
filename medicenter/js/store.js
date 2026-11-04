/*
 * Stocarea programărilor și a setărilor.
 *
 * În demo, datele stau în browser (localStorage), deci fiecare calculator își vede
 * propriile date. La lansare, doar acest fișier se înlocuiește cu varianta legată
 * de baza de date online (Supabase), iar restul site-ului rămâne la fel.
 */
window.MC = window.MC || {};

(function () {
  var KEY = 'medicenter-demo-v1';
  var memory = null; // folosit dacă browserul blochează localStorage

  var DEFAULT_SETTINGS = {
    open: 9,               // prima oră de programare
    close: 20,             // ora de închidere (ultima programare se termină până atunci)
    days: [1, 2, 3, 4, 5], // zile lucrătoare: 0 = duminică … 6 = sâmbătă
    maxDaysAhead: 60,      // cu câte zile înainte se poate programa un pacient
    capacity: { kineto: 4, masaj: 2, fizio: 4, neuro: 1 },
    adminPassword: 'medicenter'
  };

  function read() {
    if (memory) return memory;
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { memory = JSON.parse(raw); return memory; }
    } catch (e) { /* stocare indisponibilă */ }
    memory = { settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), bookings: seed(DEFAULT_SETTINGS) };
    write();
    return memory;
  }
  function write() {
    try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch (e) { /* rămâne în memorie */ }
  }

  /* Programări de test pentru săptămâna curentă și următoare, ca agenda să nu fie goală. */
  function seed(settings) {
    var names = ['Ion Popescu', 'Elena Dinu', 'Radu Ene', 'Ana Stan', 'Ioana Marin', 'Vlad Sava',
      'Maria Ionescu', 'Gheorghe Tudor', 'Cristina Lungu', 'Laura Neagu', 'Mihai Barbu', 'Florin Avram',
      'Diana Cristea', 'Paul Ilie', 'Sorina Vlad', 'Mircea Oprea', 'Victor Roman', 'Andrei Coman',
      'Irina Moldovan', 'George Sima', 'Bianca Rusu', 'Alex Toma', 'Carmen Pavel', 'Dan Preda'];
    var byCat = {};
    MC.SERVICES.forEach(function (s) {
      if (MC.slotHours(s) === 1) (byCat[s.cat] = byCat[s.cat] || []).push(s);
    });
    var r = 7;
    function rnd(n) { r = (r * 9301 + 49297) % 233280; return Math.floor(r / 233280 * n); }
    var out = [];
    var start = MC.weekStart(MC.today());
    for (var i = 0; i < 14; i++) {
      var d = MC.addDays(start, i);
      if (settings.days.indexOf(d.getDay()) < 0) continue;
      for (var h = settings.open; h < settings.close; h++) {
        MC.CATS.forEach(function (c) {
          var cap = settings.capacity[c.id];
          var n = rnd(cap + 2) - 1; // uneori gol, uneori plin
          n = Math.max(0, Math.min(cap, n));
          for (var k = 0; k < n; k++) {
            var list = byCat[c.id];
            var s = list[rnd(list.length)];
            out.push({
              id: MC.uid() + out.length, serviceId: s.id, cat: s.cat, date: MC.ymd(d), hour: h, hours: 1,
              name: names[rnd(names.length)], phone: '07xx xxx xxx', note: '', source: 'test', demo: true
            });
          }
        });
      }
    }
    return out;
  }

  /* Câți pacienți are secția `cat` în ora `hour` din ziua `date` (fără programarea `excludeId`). */
  function countAt(cat, date, hour, excludeId) {
    return read().bookings.filter(function (b) {
      return b.cat === cat && b.date === date && b.id !== excludeId &&
        hour >= b.hour && hour < b.hour + b.hours;
    }).length;
  }

  MC.store = {
    settings: function () { return read().settings; },
    saveSettings: function (s) { read().settings = s; write(); },

    bookings: function () { return read().bookings; },
    bookingsOn: function (date) {
      return read().bookings.filter(function (b) { return b.date === date; });
    },
    get: function (id) {
      return read().bookings.find(function (b) { return b.id === id; });
    },

    countAt: countAt,

    /*
     * Verifică dacă o programare de `hours` ore poate începe la `hour`.
     * Întoarce { ok, free, reason }; `free` = locuri libere în cea mai plină dintre orele ocupate.
     */
    check: function (cat, date, hour, hours, excludeId) {
      var s = read().settings;
      var d = MC.parseYmd(date);
      if (s.days.indexOf(d.getDay()) < 0) return { ok: false, free: 0, reason: 'Clinica nu lucrează în această zi.' };
      if (hour < s.open || hour + hours > s.close) return { ok: false, free: 0, reason: 'Ora este în afara programului.' };
      var cap = s.capacity[cat] || 1;
      var free = cap;
      for (var k = 0; k < hours; k++) {
        free = Math.min(free, cap - countAt(cat, date, hour + k, excludeId));
      }
      if (free <= 0) return { ok: false, free: 0, reason: 'Ora ' + MC.hourLabel(hour) + ' este completă pentru această secție.' };
      return { ok: true, free: free };
    },

    add: function (data) {
      var svc = MC.serviceById(data.serviceId);
      var b = {
        id: MC.uid(), serviceId: svc.id, cat: svc.cat, date: data.date, hour: data.hour,
        hours: MC.slotHours(svc), name: data.name.trim(), phone: data.phone.trim(),
        note: (data.note || '').trim(), source: data.source || 'online', createdAt: new Date().toISOString()
      };
      read().bookings.push(b);
      write();
      return b;
    },
    update: function (id, patch) {
      var b = this.get(id);
      if (!b) return null;
      Object.keys(patch).forEach(function (k) { b[k] = patch[k]; });
      if (patch.serviceId) {
        var svc = MC.serviceById(patch.serviceId);
        b.cat = svc.cat; b.hours = MC.slotHours(svc);
      }
      write();
      return b;
    },
    remove: function (id) {
      var all = read();
      all.bookings = all.bookings.filter(function (b) { return b.id !== id; });
      write();
    },

    /* Șterge programările de test și le păstrează pe cele reale. */
    clearDemo: function () {
      var all = read();
      all.bookings = all.bookings.filter(function (b) { return !b.demo; });
      write();
    },
    resetAll: function () {
      memory = { settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), bookings: seed(DEFAULT_SETTINGS) };
      write();
    }
  };
})();
