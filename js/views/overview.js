/* Übersicht – Begrüßung, Heute, Handlungsbedarf, Karten */
(function (L) {
  'use strict';

  function tile(href, icon, label, value, sub, tone) {
    return '<a class="stat" href="' + href + '"><span class="stat-label">' + L.icon(icon) + label + '</span>' +
      '<span class="stat-value">' + value + '</span><span class="stat-sub ' + (tone || '') + '">' + sub + '</span></a>';
  }

  function attention() {
    var S = L.S, T = L.todayIso(), items = [];
    if (L.on('personal')) {
      S.absences.filter(function (a) { return a.status === 'beantragt'; }).forEach(function (a) {
        var e = L.emp(a.empId), n = L.workdays(a.from, a.to);
        var clash = S.shifts.filter(function (s) { return s.empId === a.empId && s.date >= a.from && s.date <= a.to; }).length;
        items.push({ icon: 'plane', text: '<b>' + L.h(L.name(e)) + '</b> beantragt ' + a.type + ' ' + L.fds(a.from) + '–' + L.fds(a.to) + ' (' + n + ' Tag' + (n > 1 ? 'e' : '') + ')' +
          (clash ? ' <span class="hint-warn">' + clash + ' Schicht' + (clash > 1 ? 'en' : '') + ' betroffen</span>' : ''),
          actions: '<button class="btn btn-sm" data-abs-no="' + a.id + '">Ablehnen</button><button class="btn btn-sm btn-primary" data-abs-ok="' + a.id + '">Genehmigen</button>' });
      });
      S.onboarding.filter(function (o) { return o.kind === 'Onboarding'; }).forEach(function (o) {
        var e = L.emp(o.empId), done = o.tasks.filter(function (t) { return t.done; }).length;
        if (done < o.tasks.length) items.push({ icon: 'user-plus', text: 'Onboarding <b>' + L.h(L.name(e)) + '</b>: ' + done + ' von ' + o.tasks.length + ' erledigt, Start ' + L.rel(o.date), actions: '<a class="btn btn-sm" href="#/personal/onboarding">Öffnen</a>' });
      });
    }
    if (L.on('schichten')) {
      S.swaps.filter(function (w) { return w.status === 'offen'; }).forEach(function (w) {
        var s = L.shift(w.shiftId), e = L.emp(w.from);
        if (s) items.push({ icon: 'repeat', text: '<b>' + L.h(e.first) + '</b> möchte die Schicht ' + L.WD[L.wdIdx(s.date)] + ' ' + L.fds(s.date) + ' ' + s.start + '–' + s.end + ' abgeben' + (w.to ? ' an ' + L.h(L.emp(w.to).first) : ''), actions: '<a class="btn btn-sm" href="#/schichten/tausch">Prüfen</a>' });
      });
      var open = S.shifts.filter(function (s) { return !s.empId && s.date >= T && s.date <= L.add(S.anchor, 13); }).length;
      var conf = L.weekShifts(S.anchor).concat(L.weekShifts(L.add(S.anchor, 7))).filter(function (s) { return L.shiftConflict(s); }).length;
      if (open || conf) items.push({ icon: 'calendar-x', text: (open ? '<b>' + open + ' offene Schichten</b>' : '') + (open && conf ? ' und ' : '') + (conf ? '<b class="hint-warn">' + conf + ' Konflikt' + (conf > 1 ? 'e' : '') + '</b>' : '') + ' in den nächsten zwei Wochen', actions: '<a class="btn btn-sm" href="#/schichten/plan">Zum Schichtplan</a>' });
    }
    if (L.on('finanzen')) {
      S.invoices.filter(function (i) { return L.invStatus(i) === 'Überfällig'; }).forEach(function (i) {
        items.push({ icon: 'receipt', text: 'Rechnung <b>' + i.no + '</b> an ' + L.h(L.cust(i.customerId).name) + ' ist seit ' + L.days(i.due, T) + ' Tagen überfällig (' + L.eur(L.invGross(i)) + ')' + (i.reminded ? ' · Erinnerung ' + L.rel(i.reminded) + ' versendet' : ''),
          actions: '<button class="btn btn-sm" data-remind="' + i.id + '">Zahlungserinnerung</button>' });
      });
      var byCust = {};
      L.unbilled().forEach(function (t) { if (t.customerId) byCust[t.customerId] = (byCust[t.customerId] || 0) + L.entryHours(t); });
      Object.keys(byCust).forEach(function (cid) {
        items.push({ icon: 'timer', text: '<b>' + L.num(byCust[cid], 1) + ' h</b> für ' + L.h(L.cust(cid).name) + ' erfasst, aber noch nicht abgerechnet', actions: '<button class="btn btn-sm btn-primary" data-bill="' + cid + '">Rechnung erstellen</button>' });
      });
    }
    if (L.on('verwaltung')) {
      S.deadlines.filter(function (f) { return !f.done && L.days(T, f.date) >= 0 && L.days(T, f.date) <= 14; }).forEach(function (f) {
        items.push({ icon: 'alarm-clock', text: '<b>' + L.h(f.title) + '</b> · ' + L.rel(f.date) + ' (' + L.fd(f.date) + ')', actions: '<a class="btn btn-sm" href="#/verwaltung/fristen">Fristen</a>' });
      });
    }
    return items;
  }

  function orgChart() {
    var emps = L.activeEmployees();
    var lvl1 = emps.filter(function (e) { return !e.manager; });
    var lvl2 = emps.filter(function (e) { return e.manager; });
    var W = 400, H = 200, rootX = W / 2, rootY = 26;
    var pos = {};
    lvl1.forEach(function (e, i) { pos[e.id] = [W * (i + 1) / (lvl1.length + 1), 95]; });
    var ordered = [];
    lvl1.forEach(function (m) { lvl2.forEach(function (e) { if (e.manager === m.id) ordered.push(e); }); });
    ordered.forEach(function (e, i) { pos[e.id] = [18 + i * (W - 36) / Math.max(1, ordered.length - 1), 168]; });
    var s = '';
    lvl1.forEach(function (e) { s += '<line class="edge" x1="' + rootX + '" y1="' + rootY + '" x2="' + pos[e.id][0] + '" y2="' + pos[e.id][1] + '"/>'; });
    ordered.forEach(function (e) { var m = pos[e.manager]; s += '<line class="edge" x1="' + m[0] + '" y1="' + m[1] + '" x2="' + pos[e.id][0] + '" y2="' + pos[e.id][1] + '"/>'; });
    var me = (L.email || 'd').charAt(0).toUpperCase();
    s += '<g class="node lead"><title>Geschäftsführung (du)</title><circle cx="' + rootX + '" cy="' + rootY + '" r="17"/><text x="' + rootX + '" y="' + rootY + '">' + me + '</text></g>';
    lvl1.concat(ordered).forEach(function (e) {
      var p = pos[e.id], r = e.manager ? 14 : 16;
      s += '<a href="#/personal/mitarbeiter/' + e.id + '"><g class="node' + (e.status !== 'aktiv' ? ' dim' : '') + '"><title>' + L.h(L.name(e) + ' – ' + e.role) + '</title><circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + r + '"/><text x="' + p[0] + '" y="' + p[1] + '"' + (e.manager ? ' style="font-size:10px"' : '') + '>' + L.initials(e.first, e.last) + '</text></g></a>';
    });
    return '<svg class="org-chart" viewBox="0 0 ' + W + ' ' + H + '" aria-label="Organigramm">' + s + '</svg>';
  }

  L.views.uebersicht = function () {
    var S = L.S, T = L.todayIso();
    var tiles = [];
    if (L.on('schichten')) {
      var today = S.shifts.filter(function (s) { return s.date === T; });
      var staffed = today.filter(function (s) { return s.empId; });
      tiles.push(tile('#/schichten/plan', 'calendar-clock', 'Heute im Dienst', staffed.length ? staffed.length + (staffed.length === 1 ? ' Person' : ' Personen') : 'Niemand', today.length - staffed.length ? (today.length - staffed.length) + ((today.length - staffed.length) === 1 ? ' Schicht offen' : ' Schichten offen') : (today.length ? 'Alle Schichten besetzt' : 'Keine Schichten geplant'), today.length - staffed.length ? 'warn' : ''));
    }
    if (L.on('personal')) {
      var abs = L.activeEmployees().filter(function (e) { return L.absenceOn(e.id, T); });
      var pend = S.absences.filter(function (a) { return a.status === 'beantragt'; }).length;
      tiles.push(tile('#/personal/abwesenheiten', 'plane', 'Abwesend heute', abs.length ? abs.map(function (e) { return e.first; }).join(', ') : 'Niemand', pend ? pend + (pend === 1 ? ' Antrag offen' : ' Anträge offen') : 'Keine offenen Anträge', pend ? 'warn' : ''));
    }
    if (L.on('finanzen')) {
      var over = S.invoices.filter(function (i) { return L.invStatus(i) === 'Überfällig'; }).length;
      tiles.push(tile('#/finanzen/rechnungen', 'receipt', 'Offene Rechnungen', L.eur(L.openReceivables(), 0), over ? over + ' überfällig' : 'Nichts überfällig', over ? 'bad' : ''));
    }
    if (L.on('verwaltung')) {
      var next = S.deadlines.filter(function (f) { return !f.done && f.date >= T; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0];
      tiles.push(tile('#/verwaltung/fristen', 'alarm-clock', 'Nächste Frist', next ? L.rel(next.date) : '–', next ? L.h(next.title) : 'Keine Fristen', next && L.days(T, next.date) <= 7 ? 'warn' : ''));
    }

    var att = attention();
    var html = '';
    if (tiles.length) html += '<div class="stats">' + tiles.join('') + '</div>';

    html += '<h2 class="section-title">Braucht deine Aufmerksamkeit <span class="count">' + att.length + '</span></h2>';
    html += att.length ? '<ul class="attention">' + att.map(function (a) {
      return '<li>' + L.icon(a.icon) + '<span class="att-text">' + a.text + '</span><span class="att-actions">' + a.actions + '</span></li>';
    }).join('') + '</ul>' : L.empty('party-popper', 'Alles erledigt – nichts Dringendes offen.');

    html += '<h2 class="section-title">Aktuelle Daten</h2><div class="cards">';
    if (L.on('finanzen')) {
      var f = L.forecast();
      html += '<section class="card"><div class="card-head"><a class="card-title" href="#/finanzen">' + L.icon('trending-up') + 'Cashflow</a><span class="card-meta">inkl. 3 Monate Prognose</span></div>' +
        '<div class="kpi">' + L.eur(f.balance, 0) + '</div><div class="kpi-sub">Kontostand · Prognose ' + L.MON[(L.parse(S.cashflow.end).getMonth() + 3) % 12] + ': ' + L.eur(f.forecast[f.forecast.length - 1], 0) + '</div>' +
        '<div class="chart-wrap" id="ov-chart"><svg></svg><div class="chart-tip"></div></div></section>';
    }
    if (L.on('organisation')) {
      var open = S.tasks.filter(function (t) { return !t.done; }).sort(function (a, b) { return (a.due || '9') < (b.due || '9') ? -1 : 1; }).slice(0, 5);
      var doneN = S.tasks.filter(function (t) { return t.done; }).length;
      html += '<section class="card"><div class="card-head"><a class="card-title" href="#/organisation/aufgaben">' + L.icon('square-check-big') + 'Aufgaben</a><span class="card-meta">' + doneN + ' von ' + S.tasks.length + ' erledigt</span></div>' +
        '<ul class="task-list">' + open.map(function (t) {
          var late = t.due && t.due < T;
          return '<li class="task"><input type="checkbox" data-task="' + t.id + '"><span class="task-text">' + L.h(t.title) + '</span><span class="task-due' + (late ? ' late' : '') + '">' + (t.due ? L.rel(t.due) : '') + '</span></li>';
        }).join('') + '</ul><a class="task-add" href="#/organisation/aufgaben">' + L.icon('arrow-right') + 'Alle Aufgaben</a></section>';
    }
    if (L.on('personal')) {
      html += '<section class="card org"><div class="card-head"><a class="card-title" href="#/personal/mitarbeiter">' + L.icon('network') + 'Mitarbeiter</a><span class="card-meta">' + L.activeEmployees().length + ' Personen</span></div>' + orgChart() + '</section>';
    }
    if (L.on('kunden')) {
      var topics = {};
      S.tickets.forEach(function (t) { topics[t.topic] = (topics[t.topic] || 0) + 1; });
      var keys = Object.keys(topics).sort(function (a, b) { return topics[b] - topics[a]; });
      var max = topics[keys[0]] || 1;
      var openT = S.tickets.filter(function (t) { return !t.done; }).length;
      html += '<section class="card"><div class="card-head"><a class="card-title" href="#/kunden/support">' + L.icon('life-buoy') + 'Support-Tickets</a><span class="card-meta">nach Themen · 7 Tage</span></div>' +
        '<ul class="topics">' + keys.map(function (k) { return '<li class="topic"><span>' + L.h(k) + '</span><span class="topic-count">' + topics[k] + '</span><span class="topic-bar"><span style="width:' + (topics[k] / max * 100) + '%"></span></span></li>'; }).join('') + '</ul>' +
        '<div class="ticket-foot"><span><b>' + openT + '</b> offen</span><span><b>' + (S.tickets.length - openT) + '</b> <span class="down">gelöst</span></span></div></section>';
    }
    html += '</div>';

    return {
      title: 'Willkommen zurück bei ' + L.company() + '!',
      pre: '',
      html: html,
      mount: function (root) {
        var ch = root.querySelector('#ov-chart');
        if (ch) { var f = L.forecast(); L.lineChart(ch, f.labels, f.actual, f.forecast); }
        root.querySelectorAll('[data-abs-ok]').forEach(function (b) { b.onclick = function () { L.approveAbsence(b.dataset.absOk, true); L.render(); }; });
        root.querySelectorAll('[data-abs-no]').forEach(function (b) { b.onclick = function () { L.approveAbsence(b.dataset.absNo, false); L.render(); }; });
        root.querySelectorAll('[data-remind]').forEach(function (b) { b.onclick = function () { L.remind(b.dataset.remind); }; });
        root.querySelectorAll('[data-bill]').forEach(function (b) {
          b.onclick = function () { var inv = L.billCustomer(b.dataset.bill); L.toast('Rechnungsentwurf ' + inv.no + ' aus der Zeiterfassung erstellt'); L.go('#/finanzen/rechnungen'); };
        });
        root.querySelectorAll('[data-task]').forEach(function (c) {
          c.onchange = function () { var t = L.S.tasks.filter(function (x) { return x.id === c.dataset.task; })[0]; t.done = c.checked; L.save(); L.toast('Aufgabe erledigt'); setTimeout(L.render, 350); };
        });
      }
    };
  };
})(window.L);
