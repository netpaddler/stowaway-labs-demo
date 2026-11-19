/* Stowaway Labs: the "easy button".
 * Remembers what a visitor did, on this device only (localStorage), and turns
 * it into one-tap suggestions: "Book your usual", "Same as last time,
 * tomorrow", "Same time next week", membership savings, and the Quick book
 * sheet in the header. Nothing leaves the browser.
 *
 * Demo: add ?demo=returning to any URL to seed a sample returning visitor,
 * or ?demo=new to start fresh.
 *
 * Also exposes window.SWL.core (dates, desk types, seat model, pricing) so the
 * booking page and the Quick book sheet share one source of truth.
 */
(function () {
  'use strict';

  // =====================================================================
  // Core: dates, formatting, desk types, seat model, pricing
  // =====================================================================
  var RATE = 12, OPEN = 540, CLOSE = 1020, MIN_DUR = 120, STEP = 30, MAX_PEOPLE = 6, DAYS_AHEAD = 60;
  var PART_TIME = 250, PART_TIME_HRS = 50, FULL_TIME = 500, FLEX = 750, FLEX_HRS = 100;

  var TYPES = [
    { id: 'monitor', name: 'Monitor desk', plural: 'Monitor desks', icon: 'monitor', blurb: 'Ultrawide screen, stand, mouse, keyboard', tables: [{ label: 'Oar wall table', cols: 3 }, { label: 'Window table', cols: 3 }] },
    { id: 'nomonitor', name: 'No-monitor desk', plural: 'No-monitor desks', icon: 'laptop', blurb: 'Open table space for laptops', tables: [{ label: 'Long table', cols: 4 }] },
    { id: 'heated', name: 'Heated table seat', plural: 'Heated table seats', icon: 'flame', blurb: 'A warm seat for gray days', tables: [{ label: 'Heated table', cols: 3 }] },
    { id: 'booth', name: 'Booth seat', plural: 'Booth seats', icon: 'booth', blurb: 'Cozy sea-glass booths', tables: [{ label: 'Booth 1', cols: 2 }, { label: 'Booth 2', cols: 2 }, { label: 'Booth 3', cols: 2 }] }
  ];
  var DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var icon = function (n) { return '<svg class="i" aria-hidden="true"><use href="#i-' + n + '"></use></svg>'; };
  var fmtTime = function (m) { var h = Math.floor(m / 60), mm = m % 60; return (h % 12 || 12) + (mm ? ':' + pad(mm) : '') + ' ' + (h >= 12 ? 'p.m.' : 'a.m.'); };
  var fmtTimeShort = function (m) { var h = Math.floor(m / 60), mm = m % 60; return (h % 12 || 12) + ':' + pad(mm); };
  var fmtHour = function (m) { var h = Math.floor(m / 60), mm = m % 60; return (h % 12 || 12) + (mm ? ':' + pad(mm) : ''); };
  var fmtDur = function (m) { var h = Math.floor(m / 60), r = m % 60; return (h ? h + (h === 1 ? ' hour' : ' hours') : '') + (r ? (h ? ' ' : '') + r + ' min' : ''); };
  var fmtDate = function (d) { return DOW[d.getDay()] + ', ' + MON[d.getMonth()] + ' ' + d.getDate(); };
  var fmtDateShort = function (d) { return DOW[d.getDay()].slice(0, 3) + ', ' + MON[d.getMonth()].slice(0, 3) + ' ' + d.getDate(); };
  var key = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var parseKey = function (s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
  var addDays = function (d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); };
  var money = function (n) { return '$' + n.toFixed(n % 1 ? 2 : 0).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
  var today = function () { var d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  var nowMin = function () { var d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  var sameDay = function (a, b) { return !!(a && b) && key(a) === key(b); };
  var isWeekday = function (d) { var w = d.getDay(); return w > 0 && w < 6; };
  var validEmail = function (s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); };
  var hash = function (s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  var ref = function (p) { var c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = ''; for (var i = 0; i < 5; i++) s += c[Math.floor(Math.random() * c.length)]; return p + '-' + s; };
  var firstName = function (n) { return String(n || '').trim().split(/\s+/)[0] || ''; };
  var typeById = function (id) { return TYPES.filter(function (t) { return t.id === id; })[0] || TYPES[0]; };

  function earliestStart(date, len) {
    if (!sameDay(date, today())) return OPEN;
    var s = Math.max(OPEN, Math.ceil((nowMin() + 1) / STEP) * STEP);
    return s + len <= CLOSE ? s : null;
  }
  function inWindow(date) { var t = today(); return isWeekday(date) && date >= t && (date - t) / 864e5 <= DAYS_AHEAD; }
  function dayAvailable(date, len) { return inWindow(date) && earliestStart(date, len) !== null; }
  function firstAvailable(len) {
    var d = today();
    for (var i = 0; i < 90; i++) { if (dayAvailable(d, len)) return d; d = addDays(d, 1); }
    return null;
  }
  // Is this exact slot still bookable (weekday, in range, not already past)?
  function slotOpen(date, start, dur) {
    if (!inWindow(date) || start < OPEN || start + dur > CLOSE) return false;
    var e = earliestStart(date, MIN_DUR);
    return e !== null && start >= e;
  }

  // Seats are ordered around each table so a contiguous run sits side by side.
  function seatsFor(type) {
    var out = [];
    type.tables.forEach(function (tb, ti) {
      var n = tb.cols, order = 0;
      for (var c = 0; c < n; c++) out.push({ id: type.id + '-' + ti + '-A' + c, table: ti, side: 'A', col: c, order: order++ });
      for (var c2 = n - 1; c2 >= 0; c2--) out.push({ id: type.id + '-' + ti + '-B' + c2, table: ti, side: 'B', col: c2, order: order++ });
    });
    return out;
  }
  // Deterministic, simulated "already booked" seats for a date and start time.
  function takenSet(type, date, start) {
    var set = {}, dk = key(date || today()), multi = type.tables.length > 1;
    var openTable = hash(dk + type.id) % type.tables.length; // one table stays clear for groups
    seatsFor(type).forEach(function (s) {
      if (multi && s.table === openTable) return;
      if (hash(dk + '|' + Math.floor(start / 60) + '|' + s.id) % 100 < (multi ? 30 : 18)) set[s.id] = true;
    });
    return set;
  }
  function openSeats(type, date, start) {
    var tk = takenSet(type, date, start);
    return seatsFor(type).filter(function (s) { return !tk[s.id]; }).map(function (s) { return s.id; });
  }
  function maxTogether(type) { return Math.max.apply(null, type.tables.map(function (t) { return t.cols * 2; })); }
  // A contiguous run of n open seats at one table. With preferId, prefer a run
  // that starts at that seat, then one that includes it.
  function findBlock(type, n, date, start, preferId) {
    var tk = takenSet(type, date, start), all = seatsFor(type), runs = [];
    type.tables.forEach(function (tb, ti) {
      var ring = all.filter(function (s) { return s.table === ti; }), L = ring.length;
      if (n > L) return;
      for (var st = 0; st < L; st++) {
        var block = [];
        for (var k = 0; k < n; k++) { var s = ring[(st + k) % L]; if (tk[s.id]) { block = null; break; } block.push(s.id); }
        if (block) runs.push(block);
      }
    });
    if (preferId) {
      var a = runs.filter(function (b) { return b[0] === preferId; })[0] || runs.filter(function (b) { return b.indexOf(preferId) > -1; })[0];
      if (a) return a;
    }
    return runs[0] || null;
  }
  function seatNames(type, ids) {
    var all = seatsFor(type), byTable = {};
    ids.forEach(function (id) {
      var s = all.filter(function (x) { return x.id === id; })[0];
      if (s) (byTable[s.table] = byTable[s.table] || []).push(s.order + 1);
    });
    return Object.keys(byTable).map(function (t) {
      var seats = byTable[t].sort(function (a, b) { return a - b; });
      return type.tables[t].label + (seats.length > 1 ? ', seats ' : ', seat ') + seats.join(', ');
    }).join('; ') || 'None yet';
  }
  // "2 monitor desks", "1 booth seat"
  function deskCount(typeId, n) { var t = typeById(typeId); return n + ' ' + (n === 1 ? t.name : t.plural).toLowerCase(); }

  // Who is covered, and what it costs. guests[i].member marks extra members.
  function price(p) {
    var hrs = p.dur / 60, paying = 0, covered = 0;
    for (var i = 0; i < p.people; i++) {
      var g = (p.guests || [])[i] || {};
      if (p.cover === 'flex' || (p.cover === 'member' && (i === 0 || g.member))) covered++; else paying++;
    }
    return { hrs: hrs, paying: paying, covered: covered, total: paying * hrs * RATE, poolHours: p.cover === 'flex' ? p.people * hrs : 0 };
  }

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

  var core = {
    RATE: RATE, OPEN: OPEN, CLOSE: CLOSE, MIN_DUR: MIN_DUR, STEP: STEP, MAX_PEOPLE: MAX_PEOPLE, DAYS_AHEAD: DAYS_AHEAD, TYPES: TYPES,
    DOW: DOW, MON: MON, pad: pad, esc: esc, icon: icon, fmtTime: fmtTime, fmtTimeShort: fmtTimeShort, fmtHour: fmtHour, fmtDur: fmtDur,
    fmtDate: fmtDate, fmtDateShort: fmtDateShort, key: key, parseKey: parseKey, addDays: addDays, money: money, today: today, nowMin: nowMin,
    sameDay: sameDay, isWeekday: isWeekday, validEmail: validEmail, hash: hash, ref: ref, firstName: firstName, typeById: typeById,
    earliestStart: earliestStart, dayAvailable: dayAvailable, firstAvailable: firstAvailable, slotOpen: slotOpen,
    seatsFor: seatsFor, takenSet: takenSet, openSeats: openSeats, maxTogether: maxTogether, findBlock: findBlock, seatNames: seatNames,
    deskCount: deskCount, price: price, ics: ics
  };

  // =====================================================================
  // Memory: everything we remember, in one localStorage entry
  // =====================================================================
  var STORE = 'swl.memory.v1';
  var blank = function () { return { v: 1, sessions: 0, pages: {}, bookings: [], profile: null, rulesOK: false }; };
  var canStore = (function () { try { localStorage.setItem('swl.t', '1'); localStorage.removeItem('swl.t'); return true; } catch (e) { return false; } })();
  function load() {
    if (!canStore) return blank();
    try { var m = JSON.parse(localStorage.getItem(STORE)); return m && m.v === 1 ? m : blank(); } catch (e) { return blank(); }
  }
  var mem = load();
  function save() { if (canStore) try { localStorage.setItem(STORE, JSON.stringify(mem)); } catch (e) { /* storage full or blocked */ } }

  // A "visit" is a browser session. Pages first seen in an earlier visit are
  // what we gently bring back up next time.
  function startSession() {
    var s = null;
    try { s = sessionStorage.getItem('swl.session'); } catch (e) { /* blocked */ }
    if (!s) {
      mem.sessions = (mem.sessions || 0) + 1;
      try { sessionStorage.setItem('swl.session', String(mem.sessions)); } catch (e) { /* blocked */ }
      return mem.sessions;
    }
    return +s;
  }

  var memory = {
    get: function () { return mem; },
    hasHistory: function () { return mem.bookings.length > 0 || !!mem.profile; },
    profile: function () { return mem.profile; },
    rulesOK: function () { return !!mem.rulesOK; },
    bookings: function () { return mem.bookings.slice(); },
    recordBooking: function (b) {
      mem.bookings.push({
        date: key(b.date), start: b.start, dur: b.dur, type: b.type, people: b.people, together: !!b.together,
        cover: b.cover || 'dropin', ref: b.ref || '', at: new Date().toISOString(),
        guests: (b.guests || []).slice(0, b.people).map(function (g) { return { name: (g.name || '').trim(), email: (g.email || '').trim(), member: !!g.member }; })
      });
      if (mem.bookings.length > 40) mem.bookings = mem.bookings.slice(-40);
      var lead = (b.guests || [])[0];
      if (lead && lead.name) mem.profile = { name: lead.name.trim(), email: (lead.email || '').trim() };
      mem.rulesOK = true;
      save(); refreshAll();
    },
    rememberPerson: function (name, email) {
      if (!name) return;
      mem.profile = { name: name.trim(), email: (email || '').trim() };
      save(); refreshAll();
    },
    forget: function () {
      mem = blank();
      try { localStorage.removeItem(STORE); sessionStorage.removeItem('swl.session'); } catch (e) { /* blocked */ }
      refreshAll();
    }
  };

  // =====================================================================
  // Suggestions
  // =====================================================================
  function bookingsAsc() { return mem.bookings.slice().sort(function (a, b) { return (a.date + pad(a.start)).localeCompare(b.date + pad(b.start)); }); }
  function lastBooking() { var b = bookingsAsc(); return b[b.length - 1] || null; }
  function isBooked(date, start) { return mem.bookings.some(function (b) { return b.date === key(date) && b.start === start; }); }

  // The visitor's habit: the most frequent day/time/desk/party combination,
  // with recent bookings counting a little more. One booking is a habit too.
  function usual() {
    var groups = {}, list = bookingsAsc(), n = list.length;
    if (!n) return null;
    list.forEach(function (b, i) {
      var sig = [parseKey(b.date).getDay(), b.start, b.dur, b.type, b.people].join('|');
      var g = groups[sig] || (groups[sig] = { count: 0, score: 0, last: b });
      g.count++; g.score += 1 + i / n; g.last = b;
    });
    var best = Object.keys(groups).map(function (k) { return groups[k]; }).sort(function (a, b) { return b.score - a.score; })[0];
    var b = best.last;
    return { dow: parseKey(b.date).getDay(), start: b.start, dur: b.dur, type: b.type, people: b.people, together: b.together, cover: b.cover, guests: b.guests, count: best.count };
  }

  function planFrom(src, date) {
    return { date: date, start: src.start, dur: src.dur, type: src.type, people: src.people, together: src.people > 1 && src.together !== false, cover: src.cover || 'dropin', guests: (src.guests || []).map(function (g) { return { name: g.name, email: g.email, member: !!g.member }; }) };
  }
  function nextOnDow(dow, start, dur, minDate) {
    var d = minDate || today();
    for (var i = 0; i < 70; i++) {
      if (d.getDay() === dow && slotOpen(d, start, dur) && !isBooked(d, start)) return d;
      d = addDays(d, 1);
    }
    return null;
  }

  // Describe a plan in one human line: "2 monitor desks, Tuesday 9 to 1, seats together"
  function describe(p, withDay) {
    return deskCount(p.type, p.people) + (withDay === false ? '' : ', ' + DOW[p.date.getDay()]) + ' ' + fmtHour(p.start) + ' to ' + fmtHour(p.start + p.dur) + (p.people > 1 && p.together ? ', seats together' : '');
  }
  function crewLine(p) {
    var names = (p.guests || []).slice(1, p.people).map(function (g) { return g.name; }).filter(Boolean);
    if (p.people === 1) return 'Just you';
    if (!names.length) return 'You and ' + (p.people - 1) + (p.people === 2 ? ' guest' : ' guests');
    var extra = p.people - 1 - names.length;
    return 'You and ' + names.join(', ') + (extra > 0 ? ' plus ' + extra : '');
  }
  function relDay(d) {
    var t = today(), diff = Math.round((d - t) / 864e5);
    if (diff === 0) return 'today';
    if (diff === 1) return 'tomorrow';
    if (diff < 7) return DOW[d.getDay()];
    return fmtDateShort(d);
  }

  // Ranked one-tap plans. Each is fully specified and bookable as-is.
  function plans() {
    var out = [], u = usual(), last = lastBooking(), seen = {};
    var push = function (id, label, sub, p) {
      if (!p || !p.date) return;
      var sig = key(p.date) + p.start + p.type + p.people;
      if (seen[sig]) return;
      seen[sig] = 1;
      out.push({ id: id, label: label, sub: sub, plan: p });
    };
    if (u) {
      var d = nextOnDow(u.dow, u.start, u.dur);
      if (d) push('usual', 'Book your usual', relDay(d) === 'today' || relDay(d) === 'tomorrow' ? cap(relDay(d)) + ', ' + fmtDateShort(d) : fmtDate(d), planFrom(u, d));
    }
    if (last) {
      // Same as last time, on the next open weekday (tomorrow when it is one)
      var t = addDays(today(), 1);
      for (var i = 0; i < 7 && !(slotOpen(t, last.start, last.dur) && !isBooked(t, last.start)); i++) t = addDays(t, 1);
      if (slotOpen(t, last.start, last.dur)) push('tomorrow', 'Same as last time, ' + (relDay(t) === 'tomorrow' ? 'tomorrow' : DOW[t.getDay()]), fmtDate(t), planFrom(last, t));
      // Same time next week: a week on from the last booking, rolled forward
      var nw = addDays(parseKey(last.date), 7);
      while (nw < today() || isBooked(nw, last.start)) nw = addDays(nw, 7);
      if (slotOpen(nw, last.start, last.dur)) push('nextweek', 'Same time next week', fmtDate(nw), planFrom(last, nw));
    }
    return out;
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // First-time visitors get a sensible default: the next open two hours.
  function defaultPlan() {
    var d = firstAvailable(MIN_DUR);
    if (!d) return null;
    var p = mem.profile;
    return { date: d, start: earliestStart(d, MIN_DUR), dur: MIN_DUR, type: 'monitor', people: 1, together: false, cover: 'dropin', guests: p ? [{ name: p.name, email: p.email }] : [] };
  }

  // Pick seats for a plan; if the desk type is full, quietly try the others.
  function seatPlan(p) {
    var order = [p.type].concat(TYPES.map(function (t) { return t.id; }).filter(function (id) { return id !== p.type; }));
    for (var i = 0; i < order.length; i++) {
      var type = typeById(order[i]), seats;
      if (p.people > 1 && p.together) seats = findBlock(type, p.people, p.date, p.start);
      else { var open = openSeats(type, p.date, p.start); seats = open.length >= p.people ? open.slice(0, p.people) : null; }
      if (seats) return { type: type.id, seats: seats, switched: i > 0 };
    }
    return null;
  }

  // Would a membership have saved money? Looks at the last 30 days of
  // drop-in bookings, per person, and compares against each plan.
  function savings() {
    var since = addDays(today(), -30), until = addDays(today(), 1);
    var people = {}, dropins = 0, visits = 0;
    mem.bookings.forEach(function (b) {
      var d = parseKey(b.date);
      if (d < since || d >= until) return;
      visits++;
      if (b.cover !== 'dropin') return;
      dropins++;
      for (var i = 0; i < b.people; i++) {
        var g = b.guests[i] || {}, k = i === 0 ? 'lead' : (g.name || 'guest ' + (i + 1)).toLowerCase();
        var rec = people[k] || (people[k] = { name: i === 0 ? 'you' : g.name || 'a guest', hrs: 0 });
        rec.hrs += b.dur / 60;
      }
    });
    var lead = people.lead ? people.lead.hrs : 0;
    var total = Object.keys(people).reduce(function (s, k) { return s + people[k].hrs; }, 0);
    var viewedPricing = ((mem.pages.memberships || {}).count || 0) >= 2;
    if (!dropins && !viewedPricing) return null;
    var out = { leadHours: lead, leadSpend: lead * RATE, totalHours: total, totalSpend: total * RATE, dropins: dropins, visits: visits, viewedPricing: viewedPricing, crew: Object.keys(people).length };
    var options = [];
    if (lead > 0 && lead <= PART_TIME_HRS && lead * RATE > PART_TIME) options.push({ plan: 'Part-time', href: 'memberships.html#part-time', cost: PART_TIME, save: lead * RATE - PART_TIME, scope: 'you' });
    if (lead > 0 && lead * RATE > FULL_TIME) options.push({ plan: 'Full-time', href: 'memberships.html#full-time', cost: FULL_TIME, save: lead * RATE - FULL_TIME, scope: 'you' });
    if (out.crew > 1 && total <= FLEX_HRS && total * RATE > FLEX) options.push({ plan: 'Corporate Flex', href: 'memberships.html#corporate-flex', cost: FLEX, save: total * RATE - FLEX, scope: 'team' });
    options.sort(function (a, b) { return b.save - a.save; });
    out.best = options[0] || null;
    out.breakEven = Math.ceil(PART_TIME / RATE); // 21 hours a month
    if (!out.best && !(dropins >= 3 || viewedPricing)) return null;
    return out;
  }

  // Pages seen on an earlier visit that are worth a nudge.
  var INTERESTS = {
    'virtual-office': { tag: 'Picked up where you left off', title: 'Still weighing a waterfront address?', body: 'A professional Gig Harbor address and private mailbox for $49 a month, or $39 for members. Boaters and liveaboards welcome.', href: 'virtual-office.html', cta: 'See the virtual office', ico: 'mail' },
    events: { tag: 'Picked up where you left off', title: 'Planning something by the water?', body: 'Workshops, retreats, and parties with the harbor as your backdrop. Send us a date and a headcount and we will take it from there.', href: 'events.html#inquire', cta: 'Start an event inquiry', ico: 'glass' }
  };
  function interests() {
    return Object.keys(INTERESTS).filter(function (k) { var p = mem.pages[k]; return p && p.first < currentSession; }).map(function (k) { return INTERESTS[k]; });
  }

  // =====================================================================
  // Demo: ?demo=returning seeds a believable returning visitor
  // =====================================================================
  function seedDemo() {
    mem = blank();
    var t = today(), lead = { name: 'Jordan Reyes', email: 'jordan@example.com' }, crew = { name: 'Casey Lin', email: 'casey@example.com' };
    var add = function (dow, weeksAgo, people) {
      var d = addDays(t, -(((t.getDay() - dow + 7) % 7) || 7) - 7 * weeksAgo);
      mem.bookings.push({ date: key(d), start: 540, dur: 240, type: 'monitor', people: people, together: people > 1, cover: 'dropin', ref: ref('SWL'), at: d.toISOString(), guests: people > 1 ? [lead, crew] : [lead] });
    };
    for (var w = 3; w >= 0; w--) { add(2, w, 2); if (w < 3) add(4, w, 1); } // Tuesdays with Casey, Thursdays solo
    // ...plus one recent solo afternoon at the heated table, so "same as last
    // time" and "same time next week" differ from the usual.
    var y = addDays(t, -1);
    while (!isWeekday(y)) y = addDays(y, -1);
    mem.bookings.push({ date: key(y), start: 780, dur: 180, type: 'heated', people: 1, together: false, cover: 'dropin', ref: ref('SWL'), at: y.toISOString(), guests: [lead] });
    mem.bookings.sort(function (a, b) { return a.date.localeCompare(b.date); });
    mem.profile = lead;
    mem.rulesOK = true;
    mem.sessions = 4;
    mem.pages = { home: { count: 6, first: 1, last: 3 }, memberships: { count: 3, first: 1, last: 3 }, 'virtual-office': { count: 1, first: 2, last: 2 }, events: { count: 1, first: 3, last: 3 }, book: { count: 7, first: 1, last: 3 } };
    save();
    try { sessionStorage.removeItem('swl.session'); } catch (e) { /* blocked */ }
  }

  // =====================================================================
  // UI helpers
  // =====================================================================
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduced = function () { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; };

  var toastEl;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = icon('check') + '<span>' + esc(msg) + '</span>';
    toastEl.classList.remove('is-on');
    void toastEl.offsetWidth;
    toastEl.classList.add('is-on');
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { toastEl.classList.remove('is-on'); }, 4200);
  }

  function priceLine(p) {
    var pr = price(p);
    if (!pr.paying) return p.cover === 'flex' ? pr.poolHours + ' hours from your team pool' : 'Covered by membership';
    return money(pr.total) + (pr.covered ? ' after membership' : ' drop-in');
  }

  // =====================================================================
  // Quick book sheet
  // =====================================================================
  var sheet, sheetState = { options: [], idx: 0, plan: null, editing: false };

  function buildSheet() {
    sheet = document.createElement('dialog');
    sheet.className = 'sheet';
    sheet.setAttribute('aria-labelledby', 'qb-title');
    sheet.innerHTML = '<div class="sheet-inner" data-qb></div>';
    document.body.appendChild(sheet);
    sheet.addEventListener('click', function (e) {
      if (e.target === sheet) { sheet.close(); return; }
      var b = e.target.closest('button, a');
      if (!b) return;
      if (b.hasAttribute('data-qb-close')) sheet.close();
      else if (b.hasAttribute('data-qb-opt')) { sheetState.idx = +b.getAttribute('data-qb-opt'); renderSheet(); var f = $('[data-qb-opt="' + sheetState.idx + '"]', sheet); if (f) f.focus(); }
      else if (b.hasAttribute('data-qb-ppl')) { var p = sheetState.options[sheetState.idx].plan; p.people = Math.min(MAX_PEOPLE, Math.max(1, p.people + +b.getAttribute('data-qb-ppl'))); p.together = p.people > 1; renderSheet(); var g = $('[data-qb-ppl="' + b.getAttribute('data-qb-ppl') + '"]', sheet); if (g && !g.disabled) g.focus(); }
      else if (b.hasAttribute('data-qb-notme')) { sheetState.editing = true; renderSheet(); var n = $('#qb-name', sheet); if (n) n.focus(); }
      else if (b.hasAttribute('data-qb-confirm')) confirmSheet();
      else if (b.hasAttribute('data-forget')) { e.preventDefault(); forgetNow(); sheet.close(); }
    });
    sheet.addEventListener('close', function () { if (sheet._opener && document.contains(sheet._opener)) sheet._opener.focus(); });
  }

  function openSheet(preferId, opener) {
    if (!sheet) buildSheet();
    var opts = plans();
    if (!opts.length) { var d = defaultPlan(); if (d) opts = [{ id: 'next', label: 'Next open desk', sub: fmtDate(d.date), plan: d }]; }
    sheetState = { options: opts, idx: Math.max(0, opts.map(function (o) { return o.id; }).indexOf(preferId)), editing: false };
    renderSheet();
    sheet._opener = opener || document.activeElement;
    if (typeof sheet.showModal === 'function') sheet.showModal(); else sheet.setAttribute('open', '');
    var c = $('[data-qb-confirm]', sheet);
    if (c) c.focus();
  }

  function renderSheet() {
    var box = $('[data-qb]', sheet), st = sheetState, prof = mem.profile;
    var keep = { name: ($('#qb-name', sheet) || {}).value || '', email: ($('#qb-email', sheet) || {}).value || '', rules: !!($('#qb-rules', sheet) || {}).checked };
    var head = '<div class="sheet-head"><p class="sheet-kicker">' + icon('sparkle') + ' Quick book</p><button type="button" class="sheet-x" data-qb-close aria-label="Close">' + icon('x') + '</button></div>';
    if (!st.options.length) {
      box.innerHTML = head + '<h2 id="qb-title" class="sheet-title">No open dates right now.</h2><p class="muted">Email <a href="mailto:ahoy@stowawaylabs.com">ahoy@stowawaylabs.com</a> and we will find you a seat.</p>';
      return;
    }
    var o = st.options[st.idx], p = o.plan, sp = seatPlan(p), returning = memory.hasHistory() && mem.bookings.length > 0;
    if (sp) p._seats = sp; else p._seats = null;
    var type = typeById(sp ? sp.type : p.type);
    var chips = st.options.length > 1 ? '<div class="qb-opts" role="radiogroup" aria-label="Suggestions">' + st.options.map(function (x, i) {
      return '<button type="button" role="radio" class="qb-opt" data-qb-opt="' + i + '" aria-checked="' + (i === st.idx) + '"><b>' + esc(x.label) + '</b><small>' + esc(x.sub) + '</small></button>';
    }).join('') + '</div>' : '';
    var who;
    if (prof && !st.editing) {
      who = '<p class="qb-who">' + icon('user') + '<span>Booking as <b>' + esc(prof.name) + '</b>' + (prof.email ? ' <span class="muted">(' + esc(prof.email) + ')</span>' : '') + ' <button type="button" class="link-btn" data-qb-notme>Not you?</button></span></p>';
    } else {
      who = '<div class="field-row qb-fields"><div class="field"><label for="qb-name">Your name</label><input id="qb-name" type="text" autocomplete="name" value="' + esc(keep.name) + '"></div>' +
        '<div class="field"><label for="qb-email">Email</label><input id="qb-email" type="email" autocomplete="email" value="' + esc(keep.email) + '"></div></div>';
    }
    var rules = mem.rulesOK ? '<p class="qb-fine">' + icon('check') + ' House rules accepted: 18+, no pets, check in on arrival.</p>'
      : '<label class="check qb-check"><input type="checkbox" id="qb-rules"' + (keep.rules ? ' checked' : '') + '> <span>Everyone is 18 or older, pets stay home, and we will check in on arrival.</span></label>';
    var seatsTxt = sp ? seatNames(type, sp.seats) : 'No open seats for this time';
    box.innerHTML = head +
      '<p class="eyebrow">' + (returning ? 'Ready when you are' : 'Our best guess') + '</p>' +
      '<h2 id="qb-title" class="sheet-title">' + esc(o.id === 'next' ? 'The next open desk, ' + relDay(p.date) + '.' : o.label + '.') + '</h2>' +
      chips +
      '<div class="qb-card">' +
        '<div class="qb-when"><span class="qb-date">' + fmtDate(p.date) + '</span><span class="qb-time">' + fmtTime(p.start) + ' to ' + fmtTime(p.start + p.dur) + ' <span>(' + fmtDur(p.dur) + ')</span></span></div>' +
        '<dl class="qb-list">' +
          '<div><dt>Desk</dt><dd>' + deskCount(type.id, p.people) + (p.people > 1 && p.together ? ', seated together' : '') + '<br><span class="muted small">' + esc(seatsTxt) + '</span></dd></div>' +
          '<div><dt>Crew</dt><dd class="qb-crew"><span>' + esc(crewLine(p)) + '</span><span class="qb-step" role="group" aria-label="Number of people"><button type="button" data-qb-ppl="-1" aria-label="One fewer person"' + (p.people <= 1 ? ' disabled' : '') + '>' + icon('minus') + '</button><output aria-live="polite">' + p.people + '</output><button type="button" data-qb-ppl="1" aria-label="One more person"' + (p.people >= MAX_PEOPLE ? ' disabled' : '') + '>' + icon('plus') + '</button></span></dd></div>' +
          '<div><dt>Total</dt><dd><b class="qb-price">' + priceLine(p) + '</b></dd></div>' +
        '</dl>' +
        (sp && sp.switched ? '<p class="qb-note">' + typeById(p.type).plural + ' are full then, so we found you ' + type.plural.toLowerCase() + ' instead.</p>' : '') +
      '</div>' +
      who + rules +
      '<p class="error-msg" data-qb-err hidden></p>' +
      '<div class="sheet-actions"><button type="button" class="btn btn-primary btn-block" data-qb-confirm' + (sp ? '' : ' disabled') + '>Confirm booking ' + icon('arrow') + '</button>' +
      '<a class="btn btn-ghost btn-block" href="book.html?prefill=' + o.id + '">Change details</a></div>' +
      '<p class="sheet-privacy">' + icon('shield') + '<span>Suggestions come from your past visits, remembered on this device only. <button type="button" class="link-btn" data-forget>Forget my preferences</button></span></p>';
  }

  function confirmSheet() {
    var o = sheetState.options[sheetState.idx], p = o.plan, err = $('[data-qb-err]', sheet);
    var prof = mem.profile, name, email;
    if (prof && !sheetState.editing) { name = prof.name; email = prof.email; }
    else {
      var n = $('#qb-name', sheet), m = $('#qb-email', sheet);
      name = n.value.trim(); email = m.value.trim();
      n.setAttribute('aria-invalid', !name); m.setAttribute('aria-invalid', !validEmail(email));
      if (!name || !validEmail(email)) { err.textContent = 'Add your name and a valid email so we can hold your seat.'; err.hidden = false; (!name ? n : m).focus(); return; }
    }
    var rules = $('#qb-rules', sheet);
    if (rules && !rules.checked) { err.textContent = 'Please confirm the house rules.'; err.hidden = false; rules.focus(); return; }
    var sp = p._seats;
    if (!sp) return;
    var guests = [{ name: name, email: email, member: false }];
    for (var i = 1; i < p.people; i++) guests.push((p.guests || [])[i] || { name: '', email: '' });
    var plan = { date: p.date, start: p.start, dur: p.dur, type: sp.type, people: p.people, together: p.together, cover: p.cover, guests: guests };
    var r = ref('SWL'), type = typeById(sp.type), seats = seatNames(type, sp.seats);
    memory.recordBooking({ date: plan.date, start: plan.start, dur: plan.dur, type: plan.type, people: plan.people, together: plan.together, cover: plan.cover, guests: guests, ref: r });
    var box = $('[data-qb]', sheet);
    box.innerHTML = '<div class="sheet-head"><p class="sheet-kicker">' + icon('sparkle') + ' Quick book</p><button type="button" class="sheet-x" data-qb-close aria-label="Close">' + icon('x') + '</button></div>' +
      '<div class="qb-done">' +
        '<div class="confirm-mark" aria-hidden="true"><svg><use href="#i-mark"></use></svg></div>' +
        '<p class="eyebrow">Ahoy, ' + esc(firstName(name)) + '</p>' +
        '<h2 id="qb-title" class="sheet-title">You’re on the manifest.</h2>' +
        '<p class="muted">' + fmtDate(plan.date) + ', ' + fmtTime(plan.start) + ' to ' + fmtTime(plan.start + plan.dur) + '<br>' + esc(deskCount(type.id, plan.people)) + ' · ' + esc(seats) + '</p>' +
        '<p class="confirm-ref">Confirmation <b>' + r + '</b></p>' +
        '<div class="sheet-actions"><a class="btn btn-dark btn-block" download="stowaway-labs.ics" href="' + ics('Stowaway Labs: ' + type.name + (plan.people > 1 ? ' for ' + plan.people : ''), plan.date, plan.start, plan.start + plan.dur, deskCount(type.id, plan.people) + ' (' + seats + '). Ref ' + r + '. Check in on arrival.') + '">' + icon('calendar') + ' Add to calendar</a>' +
        '<button type="button" class="btn btn-ghost btn-block" data-qb-close>Done</button></div>' +
        '<p class="sheet-privacy">' + icon('mail') + '<span>A confirmation is on its way to ' + esc(email) + '.</span></p>' +
      '</div>';
    var d = $('[data-qb-close].btn', box); if (d) d.focus();
  }

  // =====================================================================
  // Page cards
  // =====================================================================
  function usualCard(o, mode) {
    var p = o.plan, pr = priceLine(p);
    var primary = mode === 'book'
      ? '<button type="button" class="btn btn-light" data-fill="usual">Use my usual ' + icon('arrow') + '</button><button type="button" class="btn btn-ghost-light" data-quick-open="usual">Quick confirm</button>'
      : '<button type="button" class="btn btn-light" data-quick-open="usual">Book it ' + icon('arrow') + '</button><a class="btn btn-ghost-light" href="book.html?prefill=usual">Adjust details</a>';
    return '<div class="usual">' +
      '<div class="usual-top"><span class="usual-tag">' + icon('sparkle') + ' Your usual</span><span class="usual-next">Next: ' + esc(o.sub) + '</span></div>' +
      '<h3 class="usual-title">' + esc(cap(describe(p))) + '</h3>' +
      '<p class="usual-meta"><span>' + icon('users') + esc(crewLine(p)) + '</span><span>' + icon('tag') + esc(pr) + '</span></p>' +
      '<div class="btn-row">' + primary + '</div>' +
    '</div>';
  }
  function quickChips(list, mode) {
    if (!list.length) return '';
    return '<div class="quick-chips" aria-label="Quick actions">' + list.map(function (o) {
      var attr = mode === 'book' ? 'data-fill="' + o.id + '"' : 'data-quick-open="' + o.id + '"';
      return '<button type="button" class="quick-chip" ' + attr + '>' + icon(o.id === 'nextweek' ? 'calendar' : 'clock') + '<span><b>' + esc(o.label) + '</b><small>' + esc(o.sub) + ', ' + fmtHour(o.plan.start) + ' to ' + fmtHour(o.plan.start + o.plan.dur) + '</small></span></button>';
    }).join('') + '</div>';
  }
  function savingsCard(s) {
    if (!s) return '';
    if (s.best) {
      var b = s.best;
      return '<div class="nudge-card">' +
        '<span class="nudge-ico">' + icon('tag') + '</span>' +
        '<p class="nudge-kicker">A friendly heads up</p>' +
        '<h3>' + b.plan + ' would have saved ' + (b.scope === 'team' ? 'your team ' : 'you ') + money(b.save) + ' in the last 30 days.</h3>' +
        '<p>' + (b.scope === 'team'
          ? 'Your crew logged ' + s.totalHours + ' drop-in hours in the last 30 days: ' + s.totalHours + ' × $' + RATE + ' = ' + money(s.totalSpend) + ', versus ' + money(b.cost) + ' for a shared pool of 100 hours.'
          : 'You logged ' + s.leadHours + ' drop-in hours in the last 30 days: ' + s.leadHours + ' × $' + RATE + ' = ' + money(s.leadSpend) + ', versus ' + money(b.cost) + ' a month' + (b.plan === 'Part-time' ? ' for up to 50 hours, plus priority booking.' : ' for unlimited weekdays.')) + '</p>' +
        '<a class="text-link" href="' + b.href + '">Compare memberships ' + icon('arrow') + '</a>' +
      '</div>';
    }
    var left = Math.max(0, s.breakEven - s.leadHours);
    return '<div class="nudge-card">' +
      '<span class="nudge-ico">' + icon('tag') + '</span>' +
      '<p class="nudge-kicker">Doing the math for you</p>' +
      '<h3>Part-time pays for itself at ' + s.breakEven + ' hours a month.</h3>' +
      '<p>' + (s.leadHours ? 'You are at ' + s.leadHours + ' drop-in hours (' + money(s.leadSpend) + ') in the last 30 days, ' + left + ' hours shy. Until then, drop-in is the better deal.' : 'At $' + RATE + ' an hour, drop-in is the better deal until you pass that. We will let you know when a membership starts to save you money.') + '</p>' +
      '<a class="text-link" href="memberships.html">See memberships ' + icon('arrow') + '</a>' +
    '</div>';
  }
  function interestCards() {
    return interests().map(function (it) {
      return '<a class="nudge-card nudge-link" href="' + it.href + '"><span class="nudge-ico">' + icon(it.ico) + '</span><p class="nudge-kicker">' + it.tag + '</p><h3>' + it.title + '</h3><p>' + it.body + '</p><span class="text-link">' + it.cta + ' ' + icon('arrow') + '</span></a>';
    }).join('');
  }
  function forgetLink(cls) { return '<button type="button" class="link-btn ' + (cls || '') + '" data-forget>' + icon('shield') + ' Forget my preferences</button>'; }

  function renderHome() {
    var el = $('[data-smart-home]');
    if (!el) return;
    var all = plans(), prof = mem.profile, s = savings(), extras = interestCards();
    if (!all.length && !s && !extras) { el.hidden = true; el.innerHTML = ''; return; }
    var u = all.filter(function (o) { return o.id === 'usual'; })[0], rest = all.filter(function (o) { return o !== u; });
    el.innerHTML = '<div class="container">' +
      '<div class="smart-head"><div><p class="eyebrow">Welcome back</p><h2 id="smart-h">Ahoy again' + (prof ? ', ' + esc(firstName(prof.name)) : '') + '.</h2>' +
      '<p class="lede">' + (u ? 'Your desk is a tap away. We remembered how you like to work.' : 'We kept your place. Here is what you were looking at.') + '</p></div>' + forgetLink('smart-forget') + '</div>' +
      '<div class="smart-grid' + (u ? '' : ' no-usual') + '">' +
        (u ? '<div class="smart-main">' + usualCard(u, 'home') + quickChips(rest, 'home') + '</div>' : (rest.length ? '<div class="smart-main">' + quickChips(rest, 'home') + '</div>' : '')) +
        ((s || extras) ? '<div class="smart-side">' + savingsCard(s) + extras + '</div>' : '') +
      '</div></div>';
    el.hidden = false;
  }

  function renderHero() {
    var el = $('[data-smart-hero]');
    if (!el) return;
    var u = plans().filter(function (o) { return o.id === 'usual'; })[0], prof = mem.profile;
    if (!u) { el.hidden = true; el.innerHTML = ''; return; }
    el.innerHTML = '<span class="hero-usual-ico" aria-hidden="true">' + icon('sparkle') + '</span>' +
      '<span class="hero-usual-txt"><small>Welcome back' + (prof ? ', ' + esc(firstName(prof.name)) : '') + '. Your usual, ' + esc(relDay(u.plan.date) === 'today' || relDay(u.plan.date) === 'tomorrow' ? relDay(u.plan.date) : fmtDateShort(u.plan.date)) + ':</small>' +
      '<b>' + esc(cap(describe(u.plan, false))) + '</b></span>' +
      '<button type="button" class="btn btn-dark btn-sm" data-quick-open="usual">Book it ' + icon('arrow') + '</button>';
    el.hidden = false;
  }

  function renderBook() {
    var el = $('[data-smart-book]');
    if (!el) return;
    var all = plans(), prof = mem.profile;
    if (!all.length) { el.hidden = true; el.innerHTML = ''; return; }
    var u = all.filter(function (o) { return o.id === 'usual'; })[0], rest = all.filter(function (o) { return o !== u; });
    el.innerHTML = '<div class="smart-book-head"><p class="smart-hi">' + icon('sparkle') + '<span>Welcome back' + (prof ? ', ' + esc(firstName(prof.name)) : '') + '. Pick up right where you left off.</span></p>' + forgetLink() + '</div>' +
      '<div class="smart-book-body">' + (u ? usualCard(u, 'book') : '') + quickChips(rest, 'book') + '</div>';
    el.hidden = false;
  }

  function renderFooter() {
    $$('.footer-forget').forEach(function (b) { b.hidden = !memory.hasHistory(); });
    document.documentElement.classList.toggle('swl-returning', mem.bookings.length > 0);
  }

  var listeners = [];
  function refreshAll() {
    renderHome(); renderHero(); renderBook(); renderFooter();
    listeners.forEach(function (fn) { try { fn(); } catch (e) { /* keep going */ } });
  }

  function forgetNow() {
    memory.forget();
    toast('Done. This browser no longer remembers your visits.');
  }

  // =====================================================================
  // Boot
  // =====================================================================
  var params = new URLSearchParams(location.search);
  var demo = params.get('demo');
  if (demo === 'returning') seedDemo();
  else if (demo === 'new') { mem = blank(); try { localStorage.removeItem(STORE); sessionStorage.removeItem('swl.session'); } catch (e) { /* blocked */ } }

  var currentSession = startSession();
  var page = document.body.getAttribute('data-page') || '';
  if (page) {
    var pv = mem.pages[page] || (mem.pages[page] = { count: 0, first: currentSession, last: currentSession });
    pv.count++; pv.last = currentSession;
  }
  if (demo !== 'new') save();

  if (demo) {
    params.delete('demo');
    var qs = params.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
  }

  window.SWL = {
    core: core, memory: memory, toast: toast, openSheet: openSheet,
    suggest: { usual: usual, plans: plans, defaultPlan: defaultPlan, savings: savings, interests: interests, describe: describe, crewLine: crewLine, seatPlan: seatPlan },
    onChange: function (fn) { listeners.push(fn); }
  };

  document.addEventListener('click', function (e) {
    var q = e.target.closest('[data-quick]');
    if (q) { e.preventDefault(); openSheet(null, q); return; }
    var o = e.target.closest('[data-quick-open]');
    if (o) { e.preventDefault(); openSheet(o.getAttribute('data-quick-open'), o); return; }
    var f = e.target.closest('[data-forget]');
    if (f && !(sheet && sheet.contains(f))) { e.preventDefault(); forgetNow(); }
  });

  refreshAll();
  if (demo === 'returning') toast('Demo mode: you are seeing a returning visitor. Forget my preferences resets it.');
})();
