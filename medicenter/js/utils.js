/* Funcții ajutătoare: date calendaristice, escapare HTML, notificări. */
window.MC = window.MC || {};

MC.DAYS_SHORT = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];
MC.DAYS_LONG = ['duminică', 'luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă'];
MC.MONTHS = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie',
  'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];

MC.pad = function (n) { return String(n).padStart(2, '0'); };

/* Data locală în formatul AAAA-LL-ZZ. */
MC.ymd = function (d) {
  return d.getFullYear() + '-' + MC.pad(d.getMonth() + 1) + '-' + MC.pad(d.getDate());
};
MC.parseYmd = function (s) {
  var p = s.split('-');
  return new Date(+p[0], +p[1] - 1, +p[2]);
};
MC.addDays = function (d, n) {
  var r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() + n);
  return r;
};
MC.today = function () {
  var n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
};
/* Luni din săptămâna datei. */
MC.weekStart = function (d) {
  var day = d.getDay();
  return MC.addDays(d, day === 0 ? -6 : 1 - day);
};
MC.hourLabel = function (h) { return MC.pad(h) + ':00'; };

/* „joi, 5 noiembrie” */
MC.fmtDate = function (s, withYear) {
  var d = typeof s === 'string' ? MC.parseYmd(s) : s;
  var t = MC.DAYS_LONG[d.getDay()] + ', ' + d.getDate() + ' ' + MC.MONTHS[d.getMonth()];
  return withYear ? t + ' ' + d.getFullYear() : t;
};
MC.cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };

MC.esc = function (s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
};

MC.uid = function () {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
};

/* Telefon românesc: 07xx xxx xxx sau +407xx xxx xxx. */
MC.validPhone = function (s) {
  var d = String(s).replace(/[\s.\-()]/g, '');
  return /^(\+40|0040|0)7\d{8}$/.test(d) || /^(\+40|0040|0)[23]\d{8}$/.test(d);
};

MC.toast = function (msg, kind) {
  var box = document.getElementById('toast');
  if (!box) return;
  box.textContent = msg;
  box.className = 'toast show' + (kind ? ' ' + kind : '');
  clearTimeout(MC._toastT);
  MC._toastT = setTimeout(function () { box.className = 'toast'; }, 3200);
};
