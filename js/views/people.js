/* Personal – Mitarbeiter, Personalakte, Abwesenheiten, On-/Offboarding, Recruiting */
(function (L) {
  'use strict';

  var TYPE_COLOR = { Vollzeit: 'blue', Teilzeit: 'purple', Minijob: 'orange', Werkstudent: 'yellow', Aushilfe: 'gray' };
  var STATUS_TAG = { aktiv: ['Aktiv', 'green'], onboarding: ['Onboarding', 'blue'], offboarding: ['Offboarding', 'orange'], ausgetreten: ['Ausgetreten', 'gray'] };
  var ABS_COLOR = { Urlaub: 'blue', Krank: 'red', Weiterbildung: 'purple', Sonderurlaub: 'green' };
  var DEPTS = ['Küche', 'Service', 'Events', 'Logistik', 'Verwaltung'];
  var COLORS = ['#2f8f8a', '#c77a2e', '#6b5bb5', '#3f7fbf', '#c2507a', '#4d8f6a', '#b8962e', '#5f7482', '#9a6b4f'];

  var ONBOARD_TASKS = ['Arbeitsvertrag unterschrieben zurück', 'Personalfragebogen & Steuer-ID erhalten', 'Sozialversicherungsnummer & Krankenkasse erfasst', 'Belehrung nach § 43 IfSG (Gesundheitsamt)', 'Arbeitskleidung bestellt', 'Zugang zu Lincom & Schichtplan eingerichtet', 'Einarbeitung in der ersten Woche geplant'];
  var OFFBOARD_TASKS = ['Kündigung / Aufhebung dokumentiert', 'Resturlaub geklärt', 'Arbeitszeugnis erstellt', 'Schlüssel, Kleidung & Geräte zurückerhalten', 'Zugänge deaktiviert', 'Abmeldung bei der Krankenkasse bzw. Minijob-Zentrale'];

  /* ---------- Mitarbeiter anlegen (Verknüpfung: Vertrag + Onboarding) ---------- */
  L.addEmployee = function (pre) {
    pre = pre || {};
    L.modal({
      title: 'Mitarbeiter hinzufügen', wide: true, submit: 'Anlegen',
      body: '<div class="grid-2">' + L.field('Vorname', L.input('first', pre.first, 'required')) + L.field('Nachname', L.input('last', pre.last, 'required')) + '</div>' +
        '<div class="grid-2">' + L.field('Rolle', L.input('role', pre.role, 'required placeholder="z. B. Servicekraft"')) + L.field('Bereich', L.select('dept', DEPTS, pre.dept || 'Service')) + '</div>' +
        '<div class="grid-3">' + L.field('Vertragsart', L.select('type', ['Vollzeit', 'Teilzeit', 'Minijob', 'Werkstudent', 'Aushilfe'], pre.type || 'Teilzeit')) +
        L.field('Std. / Woche', L.input('hours', pre.hours || 25, 'type="number" min="1" max="48"')) + L.field('Stundenlohn (€)', L.input('rate', pre.rate || 14.5, 'type="number" min="0" step="0.1"')) + '</div>' +
        '<div class="grid-2">' + L.field('Eintritt', L.input('start', pre.start || L.add(L.anchorWeek(), 14), 'type="date"')) + L.field('E-Mail', L.input('email', '', 'type="email"')) + '</div>' +
        '<div class="link-box">' + L.icon('link') + '<div><b>Automatisch mit anlegen</b>' +
        L.check('contract', 'Arbeitsvertrag aus Vorlage erstellen (Personalakte)', true) +
        L.check('onboard', 'Onboarding-Checkliste und Aufgaben anlegen', true) +
        L.check('shift', 'Im Schichtplan als planbar aufnehmen', true) + '</div></div>',
      onSubmit: function (d) {
        var e = {
          id: L.uid('e'), first: d.first, last: d.last, role: d.role, dept: d.dept, type: d.type, hoursWeek: Number(d.hours) || 20,
          rate: Number(d.rate) || 14, vacation: d.type === 'Vollzeit' ? 28 : 24, start: d.start, email: d.email, phone: '',
          manager: d.dept === 'Küche' || d.dept === 'Logistik' ? 'e2' : (d.dept === 'Verwaltung' ? null : 'e3'),
          color: COLORS[L.S.employees.length % COLORS.length], status: 'onboarding'
        };
        if (!L.emp(e.manager)) e.manager = null;
        L.S.employees.push(e);
        var made = [];
        if (d.contract) { L.S.docs.push({ id: L.uid('d'), empId: e.id, name: 'Arbeitsvertrag (' + d.type + ')', cat: 'Vertrag', date: d.start, status: 'Entwurf aus Vorlage' }); made.push('Arbeitsvertrag'); }
        if (d.onboard) {
          L.S.onboarding.push({ id: L.uid('o'), empId: e.id, kind: 'Onboarding', date: d.start, tasks: ONBOARD_TASKS.map(function (t) { return { t: t, done: false }; }) });
          var pid = L.uid('p');
          L.S.projects.push({ id: pid, name: 'Onboarding ' + e.first, customerId: null, status: 'Läuft', due: d.start });
          L.S.tasks.push({ id: L.uid('k'), title: 'Arbeitsvertrag an ' + e.first + ' senden', done: false, prio: 'Hoch', due: L.add(L.todayIso(), 2), projectId: pid, owner: L.myEmpId || (L.emp('e1') ? 'e1' : null) });
          made.push('Onboarding');
        }
        if (!d.shift) L.S.availability[e.id] = [0, 1, 2, 3, 4, 5, 6];
        if (pre.candidateId) { var cand = L.S.candidates.filter(function (c) { return c.id === pre.candidateId; })[0]; if (cand) { cand.stage = 'Eingestellt'; cand.empId = e.id; } }
        L.save();
        L.toast(L.name(e) + ' angelegt' + (made.length ? ' – ' + made.join(' & ') + ' erstellt' : ''));
        L.go('#/personal/mitarbeiter/' + e.id);
      }
    });
  };

  function editEmployee(e) {
    L.modal({
      title: L.name(e) + ' bearbeiten', wide: true,
      body: '<div class="grid-2">' + L.field('Rolle', L.input('role', e.role)) + L.field('Bereich', L.select('dept', DEPTS, e.dept)) + '</div>' +
        '<div class="grid-3">' + L.field('Vertragsart', L.select('type', ['Vollzeit', 'Teilzeit', 'Minijob', 'Werkstudent', 'Aushilfe'], e.type)) + L.field('Std. / Woche', L.input('hours', e.hoursWeek, 'type="number"')) + L.field('Stundenlohn (€)', L.input('rate', e.rate, 'type="number" step="0.1"')) + '</div>' +
        '<div class="grid-2">' + L.field('Urlaubsanspruch (Tage)', L.input('vac', e.vacation, 'type="number"')) + L.field('Telefon', L.input('phone', e.phone)) + '</div>' +
        '<div class="field"><span class="field-label">Nicht verfügbar an</span><div class="day-picks">' + L.WD.map(function (w, i) {
          return '<label class="day-pick"><input type="checkbox" name="na' + i + '"' + ((L.S.availability[e.id] || []).indexOf(i) !== -1 ? ' checked' : '') + '><span>' + w + '</span></label>';
        }).join('') + '</div></div>',
      onSubmit: function (d) {
        e.role = d.role; e.dept = d.dept; e.type = d.type; e.hoursWeek = Number(d.hours); e.rate = Number(d.rate); e.vacation = Number(d.vac); e.phone = d.phone;
        L.S.availability[e.id] = [0, 1, 2, 3, 4, 5, 6].filter(function (i) { return d['na' + i]; });
        L.save(); L.toast('Gespeichert'); L.render();
      }
    });
  }

  function startOffboarding(e) {
    L.modal({
      title: 'Offboarding für ' + L.name(e), submit: 'Offboarding starten',
      body: L.field('Letzter Arbeitstag', L.input('end', L.iso(new Date(L.today().getFullYear(), L.today().getMonth() + 2, 0)), 'type="date" required')) +
        '<p class="muted small">Legt eine Offboarding-Checkliste an. Schichten nach dem letzten Arbeitstag werden im Schichtplan als Konflikt markiert.</p>',
      onSubmit: function (d) {
        e.status = 'offboarding'; e.end = d.end;
        L.S.onboarding.push({ id: L.uid('o'), empId: e.id, kind: 'Offboarding', date: d.end, tasks: OFFBOARD_TASKS.map(function (t) { return { t: t, done: false }; }) });
        L.save(); L.toast('Offboarding für ' + e.first + ' gestartet'); L.go('#/personal/onboarding');
      }
    });
  }

  L.newAbsence = function (pre) {
    pre = pre || {};
    var emps = L.activeEmployees().map(function (e) { return [e.id, L.name(e)]; });
    L.modal({
      title: 'Abwesenheit eintragen', submit: 'Eintragen',
      body: '<div class="grid-2">' + L.field('Mitarbeiter', L.select('emp', emps, pre.empId || emps[0][0])) + L.field('Art', L.select('type', ['Urlaub', 'Krank', 'Weiterbildung', 'Sonderurlaub'], 'Urlaub')) + '</div>' +
        '<div id="abs-rp"></div><div class="rp-legend"><span><i style="background:#d9730d"></i>Schichten der Person</span><span><i style="background:#9065b0"></i>schon eingetragen</span></div>' +
        L.field('Notiz', L.input('note', '')) + L.check('approve', 'Direkt genehmigen', false) +
        '<p class="muted small">Krankmeldungen werden ohne Genehmigung eingetragen. Betroffene Schichten erscheinen im Schichtplan als Konflikt.</p>',
      onMount: function (f) {
        var sel = f.querySelector('select[name=emp]');
        var rp = L.rangePicker(f.querySelector('#abs-rp'), {
          from: pre.from || L.add(L.todayIso(), 7), to: pre.to || L.add(L.todayIso(), 9), quick: L.quickRanges(),
          marks: function (d) {
            var id = sel.value;
            if (L.S.absences.some(function (a) { return a.empId === id && a.status !== 'abgelehnt' && a.from <= d && a.to >= d; })) return 'absence';
            return L.S.shifts.some(function (s) { return s.empId === id && s.date === d; }) ? 'shift' : null;
          }
        });
        sel.addEventListener('change', rp.redraw);
      },
      onSubmit: function (d) {
        if (d.to < d.from) { L.toast('„Bis“ liegt vor „Von“', 'warn'); return false; }
        var a = { id: L.uid('a'), empId: d.emp, type: d.type, from: d.from, to: d.to, note: d.note, status: d.type === 'Krank' ? 'gemeldet' : (d.approve ? 'genehmigt' : 'beantragt') };
        L.S.absences.push(a); L.save();
        var clash = L.S.shifts.filter(function (s) { return s.empId === a.empId && s.date >= a.from && s.date <= a.to; }).length;
        L.toast(a.type + ' eingetragen' + (a.status === 'beantragt' ? ' – wartet auf Genehmigung' : ''));
        if (clash && a.status !== 'beantragt') setTimeout(function () { L.toast(clash + ' Schicht(en) betroffen – bitte im Schichtplan neu besetzen', 'warn'); }, 400);
        L.render();
      }
    });
  };

  /* ---------- Mitarbeiterliste ---------- */
  function employees() {
    var S = L.S, emps = S.employees.slice().sort(function (a, b) { return DEPTS.indexOf(a.dept) - DEPTS.indexOf(b.dept) || a.last.localeCompare(b.last); });
    var total = emps.filter(function (e) { return e.status !== 'ausgetreten'; });
    var html = '<div class="stats small">' +
      '<div class="stat"><span class="stat-label">' + L.icon('users') + 'Mitarbeitende</span><span class="stat-value">' + total.length + '</span><span class="stat-sub">' + total.filter(function (e) { return e.type === 'Vollzeit'; }).length + ' Vollzeit · ' + total.filter(function (e) { return e.type !== 'Vollzeit'; }).length + ' Teilzeit/Minijob</span></div>' +
      '<div class="stat"><span class="stat-label">' + L.icon('clock') + 'Vertragsstunden / Woche</span><span class="stat-value">' + total.reduce(function (s, e) { return s + e.hoursWeek; }, 0) + ' h</span><span class="stat-sub">laut Arbeitsverträgen</span></div>' +
      '<a class="stat" href="#/personal/abwesenheiten"><span class="stat-label">' + L.icon('plane') + 'Heute abwesend</span><span class="stat-value">' + total.filter(function (e) { return L.absenceOn(e.id, L.todayIso()); }).length + '</span><span class="stat-sub">' + (function (n) { return n + (n === 1 ? ' Antrag offen' : ' Anträge offen'); })(S.absences.filter(function (a) { return a.status === 'beantragt'; }).length) + '</span></a>' +
      '</div>';
    html += '<div class="table-wrap"><table class="db"><thead><tr><th>' + L.icon('user') + 'Name</th><th>' + L.icon('briefcase') + 'Rolle</th><th>' + L.icon('layers') + 'Bereich</th><th>' + L.icon('file-signature') + 'Vertrag</th><th>' + L.icon('calendar') + 'Eintritt</th><th>' + L.icon('plane') + 'Urlaub</th><th>' + L.icon('circle-dot') + 'Status</th></tr></thead><tbody>' +
      emps.map(function (e) {
        var v = L.vacation(e), st = STATUS_TAG[e.status] || STATUS_TAG.aktiv;
        var abs = L.absenceOn(e.id, L.todayIso());
        return '<tr class="row-link" data-e="' + e.id + '"><td><span class="person">' + L.avatar(e) + '<b>' + L.h(L.name(e)) + '</b>' + (abs ? ' ' + L.tag(abs.type, ABS_COLOR[abs.type]) : '') + '</span></td><td>' + L.h(e.role) + '</td><td>' + L.h(e.dept) + '</td>' +
          '<td>' + L.tag(e.type, TYPE_COLOR[e.type]) + ' <span class="muted">' + e.hoursWeek + ' h</span></td><td>' + L.fd(e.start) + '</td>' +
          '<td><span class="vac">' + L.progress(v.used + v.planned, v.entitled) + '<span class="muted">' + v.rest + ' frei</span></span></td><td>' + L.tag(st[0], st[1]) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    return {
      title: 'Personal', icon: 'users',
      actions: '<button class="btn" id="add-abs">' + L.icon('plane') + 'Abwesenheit</button><button class="btn btn-primary" id="add-e">' + L.icon('user-plus') + 'Mitarbeiter hinzufügen</button>',
      html: html,
      mount: function (root, main) {
        main.querySelector('#add-e').onclick = function () { L.addEmployee(); };
        main.querySelector('#add-abs').onclick = function () { L.newAbsence(); };
        root.querySelectorAll('[data-e]').forEach(function (r) { r.onclick = function () { L.go('#/personal/mitarbeiter/' + r.dataset.e); }; });
      }
    };
  }

  /* ---------- Personalakte ---------- */
  function profile(id) {
    var S = L.S, e = L.emp(id);
    if (!e) return employees();
    var v = L.vacation(e), st = STATUS_TAG[e.status] || STATUS_TAG.aktiv, T = L.todayIso();
    var mgr = e.manager ? L.emp(e.manager) : null;
    var docs = S.docs.filter(function (d) { return d.empId === id; });
    var needsIfsg = ['Küche', 'Service', 'Events'].indexOf(e.dept) !== -1 && !docs.some(function (d) { return d.name.indexOf('IfSG') !== -1; });
    var shifts = S.shifts.filter(function (s) { return s.empId === id && s.date >= T; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }).slice(0, 6);
    var absList = S.absences.filter(function (a) { return a.empId === id; }).sort(function (a, b) { return a.from < b.from ? 1 : -1; });
    var ob = S.onboarding.filter(function (o) { return o.empId === id; });
    var wk = L.weekCost(S.anchor).byEmp[id] || 0;

    var html = '<div class="profile-head">' + L.avatar(e, 56) + '<div><div class="profile-name">' + L.h(L.name(e)) + '</div><div class="muted">' + L.h(e.role) + ' · ' + L.h(e.dept) + '</div></div>' + L.tag(st[0], st[1]) + '</div>';
    html += '<div class="props">' +
      L.prop('file-signature', 'Vertragsart', L.tag(e.type, TYPE_COLOR[e.type])) + L.prop('clock', 'Wochenstunden', e.hoursWeek + ' h' + (L.on('schichten') ? ' <span class="muted">· KW ' + L.kw(S.anchor) + ' geplant: ' + L.num(wk, 1) + ' h</span>' : '')) +
      L.prop('euro', 'Stundenlohn', L.eur(e.rate)) + L.prop('calendar', 'Eintritt', L.fd(e.start) + (e.end ? ' · Austritt ' + L.fd(e.end) : '')) +
      L.prop('user-round', 'Vorgesetzt', mgr ? L.h(L.name(mgr)) : 'Geschäftsführung') + L.prop('mail', 'E-Mail', L.h(e.email || '–')) +
      L.prop('phone', 'Telefon', L.h(e.phone || '–')) + L.prop('calendar-off', 'Nicht verfügbar', (S.availability[id] || []).map(function (i) { return L.WD[i]; }).join(', ') || '–') + '</div>';

    if (needsIfsg) html += '<div class="callout warn">' + L.icon('triangle-alert') + '<span>Für die Arbeit mit Lebensmitteln fehlt noch der Nachweis der <b>Belehrung nach § 43 IfSG</b>.</span><button class="btn btn-sm" id="add-ifsg">Nachweis hinterlegen</button></div>';

    html += '<div class="split even">';
    html += '<section class="card card-flat"><div class="card-head"><span class="card-title">' + L.icon('plane') + 'Urlaub ' + L.today().getFullYear() + '</span><button class="btn btn-sm" id="req-abs">Eintragen</button></div>' +
      '<div class="vac-big"><div><b>' + v.entitled + '</b><span>Anspruch</span></div><div><b>' + v.used + '</b><span>genommen</span></div><div><b>' + v.planned + '</b><span>geplant</span></div><div><b class="' + (v.rest < 0 ? 'neg' : '') + '">' + v.rest + '</b><span>frei</span></div></div>' +
      (absList.length ? '<ul class="mini-list">' + absList.slice(0, 5).map(function (a) { return '<li>' + L.tag(a.type, ABS_COLOR[a.type]) + '<span>' + L.fds(a.from) + '–' + L.fds(a.to) + '</span><span class="muted">' + a.status + '</span></li>'; }).join('') + '</ul>' : '<p class="muted">Keine Abwesenheiten.</p>') + '</section>';
    html += '<section class="card card-flat"><div class="card-head"><span class="card-title">' + L.icon('folder') + 'Dokumente</span><button class="btn btn-sm" id="add-doc">Hinzufügen</button></div>' +
      (docs.length ? '<ul class="mini-list">' + docs.map(function (d) { return '<li>' + L.icon('file-text') + '<span>' + L.h(d.name) + '</span><span class="muted">' + L.fd(d.date) + '</span>' + L.tag(d.status, d.status.indexOf('Entwurf') !== -1 ? 'yellow' : 'green') + '</li>'; }).join('') + '</ul>' : '<p class="muted">Noch keine Dokumente.</p>') + '</section>';
    html += '</div>';

    if (L.on('schichten') && e.dept !== 'Verwaltung') {
      html += '<h3 class="sub-title">Nächste Schichten</h3>' + (shifts.length ? '<ul class="mini-list">' + shifts.map(function (s) {
        var c = L.shiftConflict(s);
        return '<li>' + L.icon('calendar-clock') + '<span>' + L.WD[L.wdIdx(s.date)] + ' ' + L.fds(s.date) + '</span><span>' + s.start + '–' + s.end + '</span>' + L.tag(s.area, 'gray') + (c ? '<span class="hint-warn">' + L.h(c) + '</span>' : '') + '</li>';
      }).join('') + '</ul>' : '<p class="muted">Keine geplanten Schichten.</p>');
    }
    if (ob.length) html += '<h3 class="sub-title">' + ob[0].kind + '</h3><p>' + ob[0].tasks.filter(function (t) { return t.done; }).length + ' von ' + ob[0].tasks.length + ' Schritten erledigt · <a href="#/personal/onboarding">Checkliste öffnen</a></p>';

    return {
      title: L.name(e), icon: 'contact', crumb: L.name(e), noTabs: true,
      actions: '<button class="btn" id="edit-e">' + L.icon('pencil') + 'Bearbeiten</button>' + (e.status === 'aktiv' ? '<button class="btn" id="off-e">' + L.icon('log-out') + 'Offboarding</button>' : ''),
      html: html, noHead: true,
      pre: '<div class="page-actions standalone"><a class="btn btn-ghost" href="#/personal/mitarbeiter">' + L.icon('arrow-left') + 'Alle Mitarbeiter</a><span class="spacer"></span><button class="btn" id="edit-e">' + L.icon('pencil') + 'Bearbeiten</button>' + (e.status === 'aktiv' ? '<button class="btn" id="off-e">' + L.icon('log-out') + 'Offboarding</button>' : '') + '</div>',
      mount: function (root, main) {
        main.querySelector('#edit-e').onclick = function () { editEmployee(e); };
        var off = main.querySelector('#off-e'); if (off) off.onclick = function () { startOffboarding(e); };
        root.querySelector('#req-abs').onclick = function () { L.newAbsence({ empId: id }); };
        root.querySelector('#add-doc').onclick = function () {
          L.modal({ title: 'Dokument hinzufügen', submit: 'Hinzufügen', body: L.field('Name', L.input('name', '', 'required placeholder="z. B. Gesundheitszeugnis"')) + L.field('Kategorie', L.select('cat', ['Vertrag', 'Nachweis', 'Personal', 'Sonstiges'], 'Nachweis')) + '<p class="muted small">Datei-Upload folgt mit der echten Datenbank – in der Demo wird nur der Eintrag angelegt.</p>',
            onSubmit: function (d) { S.docs.push({ id: L.uid('d'), empId: id, name: d.name, cat: d.cat, date: L.todayIso(), status: 'Vorhanden' }); L.save(); L.toast('Dokument hinzugefügt'); L.render(); } });
        };
        var ifsg = root.querySelector('#add-ifsg');
        if (ifsg) ifsg.onclick = function () { L.addIfsg(id); L.render(); };
      }
    };
  }

  /* IfSG-Nachweis: Personalakte + Onboarding + Pflichten-Check + Aufgabe */
  L.addIfsg = function (empId) {
    var S = L.S;
    if (!S.docs.some(function (d) { return d.empId === empId && d.name.indexOf('IfSG') !== -1; })) {
      S.docs.push({ id: L.uid('d'), empId: empId, name: 'Belehrung nach § 43 IfSG', cat: 'Nachweis', date: L.todayIso(), status: 'Vorhanden' });
    }
    S.onboarding.forEach(function (o) { if (o.empId === empId) o.tasks.forEach(function (t) { if (t.t.indexOf('IfSG') !== -1) t.done = true; }); });
    var e = L.emp(empId);
    S.tasks.forEach(function (t) { if (t.title.indexOf('IfSG') !== -1 && t.title.indexOf(e.first) !== -1) t.done = true; });
    L.save();
    L.toast('IfSG-Nachweis für ' + e.first + ' hinterlegt – Onboarding, Aufgaben & Pflichten-Check aktualisiert');
  };

  /* ---------- Abwesenheiten ---------- */
  function absences() {
    var S = L.S, T = L.todayIso();
    var m = S.ui.absMonth || T.slice(0, 7) + '-01';
    var first = L.parse(m), y = first.getFullYear(), mo = first.getMonth();
    var nDays = new Date(y, mo + 1, 0).getDate();
    var days = []; for (var d = 1; d <= nDays; d++) days.push(L.iso(new Date(y, mo, d)));
    var emps = L.activeEmployees();
    var head = '<tr><th class="cal-name">Mitarbeiter</th>' + days.map(function (dd) {
      var wd = L.wdIdx(dd);
      return '<th class="' + (wd >= 5 ? 'we' : '') + (dd === T ? ' today' : '') + '"><span>' + L.WD[wd].charAt(0) + '</span>' + L.parse(dd).getDate() + '</th>';
    }).join('') + '</tr>';
    var body = emps.map(function (e) {
      return '<tr><td class="cal-name"><span class="person">' + L.avatar(e, 20) + L.h(e.first + ' ' + e.last.charAt(0) + '.') + '</span></td>' + days.map(function (dd) {
        var a = S.absences.filter(function (x) { return x.empId === e.id && x.from <= dd && x.to >= dd && x.status !== 'abgelehnt'; })[0];
        var wd = L.wdIdx(dd), cls = (wd >= 5 ? 'we' : '') + (dd === T ? ' today' : '');
        if (!a) return '<td class="' + cls + '"></td>';
        return '<td class="' + cls + '"><span class="abs abs-' + ABS_COLOR[a.type] + (a.status === 'beantragt' ? ' pending' : '') + '" title="' + L.h(a.type + ' · ' + a.status + (a.note ? ' · ' + a.note : '')) + '">' + a.type.charAt(0) + '</span></td>';
      }).join('') + '</tr>';
    }).join('');
    var pending = S.absences.filter(function (a) { return a.status === 'beantragt'; });
    var upcoming = S.absences.filter(function (a) { return a.to >= T && a.status !== 'abgelehnt' && a.status !== 'beantragt'; }).sort(function (a, b) { return a.from < b.from ? -1 : 1; });

    var html = '<div class="cal-toolbar"><button class="icon-btn" id="m-prev">' + L.icon('chevron-left') + '</button><b>' + L.MONTHS[mo] + ' ' + y + '</b><button class="icon-btn" id="m-next">' + L.icon('chevron-right') + '</button>' +
      '<button class="btn btn-sm" id="m-today">Heute</button><span class="spacer"></span>' +
      '<span class="legend">' + ['Urlaub', 'Krank', 'Weiterbildung'].map(function (t) { return '<span><span class="abs abs-' + ABS_COLOR[t] + '"></span>' + t + '</span>'; }).join('') + '<span><span class="abs abs-blue pending"></span>beantragt</span></span></div>';
    html += '<div class="table-wrap"><table class="cal">' + '<thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
    html += '<div class="split even">';
    html += '<section class="card card-flat"><div class="card-head"><span class="card-title">' + L.icon('inbox') + 'Offene Anträge</span><span class="card-meta">' + pending.length + '</span></div>' +
      (pending.length ? '<ul class="req-list">' + pending.map(function (a) {
        var e = L.emp(a.empId), n = L.workdays(a.from, a.to), v = L.vacation(e);
        var clash = S.shifts.filter(function (s) { return s.empId === a.empId && s.date >= a.from && s.date <= a.to; }).length;
        return '<li><div class="person">' + L.avatar(e) + '<b>' + L.h(L.name(e)) + '</b></div><div class="req-meta">' + L.tag(a.type, ABS_COLOR[a.type]) + ' ' + L.fds(a.from) + '–' + L.fds(a.to) + ' · ' + n + ' Arbeitstag' + (n > 1 ? 'e' : '') +
          (a.type === 'Urlaub' ? ' · danach ' + (v.rest) + ' frei' : '') + (a.note ? ' · „' + L.h(a.note) + '“' : '') + (clash ? '<br><span class="hint-warn">' + L.icon('triangle-alert', 'tiny') + clash + ' geplante Schicht' + (clash > 1 ? 'en' : '') + ' im Zeitraum</span>' : '') + '</div>' +
          '<div class="req-actions"><button class="btn btn-sm" data-no="' + a.id + '">Ablehnen</button><button class="btn btn-sm btn-primary" data-ok="' + a.id + '">Genehmigen</button></div></li>';
      }).join('') + '</ul>' : L.empty('check', 'Keine offenen Anträge.')) + '</section>';
    html += '<section class="card card-flat"><div class="card-head"><span class="card-title">' + L.icon('calendar-range') + 'Demnächst abwesend</span></div>' +
      (upcoming.length ? '<ul class="mini-list">' + upcoming.map(function (a) { var e = L.emp(a.empId); return '<li>' + L.avatar(e, 20) + '<span>' + L.h(e.first) + '</span>' + L.tag(a.type, ABS_COLOR[a.type]) + '<span class="muted">' + L.fds(a.from) + '–' + L.fds(a.to) + '</span></li>'; }).join('') + '</ul>' : L.empty('sun', 'Niemand abwesend.')) + '</section>';
    html += '</div>';

    return {
      title: 'Abwesenheiten', icon: 'plane', wide: true,
      actions: '<button class="btn btn-primary" id="add-abs">' + L.icon('plus') + 'Abwesenheit eintragen</button>',
      html: html,
      mount: function (root, main) {
        main.querySelector('#add-abs').onclick = function () { L.newAbsence(); };
        root.querySelector('#m-prev').onclick = function () { S.ui.absMonth = L.addMonths(m, -1); L.save(); L.render(); };
        root.querySelector('#m-next').onclick = function () { S.ui.absMonth = L.addMonths(m, 1); L.save(); L.render(); };
        root.querySelector('#m-today').onclick = function () { S.ui.absMonth = null; L.save(); L.render(); };
        root.querySelectorAll('[data-ok]').forEach(function (b) { b.onclick = function () { L.approveAbsence(b.dataset.ok, true); L.render(); }; });
        root.querySelectorAll('[data-no]').forEach(function (b) { b.onclick = function () { L.approveAbsence(b.dataset.no, false); L.render(); }; });
      }
    };
  }

  /* ---------- On- & Offboarding ---------- */
  function onboarding() {
    var S = L.S;
    var procs = S.onboarding.slice().sort(function (a, b) { return a.kind < b.kind ? -1 : 1; });
    var html = procs.length ? '<div class="ob-grid">' + procs.map(function (o) {
      var e = L.emp(o.empId), done = o.tasks.filter(function (t) { return t.done; }).length;
      var fin = done === o.tasks.length;
      return '<section class="card card-flat ob"><div class="card-head"><span class="person">' + L.avatar(e, 28) + '<span><b>' + L.h(L.name(e)) + '</b><br><span class="muted small">' + L.h(e.role) + '</span></span></span>' + L.tag(o.kind, o.kind === 'Onboarding' ? 'blue' : 'orange') + '</div>' +
        '<div class="ob-meta">' + (o.kind === 'Onboarding' ? 'Erster Arbeitstag' : 'Letzter Arbeitstag') + ': <b>' + (o.date ? L.fd(o.date) + '</b> (' + L.rel(o.date) + ')' : '–</b>') + '</div>' +
        '<div class="ob-progress">' + L.progress(done, o.tasks.length) + '<span class="muted small">' + done + '/' + o.tasks.length + '</span></div>' +
        '<ul class="checklist">' + o.tasks.map(function (t, i) {
          return '<li><label><input type="checkbox" data-o="' + o.id + '" data-i="' + i + '"' + (t.done ? ' checked' : '') + '><span' + (t.done ? ' class="done"' : '') + '>' + L.h(t.t) + '</span></label></li>';
        }).join('') + '</ul>' + (fin ? '<div class="callout ok">' + L.icon('circle-check') + '<span>Alle Schritte erledigt.</span>' + (o.kind === 'Onboarding' && e.status === 'onboarding' ? '<button class="btn btn-sm btn-primary" data-activate="' + e.id + '">Als aktiv markieren</button>' : '') + (o.kind === 'Offboarding' && e.status !== 'ausgetreten' ? '<button class="btn btn-sm" data-leave="' + e.id + '">Austritt abschließen</button>' : '') + '</div>' : '') +
        '</section>';
    }).join('') + '</div>' : L.empty('user-plus', 'Keine laufenden On- oder Offboardings.');
    return {
      title: 'On- & Offboarding', icon: 'user-plus',
      actions: '<button class="btn" id="off-any">' + L.icon('log-out') + 'Offboarding starten</button><button class="btn btn-primary" id="add-e">' + L.icon('user-plus') + 'Neue Einstellung</button>',
      html: html,
      mount: function (root, main) {
        main.querySelector('#add-e').onclick = function () { L.addEmployee(); };
        main.querySelector('#off-any').onclick = function () {
          var act = L.S.employees.filter(function (e) { return e.status === 'aktiv'; });
          L.modal({ title: 'Offboarding starten', submit: 'Weiter', body: L.field('Mitarbeiter', L.select('emp', act.map(function (e) { return [e.id, L.name(e)]; }), act[0].id)),
            onSubmit: function (d) { setTimeout(function () { startOffboarding(L.emp(d.emp)); }, 10); } });
        };
        root.querySelectorAll('[data-o]').forEach(function (c) {
          c.onchange = function () {
            var o = S.onboarding.filter(function (x) { return x.id === c.dataset.o; })[0], t = o.tasks[Number(c.dataset.i)];
            t.done = c.checked;
            if (c.checked && t.t.indexOf('IfSG') !== -1) { L.save(); L.addIfsg(o.empId); }
            else { L.save(); if (c.checked) L.toast('Erledigt: ' + t.t); }
            L.render();
          };
        });
        root.querySelectorAll('[data-activate]').forEach(function (b) { b.onclick = function () { var e = L.emp(b.dataset.activate); e.status = 'aktiv'; S.docs.forEach(function (d) { if (d.empId === e.id && d.status.indexOf('Entwurf') !== -1) d.status = 'Unterschrieben'; }); S.onboarding = S.onboarding.filter(function (o) { return !(o.empId === e.id && o.kind === 'Onboarding'); }); L.save(); L.toast(e.first + ' ist jetzt aktiv'); L.render(); }; });
        root.querySelectorAll('[data-leave]').forEach(function (b) { b.onclick = function () { var e = L.emp(b.dataset.leave); e.status = 'ausgetreten'; S.onboarding = S.onboarding.filter(function (o) { return !(o.empId === e.id && o.kind === 'Offboarding'); }); L.save(); L.toast('Austritt von ' + e.first + ' abgeschlossen'); L.render(); }; });
      }
    };
  }

  /* ---------- Recruiting ---------- */
  var STAGES = ['Neu', 'Gespräch', 'Angebot', 'Eingestellt'];
  var ST_COLOR = { Neu: 'gray', 'Gespräch': 'yellow', Angebot: 'orange', Eingestellt: 'green' };
  function stars(n) { var s = ''; for (var i = 1; i <= 5; i++) s += '<span class="star' + (i <= n ? ' on' : '') + '">★</span>'; return s; }

  function recruiting() {
    var S = L.S;
    var pos = {};
    S.candidates.forEach(function (c) { if (c.stage !== 'Eingestellt') pos[c.position] = (pos[c.position] || 0) + 1; });
    var html = '<div class="filters">' + Object.keys(pos).map(function (p) { return '<span class="chip static">' + L.icon('briefcase') + L.h(p) + ' <span>' + pos[p] + '</span></span>'; }).join('') + '</div>';
    html += '<div class="board">' + STAGES.map(function (st) {
      var list = S.candidates.filter(function (c) { return c.stage === st; });
      return '<div class="col" data-stage="' + st + '"><div class="col-head">' + L.tag(st, ST_COLOR[st]) + '<span class="muted">' + list.length + '</span></div>' +
        list.map(function (c) {
          return '<div class="bcard" data-id="' + c.id + '"><div class="bcard-title">' + L.h(c.name) + '</div><div class="bcard-meta">' + L.h(c.position) + '</div>' +
            '<div class="bcard-foot"><span class="stars">' + stars(c.rating) + '</span><span class="muted">' + L.rel(c.date) + '</span></div>' +
            (st === 'Angebot' ? '<button class="btn btn-sm btn-primary bcard-btn" data-hire="' + c.id + '">' + L.icon('user-check') + 'Einstellen</button>' : '') +
            (st === 'Eingestellt' && c.empId ? '<a class="bcard-link" href="#/personal/mitarbeiter/' + c.empId + '">' + L.icon('arrow-right') + 'Personalakte</a>' : '') + '</div>';
        }).join('') + (st === 'Neu' ? '<button class="col-add" id="add-cand">' + L.icon('plus') + 'Bewerbung</button>' : '') + '</div>';
    }).join('') + '</div>';

    function hire(c) {
      var p = c.name.split(' ');
      var role = c.position.replace(/\s*\(.*\)/, '').replace('Koch/Köchin', 'Koch');
      var type = /Vollzeit/.test(c.position) ? 'Vollzeit' : (/Werkstudent/.test(c.position) ? 'Werkstudent' : 'Teilzeit');
      L.addEmployee({ first: p[0], last: p.slice(1).join(' '), role: role, dept: /Koch/.test(c.position) ? 'Küche' : (/Event/.test(c.position) ? 'Events' : 'Service'), type: type, hours: type === 'Vollzeit' ? 40 : 20, rate: /Koch/.test(c.position) ? 17 : 14.5, candidateId: c.id });
    }

    return {
      title: 'Recruiting', icon: 'user-search', wide: true,
      desc: 'Bewerbungen per Drag &amp; Drop durch die Phasen ziehen. „Einstellen“ legt direkt Personalakte, Arbeitsvertrag und Onboarding an.',
      actions: '<button class="btn" id="job-ad">' + L.icon('megaphone') + 'Stelle ausschreiben</button><button class="btn btn-primary" id="add-cand2">' + L.icon('plus') + 'Bewerbung erfassen</button>',
      html: html,
      mount: function (root, main) {
        function addCand() {
          L.modal({ title: 'Bewerbung erfassen', submit: 'Speichern',
            body: L.field('Name', L.input('name', '', 'required')) + L.field('Position', L.select('pos', ['Servicekraft (Teilzeit)', 'Koch/Köchin (Vollzeit)', 'Werkstudent Events', 'Fahrer/in (Vollzeit)'], 'Servicekraft (Teilzeit)')) + L.field('Notiz', L.input('note', '')),
            onSubmit: function (d) { S.candidates.push({ id: L.uid('r'), name: d.name, position: d.pos, stage: 'Neu', rating: 0, date: L.todayIso(), note: d.note }); L.save(); L.toast('Bewerbung von ' + d.name + ' erfasst'); L.render(); } });
        }
        main.querySelector('#add-cand2').onclick = addCand;
        var a = root.querySelector('#add-cand'); if (a) a.onclick = addCand;
        main.querySelector('#job-ad').onclick = function () { L.useTemplate('stelle'); };
        root.querySelectorAll('[data-hire]').forEach(function (b) { b.onclick = function (ev) { ev.stopPropagation(); hire(S.candidates.filter(function (c) { return c.id === b.dataset.hire; })[0]); }; });
        root.querySelectorAll('.bcard').forEach(function (el) {
          el.onclick = function (ev) {
            if (ev.target.closest('button, a')) return;
            var c = S.candidates.filter(function (x) { return x.id === el.dataset.id; })[0];
            L.modal({ title: c.name, submit: 'Speichern',
              body: L.prop('briefcase', 'Position', L.h(c.position)) + L.prop('calendar', 'Eingang', L.fd(c.date)) +
                L.field('Bewertung', L.select('rating', [[0, 'Noch nicht bewertet'], [1, '★'], [2, '★★'], [3, '★★★'], [4, '★★★★'], [5, '★★★★★']], c.rating)) + L.field('Notiz', '<textarea name="note" rows="3">' + L.h(c.note || '') + '</textarea>'),
              onSubmit: function (d) { c.rating = Number(d.rating); c.note = d.note; L.save(); L.render(); } });
          };
        });
        L.dnd(root, {
          item: '.bcard', zone: '.col', onDrop: function (id, zone) {
            var c = S.candidates.filter(function (x) { return x.id === id; })[0], st = zone.dataset.stage;
            if (c.stage === st) return;
            if (st === 'Eingestellt' && !c.empId) { L.render(); hire(c); return; }
            c.stage = st; L.save(); L.toast(c.name + ' → ' + st); L.render();
          }
        });
      }
    };
  }

  L.views.personal = function (sub, id) {
    if (sub === 'mitarbeiter' && id) return profile(id);
    if (sub === 'abwesenheiten') return absences();
    if (sub === 'onboarding') return onboarding();
    if (sub === 'recruiting') return recruiting();
    return employees();
  };
})(window.L);
