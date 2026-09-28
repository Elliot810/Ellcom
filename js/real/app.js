/* Lincom – echte App: Konto, Firma, Rollen, „Mein Bereich“, Team-Seiten und Start.
   Die Module (Finanzen, Personal, Schichten …) sind die Ansichten der Demo, gespeist aus js/real/remote.js. */
(function (L) {
  'use strict';

  var ROLES = {
    owner: { label: 'Inhaber', color: 'purple', desc: 'Voller Zugriff, inklusive Rechte und Abo.' },
    admin: { label: 'Admin', color: 'blue', desc: 'Verwaltet Firma, Mitglieder und alle Bereiche.' },
    planner: { label: 'Dienstplanung', color: 'orange', desc: 'Plant Schichten für alle, sieht Kunden und Organisation. Keine Löhne.' },
    hr: { label: 'Personal', color: 'green', desc: 'Personalakten, Verträge, Urlaub, Recruiting und Beitrittsanfragen.' },
    accounting: { label: 'Buchhaltung', color: 'yellow', desc: 'Finanzen, Kunden, Zeiten und Verwaltung. Keine Personalakten.' },
    employee: { label: 'Mitarbeiter', color: 'gray', desc: 'Eigene Schichten, Urlaub beantragen, stempeln, eigene Dokumente, Aufgaben.' }
  };
  var ROLE_ORDER = ['owner', 'admin', 'planner', 'hr', 'accounting', 'employee'];
  var INDUSTRIES = ['Gastronomie', 'Event & Catering', 'Einzelhandel', 'Mobilität & Logistik', 'Handwerk', 'Agentur', 'Beratung', 'Gesundheit & Pflege', 'Sonstiges'];
  var A = { user: null, profile: null, members: [], cid: null, pending: 0 };
  L.account = A;

  /* ---------- Hilfen ---------- */
  function $(id) { return document.getElementById(id); }
  function cur() { return A.members.filter(function (m) { return m.company_id === A.cid; })[0] || null; }
  function company() { var m = cur(); return m ? m.companies : null; }
  function role() { var m = cur(); return m ? m.role : null; }
  function is(list) { return list.indexOf(role()) !== -1; }
  function grantable() {
    var r = role();
    if (r === 'owner') return ROLE_ORDER.slice();
    if (r === 'admin') return ROLE_ORDER.filter(function (x) { return x !== 'owner'; });
    if (r === 'hr') return ['employee'];
    return [];
  }
  function roleTag(r) { var d = ROLES[r] || ROLES.employee; return L.tag(d.label, d.color); }
  function firstName() { var n = (A.profile && A.profile.full_name) || ''; return n.split(' ')[0] || ''; }
  function initials(name) { var p = (name || '?').trim().split(/\s+/); return ((p[0] || '?').charAt(0) + (p[1] ? p[1].charAt(0) : '')).toUpperCase(); }
  function av(name) { return '<span class="rw-av">' + L.h(initials(name)) + '</span>'; }
  function date(d) { return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  function fail(e) { L.toast(lincomError(e), 'warn'); }
  async function q(p) { var r = await p; if (r.error) throw r.error; return r.data; }
  function copy(text, label) {
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { L.toast((label || 'Text') + ' kopiert'); }, function () { L.toast('Kopieren nicht möglich', 'warn'); });
  }
  function setCompany(id) { A.cid = id; try { localStorage.setItem('lincomCompany', id); } catch (e) {} }
  function me() { return L.myEmpId ? (L.S.employees || []).filter(function (e) { return e.id === L.myEmpId; })[0] : null; }

  /* ---------- Konto laden ---------- */
  async function loadAccount() {
    var u = await sb.auth.getUser();
    if (u.error || !u.data.user) { location.replace('login.html'); return false; }
    A.user = u.data.user;
    A.profile = await q(sb.from('profiles').select('full_name').eq('id', A.user.id).maybeSingle()) || { full_name: '' };
    A.members = await q(sb.from('memberships')
      .select('company_id, role, employee_id, created_at, companies(id, name, industry, searchable, join_code, plan, modules)')
      .eq('user_id', A.user.id).order('created_at'));
    var saved = null; try { saved = localStorage.getItem('lincomCompany'); } catch (e) {}
    A.cid = A.members.some(function (m) { return m.company_id === saved; }) ? saved : (A.members[0] ? A.members[0].company_id : null);
    await countPending();
    return true;
  }
  async function countPending() {
    A.pending = 0;
    if (A.cid && is(['owner', 'admin', 'hr'])) {
      var c = await sb.from('join_requests').select('id', { count: 'exact', head: true }).eq('company_id', A.cid).eq('status', 'pending');
      A.pending = c.count || 0;
    }
  }

  L.logout = async function () {
    if (L.remote.pending()) await L.remote.flush();
    await sb.auth.signOut();
    try { localStorage.removeItem('lincomCompany'); } catch (e) {}
    location.replace('index.html');
  };
  L.settingsHash = '#/team/konto';
  L.onCompanyChanged = function (c) {
    var m = cur(); if (m) { m.companies.name = c.name; m.companies.industry = c.industry; m.companies.modules = c.modules; }
  };

  /* ---------- Seitenleiste & Kopfzeile ---------- */
  L.sidebarBrand = function () {
    var c = company();
    return '<div class="rw-switch"><button class="brand rw-switch-btn" id="switch-btn"><span class="brand-mark">' + L.h(c.name.charAt(0).toUpperCase()) + '</span><span class="brand-name">' + L.h(c.name) + '</span>' + L.icon('chevrons-up-down', 'rw-chev') + '</button>' +
      '<div class="menu rw-switch-menu" id="switch-menu">' +
      A.members.map(function (m) {
        return '<button class="nav-item" data-company="' + m.company_id + '">' + L.icon(m.company_id === A.cid ? 'check' : 'building-2') + '<span>' + L.h(m.companies.name) + '</span>' + roleTag(m.role) + '</button>';
      }).join('') +
      '<div class="rw-sep"></div><a class="nav-item" href="#/neu">' + L.icon('plus') + '<span>Weitere Firma anlegen oder beitreten</span></a></div></div>';
  };
  L.sidebarTop = function (r) {
    if (role() === 'employee') return '';
    return '<a href="#/mein" class="nav-item' + (r.area === 'mein' ? ' is-active' : '') + '">' + L.icon('circle-user-round') + '<span>Mein Bereich</span></a>';
  };
  L.sidebarExtra = function (r) {
    var h = '<div class="nav-label">Team</div>';
    var item = function (sub, icon, label, count) {
      return '<a href="#/team/' + sub + '" class="nav-item' + (r.area === 'team' && r.sub === sub ? ' is-active' : '') + '">' + L.icon(icon) + '<span>' + label + '</span>' + (count ? '<span class="nav-count">' + count + '</span>' : '') + '</a>';
    };
    h += item('mitglieder', 'users', 'Mitglieder');
    if (is(['owner', 'admin', 'hr'])) h += item('anfragen', 'user-plus', 'Beitrittsanfragen', A.pending);
    if (is(['owner', 'admin'])) h += item('firma', 'building-2', 'Firma');
    return h;
  };
  L.sidebarBottom = function (r) {
    return '<div class="sidebar-bottom"><a href="#/team/konto" class="nav-item' + (r.area === 'team' && r.sub === 'konto' ? ' is-active' : '') + '">' + L.icon('circle-user') + '<span>' + L.h(A.profile.full_name || A.user.email) + '</span></a>' +
      '<button class="nav-item" id="rw-logout">' + L.icon('log-out') + '<span>Abmelden</span></button></div>';
  };
  L.afterSidebar = function () {
    $('switch-btn').onclick = function (e) { e.stopPropagation(); $('switch-menu').classList.toggle('is-open'); };
    document.querySelectorAll('[data-company]').forEach(function (b) {
      b.onclick = async function () {
        if (b.dataset.company === A.cid) return;
        if (L.remote.pending()) await L.remote.flush();
        setCompany(b.dataset.company); location.hash = '#/uebersicht'; location.reload();
      };
    });
    $('rw-logout').onclick = L.logout;
  };
  document.addEventListener('click', function () { var m = $('switch-menu'); if (m) m.classList.remove('is-open'); });
  L.topbarNote = function () { return L.remote.stateHtml() + '<span class="rw-roletag">' + roleTag(role()) + '</span>'; };

  /* ---------- Übersicht / Einstellungen je Rolle ---------- */
  function wrapViews() {
    var ov = L.views.uebersicht;
    L.views.uebersicht = function (sub, id) {
      if (role() === 'employee') return L.views.mein(sub, id);
      var page = ov(sub, id);
      var S = L.S, empty = !S.employees.length && !S.customers.length && !S.shifts.length;
      if (empty && L.canAdmin()) {
        page.html = '<div class="rw-empty-co">' + L.icon('sparkles') + '<div><b>Dein Firmenbereich ist noch leer.</b><span>Lege Mitarbeiter unter Personal an, plane Schichten oder lade Beispieldaten, um alles auszuprobieren. Beispieldaten lassen sich jederzeit wieder entfernen.</span></div>' +
          '<button class="btn btn-primary" id="rw-sample">' + L.icon('database') + 'Beispieldaten laden</button></div>' + page.html;
        var m = page.mount;
        page.mount = function (root, main) { if (m) m(root, main); var b = root.querySelector('#rw-sample'); if (b) b.onclick = function () { loadSample(b); }; };
      }
      return page;
    };
    var st = L.views.einstellungen;
    L.views.einstellungen = function (sub, id) {
      if (sub === 'module' && L.canAdmin()) return st(sub, id);
      return L.views.team(L.canAdmin() ? 'firma' : 'konto');
    };
  }

  async function loadSample(btn) {
    if (btn) btn.disabled = true;
    L.toast('Beispieldaten werden angelegt …');
    L.remote.loadSample();
    await L.remote.flush();
    if (L.remote.state !== 'error') L.toast('Beispieldaten geladen – schau dich um!');
    L.render();
  }

  /* ---------- Mein Bereich ---------- */
  L.views.mein = function () {
    var e = me(), S = L.S, T = L.todayIso();
    var page = { title: role() === 'employee' ? 'Hallo ' + (firstName() || '') + '!' : 'Mein Bereich', icon: 'circle-user-round', noTabs: true, crumbTitle: 'Mein Bereich',
      desc: L.h(company().name) + ' · Deine Rolle: ' + roleTag(role()) };
    if (!e) {
      page.html = '<div class="callout info">' + L.icon('link') + '<span>Dein Konto ist noch nicht mit einem Eintrag im Personalstamm verknüpft. Erst dann erscheinen hier deine Schichten, dein Urlaub und deine Dokumente.</span></div>' +
        (is(['owner', 'admin', 'hr']) ? '<button class="btn btn-primary" id="rw-self">' + L.icon('user-plus') + 'Mich im Personalstamm anlegen</button>' : '<p class="muted">Bitte die Personalabteilung, dein Konto zu verknüpfen.</p>');
      page.mount = function (root) {
        var b = root.querySelector('#rw-self'); if (!b) return;
        b.onclick = async function () {
          b.disabled = true;
          var n = (A.profile.full_name || A.user.email.split('@')[0]).trim().split(/\s+/);
          var id = L.uid();
          S.employees.push({ id: id, first: n[0], last: n.slice(1).join(' '), role: ROLES[role()].label, dept: 'Verwaltung', type: '', hoursWeek: 40, rate: 0, vacation: 0, start: T, status: 'aktiv', manager: null, email: A.user.email, phone: '' });
          await L.remote.flush();
          try { await q(sb.rpc('link_employee', { p_company: A.cid, p_user: A.user.id, p_employee: id })); L.myEmpId = id; L.toast('Du bist jetzt im Personalstamm'); await L.remote.reload(); }
          catch (er) { b.disabled = false; fail(er); }
        };
      };
      return page;
    }

    var mine = S.shifts.filter(function (s) { return s.empId === e.id && s.date >= T; }).sort(function (a, b) { return (a.date + a.start).localeCompare(b.date + b.start); });
    var open = S.shifts.filter(function (s) { return !s.empId && s.date >= T && s.date <= L.add(T, 14); }).sort(function (a, b) { return (a.date + a.start).localeCompare(b.date + b.start); });
    var ws = L.weekStart(T), weekH = S.shifts.filter(function (s) { return s.empId === e.id && s.date >= ws && s.date <= L.add(ws, 6); }).reduce(function (x, s) { return x + L.shiftHours(s); }, 0);
    var abs = S.absences.filter(function (a) { return a.empId === e.id && a.to >= L.add(T, -30); }).sort(function (a, b) { return a.from < b.from ? 1 : -1; });
    var docs = S.docs.filter(function (d) { return d.empId === e.id; });
    var vac = e.vacation ? L.vacation(e) : null;
    var next = mine[0];

    var html = '<div class="stats">' +
      '<div class="stat"><span class="stat-label">' + L.icon('calendar-clock') + 'Nächste Schicht</span><span class="stat-value">' + (next ? L.rel(next.date) : '–') + '</span><span class="stat-sub">' + (next ? next.start + '–' + next.end + ' · ' + L.h(next.area) : 'Keine geplant') + '</span></div>' +
      '<div class="stat"><span class="stat-label">' + L.icon('clock') + 'Diese Woche</span><span class="stat-value">' + L.num(weekH, 1) + ' h</span><span class="stat-sub">' + (e.hoursWeek ? 'von ' + e.hoursWeek + ' h laut Vertrag' : 'geplant') + '</span></div>' +
      (vac ? '<div class="stat"><span class="stat-label">' + L.icon('plane') + 'Resturlaub</span><span class="stat-value">' + vac.rest + ' Tage</span><span class="stat-sub">von ' + vac.entitled + ' Tagen ' + L.today().getFullYear() + '</span></div>' : '') +
      '</div>';

    html += '<h3 class="sub-title">Meine Schichten</h3>' + (mine.length ? '<ul class="rw-shifts">' + mine.slice(0, 10).map(function (s) {
      return '<li><span class="rw-day">' + L.WD[L.wdIdx(s.date)] + ' ' + L.fds(s.date) + '</span><b>' + s.start + '–' + s.end + '</b><span class="muted">' + L.h(s.area) + '</span><span class="spacer"></span>' + (s.date === T ? L.tag('Heute', 'blue') : '<span class="muted small">' + L.rel(s.date) + '</span>') + '</li>';
    }).join('') + '</ul>' : L.empty('calendar', 'Für dich sind noch keine Schichten eingetragen.'));
    if (open.length) html += '<p class="muted small rw-open-hint">' + L.icon('circle-dashed', 'tiny') + open.length + ' offene Schicht' + (open.length > 1 ? 'en' : '') + ' in den nächsten zwei Wochen – sprich die Dienstplanung an, wenn du übernehmen möchtest.</p>';

    html += '<div class="rw-sec-head"><h3 class="sub-title">Urlaub & Abwesenheit</h3><button class="btn btn-sm btn-primary" id="rw-absence">' + L.icon('plus') + 'Beantragen / melden</button></div>';
    var ABS = { beantragt: ['Beantragt', 'yellow'], genehmigt: ['Genehmigt', 'green'], gemeldet: ['Gemeldet', 'blue'], abgelehnt: ['Abgelehnt', 'red'] };
    html += abs.length ? '<ul class="rw-shifts">' + abs.map(function (a) {
      var t = ABS[a.status] || [a.status, 'gray'];
      return '<li><span class="rw-day">' + L.h(a.type) + '</span><b>' + L.fds(a.from) + (a.to !== a.from ? '–' + L.fds(a.to) : '') + '</b><span class="muted">' + L.workdays(a.from, a.to) + ' Arbeitstag' + (L.workdays(a.from, a.to) === 1 ? '' : 'e') + (a.note ? ' · ' + L.h(a.note) : '') + '</span><span class="spacer"></span>' + L.tag(t[0], t[1]) +
        (a.status === 'beantragt' ? '<button class="btn btn-sm btn-ghost-danger" data-cancel-abs="' + a.id + '">Zurückziehen</button>' : '') + '</li>';
    }).join('') + '</ul>' : L.empty('plane', 'Keine Anträge.');

    html += '<h3 class="sub-title">Meine Dokumente</h3>' + (docs.length ? '<ul class="rw-shifts">' + docs.map(function (d) {
      return '<li>' + L.icon('file-text', 'muted-icon') + '<b>' + L.h(d.name) + '</b><span class="muted">' + L.h(d.cat || '') + (d.date ? ' · ' + L.fd(d.date) : '') + '</span><span class="spacer"></span>' + (d.status ? L.tag(d.status, 'gray') : '') + '</li>';
    }).join('') + '</ul>' : L.empty('folder', 'Noch keine Dokumente hinterlegt.'));

    if (e.type || e.hoursWeek || e.rate) {
      html += '<h3 class="sub-title">Mein Vertrag</h3><div class="props">' +
        L.prop('file-signature', 'Vertragsart', L.h(e.type || '–')) + L.prop('clock', 'Wochenstunden', e.hoursWeek ? e.hoursWeek + ' h' : '–') +
        (e.rate ? L.prop('euro', 'Stundenlohn', L.eur(e.rate)) : '') + (e.vacation ? L.prop('plane', 'Urlaubsanspruch', e.vacation + ' Tage') : '') +
        L.prop('calendar', 'Eintritt', e.start ? L.fd(e.start) : '–') + '</div>';
    }

    page.html = html;
    page.mount = function (root) {
      root.querySelector('#rw-absence').onclick = function () { absenceModal(e); };
      root.querySelectorAll('[data-cancel-abs]').forEach(function (b) {
        b.onclick = function () {
          S.absences = S.absences.filter(function (a) { return a.id !== b.dataset.cancelAbs; });
          L.save(); L.toast('Antrag zurückgezogen'); L.render();
        };
      });
    };
    return page;
  };

  function absenceModal(e) {
    var T = L.todayIso(), S = L.S;
    var mineShift = {}, mineAbs = {};
    S.shifts.forEach(function (s) { if (s.empId === e.id) mineShift[s.date] = 1; });
    S.absences.forEach(function (a) { if (a.empId === e.id && a.status !== 'abgelehnt') for (var d = a.from; d <= a.to; d = L.add(d, 1)) mineAbs[d] = 1; });
    var vac = e.vacation ? L.vacation(e) : null;
    L.modal({
      title: 'Urlaub beantragen oder Abwesenheit melden', submit: 'Absenden',
      body: '<div class="seg" id="abs-type">' + [['Urlaub', 'plane'], ['Krank', 'thermometer'], ['Sonderurlaub', 'gift'], ['Weiterbildung', 'graduation-cap']].map(function (t, i) {
          return '<label><input type="radio" name="type" value="' + t[0] + '"' + (i === 0 ? ' checked' : '') + '><span>' + L.icon(t[1]) + (t[0] === 'Krank' ? 'Krankmeldung' : t[0]) + '</span></label>';
        }).join('') + '</div>' +
        '<div id="abs-rp"></div>' +
        '<div class="rp-legend"><span><i style="background:#d9730d"></i>deine Schichten</span><span><i style="background:#9065b0"></i>schon eingetragen</span></div>' +
        '<div class="callout info" id="abs-info"></div>' +
        L.field('Notiz (optional)', L.input('note', '', 'maxlength="200" placeholder="z. B. Familienbesuch"'), 'Die Personalabteilung bestätigt deinen Antrag. Bei Krankheit reiche die AU wie gewohnt nach.'),
      onMount: function (f) {
        function info(a, b) {
          var box = f.querySelector('#abs-info'), type = (f.querySelector('input[name=type]:checked') || {}).value;
          var n = L.workdays(a, b), clash = Object.keys(mineShift).filter(function (d) { return d >= a && d <= b; }).length;
          var parts = [n + (n === 1 ? ' Arbeitstag' : ' Arbeitstage')];
          if (type === 'Urlaub' && vac) parts.push('danach noch ' + (vac.rest - n) + ' Tage Resturlaub');
          if (clash) parts.push(clash + (clash === 1 ? ' deiner Schichten liegt' : ' deiner Schichten liegen') + ' im Zeitraum');
          box.className = 'callout ' + (clash || (type === 'Urlaub' && vac && vac.rest - n < 0) ? 'warn' : 'info');
          box.innerHTML = L.icon(clash ? 'triangle-alert' : 'info') + '<span>' + parts.join(' · ') + '</span>';
          L.refreshIcons();
        }
        var rp = L.rangePicker(f.querySelector('#abs-rp'), {
          from: T, to: T, quick: L.quickRanges(),
          marks: function (d) { return mineAbs[d] ? 'absence' : (mineShift[d] ? 'shift' : null); },
          onChange: info
        });
        f.querySelectorAll('input[name=type]').forEach(function (r) { r.onchange = function () { var x = rp.get(); info(x[0], x[1]); }; });
        info(T, T);
      },
      onSubmit: function (d) {
        L.S.absences.push({ id: L.uid(), empId: e.id, type: d.type, from: d.from, to: d.to, status: 'beantragt', note: d.note || '' });
        L.save();
        L.toast(d.type === 'Krank' ? 'Krankmeldung gesendet – gute Besserung!' : 'Antrag gesendet');
        L.render();
      }
    });
  }

  /* ---------- Team-Seiten ---------- */
  var TEAM = {
    mitglieder: { title: 'Mitglieder', icon: 'users' },
    anfragen: { title: 'Beitrittsanfragen', icon: 'user-plus', roles: ['owner', 'admin', 'hr'] },
    firma: { title: 'Firma', icon: 'building-2', roles: ['owner', 'admin'] },
    konto: { title: 'Mein Konto', icon: 'circle-user' }
  };
  L.views.team = function (sub) {
    var t = TEAM[sub] || TEAM.mitglieder;
    if (t.roles && !is(t.roles)) t = TEAM.mitglieder, sub = 'mitglieder';
    return {
      title: t.title, icon: t.icon, noTabs: true,
      html: '<div class="rw-skel"></div>',
      mount: async function (root) {
        try { await TEAM_LOAD[sub](root); } catch (e) { root.innerHTML = '<div class="callout warn">' + L.icon('triangle-alert') + '<span>' + L.h(lincomError(e)) + '</span></div>'; }
        L.refreshIcons();
      }
    };
  };

  var TEAM_LOAD = {};
  TEAM_LOAD.mitglieder = async function (root) {
    var rows = await q(sb.from('memberships').select('user_id, role, employee_id, created_at').eq('company_id', A.cid).order('created_at'));
    var profs = await q(sb.from('profiles').select('id, full_name').in('id', rows.map(function (r) { return r.user_id; })));
    var pn = {}; profs.forEach(function (p) { pn[p.id] = p.full_name; });
    var g = grantable(), canLink = is(['owner', 'admin', 'hr']);
    var freeEmps = (L.S.employees || []).filter(function (e) { return !e.userId && !e.hidden; });
    rows.sort(function (a, b) { return ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role); });
    var html = '<p class="page-desc rw-desc">' + rows.length + (rows.length === 1 ? ' Person hat' : ' Personen haben') + ' Zugriff auf ' + L.h(company().name) + '.' +
      (is(['owner', 'admin', 'hr']) ? ' <a href="#/team/anfragen">Personen hinzufügen</a>' : '') + '</p>';
    html += '<div class="table-wrap"><table class="db"><thead><tr><th>' + L.icon('user') + 'Name</th><th>' + L.icon('shield') + 'Rolle</th><th>' + L.icon('id-card') + 'Personalstamm</th><th>' + L.icon('calendar') + 'Dabei seit</th><th></th></tr></thead><tbody>' +
      rows.map(function (r) {
        var self = r.user_id === A.user.id, name = pn[r.user_id] || 'Ohne Namen';
        var canEdit = !self && g.indexOf(r.role) !== -1 && g.length > 1;
        var roleCell = canEdit ? '<select class="sel-sm" data-role="' + r.user_id + '">' + g.map(function (x) {
          return '<option value="' + x + '"' + (x === r.role ? ' selected' : '') + '>' + ROLES[x].label + '</option>';
        }).join('') + '</select>' : roleTag(r.role);
        var emp = r.employee_id ? L.emp(r.employee_id) : null;
        var empCell = emp && !emp.hidden ? L.h(L.name(emp)) : (emp ? '<span class="muted">verknüpft</span>' :
          (canLink && freeEmps.length ? '<select class="sel-sm" data-link="' + r.user_id + '"><option value="">Verknüpfen …</option>' + freeEmps.map(function (e) { return '<option value="' + e.id + '">' + L.h(L.name(e)) + '</option>'; }).join('') + '</select>' : '<span class="muted">–</span>'));
        var act = self ? '<button class="btn btn-sm" data-leave>Firma verlassen</button>'
          : (g.indexOf(r.role) !== -1 ? '<button class="btn btn-sm btn-ghost-danger" data-remove="' + r.user_id + '" data-name="' + L.h(name) + '">Entfernen</button>' : '');
        return '<tr><td><span class="rw-person">' + av(name) + '<b>' + L.h(name) + '</b>' + (self ? '<span class="muted">(du)</span>' : '') + '</span></td><td>' + roleCell + '</td><td>' + empCell + '</td><td>' + date(r.created_at) + '</td><td class="row-actions">' + act + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    html += '<h3 class="sub-title">Was die Rollen dürfen</h3><div class="rw-roles">' + ROLE_ORDER.map(function (x) {
      return '<div class="rw-role">' + roleTag(x) + '<span>' + ROLES[x].desc + '</span></div>';
    }).join('') + '</div>';
    root.innerHTML = html; L.refreshIcons();

    root.querySelectorAll('[data-role]').forEach(function (sel) {
      var before = sel.value;
      sel.onchange = async function () {
        try { await q(sb.rpc('set_member_role', { p_company: A.cid, p_user: sel.dataset.role, p_role: sel.value })); before = sel.value; L.toast('Rolle geändert: ' + ROLES[sel.value].label); }
        catch (e) { sel.value = before; fail(e); }
      };
    });
    root.querySelectorAll('[data-link]').forEach(function (sel) {
      sel.onchange = async function () {
        if (!sel.value) return;
        try { await q(sb.rpc('link_employee', { p_company: A.cid, p_user: sel.dataset.link, p_employee: sel.value })); L.toast('Verknüpft'); if (sel.dataset.link === A.user.id) L.myEmpId = sel.value; await L.remote.reload(); }
        catch (e) { sel.value = ''; fail(e); }
      };
    });
    root.querySelectorAll('[data-remove]').forEach(function (b) {
      b.onclick = function () {
        L.confirm('Mitglied entfernen?', b.dataset.name + ' verliert sofort den Zugriff auf diese Firma. Der Eintrag im Personalstamm bleibt erhalten.', 'Entfernen', async function () {
          try { await q(sb.rpc('remove_member', { p_company: A.cid, p_user: b.dataset.remove })); L.toast(b.dataset.name + ' wurde entfernt'); L.render(); } catch (e) { fail(e); }
        });
      };
    });
    var lv = root.querySelector('[data-leave]');
    if (lv) lv.onclick = function () {
      L.confirm('Firma verlassen?', 'Du verlierst den Zugriff auf ' + company().name + '. Um wieder beizutreten, brauchst du eine neue Bestätigung.', 'Verlassen', async function () {
        try { await q(sb.rpc('remove_member', { p_company: A.cid, p_user: A.user.id })); try { localStorage.removeItem('lincomCompany'); } catch (e) {} location.hash = '#/uebersicht'; location.reload(); } catch (e) { fail(e); }
      });
    };
  };

  TEAM_LOAD.anfragen = async function (root) {
    var c = company();
    var reqs = await q(sb.from('join_requests').select('id, user_id, message, created_at').eq('company_id', A.cid).eq('status', 'pending').order('created_at'));
    var pn = {};
    if (reqs.length) (await q(sb.from('profiles').select('id, full_name').in('id', reqs.map(function (r) { return r.user_id; })))).forEach(function (p) { pn[p.id] = p.full_name; });
    var html = '<p class="page-desc rw-desc">Beim Annehmen legst du fest, was die Person sehen und tun darf.</p>' +
      '<div class="rw-invite"><div><b>So kommt dein Team dazu</b><p>Mitarbeitende registrieren sich bei Lincom und suchen nach „' + L.h(c.name) + '“' + (c.searchable ? '' : ' (Suche ist ausgeschaltet)') + ' oder geben den Firmencode ein. Danach erscheint die Anfrage hier.</p></div>' +
      '<div class="rw-code-box"><span class="muted">Firmencode</span><b class="mono">' + L.h(c.join_code) + '</b><button class="btn btn-sm" id="copy-code">' + L.icon('copy') + 'Kopieren</button><button class="btn btn-sm" id="copy-link">' + L.icon('link') + 'Einladungstext</button></div></div>';
    html += '<h3 class="sub-title">Offene Anfragen</h3>';
    html += reqs.length ? '<div class="rw-reqs">' + reqs.map(function (r) {
      var name = pn[r.user_id] || 'Ohne Namen';
      return '<div class="rw-req"><div class="rw-person">' + av(name) + '<div><b>' + L.h(name) + '</b><span class="muted">angefragt am ' + date(r.created_at) + '</span></div></div>' +
        (r.message ? '<p class="rw-msg">„' + L.h(r.message) + '“</p>' : '') +
        '<div class="rw-req-actions"><button class="btn btn-sm" data-reject="' + r.id + '" data-name="' + L.h(name) + '">Ablehnen</button><button class="btn btn-sm btn-primary" data-approve="' + r.id + '" data-name="' + L.h(name) + '">' + L.icon('check') + 'Annehmen …</button></div></div>';
    }).join('') + '</div>' : L.empty('inbox', 'Keine offenen Anfragen.');
    root.innerHTML = html; L.refreshIcons();
    root.querySelector('#copy-code').onclick = function () { copy(c.join_code, 'Firmencode'); };
    root.querySelector('#copy-link').onclick = function () {
      copy('Hallo! Tritt unserem Firmenbereich „' + c.name + '“ in Lincom bei: Registriere dich unter ' + LINCOM_BASE + 'login.html#registrieren und gib danach den Firmencode ' + c.join_code + ' ein.', 'Einladungstext');
    };
    root.querySelectorAll('[data-reject]').forEach(function (b) {
      b.onclick = function () {
        L.confirm('Anfrage ablehnen?', b.dataset.name + ' bekommt keinen Zugriff. Die Person kann später erneut anfragen.', 'Ablehnen', async function () {
          try { await q(sb.rpc('decide_join_request', { p_request: b.dataset.reject, p_approve: false })); L.toast('Anfrage abgelehnt'); await countPending(); L.render(); } catch (e) { fail(e); }
        });
      };
    });
    root.querySelectorAll('[data-approve]').forEach(function (b) { b.onclick = function () { approve(b.dataset.approve, b.dataset.name); }; });
  };

  function approve(reqId, name) {
    var g = grantable(), free = (L.S.employees || []).filter(function (e) { return !e.userId && !e.hidden; });
    var body = '<p class="muted rw-lead">Welche Rolle bekommt <b>' + L.h(name) + '</b>?</p><div class="rw-role-pick">' + g.map(function (x, i) {
      return '<label class="rw-pick"><input type="radio" name="role" value="' + x + '"' + (x === 'employee' || (i === 0 && g.indexOf('employee') === -1) ? ' checked' : '') + '><span>' + roleTag(x) + '<small>' + ROLES[x].desc + '</small></span></label>';
    }).join('') + '</div>';
    if (free.length) body += L.field('Im Personalstamm', L.select('employee', [['', 'Neuen Eintrag anlegen']].concat(free.map(function (e) { return [e.id, 'Verknüpfen mit ' + L.name(e)]; })), ''), 'Falls die Person schon als Mitarbeiter:in angelegt ist, z. B. aus den Beispieldaten.');
    L.modal({
      title: 'Anfrage annehmen', body: body, submit: 'Annehmen',
      onSubmit: function (d, form) {
        var btn = form.querySelector('button[type=submit]'); btn.disabled = true;
        q(sb.rpc('decide_join_request', { p_request: reqId, p_approve: true, p_role: d.role, p_employee: d.employee || null }))
          .then(async function () { L.closeModal(); L.toast(name + ' ist jetzt dabei als ' + ROLES[d.role].label); await countPending(); await L.remote.reload(); })
          .catch(function (e) { btn.disabled = false; fail(e); });
        return false;
      }
    });
  }

  TEAM_LOAD.firma = async function (root) {
    var c = company(), hasSample = L.remote.hasSample();
    var html = '<p class="page-desc rw-desc">Stammdaten, Sichtbarkeit und Daten deines Firmenbereichs.</p><form class="rw-form" id="f-company" novalidate>' +
      L.field('Firmenname', '<input name="name" value="' + L.h(c.name) + '" maxlength="120" required>') +
      L.field('Branche', L.select('industry', [['', '– bitte wählen –']].concat(INDUSTRIES), c.industry || '')) +
      '<label class="rw-toggle"><span class="switch"><input type="checkbox" name="searchable"' + (c.searchable ? ' checked' : '') + '><span></span></span><span><b>In der Firmensuche anzeigen</b><small>Mitarbeitende finden die Firma über ihren Namen und können eine Anfrage senden. Ausgeschaltet geht der Beitritt nur mit Firmencode. Jede Anfrage musst du trotzdem bestätigen.</small></span></label>' +
      '<div class="rw-form-foot"><button class="btn btn-primary" type="submit">Speichern</button></div></form>' +
      '<h3 class="sub-title">Module</h3><p class="muted">Blende Bereiche aus, die du nicht brauchst. <a href="#/einstellungen/module">Module verwalten</a></p>' +
      '<h3 class="sub-title">Beispieldaten</h3><div class="rw-sample">' + L.icon('database') + '<div><b>' + (hasSample ? 'Beispieldaten sind geladen' : 'Zum Ausprobieren') + '</b><span>' +
      (hasSample ? 'Beispiel-Mitarbeitende, Schichten, Kunden, Rechnungen usw. sind markiert und lassen sich komplett entfernen. Deine eigenen Einträge bleiben erhalten.' : 'Füllt alle Bereiche mit den Beispieldaten aus der Demo (ein kleiner Event- & Catering-Betrieb). Später mit einem Klick wieder entfernbar.') +
      '</span></div><button class="btn" id="rw-sample-btn">' + (hasSample ? 'Beispieldaten entfernen' : 'Beispieldaten laden') + '</button></div>' +
      '<h3 class="sub-title">Abo</h3><div class="callout info">' + L.icon('badge-check') + '<span><b>Kostenlose Testphase.</b> Abo und Bezahlung werden als Nächstes angebunden.</span></div>';
    root.innerHTML = html; L.refreshIcons();
    root.querySelector('#f-company').onsubmit = async function (e) {
      e.preventDefault();
      var f = this, name = f.elements.name.value.trim();
      if (name.length < 2) { f.elements.name.classList.add('invalid'); f.elements.name.focus(); return; }
      try {
        if (f.elements.searchable.checked !== c.searchable) { await q(sb.from('companies').update({ searchable: f.elements.searchable.checked }).eq('id', A.cid)); c.searchable = f.elements.searchable.checked; }
        L.S.company.name = name; L.S.company.branche = f.elements.industry.value || '';
        L.save(); await L.remote.flush();
        L.toast('Gespeichert'); L.render();
      } catch (er) { fail(er); }
    };
    root.querySelector('#rw-sample-btn').onclick = function () {
      if (!hasSample) return loadSample(this);
      L.confirm('Beispieldaten entfernen?', 'Alle als Beispiel markierten Mitarbeitenden, Schichten, Kunden, Rechnungen, Aufgaben usw. werden gelöscht. Deine eigenen Einträge bleiben erhalten.', 'Entfernen', async function () {
        L.remote.removeSample(); await L.remote.flush(); L.toast('Beispieldaten entfernt'); L.render();
      });
    };
  };

  TEAM_LOAD.konto = async function (root) {
    var html = '<p class="page-desc rw-desc">Dein persönliches Konto – gilt für alle Firmen, in denen du Mitglied bist.</p><form class="rw-form" id="f-profile" novalidate>' +
      L.field('Vor- und Nachname', '<input name="full_name" value="' + L.h(A.profile.full_name) + '" maxlength="120" required>') +
      L.field('E-Mail-Adresse', '<input value="' + L.h(A.user.email) + '" disabled>') +
      '<div class="rw-form-foot"><button class="btn btn-primary" type="submit">Speichern</button></div></form>' +
      '<h3 class="sub-title">Passwort ändern</h3><form class="rw-form" id="f-pass" novalidate>' +
      L.field('Neues Passwort', '<input type="password" name="pass" minlength="8" autocomplete="new-password" placeholder="Mindestens 8 Zeichen" required>') +
      '<div class="rw-form-foot"><button class="btn" type="submit">Passwort ändern</button></div></form>' +
      '<h3 class="sub-title">Abmelden</h3><button class="btn" id="logout2">' + L.icon('log-out') + 'Abmelden</button>';
    root.innerHTML = html; L.refreshIcons();
    root.querySelector('#f-profile').onsubmit = async function (e) {
      e.preventDefault(); var v = this.elements.full_name.value.trim();
      if (!v) { this.elements.full_name.classList.add('invalid'); return; }
      try { await q(sb.from('profiles').update({ full_name: v }).eq('id', A.user.id)); A.profile.full_name = v; L.toast('Name gespeichert'); L.render(); } catch (er) { fail(er); }
    };
    root.querySelector('#f-pass').onsubmit = async function (e) {
      e.preventDefault(); var f = this;
      if (f.elements.pass.value.length < 8) { f.elements.pass.classList.add('invalid'); L.toast('Das Passwort braucht mindestens 8 Zeichen', 'warn'); return; }
      var r = await sb.auth.updateUser({ password: f.elements.pass.value });
      if (r.error) fail(r.error); else { f.reset(); L.toast('Passwort geändert'); }
    };
    root.querySelector('#logout2').onclick = L.logout;
  };

  /* ---------- Firma anlegen oder beitreten ---------- */
  function joinCreateHtml() {
    return '<div class="rw-ob-grid">' +
      '<section class="rw-ob-card"><div class="rw-ob-icon">' + L.icon('building-2') + '</div><h2>Firma anlegen</h2><p>Für Inhaber und Geschäftsführung. Du legst den Firmenbereich an und lädst dein Team ein.</p>' +
        '<form id="f-create" novalidate>' + L.field('Firmenname', '<input name="cname" maxlength="120" placeholder="z. B. Miles Mobility" required>') +
        L.field('Branche', L.select('industry', [['', '– bitte wählen –']].concat(INDUSTRIES), '')) +
        '<button class="btn btn-primary btn-block" type="submit">Firma anlegen</button></form>' +
        '<p class="rw-fine">' + L.icon('info') + 'Du wirst Inhaber:in. Aktuell kostenlose Testphase – das Abo wird später angebunden.</p></section>' +
      '<section class="rw-ob-card"><div class="rw-ob-icon">' + L.icon('user-plus') + '</div><h2>Meiner Firma beitreten</h2><p>Für Mitarbeitende. Such deine Firma oder gib den Code ein, den du bekommen hast.</p>' +
        '<label class="field"><span class="field-label">Firma suchen</span><span class="rw-search">' + L.icon('search') + '<input id="ob-q" placeholder="Firmenname (mind. 3 Zeichen)" autocomplete="off"></span></label>' +
        '<div id="ob-results" class="rw-results"></div>' +
        '<form id="f-code" class="rw-code-form" novalidate>' + L.field('Oder Firmencode', '<input name="code" maxlength="12" placeholder="z. B. 7F3A9C21" class="mono" autocomplete="off" required>') +
        '<button class="btn" type="submit">Anfrage senden</button></form></section></div>';
  }
  async function pendingHtml() {
    var reqs = [];
    try { reqs = await q(sb.rpc('my_join_requests')); } catch (e) {}
    var pending = reqs.filter(function (r) { return r.status === 'pending'; });
    var html = pending.length ? '<div class="rw-pending">' + pending.map(function (r) {
      return '<div class="rw-pending-item">' + L.icon('hourglass') + '<div><b>Anfrage an ' + L.h(r.company_name) + ' gesendet</b><span>Sobald sie angenommen wird, kommst du hier automatisch weiter.</span></div><button class="btn btn-sm" data-cancel="' + r.id + '">Zurückziehen</button></div>';
    }).join('') + '</div>' : '';
    var rej = reqs.filter(function (r) { return r.status === 'rejected'; });
    var foot = rej.length ? '<p class="rw-fine center">' + rej.map(function (r) { return 'Deine Anfrage an ' + L.h(r.company_name) + ' wurde abgelehnt.'; }).join(' ') + '</p>' : '';
    return { html: html, foot: foot, pending: pending.length };
  }
  function bindJoinCreate(box, again) {
    box.querySelectorAll('[data-cancel]').forEach(function (b) {
      b.onclick = async function () { try { await q(sb.rpc('cancel_join_request', { p_request: b.dataset.cancel })); L.toast('Anfrage zurückgezogen'); again(); } catch (e) { fail(e); } };
    });
    box.querySelector('#f-create').onsubmit = async function (e) {
      e.preventDefault(); var f = this, name = f.elements.cname.value.trim();
      if (name.length < 2) { f.elements.cname.classList.add('invalid'); f.elements.cname.focus(); return; }
      var btn = f.querySelector('button'); btn.disabled = true;
      try {
        var id = await q(sb.rpc('create_company', { p_name: name, p_industry: f.elements.industry.value || null }));
        setCompany(id); location.hash = '#/uebersicht'; location.reload();
      } catch (er) { btn.disabled = false; fail(er); }
    };
    var t = null, input = box.querySelector('#ob-q');
    input.oninput = function () {
      clearTimeout(t);
      var v = input.value.trim(), out = box.querySelector('#ob-results');
      if (v.length < 3) { out.innerHTML = ''; return; }
      t = setTimeout(async function () {
        try {
          var res = await q(sb.rpc('search_companies', { q: v }));
          if (input.value.trim() !== v) return;
          out.innerHTML = res.length ? res.map(function (c) {
            return '<div class="rw-result"><span class="brand-mark sm">' + L.h(c.name.charAt(0).toUpperCase()) + '</span><div><b>' + L.h(c.name) + '</b>' + (c.industry ? '<span class="muted">' + L.h(c.industry) + '</span>' : '') + '</div><button class="btn btn-sm btn-primary" data-join="' + c.id + '" data-name="' + L.h(c.name) + '">Anfrage senden</button></div>';
          }).join('') : '<p class="rw-fine">Keine Firma gefunden. Frag nach dem Firmencode.</p>';
          L.refreshIcons();
          out.querySelectorAll('[data-join]').forEach(function (b) { b.onclick = function () { askJoin(b.dataset.name, function (msg) { return sb.rpc('request_join', { p_company: b.dataset.join, p_message: msg }); }, again); }; });
        } catch (er) { fail(er); }
      }, 300);
    };
    box.querySelector('#f-code').onsubmit = function (e) {
      e.preventDefault(); var code = this.elements.code.value.trim();
      if (code.length < 4) { this.elements.code.classList.add('invalid'); this.elements.code.focus(); return; }
      askJoin('diese Firma', function (msg) { return sb.rpc('request_join_by_code', { p_code: code, p_message: msg }); }, again);
    };
  }
  function askJoin(name, call, again) {
    L.modal({
      title: 'Anfrage an ' + name, submit: 'Anfrage senden',
      body: '<p class="muted rw-lead">Die Geschäftsführung oder Personalabteilung bestätigt deine Anfrage und legt fest, was du sehen darfst.</p>' +
        L.field('Nachricht (optional)', '<textarea name="message" rows="3" maxlength="500" placeholder="z. B. Hallo, ich bin Anna aus dem Service-Team."></textarea>'),
      onSubmit: function (d, form) {
        var btn = form.querySelector('button[type=submit]'); btn.disabled = true;
        q(call(d.message || null)).then(function () { L.closeModal(); L.toast('Anfrage gesendet'); again(); })
          .catch(function (e) { btn.disabled = false; fail(e); });
        return false;
      }
    });
  }

  // Ohne Firma: Vollbild-Einstieg
  var pollT = null;
  async function renderOnboarding() {
    clearInterval(pollT);
    var box = $('onboard'); box.hidden = false; $('app').hidden = true;
    var p = await pendingHtml();
    box.innerHTML =
      '<header class="rw-top"><span class="brand"><span class="brand-mark">L</span><span class="brand-name">Lincom</span></span><span class="spacer"></span>' +
      '<span class="rw-me">' + L.h(A.user.email) + '</span><button class="btn btn-ghost" id="ob-logout">' + L.icon('log-out') + 'Abmelden</button></header>' +
      '<div class="rw-ob-inner"><h1>Willkommen' + (firstName() ? ', ' + L.h(firstName()) : '') + '!</h1><p class="rw-sub">Wie möchtest du Lincom nutzen?</p>' +
      p.html + joinCreateHtml() + p.foot + '</div>';
    L.refreshIcons();
    $('ob-logout').onclick = L.logout;
    bindJoinCreate(box, renderOnboarding);
    if (p.pending) pollT = setInterval(async function () {
      var r = await sb.from('memberships').select('company_id').eq('user_id', A.user.id);
      if (!r.error && r.data.length) { clearInterval(pollT); setCompany(r.data[0].company_id); location.hash = '#/uebersicht'; location.reload(); }
    }, 15000);
  }

  // Mit Firma: weitere Firma über „#/neu“
  L.views.neu = function () {
    return {
      title: 'Weitere Firma', icon: 'plus', noTabs: true, html: '<div class="rw-skel"></div>',
      mount: async function (root) {
        var p = await pendingHtml();
        root.innerHTML = '<p class="page-desc rw-desc">Lege eine weitere Firma an oder tritt einer bei. Zwischen deinen Firmen wechselst du oben links.</p>' + p.html + joinCreateHtml() + p.foot;
        L.refreshIcons();
        bindJoinCreate(root, function () { L.render(); });
      }
    };
  };

  /* ---------- Start ---------- */
  async function start() {
    try {
      if (!(await loadAccount())) return;
      if (!A.members.length) { $('loading').remove(); return renderOnboarding(); }
      var m = cur();
      L.myEmpId = m.employee_id || null;
      L.email = A.user.email;
      await L.remote.load(A.cid, m.role, m.companies);
      if (!L.myEmpId) { var mine = L.S.employees.filter(function (e) { return e.userId === A.user.id; })[0]; if (mine) L.myEmpId = mine.id; }
    } catch (e) {
      console.error(e);
      $('loading').innerHTML = '<span>' + L.h(lincomError(e)) + '</span><a class="btn" href="login.html">Zur Anmeldung</a>';
      return;
    }
    wrapViews();
    $('loading').remove();
    $('app').hidden = false;
    L.boot();
    if (!L.canAdmin()) document.querySelectorAll('.rail-btn[data-open="web"], .tab[data-tab="web"]').forEach(function (x) { x.style.display = 'none'; });
    // Daten auffrischen, wenn man nach einer Weile zurückkommt (Änderungen von Kolleg:innen)
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && Date.now() - L.remote.loadedAt > 60000 && !L.remote.pending() && !document.getElementById('modal-root')) {
        countPending().then(function () { return L.remote.reload(); }).catch(function () {});
      }
    });
    sb.auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_OUT') location.replace('login.html'); });
  }
  start();
})(window.L);
