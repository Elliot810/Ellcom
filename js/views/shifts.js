/* Schichten & Zeiten – Schichtplan, Tauschbörse, Zeiterfassung */
(function (L) {
  'use strict';

  var AREAS = ['Küche', 'Service', 'Events', 'Logistik'];
  var AREA_COLOR = { 'Küche': 'orange', Service: 'blue', Events: 'purple', Logistik: 'gray' };

  function shiftModal(s, pre) {
    var isNew = !s;
    pre = pre || {};
    var S = L.S, ws = pre.ws || L.S.anchor;
    var dates = []; for (var i = 0; i < 7; i++) { var d = L.add(ws, i); dates.push([d, L.WD[i] + ' ' + L.fds(d)]); }
    if (s && dates.every(function (x) { return x[0] !== s.date; })) dates.push([s.date, L.WD[L.wdIdx(s.date)] + ' ' + L.fds(s.date)]);
    var staff = [['', '— Offene Schicht —']].concat(L.shiftStaff().map(function (e) { return [e.id, L.name(e)]; }));
    L.modal({
      title: isNew ? 'Schicht hinzufügen' : 'Schicht bearbeiten', submit: isNew ? 'Hinzufügen' : 'Speichern',
      body: '<div class="grid-2">' + L.field('Tag', L.select('date', dates, s ? s.date : (pre.date || dates[0][0]))) + L.field('Bereich', L.select('area', AREAS, s ? s.area : (pre.area || 'Service'))) + '</div>' +
        '<div class="grid-2">' + L.field('Beginn', L.input('start', s ? s.start : '10:00', 'type="time" required')) + L.field('Ende', L.input('end', s ? s.end : '18:00', 'type="time" required')) + '</div>' +
        L.field('Besetzt mit', L.select('emp', staff, s ? (s.empId || '') : (pre.empId || ''))) + '<div id="shift-check" class="callout" style="display:none"></div>',
      footerLeft: s ? '<button type="button" class="btn btn-ghost-danger" id="sh-del">' + L.icon('trash-2') + 'Löschen</button>' : '',
      onMount: function (f) {
        function check() {
          var tmp = { date: f.date.value, start: f.start.value || '00:00', end: f.end.value || '00:00', empId: f.emp.value || null, area: f.area.value };
          var box = f.querySelector('#shift-check');
          var c = L.shiftConflict(tmp);
          var h = L.shiftHours(tmp);
          box.style.display = '';
          box.className = 'callout ' + (c ? 'warn' : 'info');
          box.innerHTML = L.icon(c ? 'triangle-alert' : 'info') + '<span>' + (c ? L.h(c) : L.num(h, 2) + ' h bezahlte Arbeitszeit (inkl. gesetzlicher Pause)' + (tmp.empId ? ' · ' + L.eur(h * L.emp(tmp.empId).rate) + ' Lohnkosten' : '')) + '</span>';
          L.refreshIcons();
        }
        ['date', 'start', 'end', 'emp'].forEach(function (n) { f[n].addEventListener('change', check); });
        check();
        var del = f.querySelector('#sh-del');
        if (del) del.onclick = function () { S.shifts = S.shifts.filter(function (x) { return x !== s; }); S.swaps = S.swaps.filter(function (w) { return w.shiftId !== s.id; }); L.save(); L.closeModal(); L.toast('Schicht gelöscht'); L.render(); };
      },
      onSubmit: function (d) {
        var t = s || { id: L.uid('s') };
        t.date = d.date; t.area = d.area; t.start = d.start; t.end = d.end; t.empId = d.emp || null;
        if (isNew) S.shifts.push(t);
        L.save();
        var c = L.shiftConflict(t);
        L.toast(c ? 'Gespeichert – Achtung: ' + c : (isNew ? 'Schicht hinzugefügt' : 'Schicht gespeichert'), c ? 'warn' : '');
        L.render();
      }
    });
  }

  /* ---------- Schichtplan ---------- */
  function plan() {
    var S = L.S, off = S.ui.weekOffset || 0, ws = L.add(S.anchor, off * 7), T = L.todayIso();
    var days = []; for (var i = 0; i < 7; i++) days.push(L.add(ws, i));
    var shifts = L.weekShifts(ws);
    var cost = L.weekCost(ws);
    var staff = L.shiftStaff().filter(function (e) { return !(e.end && e.end < ws); });

    function chip(s) {
      var c = L.shiftConflict(s);
      return '<div class="shift shift-' + AREA_COLOR[s.area] + (c ? ' conflict' : '') + '" data-id="' + s.id + '" title="' + L.h(c || (s.area + ' · ' + s.start + '–' + s.end)) + '">' +
        (c ? L.icon('triangle-alert', 'tiny') : '') + '<span class="shift-time">' + s.start + '–' + s.end + '</span><span class="shift-area">' + s.area + '</span></div>';
    }

    var head = '<tr><th class="plan-name">Team</th>' + days.map(function (d) {
      return '<th class="' + (d === T ? 'today' : '') + (L.wdIdx(d) >= 5 ? ' we' : '') + '"><span class="wd">' + L.WD[L.wdIdx(d)] + '</span> ' + L.fds(d) + '</th>';
    }).join('') + '</tr>';

    var openRow = '<tr class="open-row"><td class="plan-name"><span class="person"><span class="av av-open" style="--s:22px">' + L.icon('circle-dashed', 'tiny') + '</span><b>Offene Schichten</b></span></td>' + days.map(function (d) {
      var list = shifts.filter(function (s) { return !s.empId && s.date === d; });
      return '<td class="cell" data-emp="" data-date="' + d + '">' + list.map(chip).join('') + '<button class="cell-add" data-add-date="' + d + '" data-add-emp="">+</button></td>';
    }).join('') + '</tr>';

    var rows = staff.map(function (e) {
      var h = cost.byEmp[e.id] || 0, over = h > e.hoursWeek + 0.01;
      return '<tr><td class="plan-name"><a class="person" href="#/personal/mitarbeiter/' + e.id + '">' + L.avatar(e) + '<span><b>' + L.h(e.first + ' ' + e.last.charAt(0) + '.') + '</b><span class="plan-hours' + (over ? ' over' : '') + '">' + L.num(h, 1) + ' / ' + e.hoursWeek + ' h</span></span></a></td>' +
        days.map(function (d) {
          var list = shifts.filter(function (s) { return s.empId === e.id && s.date === d; });
          var a = L.absenceOn(e.id, d, true);
          var na = L.unavailable(e.id, d), notYet = e.start > d || (e.end && e.end < d);
          var marker = a ? '<span class="cell-note abs-' + ({ Urlaub: 'blue', Krank: 'red', Weiterbildung: 'purple', Sonderurlaub: 'green' }[a.type]) + (a.status === 'beantragt' ? ' pending' : '') + '">' + a.type + (a.status === 'beantragt' ? ' (beantragt)' : '') + '</span>'
            : (notYet ? '<span class="cell-note muted-note">' + (e.start > d ? 'ab ' + L.fds(e.start) : 'ausgeschieden') + '</span>' : (na ? '<span class="cell-note muted-note">nicht verfügbar</span>' : ''));
          return '<td class="cell' + (d === T ? ' today' : '') + (na || notYet ? ' na' : '') + '" data-emp="' + e.id + '" data-date="' + d + '">' + marker + list.map(chip).join('') + '<button class="cell-add" data-add-date="' + d + '" data-add-emp="' + e.id + '">+</button></td>';
        }).join('') + '</tr>';
    }).join('');

    var html = '<div class="cal-toolbar"><button class="icon-btn" id="w-prev">' + L.icon('chevron-left') + '</button><b>KW ' + L.kw(ws) + '</b><span class="muted">' + L.fds(ws) + '–' + L.fd(L.add(ws, 6)) + '</span><button class="icon-btn" id="w-next">' + L.icon('chevron-right') + '</button>' +
      (off ? '<button class="btn btn-sm" id="w-now">Aktuelle Woche</button>' : '') + '<span class="spacer"></span>' +
      '<span class="pill">' + L.icon('clock', 'tiny') + L.num(cost.hours, 1) + ' h geplant</span>' +
      '<a class="pill" href="#/finanzen" title="Fließt in die Liquiditätsprognose">' + L.icon('euro', 'tiny') + L.eur(cost.total, 0) + ' Personalkosten</a>' +
      '<span class="pill' + (cost.open ? ' warn' : '') + '">' + L.icon('circle-dashed', 'tiny') + cost.open + ' offen</span>' +
      '<span class="pill' + (cost.conflicts ? ' bad' : '') + '">' + L.icon('triangle-alert', 'tiny') + cost.conflicts + ' Konflikte</span></div>';
    html += '<div class="table-wrap plan-wrap"><table class="plan"><thead>' + head + '</thead><tbody>' + openRow + rows + '</tbody></table></div>';
    html += '<p class="muted small plan-legend">' + AREAS.map(function (a) { return '<span class="shift-dot shift-' + AREA_COLOR[a] + '"></span>' + a; }).join(' ') +
      ' · Schichten per Drag &amp; Drop zwischen Personen und Tagen verschieben · Klick zum Bearbeiten · Personalkosten inkl. ' + S.settings.agPct + ' % Arbeitgeberanteil, gesetzliche Pausen abgezogen</p>';

    return {
      title: 'Schichtplan', icon: 'calendar-clock', wide: true,
      actions: '<button class="btn" id="plan-tour">' + L.icon('graduation-cap') + 'Kurze Tour</button><button class="btn" id="copy-w">' + L.icon('copy') + 'Vorwoche übernehmen</button><button class="btn btn-primary" id="add-s">' + L.icon('plus') + 'Schicht</button>',
      html: html,
      mount: function (root, main) {
        root.querySelector('#w-prev').onclick = function () { S.ui.weekOffset = off - 1; L.save(); L.render(); };
        root.querySelector('#w-next').onclick = function () { S.ui.weekOffset = off + 1; L.save(); L.render(); };
        var now = root.querySelector('#w-now'); if (now) now.onclick = function () { S.ui.weekOffset = 0; L.save(); L.render(); };
        main.querySelector('#add-s').onclick = function () { shiftModal(null, { ws: ws }); };
        main.querySelector('#plan-tour').onclick = function () { if (L.tour) L.tour.start('schicht'); };
        if (L.tour) L.tour.auto('schicht');
        main.querySelector('#copy-w').onclick = function () {
          var prev = L.weekShifts(L.add(ws, -7));
          if (!prev.length) return L.toast('Die Vorwoche ist leer', 'warn');
          var n = 0;
          prev.forEach(function (p) {
            var date = L.add(p.date, 7);
            var exists = S.shifts.some(function (x) { return x.date === date && x.start === p.start && x.area === p.area && x.empId === p.empId; });
            if (!exists) { S.shifts.push({ id: L.uid('s'), date: date, start: p.start, end: p.end, area: p.area, empId: p.empId }); n++; }
          });
          L.save(); L.toast(n ? n + ' Schichten aus der Vorwoche übernommen' : 'Alle Schichten der Vorwoche sind schon vorhanden'); L.render();
        };
        root.querySelectorAll('.shift').forEach(function (el) { el.onclick = function () { shiftModal(L.shift(el.dataset.id), { ws: ws }); }; });
        root.querySelectorAll('.cell-add').forEach(function (b) { b.onclick = function (ev) { ev.stopPropagation(); shiftModal(null, { ws: ws, date: b.dataset.addDate, empId: b.dataset.addEmp }); }; });
        L.dnd(root, {
          item: '.shift', zone: '.cell', onDrop: function (id, zone) {
            var s = L.shift(id);
            var emp = zone.dataset.emp || null, date = zone.dataset.date;
            if (s.empId === emp && s.date === date) return;
            s.empId = emp; s.date = date;
            S.swaps.forEach(function (w) { if (w.shiftId === s.id && w.status === 'offen') w.status = 'erledigt'; });
            L.save();
            var c = L.shiftConflict(s);
            if (c) L.toast('Achtung: ' + c, 'warn');
            else L.toast(emp ? 'Schicht an ' + L.emp(emp).first + ' vergeben' : 'Schicht ist jetzt offen');
            L.render();
          }
        });
      }
    };
  }

  /* ---------- Tauschbörse ---------- */
  function candidatesFor(s, exclude) {
    return L.shiftStaff().filter(function (e) {
      if (e.id === exclude) return false;
      return !L.shiftConflict({ date: s.date, start: s.start, end: s.end, empId: e.id, area: s.area });
    });
  }
  function swaps() {
    var S = L.S, T = L.todayIso();
    var list = S.swaps.slice().sort(function (a, b) { return a.status === 'offen' ? -1 : 1; });
    var html = list.length ? '<ul class="swap-list">' + list.map(function (w) {
      var s = L.shift(w.shiftId), from = L.emp(w.from), to = w.to ? L.emp(w.to) : null;
      if (!s) return '';
      var cands = candidatesFor(s, w.from);
      var stTag = { offen: ['Offen', 'yellow'], genehmigt: ['Genehmigt', 'green'], abgelehnt: ['Abgelehnt', 'red'], erledigt: ['Im Plan geändert', 'gray'] }[w.status];
      return '<li class="swap"><div class="swap-shift"><span class="shift shift-' + AREA_COLOR[s.area] + '"><span class="shift-time">' + s.start + '–' + s.end + '</span><span class="shift-area">' + s.area + '</span></span>' +
        '<div><b>' + L.fdl(s.date) + '</b><br><span class="muted small">' + L.rel(s.date) + '</span></div></div>' +
        '<div class="swap-people">' + L.avatar(from) + '<span>' + L.h(from.first) + '</span>' + L.icon('arrow-right', 'tiny') + (to ? L.avatar(to) + '<span>' + L.h(to.first) + '</span>' : '<span class="muted">sucht Ersatz</span>') + '</div>' +
        '<div class="swap-note muted">' + (w.note ? '„' + L.h(w.note) + '“' : '') + '</div>' +
        '<div class="swap-actions">' + L.tag(stTag[0], stTag[1]) +
        (w.status === 'offen' ? (to ? '' : L.select('pick', [['', 'Ersatz wählen …']].concat(cands.map(function (e) { return [e.id, L.name(e) + ' (verfügbar)']; })), '', 'class="sel-sm" data-pick="' + w.id + '"')) +
          '<button class="btn btn-sm" data-no="' + w.id + '">Ablehnen</button><button class="btn btn-sm btn-primary" data-ok="' + w.id + '">Genehmigen</button>' : '') + '</div></li>';
    }).join('') + '</ul>' : L.empty('repeat', 'Keine Tauschanfragen.');

    var open = S.shifts.filter(function (s) { return !s.empId && s.date >= T; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    html += '<h3 class="sub-title">Offene Schichten zum Übernehmen</h3>' + (open.length ? '<ul class="mini-list">' + open.map(function (s) {
      var c = candidatesFor(s, null);
      return '<li><span class="shift shift-' + AREA_COLOR[s.area] + '"><span class="shift-time">' + s.start + '–' + s.end + '</span><span class="shift-area">' + s.area + '</span></span><span>' + L.WD[L.wdIdx(s.date)] + ' ' + L.fds(s.date) + '</span>' +
        '<span class="muted">' + (c.length ? 'verfügbar: ' + c.slice(0, 3).map(function (e) { return e.first; }).join(', ') : 'niemand verfügbar') + '</span>' +
        (c.length ? '<button class="btn btn-sm" data-fill="' + s.id + '" data-emp="' + c[0].id + '">An ' + L.h(c[0].first) + ' vergeben</button>' : '') + '</li>';
    }).join('') + '</ul>' : '<p class="muted">Alle Schichten sind besetzt.</p>');

    return {
      title: 'Tauschbörse', icon: 'repeat',
      desc: 'Mitarbeitende bieten Schichten an oder tauschen untereinander – du gibst frei. Vorschläge berücksichtigen Abwesenheiten, Verfügbarkeiten und Überschneidungen.',
      actions: '<button class="btn btn-primary" id="offer">' + L.icon('plus') + 'Schicht abgeben</button>',
      html: html,
      mount: function (root, main) {
        root.querySelectorAll('[data-ok]').forEach(function (b) {
          b.onclick = function () {
            var w = S.swaps.filter(function (x) { return x.id === b.dataset.ok; })[0], s = L.shift(w.shiftId);
            var pick = root.querySelector('[data-pick="' + w.id + '"]');
            var target = w.to || (pick && pick.value);
            if (!target) { L.toast('Bitte zuerst Ersatz wählen', 'warn'); if (pick) pick.focus(); return; }
            s.empId = target; w.to = target; w.status = 'genehmigt'; L.save();
            L.toast('Schicht an ' + L.emp(target).first + ' übertragen – Schichtplan aktualisiert'); L.render();
          };
        });
        root.querySelectorAll('[data-no]').forEach(function (b) { b.onclick = function () { var w = S.swaps.filter(function (x) { return x.id === b.dataset.no; })[0]; w.status = 'abgelehnt'; L.save(); L.toast('Tausch abgelehnt'); L.render(); }; });
        root.querySelectorAll('[data-fill]').forEach(function (b) { b.onclick = function () { var s = L.shift(b.dataset.fill); s.empId = b.dataset.emp; L.save(); L.toast('Schicht an ' + L.emp(b.dataset.emp).first + ' vergeben'); L.render(); }; });
        main.querySelector('#offer').onclick = function () {
          var future = S.shifts.filter(function (s) { return s.empId && s.date >= L.todayIso(); }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
          L.modal({ title: 'Schicht abgeben', submit: 'Anfrage stellen',
            body: L.field('Schicht', L.select('shift', future.map(function (s) { return [s.id, L.WD[L.wdIdx(s.date)] + ' ' + L.fds(s.date) + ' · ' + s.start + '–' + s.end + ' · ' + s.area + ' · ' + L.emp(s.empId).first]; }), future[0] && future[0].id)) +
              L.field('An Kolleg:in (optional)', L.select('to', [['', 'Jeder, der kann']].concat(L.shiftStaff().map(function (e) { return [e.id, L.name(e)]; })), '')) + L.field('Grund', L.input('note', '')),
            onSubmit: function (d) { var s = L.shift(d.shift); S.swaps.push({ id: L.uid('w'), shiftId: s.id, from: s.empId, to: d.to || null, status: 'offen', note: d.note }); L.save(); L.toast('Tauschanfrage erstellt'); L.render(); } });
        };
      }
    };
  }

  /* ---------- Zeiterfassung ---------- */
  function timeModal() {
    var S = L.S;
    L.modal({
      title: 'Zeit nachtragen', submit: 'Speichern',
      body: '<div class="grid-2">' + L.field('Mitarbeiter', L.select('emp', L.activeEmployees().map(function (e) { return [e.id, L.name(e)]; }), 'e3')) + L.field('Datum', L.input('date', L.todayIso(), 'type="date"')) + '</div>' +
        '<div class="grid-3">' + L.field('Beginn', L.input('start', '09:00', 'type="time"')) + L.field('Ende', L.input('end', '17:00', 'type="time"')) + L.field('Pause (Min.)', L.input('pause', '30', 'type="number" min="0" step="5"')) + '</div>' +
        '<div class="grid-2">' + L.field('Kunde', L.select('cust', [['', 'Intern']].concat(S.customers.filter(function (c) { return c.stage === 'Kunde' || c.stage === 'Verhandlung' || c.stage === 'Angebot'; }).map(function (c) { return [c.id, c.name]; })), '')) +
        L.field('Projekt', L.select('proj', [['', '–']].concat(S.projects.map(function (p) { return [p.id, p.name]; })), '')) + '</div>' + L.check('billable', 'Abrechenbar', true),
      onSubmit: function (d) {
        S.time.push({ id: L.uid('t'), empId: d.emp, date: d.date, start: d.start, end: d.end, pause: Number(d.pause) || 0, customerId: d.cust || null, projectId: d.proj || null, billable: !!d.cust && !!d.billable, billed: false });
        L.save(); L.toast('Zeit erfasst'); L.render();
      }
    });
  }

  function times() {
    var S = L.S, T = L.todayIso();
    var ws = L.weekStart(T);
    var list = S.time.slice().sort(function (a, b) { return (b.date + b.start).localeCompare(a.date + a.start); });
    var weekH = S.time.filter(function (t) { return t.date >= ws; }).reduce(function (s, t) { return s + L.entryHours(t); }, 0);
    var byCust = {};
    L.unbilled().forEach(function (t) { if (t.customerId) byCust[t.customerId] = (byCust[t.customerId] || 0) + L.entryHours(t); });
    var clk = S.clock;

    var clock = '<section class="card card-flat clock"><div class="card-head"><span class="card-title">' + L.icon('timer') + 'Stempeluhr</span>' + (clk ? L.tag('läuft', 'green') : '') + '</div>';
    if (clk) {
      var e = L.emp(clk.empId), c = clk.customerId ? L.cust(clk.customerId) : null;
      clock += '<div class="clock-run"><div class="clock-time" id="clock-time">00:00:00</div><div class="muted">' + L.h(L.name(e)) + (c ? ' · ' + L.h(c.name) : ' · intern') + ' · seit ' + clk.start + ' Uhr</div>' +
        '<button class="btn btn-danger btn-lg" id="clock-stop">' + L.icon('square') + 'Ausstempeln</button></div>';
    } else {
      clock += '<div class="grid-2">' + L.field('Mitarbeiter', L.select('cemp', L.activeEmployees().map(function (e) { return [e.id, L.name(e)]; }), 'e3', 'id="c-emp"')) +
        L.field('Kunde (optional)', L.select('ccust', [['', 'Intern']].concat(S.customers.filter(function (c) { return c.stage === 'Kunde'; }).map(function (c) { return [c.id, c.name]; })), '', 'id="c-cust"')) + '</div>' +
        '<button class="btn btn-primary btn-lg" id="clock-start">' + L.icon('play') + 'Einstempeln</button>';
    }
    clock += '</section>';

    var billing = '<section class="card card-flat"><div class="card-head"><span class="card-title">' + L.icon('receipt') + 'Noch nicht abgerechnet</span><span class="card-meta">Diese Woche erfasst: ' + L.num(weekH, 1) + ' h</span></div>' +
      (Object.keys(byCust).length ? '<ul class="mini-list">' + Object.keys(byCust).map(function (cid) {
        var c = L.cust(cid);
        return '<li><span><b>' + L.h(c.name) + '</b></span><span>' + L.num(byCust[cid], 1) + ' h</span><span class="muted">' + L.eur(byCust[cid] * c.rate, 0) + ' netto</span>' +
          (L.on('finanzen') ? '<button class="btn btn-sm btn-primary" data-bill="' + cid + '">Rechnung erstellen</button>' : '') + '</li>';
      }).join('') + '</ul><p class="muted small">„Rechnung erstellen“ übernimmt die Stunden mit dem Stundensatz des Kunden als Rechnungsentwurf in Finanzen.</p>' : L.empty('circle-check', 'Alle abrechenbaren Stunden sind abgerechnet.')) + '</section>';

    var html = '<div class="split even">' + clock + billing + '</div>';
    html += '<div class="table-wrap"><table class="db"><thead><tr><th>' + L.icon('calendar') + 'Datum</th><th>' + L.icon('user') + 'Mitarbeiter</th><th>' + L.icon('clock') + 'Zeit</th><th class="num">Pause</th><th class="num">Stunden</th><th>' + L.icon('building-2') + 'Kunde / Projekt</th><th>' + L.icon('circle-dot') + 'Status</th><th></th></tr></thead><tbody>' +
      list.map(function (t) {
        var e = L.emp(t.empId), c = t.customerId ? L.cust(t.customerId) : null, p = t.projectId ? L.proj(t.projectId) : null;
        var st = t.billed ? L.tag('Abgerechnet', 'green') : (t.billable ? L.tag('Offen', 'blue') : L.tag('Intern', 'gray'));
        return '<tr><td>' + L.WD[L.wdIdx(t.date)] + ' ' + L.fds(t.date) + '</td><td><span class="person">' + L.avatar(e, 20) + L.h(e.first) + '</span></td><td>' + t.start + '–' + t.end + '</td><td class="num">' + (t.pause || 0) + ' min</td><td class="num">' + L.num(L.entryHours(t), 2) + '</td>' +
          '<td>' + (c ? L.h(c.name) : '<span class="muted">Intern</span>') + (p ? '<br><span class="muted small">' + L.h(p.name) + '</span>' : '') + '</td><td>' + st + '</td>' +
          '<td class="row-actions">' + (!t.billed ? '<button class="icon-btn" data-del="' + t.id + '" aria-label="Löschen">' + L.icon('trash-2') + '</button>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';

    return {
      title: 'Zeiterfassung', icon: 'timer',
      actions: '<button class="btn btn-primary" id="add-t">' + L.icon('plus') + 'Zeit nachtragen</button>',
      html: html,
      mount: function (root, main) {
        main.querySelector('#add-t').onclick = timeModal;
        var start = root.querySelector('#clock-start');
        if (start) start.onclick = function () {
          var n = new Date();
          S.clock = { empId: root.querySelector('#c-emp').value, customerId: root.querySelector('#c-cust').value || null, since: n.getTime(), start: String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0') };
          L.save(); L.toast('Eingestempelt'); L.render();
        };
        var stop = root.querySelector('#clock-stop');
        if (stop) {
          var el = root.querySelector('#clock-time');
          var tick = function () { var s = Math.floor((Date.now() - S.clock.since) / 1000); el.textContent = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(function (x) { return String(x).padStart(2, '0'); }).join(':'); };
          tick(); L.timer = setInterval(tick, 1000);
          stop.onclick = function () {
            var n = new Date(), c = S.clock;
            var end = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0');
            if (end === c.start) end = String(n.getHours()).padStart(2, '0') + ':' + String(Math.min(59, n.getMinutes() + 1)).padStart(2, '0');
            S.time.push({ id: L.uid('t'), empId: c.empId, date: L.todayIso(), start: c.start, end: end, pause: 0, customerId: c.customerId, projectId: null, billable: !!c.customerId, billed: false });
            S.clock = null; L.save(); L.toast('Ausgestempelt – Zeit gespeichert'); L.render();
          };
        }
        root.querySelectorAll('[data-bill]').forEach(function (b) { b.onclick = function () { var inv = L.billCustomer(b.dataset.bill); L.toast('Rechnungsentwurf ' + inv.no + ' erstellt'); L.go('#/finanzen/rechnungen'); setTimeout(function () { L.invoicePreview(inv); }, 60); }; });
        root.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () { S.time = S.time.filter(function (t) { return t.id !== b.dataset.del; }); L.save(); L.toast('Eintrag gelöscht'); L.render(); }; });
      }
    };
  }

  L.views.schichten = function (sub) {
    if (sub === 'tausch') return swaps();
    if (sub === 'zeiten') return times();
    return plan();
  };
})(window.L);
