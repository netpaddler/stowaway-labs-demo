/* Stowaway Labs booking flow (front end only).
 * Desk reservations for 1 to 6 people with seats together, a free local day,
 * and tour times. Nothing is sent or stored; production would hand off to Archie.
 */
(function () {
  'use strict';

  var RATE = 12;
  var OPEN = 9 * 60, CLOSE = 17 * 60, MIN_DUR = 120, STEP = 30, MAX_PEOPLE = 6;
  var DAYS_AHEAD = 60;
  var TOUR_SLOTS = [570, 630, 690, 780, 840, 900, 960]; // 9:30 .. 4:00

  // Desk zones. Each table is a run of seats on two sides. Seats are ordered
  // around the table (side A left to right, then side B right to left) so that
  // a contiguous run is a group sitting side by side.
  var TYPES = [
    { id: 'monitor', name: 'Monitor desk', plural: 'Monitor desks', icon: 'monitor', blurb: 'Ultrawide screen, stand, mouse, keyboard', tables: [{ label: 'Oar wall table', cols: 3 }, { label: 'Window table', cols: 3 }] },
    { id: 'nomonitor', name: 'No-monitor desk', plural: 'No-monitor desks', icon: 'laptop', blurb: 'Open table space for laptops', tables: [{ label: 'Long table', cols: 4 }] },
    { id: 'heated', name: 'Heated table seat', plural: 'Heated table seats', icon: 'flame', blurb: 'A warm seat for gray days', tables: [{ label: 'Heated table', cols: 3 }] },
    { id: 'booth', name: 'Booth seat', plural: 'Booth seats', icon: 'booth', blurb: 'Cozy sea-glass booths', tables: [{ label: 'Booth 1', cols: 2 }, { label: 'Booth 2', cols: 2 }, { label: 'Booth 3', cols: 2 }] }
  ];

  // ---------- helpers ----------
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var icon = function (n) { return '<svg class="i" aria-hidden="true"><use href="#i-' + n + '"></use></svg>'; };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var fmtTime = function (m) {
    var h = Math.floor(m / 60), mm = m % 60, ap = h >= 12 ? 'p.m.' : 'a.m.';
    var h12 = h % 12 || 12;
    return h12 + (mm ? ':' + pad(mm) : '') + ' ' + ap;
  };
  var fmtTimeShort = function (m) { var h = Math.floor(m / 60), mm = m % 60; return (h % 12 || 12) + ':' + pad(mm); };
  var fmtDur = function (m) {
    var h = Math.floor(m / 60), r = m % 60;
    return (h ? h + (h === 1 ? ' hour' : ' hours') : '') + (r ? (h ? ' ' : '') + r + ' min' : '');
  };
  var DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var fmtDate = function (d) { return DOW[d.getDay()] + ', ' + MON[d.getMonth()] + ' ' + d.getDate(); };
  var key = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var money = function (n) { return '$' + n.toFixed(n % 1 ? 2 : 0).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
  var today = function () { var d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  var nowMin = function () { var d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  var sameDay = function (a, b) { return a && b && key(a) === key(b); };
  var isWeekday = function (d) { var w = d.getDay(); return w > 0 && w < 6; };
  var validEmail = function (s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); };
  var hash = function (s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  var ref = function (p) { var c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = ''; for (var i = 0; i < 5; i++) s += c[Math.floor(Math.random() * c.length)]; return p + '-' + s; };

  // Latest start time still bookable on a given date for a given minimum length
  function earliestStart(date, len) {
    if (!sameDay(date, today())) return OPEN;
    var n = nowMin();
    var s = Math.max(OPEN, Math.ceil((n + 1) / STEP) * STEP);
    return s + len <= CLOSE ? s : null;
  }
  function dayAvailable(date, len) {
    if (!isWeekday(date)) return false;
    var t = today();
    if (date < t) return false;
    if ((date - t) / 864e5 > DAYS_AHEAD) return false;
    return earliestStart(date, len) !== null;
  }
  function firstAvailable(len) {
    var d = today();
    for (var i = 0; i < 90; i++) { if (dayAvailable(d, len)) return d; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); }
    return null;
  }

  // ---------- calendar component ----------
  function Calendar(el, opts) {
    this.el = el; this.opts = opts;
    this.sel = opts.selected;
    var base = this.sel || today();
    this.view = new Date(base.getFullYear(), base.getMonth(), 1);
    this.render();
    var self = this;
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b || b.disabled) return;
      if (b.hasAttribute('data-nav')) {
        self.view = new Date(self.view.getFullYear(), self.view.getMonth() + (+b.getAttribute('data-nav')), 1);
        self.render();
        var again = self.el.querySelector('[data-nav="' + b.getAttribute('data-nav') + '"]');
        if (again && !again.disabled) again.focus();
        return;
      }
      var p = b.getAttribute('data-day').split('-');
      self.sel = new Date(+p[0], +p[1] - 1, +p[2]);
      self.render(true);
      opts.onSelect(self.sel);
    });
    el.addEventListener('keydown', function (e) {
      var b = e.target.closest('[data-day]');
      if (!b) return;
      var delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      if (!delta) return;
      e.preventDefault();
      var days = $$('[data-day]:not([disabled])', self.el);
      var p = b.getAttribute('data-day').split('-');
      var target = new Date(+p[0], +p[1] - 1, +p[2] + delta);
      var t = self.el.querySelector('[data-day="' + key(target) + '"]');
      if (t && !t.disabled) t.focus();
      else if (days.length) days[delta > 0 ? days.length - 1 : 0].focus();
    });
  }
  Calendar.prototype.render = function (keepFocus) {
    var v = this.view, y = v.getFullYear(), m = v.getMonth();
    var t = today();
    var minView = new Date(t.getFullYear(), t.getMonth(), 1);
    var maxDate = new Date(t.getFullYear(), t.getMonth(), t.getDate() + DAYS_AHEAD);
    var maxView = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    var html = '<div class="cal-head"><button type="button" class="cal-nav" data-nav="-1" aria-label="Previous month"' + (v <= minView ? ' disabled' : '') + '>' + icon('chevron-left') + '</button>' +
      '<p class="cal-month" aria-live="polite">' + MON[m] + ' ' + y + '</p>' +
      '<button type="button" class="cal-nav" data-nav="1" aria-label="Next month"' + (v >= maxView ? ' disabled' : '') + '>' + icon('chevron-right') + '</button></div>';
    html += '<div class="cal-grid" role="group" aria-label="' + MON[m] + ' ' + y + '">';
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(function (d) { html += '<span class="cal-dow" aria-hidden="true">' + d.charAt(0) + '</span>'; });
    var first = new Date(y, m, 1).getDay();
    for (var i = 0; i < first; i++) html += '<span></span>';
    var dim = new Date(y, m + 1, 0).getDate();
    for (var d = 1; d <= dim; d++) {
      var date = new Date(y, m, d);
      var ok = this.opts.available(date);
      var selected = sameDay(date, this.sel);
      html += '<button type="button" class="cal-day' + (sameDay(date, t) ? ' is-today' : '') + '" data-day="' + key(date) + '"' +
        (ok ? '' : ' disabled') + ' aria-pressed="' + selected + '" aria-label="' + fmtDate(date) + (ok ? '' : ', unavailable') + '">' + d + '</button>';
    }
    html += '</div>';
    this.el.innerHTML = html;
    if (keepFocus && this.sel) { var s = this.el.querySelector('[data-day="' + key(this.sel) + '"]'); if (s) s.focus(); }
  };

  // ---------- .ics download ----------
  function ics(title, date, startMin, endMin, desc) {
    var dt = function (mins) { return key(date).replace(/-/g, '') + 'T' + pad(Math.floor(mins / 60)) + pad(mins % 60) + '00'; };
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    var body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Stowaway Labs//Booking//EN', 'BEGIN:VEVENT',
      'UID:' + Date.now() + '@stowawaylabs.com', 'DTSTAMP:' + stamp,
      'DTSTART;TZID=America/Los_Angeles:' + dt(startMin), 'DTEND;TZID=America/Los_Angeles:' + dt(endMin),
      'SUMMARY:' + title, 'LOCATION:Stowaway Labs\\, 8809 N. Harborview Dr.\\, Suite 101\\, Gig Harbor\\, WA 98332',
      'DESCRIPTION:' + desc.replace(/\n/g, '\\n').replace(/,/g, '\\,'), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(body);
  }

  function confirmScreen(target, form, o) {
    var rows = o.rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>'; }).join('');
    target.innerHTML =
      '<div class="confirm-card">' +
        '<div class="confirm-mark" aria-hidden="true"><svg><use href="#i-mark"></use></svg></div>' +
        '<p class="eyebrow">' + o.eyebrow + '</p>' +
        '<h2>' + o.title + '</h2>' +
        '<p class="lede">' + o.lede + '</p>' +
        '<p class="confirm-ref">Confirmation <b>' + o.ref + '</b></p>' +
        '<dl class="confirm-list">' + rows + '</dl>' +
        (o.extra || '') +
        '<div class="btn-row center-row">' +
          '<a class="btn btn-dark" download="stowaway-labs.ics" href="' + o.ics + '">' + icon('calendar') + ' Add to calendar</a>' +
          '<a class="btn btn-ghost" href="contact.html">Get directions</a>' +
          '<button type="button" class="btn btn-ghost" data-again>Make another booking</button>' +
        '</div>' +
        '<p class="small muted mt-2 mb-0">8809 N. Harborview Dr., Suite 101, under Devoted Kiss Cafe. Questions? <a href="mailto:ahoy@stowawaylabs.com">ahoy@stowawaylabs.com</a> or <a href="tel:+12535258911">(253) 525-8911</a>.</p>' +
      '</div>';
    form.hidden = true;
    target.hidden = false;
    target.focus();
    target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    $('[data-again]', target).addEventListener('click', function () {
      target.hidden = true; form.hidden = false;
      if (o.reset) o.reset();
      form.scrollIntoView({ block: 'start' });
    });
  }

  // =====================================================================
  // Tabs
  // =====================================================================
  var tabs = $$('[role="tab"]');
  function selectTab(name, focus) {
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-tab') === name;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    $$('[data-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== name; });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () {
      var n = t.getAttribute('data-tab');
      selectTab(n);
      history.replaceState(null, '', n === 'desk' ? location.pathname + location.search : '#' + n);
    });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      var n = tabs[(i + d + tabs.length) % tabs.length];
      n.click(); n.focus();
    });
  });
  function fromHash() {
    var h = location.hash.replace('#', '');
    if (h === 'free-day' || h === 'tour' || h === 'desk') selectTab(h);
  }
  window.addEventListener('hashchange', fromHash);

  // =====================================================================
  // Desk booking
  // =====================================================================
  var params = new URLSearchParams(location.search);
  var S = {
    date: firstAvailable(MIN_DUR),
    start: null,
    dur: MIN_DUR,
    people: Math.min(MAX_PEOPLE, Math.max(1, parseInt(params.get('people'), 10) || 1)),
    together: true,
    type: TYPES.some(function (t) { return t.id === params.get('type'); }) ? params.get('type') : 'monitor',
    seats: [],
    cover: 'dropin',
    guests: [],
    note: ''
  };
  S.start = S.date ? earliestStart(S.date, MIN_DUR) : OPEN;

  var deskForm = $('#desk-form');
  var deskCal = new Calendar($('[data-cal="desk"]'), {
    selected: S.date,
    available: function (d) { return dayAvailable(d, MIN_DUR); },
    onSelect: function (d) {
      S.date = d;
      var e = earliestStart(d, MIN_DUR);
      if (S.start < e) S.start = e;
      clampDur();
      autoSeat(); renderTimes(); renderDesk();
    }
  });

  function clampDur() {
    var max = CLOSE - S.start;
    if (S.dur > max) S.dur = max;
    if (S.dur < MIN_DUR) S.dur = MIN_DUR;
  }

  function renderTimes() {
    var box = $('[data-starts]');
    var e = earliestStart(S.date, MIN_DUR);
    var html = '';
    for (var m = OPEN; m + MIN_DUR <= CLOSE; m += STEP) {
      var dis = e === null || m < e;
      html += '<button type="button" role="radio" class="chip" data-start="' + m + '" aria-checked="' + (m === S.start) + '"' + (dis ? ' disabled' : '') + ' tabindex="' + (m === S.start ? 0 : -1) + '">' + fmtTimeShort(m) + '<small>' + (m < 720 ? 'am' : 'pm') + '</small></button>';
    }
    box.innerHTML = html;
    $('[data-dur-out]').textContent = fmtDur(S.dur);
    $('[data-dur-hint]').textContent = 'Ends at ' + fmtTime(S.start + S.dur) + ' (2-hour minimum, 30-minute steps)';
    $('[data-dur="-1"]').disabled = S.dur <= MIN_DUR;
    $('[data-dur="1"]').disabled = S.start + S.dur >= CLOSE;
  }
  $('[data-starts]').addEventListener('click', function (e) {
    var b = e.target.closest('[data-start]');
    if (!b || b.disabled) return;
    S.start = +b.getAttribute('data-start');
    clampDur(); autoSeat(); renderTimes(); renderDesk();
    var f = $('[data-start="' + S.start + '"]'); if (f) f.focus();
  });
  $('[data-starts]').addEventListener('keydown', function (e) {
    var d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!d) return;
    e.preventDefault();
    var opts = $$('[data-start]:not([disabled])');
    var i = opts.findIndex(function (b) { return +b.getAttribute('data-start') === S.start; });
    var n = opts[Math.min(opts.length - 1, Math.max(0, i + d))];
    if (n) n.click();
  });
  $$('[data-dur]').forEach(function (b) {
    b.addEventListener('click', function () {
      S.dur += STEP * +b.getAttribute('data-dur');
      clampDur(); autoSeat(); renderTimes(); renderDesk();
    });
  });

  // People
  $$('[data-ppl]').forEach(function (b) {
    b.addEventListener('click', function () {
      S.people = Math.min(MAX_PEOPLE, Math.max(1, S.people + +b.getAttribute('data-ppl')));
      autoSeat(); renderPeople(); renderDesk(); renderGuests();
    });
  });
  var together = $('[data-together]');
  together.addEventListener('change', function () { S.together = together.checked; autoSeat(); renderDesk(); });
  function renderPeople() {
    $('[data-ppl-out]').textContent = S.people + (S.people === 1 ? ' person' : ' people');
    $('[data-ppl="-1"]').disabled = S.people <= 1;
    $('[data-ppl="1"]').disabled = S.people >= MAX_PEOPLE;
    $('[data-together-wrap]').hidden = S.people < 2;
  }

  // Seat model
  function seatsFor(type) {
    var out = [];
    type.tables.forEach(function (tb, ti) {
      var n = tb.cols, order = 0;
      for (var c = 0; c < n; c++) out.push({ id: type.id + '-' + ti + '-A' + c, table: ti, side: 'A', col: c, order: order++ });
      for (var c2 = n - 1; c2 >= 0; c2--) out.push({ id: type.id + '-' + ti + '-B' + c2, table: ti, side: 'B', col: c2, order: order++ });
    });
    return out;
  }
  function takenSet(type) {
    // Deterministic "already booked" seats for the chosen date and time window.
    var set = {};
    var dk = key(S.date || today()), multi = type.tables.length > 1;
    var openTable = hash(dk + type.id) % type.tables.length; // keep one table clear for groups
    seatsFor(type).forEach(function (s) {
      if (multi && s.table === openTable) return;
      var h = hash(dk + '|' + Math.floor(S.start / 60) + '|' + s.id);
      if (h % 100 < (multi ? 30 : 18)) set[s.id] = true;
    });
    return set;
  }
  function typeById(id) { return TYPES.filter(function (t) { return t.id === id; })[0]; }
  function openCount(type) { var tk = takenSet(type); return seatsFor(type).filter(function (s) { return !tk[s.id]; }).length; }

  // Find a contiguous run of open seats (around a table) of length n.
  function findBlock(type, n, preferId) {
    var tk = takenSet(type), all = seatsFor(type), best = null;
    type.tables.forEach(function (tb, ti) {
      var ring = all.filter(function (s) { return s.table === ti; });
      var L = ring.length;
      if (n > L) return;
      for (var st = 0; st < L; st++) {
        var block = [];
        for (var k = 0; k < n; k++) {
          var s = ring[(st + k) % L];
          if (tk[s.id]) { block = null; break; }
          block.push(s.id);
        }
        if (!block) continue;
        if (preferId && block.indexOf(preferId) === 0) { best = block; return; }
        if (!best) best = block;
      }
    });
    if (preferId) {
      // Prefer a block that starts at, or at least includes, the clicked seat
      var withPref = null;
      type.tables.forEach(function (tb, ti) {
        var ring = all.filter(function (s) { return s.table === ti; }), L = ring.length;
        if (n > L) return;
        for (var st = 0; st < L && !withPref; st++) {
          var block = [];
          for (var k = 0; k < n; k++) { var s = ring[(st + k) % L]; if (tk[s.id]) { block = null; break; } block.push(s.id); }
          if (block && block[0] === preferId) withPref = block;
        }
        for (var st2 = 0; st2 < L && !withPref; st2++) {
          var b2 = [];
          for (var k2 = 0; k2 < n; k2++) { var s2 = ring[(st2 + k2) % L]; if (tk[s2.id]) { b2 = null; break; } b2.push(s2.id); }
          if (b2 && b2.indexOf(preferId) > -1) withPref = b2;
        }
      });
      if (withPref) return withPref;
    }
    return best;
  }

  function autoSeat() {
    var type = typeById(S.type), tk = takenSet(type);
    S.note = '';
    if (S.people > 1 && S.together) {
      var b = findBlock(type, S.people);
      if (b) { S.seats = b; return; }
      var maxT = Math.max.apply(null, type.tables.map(function (t) { return t.cols * 2; }));
      S.note = S.people > maxT
        ? (type.id === 'booth' ? 'Each booth seats up to ' + maxT + '.' : 'These tables seat up to ' + maxT + ' together.') + ' For a group of ' + S.people + ', try monitor desks, or switch off “Seat us together.”'
        : 'No ' + S.people + ' side-by-side seats are open at the ' + type.plural.toLowerCase() + ' for this time. Try another desk type or start time, or switch off “Seat us together.”';
    }
    var open = seatsFor(type).filter(function (s) { return !tk[s.id]; }).map(function (s) { return s.id; });
    S.seats = open.slice(0, S.people);
    if (open.length < S.people) S.note = 'Only ' + open.length + ' ' + type.plural.toLowerCase() + ' are open for this time. Try another desk type or time.';
  }

  function renderDesk() {
    // type cards
    $('[data-types]').innerHTML = TYPES.map(function (t) {
      var open = openCount(t), on = t.id === S.type;
      return '<button type="button" role="radio" class="desk-opt" data-type="' + t.id + '" aria-checked="' + on + '" tabindex="' + (on ? 0 : -1) + '">' +
        '<span class="desk-opt-ico">' + icon(t.icon) + '</span><span class="desk-opt-name">' + t.name + '</span>' +
        '<span class="desk-opt-blurb">' + t.blurb + '</span><span class="desk-opt-open' + (open < S.people ? ' is-low' : '') + '">' + open + ' open</span></button>';
    }).join('');

    // seat map
    var type = typeById(S.type), tk = takenSet(type), all = seatsFor(type);
    var html = '';
    type.tables.forEach(function (tb, ti) {
      var seat = function (side) {
        var row = '';
        for (var c = 0; c < tb.cols; c++) {
          var s = all.filter(function (x) { return x.table === ti && x.side === side && x.col === c; })[0];
          var mine = S.seats.indexOf(s.id);
          var taken = !!tk[s.id];
          var label = type.name + ', ' + tb.label + ', seat ' + (s.order + 1) + (taken ? ', taken' : mine > -1 ? ', selected for ' + guestLabel(mine) : ', open');
          row += '<button type="button" class="seat' + (taken ? ' is-taken' : '') + (mine > -1 ? ' is-mine' : '') + '" data-seat="' + s.id + '"' +
            (taken ? ' disabled' : '') + ' aria-pressed="' + (mine > -1) + '" aria-label="' + label + '">' + (mine > -1 ? '<span>' + initials(mine) + '</span>' : '') + '</button>';
        }
        return '<div class="seat-row">' + row + '</div>';
      };
      html += '<div class="table-unit' + (type.id === 'booth' ? ' is-booth' : '') + '"><p class="table-label">' + tb.label + '</p>' + seat('A') +
        '<div class="table-top" style="--cols:' + tb.cols + '" aria-hidden="true"></div>' + seat('B') + '</div>';
    });
    $('[data-seatmap]').innerHTML = html;
    var msg = $('[data-seat-msg]');
    msg.textContent = S.note || (S.people > 1 && S.together && S.seats.length === S.people ? 'Seated side by side. Tap a different open seat to move your group.' : S.people > 1 ? 'Tap open seats to choose where each person sits.' : 'Tap any open seat to move.');
    msg.classList.toggle('is-warn', !!S.note);
    renderSummary();
  }

  $('[data-types]').addEventListener('click', function (e) {
    var b = e.target.closest('[data-type]');
    if (!b) return;
    S.type = b.getAttribute('data-type');
    autoSeat(); renderDesk();
    var f = $('[data-type="' + S.type + '"]'); if (f) f.focus();
  });
  $('[data-types]').addEventListener('keydown', function (e) {
    var d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!d) return;
    e.preventDefault();
    var i = TYPES.findIndex(function (t) { return t.id === S.type; });
    S.type = TYPES[(i + d + TYPES.length) % TYPES.length].id;
    autoSeat(); renderDesk();
    $('[data-type="' + S.type + '"]').focus();
  });
  $('[data-seatmap]').addEventListener('click', function (e) {
    var b = e.target.closest('[data-seat]');
    if (!b || b.disabled) return;
    var id = b.getAttribute('data-seat');
    var type = typeById(S.type);
    if (S.people > 1 && S.together) {
      var blk = findBlock(type, S.people, id);
      if (blk) { S.seats = blk; S.note = ''; }
      else S.note = 'There is no room for ' + S.people + ' side by side starting there. Try another open seat.';
    } else {
      var i = S.seats.indexOf(id);
      if (i > -1) { if (S.people === 1) return; S.seats.splice(i, 1); }
      else { if (S.seats.length >= S.people) S.seats.shift(); S.seats.push(id); }
      S.note = '';
    }
    renderDesk();
    var f = $('[data-seat="' + id + '"]'); if (f) f.focus();
  });

  // Guests
  function ensureGuests() {
    while (S.guests.length < S.people) S.guests.push({ name: '', email: '', member: false });
    S.guests.length = S.people;
  }
  function guestLabel(i) { var g = S.guests[i]; return g && g.name ? g.name : (i === 0 ? 'you' : 'guest ' + (i + 1)); }
  function initials(i) {
    var g = S.guests[i];
    if (g && g.name.trim()) return g.name.trim().split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
    return i === 0 ? 'You' : String(i + 1);
  }
  function renderGuests() {
    ensureGuests();
    var flex = S.cover === 'flex', member = S.cover === 'member';
    $('[data-guests]').innerHTML = S.guests.map(function (g, i) {
      var lead = i === 0;
      var mem = '';
      if (member && !lead) mem = '<label class="check guest-mem"><input type="checkbox" data-g="' + i + '" data-k="member"' + (g.member ? ' checked' : '') + '> <span>Also a member</span></label>';
      var badge = flex || (member && (lead || g.member)) ? '<span class="pill">' + icon('check') + ' Covered</span>' : '<span class="pill pill-rate">$' + RATE + '/hr</span>';
      return '<div class="guest" data-guest="' + i + '">' +
        '<div class="guest-head"><span class="guest-av" aria-hidden="true">' + esc(initials(i)) + '</span><b>' + (lead ? 'You (booking lead)' : 'Guest ' + (i + 1)) + '</b>' + badge + '</div>' +
        '<div class="field-row">' +
          '<div class="field"><label for="g-n-' + i + '">Full name</label><input id="g-n-' + i + '" type="text" autocomplete="' + (lead ? 'name' : 'off') + '" data-g="' + i + '" data-k="name" value="' + esc(g.name) + '" required></div>' +
          '<div class="field"><label for="g-e-' + i + '">Email' + (lead ? '' : ' <span class="muted">(optional)</span>') + '</label><input id="g-e-' + i + '" type="email" autocomplete="' + (lead ? 'email' : 'off') + '" data-g="' + i + '" data-k="email" value="' + esc(g.email) + '"' + (lead ? ' required' : '') + '></div>' +
        '</div>' + mem + '</div>';
    }).join('') + (flex ? '<p class="flex-note">' + icon('users') + '<span>Corporate Flex teams share 100 hours a month. This booking uses <b data-flex-hours></b> of your pool.</span></p>' : '');
    renderSummary();
  }
  $('[data-guests]').addEventListener('input', function (e) {
    var f = e.target, i = f.getAttribute('data-g');
    if (i === null) return;
    var k = f.getAttribute('data-k');
    S.guests[+i][k] = f.type === 'checkbox' ? f.checked : f.value;
    f.removeAttribute('aria-invalid');
    if (k === 'member') { renderGuests(); var again = $('[data-g="' + i + '"][data-k="member"]'); if (again) again.focus(); return; }
    // update avatar + seat initials without re-rendering inputs
    var av = $('[data-guest="' + i + '"] .guest-av'); if (av) av.textContent = initials(+i);
    var seatId = S.seats[+i];
    var sb = seatId && $('[data-seat="' + seatId + '"] span'); if (sb) sb.textContent = initials(+i);
    renderSummary();
  });
  $$('input[name="cover"]').forEach(function (r) {
    r.addEventListener('change', function () { S.cover = r.value; renderGuests(); });
  });

  function pricing() {
    var hrs = S.dur / 60, paying = 0, covered = 0;
    S.guests.forEach(function (g, i) {
      var c = S.cover === 'flex' || (S.cover === 'member' && (i === 0 || g.member));
      if (c) covered++; else paying++;
    });
    return { hrs: hrs, paying: paying, covered: covered, total: paying * hrs * RATE, poolHours: S.cover === 'flex' ? S.people * hrs : 0 };
  }

  function renderSummary() {
    if (!S.date) return;
    var type = typeById(S.type), p = pricing();
    var rows = [
      ['Date', fmtDate(S.date)],
      ['Time', fmtTime(S.start) + ' to ' + fmtTime(S.start + S.dur) + ' <span class="muted">(' + fmtDur(S.dur) + ')</span>'],
      ['Crew', S.people + (S.people === 1 ? ' person' : ' people') + (S.people > 1 && S.together ? ', seated together' : '')],
      ['Seats', type.plural + ' · ' + seatNames()]
    ];
    $('[data-summary]').innerHTML = rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>'; }).join('');
    var lines = '';
    if (p.paying) lines += '<div class="calc"><span>' + p.paying + ' × ' + fmtDur(S.dur) + ' × $' + RATE + '</span><span>' + money(p.total) + '</span></div>';
    if (p.covered && S.cover === 'member') lines += '<div class="calc"><span>' + p.covered + (p.covered === 1 ? ' member' : ' members') + '</span><span>Covered by membership</span></div>';
    if (S.cover === 'flex') lines += '<div class="calc"><span>' + S.people + ' × ' + fmtDur(S.dur) + ' from team pool</span><span>' + p.poolHours + ' hrs</span></div>';
    var totalLabel = p.paying ? money(p.total) : 'Covered';
    $('[data-total]').innerHTML = lines + '<div class="total-row"><span>Total</span><b>' + totalLabel + '</b></div>' +
      (p.paying ? '' : '<p class="small muted mb-0">' + (S.cover === 'flex' ? 'Covered by your Corporate Flex pool.' : 'Covered by membership.') + '</p>');
    var fh = $('[data-flex-hours]'); if (fh) fh.textContent = p.poolHours + ' hours';
  }
  function seatNames() {
    var type = typeById(S.type), all = seatsFor(type);
    var byTable = {};
    S.seats.forEach(function (id) {
      var s = all.filter(function (x) { return x.id === id; })[0];
      if (!s) return;
      (byTable[s.table] = byTable[s.table] || []).push(s.order + 1);
    });
    var parts = Object.keys(byTable).map(function (t) { return type.tables[t].label + ' ' + byTable[t].sort(function (a, b) { return a - b; }).join(', '); });
    return parts.join('; ') || 'None yet';
  }

  deskForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('[data-form-err]'), firstBad = null;
    err.hidden = true;
    S.guests.forEach(function (g, i) {
      var n = $('#g-n-' + i), m = $('#g-e-' + i);
      var badN = !g.name.trim();
      var badE = i === 0 ? !validEmail(g.email.trim()) : (g.email.trim() && !validEmail(g.email.trim()));
      n.setAttribute('aria-invalid', badN); m.setAttribute('aria-invalid', !!badE);
      if (badN && !firstBad) firstBad = n;
      if (badE && !firstBad) firstBad = m;
    });
    var rules = $('[data-rules]');
    $('[data-rules-err]').hidden = rules.checked;
    if (!rules.checked && !firstBad) firstBad = rules;
    var msg = '';
    if (S.seats.length < S.people) msg = 'There are not enough open seats for your group. Try another desk type or time.';
    else if (firstBad) msg = 'Please add a name for everyone and a valid email for yourself.';
    if (!rules.checked && !msg) msg = 'Please confirm the house rules.';
    if (msg) { err.textContent = msg; err.hidden = false; if (firstBad) firstBad.focus(); return; }

    var type = typeById(S.type), p = pricing(), r = ref('SWL');
    var guestList = '<ul class="confirm-guests">' + S.guests.map(function (g, i) {
      var covered = S.cover === 'flex' || (S.cover === 'member' && (i === 0 || g.member));
      return '<li><span class="guest-av" aria-hidden="true">' + esc(initials(i)) + '</span><span><b>' + esc(g.name) + '</b>' + (g.email ? '<br><span class="small muted">' + esc(g.email) + '</span>' : '') + '</span><span class="pill' + (covered ? '' : ' pill-rate') + '">' + (covered ? 'Covered' : money(p.hrs * RATE)) + '</span></li>';
    }).join('') + '</ul>';
    var desc = S.people + ' ' + (S.people === 1 ? 'person' : 'people') + ', ' + type.plural + ' (' + seatNames() + '). Ref ' + r + '. Check in on arrival.';
    confirmScreen($('[data-confirm="desk"]'), deskForm, {
      eyebrow: 'Ahoy, ' + esc(S.guests[0].name.split(' ')[0]),
      title: 'You’re on the manifest.',
      lede: 'Your ' + (S.people > 1 ? 'crew’s seats are' : 'seat is') + ' saved for ' + fmtDate(S.date) + '. A confirmation is on its way to ' + esc(S.guests[0].email) + '.',
      ref: r,
      rows: [
        ['When', fmtDate(S.date) + '<br>' + fmtTime(S.start) + ' to ' + fmtTime(S.start + S.dur)],
        ['Where', type.plural + '<br>' + seatNames()],
        ['Total', p.paying ? money(p.total) : (S.cover === 'flex' ? 'Covered, ' + p.poolHours + ' pool hours' : 'Covered by membership')]
      ],
      extra: guestList,
      ics: ics('Stowaway Labs: ' + type.name + (S.people > 1 ? ' for ' + S.people : ''), S.date, S.start, S.start + S.dur, desc),
      reset: function () { rules.checked = false; }
    });
  });

  // =====================================================================
  // Free local day
  // =====================================================================
  var free = { date: firstAvailable(CLOSE - OPEN) || firstAvailable(MIN_DUR) };
  var freeAvail = function (d) {
    if (!isWeekday(d) || d < today() || (d - today()) / 864e5 > DAYS_AHEAD) return false;
    return !sameDay(d, today()) || nowMin() < 9 * 60; // a full day means booking before opening
  };
  if (free.date && !freeAvail(free.date)) { var fd = new Date(free.date); while (!freeAvail(fd)) fd.setDate(fd.getDate() + 1); free.date = fd; }
  new Calendar($('[data-cal="free"]'), { selected: free.date, available: freeAvail, onSelect: function (d) { free.date = d; renderFree(); } });
  function renderFree() {
    $('[data-free-summary]').innerHTML = '<div><dt>Date</dt><dd>' + fmtDate(free.date) + '</dd></div><div><dt>Time</dt><dd>9 a.m. to 5 p.m.</dd></div><div><dt>Includes</dt><dd>Every amenity, all day</dd></div>';
  }
  renderFree();
  $('#free-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('#f-name'), email = $('#f-email'), local = $('#f-local'), rules = $('#f-rules'), err = $('[data-free-err]');
    var bad = null;
    [[name, !name.value.trim()], [email, !validEmail(email.value.trim())], [local, !local.checked], [rules, !rules.checked]].forEach(function (x) {
      x[0].setAttribute('aria-invalid', x[1]); if (x[1] && !bad) bad = x[0];
    });
    if (bad) {
      err.textContent = !local.checked && bad === local ? 'The free day is for locals in greater Gig Harbor. Visiting? Drop-in is $12 an hour.' : 'Please fill in your name, a valid email, and both checkboxes.';
      err.hidden = false; bad.focus(); return;
    }
    err.hidden = true;
    var r = ref('SWL-FREE');
    confirmScreen($('[data-confirm="free"]'), $('#free-form'), {
      eyebrow: 'Welcome aboard, ' + esc(name.value.trim().split(' ')[0]),
      title: 'Your free day is set.',
      lede: 'We will see you ' + fmtDate(free.date) + '. Check in when you arrive and make yourself at home. Details are headed to ' + esc(email.value.trim()) + '.',
      ref: r,
      rows: [['When', fmtDate(free.date) + '<br>9 a.m. to 5 p.m.'], ['Seat', 'Any open desk, booth, or deck table'], ['Total', '$0']],
      ics: ics('Stowaway Labs: free local day', free.date, OPEN, CLOSE, 'Your free day at Stowaway Labs. Ref ' + r + '. Check in on arrival.'),
      reset: function () { local.checked = false; rules.checked = false; }
    });
  });

  // =====================================================================
  // Tour
  // =====================================================================
  var tour = { date: null, slot: null };
  var tourAvail = function (d) {
    if (!isWeekday(d) || d < today() || (d - today()) / 864e5 > DAYS_AHEAD) return false;
    if (!sameDay(d, today())) return true;
    var n = nowMin(); return TOUR_SLOTS.some(function (s) { return s > n + 30; });
  };
  tour.date = (function () { var d = today(); for (var i = 0; i < 90; i++) { if (tourAvail(d)) return d; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); } return null; })();
  new Calendar($('[data-cal="tour"]'), { selected: tour.date, available: tourAvail, onSelect: function (d) { tour.date = d; tour.slot = null; renderTour(); } });
  function slotOpen(s) {
    if (sameDay(tour.date, today()) && s <= nowMin() + 30) return false;
    return hash(key(tour.date) + 't' + s) % 100 > 22; // some slots already spoken for
  }
  function renderTour() {
    $('[data-slots]').innerHTML = TOUR_SLOTS.map(function (s) {
      var ok = slotOpen(s);
      return '<button type="button" role="radio" class="chip" data-slot="' + s + '" aria-checked="' + (s === tour.slot) + '"' + (ok ? '' : ' disabled aria-label="' + fmtTime(s) + ', booked"') + '>' + fmtTimeShort(s) + '<small>' + (s < 720 ? 'am' : 'pm') + '</small></button>';
    }).join('');
    $('[data-tour-summary]').innerHTML = '<div><dt>Date</dt><dd>' + fmtDate(tour.date) + '</dd></div><div><dt>Time</dt><dd>' + (tour.slot ? fmtTime(tour.slot) : '<span class="muted">Pick a time</span>') + '</dd></div>';
  }
  $('[data-slots]').addEventListener('click', function (e) {
    var b = e.target.closest('[data-slot]');
    if (!b || b.disabled) return;
    tour.slot = +b.getAttribute('data-slot');
    renderTour();
    $('[data-slot="' + tour.slot + '"]').focus();
    $('[data-tour-err]').hidden = true;
  });
  renderTour();
  $('#tour-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('#t-name'), email = $('#t-email'), err = $('[data-tour-err]');
    var bad = null;
    [[name, !name.value.trim()], [email, !validEmail(email.value.trim())]].forEach(function (x) { x[0].setAttribute('aria-invalid', x[1]); if (x[1] && !bad) bad = x[0]; });
    if (!tour.slot) { err.textContent = 'Please pick a tour time.'; err.hidden = false; var c = $('[data-slot]:not([disabled])'); if (c) c.focus(); return; }
    if (bad) { err.textContent = 'Please add your name and a valid email.'; err.hidden = false; bad.focus(); return; }
    err.hidden = true;
    var r = ref('SWL-TOUR');
    confirmScreen($('[data-confirm="tour"]'), $('#tour-form'), {
      eyebrow: 'See you soon, ' + esc(name.value.trim().split(' ')[0]),
      title: 'Your tour is booked.',
      lede: 'We will meet you at the door at ' + fmtTime(tour.slot) + ' on ' + fmtDate(tour.date) + '. A confirmation is headed to ' + esc(email.value.trim()) + '.',
      ref: r,
      rows: [['When', fmtDate(tour.date) + '<br>' + fmtTime(tour.slot)], ['Group', esc($('#t-ppl').value)], ['Interested in', esc($('#t-int').value)]],
      ics: ics('Stowaway Labs tour', tour.date, tour.slot, tour.slot + 30, 'Tour of Stowaway Labs. Ref ' + r + '.'),
      reset: function () { tour.slot = null; renderTour(); }
    });
  });

  // ---------- init ----------
  if (!S.date) { $('[data-cal="desk"]').insertAdjacentHTML('afterend', '<p class="error-msg">No dates are open right now. Please email ahoy@stowawaylabs.com.</p>'); }
  together.checked = S.together;
  clampDur();
  autoSeat();
  ensureGuests();
  renderPeople();
  renderTimes();
  renderGuests();
  renderDesk();
  fromHash();
})();
