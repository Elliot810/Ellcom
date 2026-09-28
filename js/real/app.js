/* Lincom – echte App: Konto, Firma, Mitglieder, Rollen und Beitrittsanfragen (Supabase) */
(function (L) {
  'use strict';

  var ROLES = {
    owner: { label: 'Inhaber', color: 'purple', desc: 'Voller Zugriff, inklusive Rechte und Abo.' },
    admin: { label: 'Admin', color: 'blue', desc: 'Verwaltet Firma, Mitglieder und alle Bereiche.' },
    planner: { label: 'Dienstplanung', color: 'orange', desc: 'Sieht alle Mitarbeitenden und setzt Schichten für andere.' },
    hr: { label: 'Personal', color: 'green', desc: 'Personalakten, Verträge und Beitrittsanfragen.' },
    accounting: { label: 'Buchhaltung', color: 'yellow', desc: 'Finanzen; sieht Mitarbeitende, aber keine Verträge.' },
    employee: { label: 'Mitarbeiter', color: 'gray', desc: 'Sieht eigene Schichten, offene Schichten und den eigenen Vertrag.' }
  };
  var ROLE_ORDER = ['owner', 'admin', 'planner', 'hr', 'accounting', 'employee'];
  var INDUSTRIES = ['Gastronomie', 'Event & Catering', 'Einzelhandel', 'Mobilität & Logistik', 'Handwerk', 'Agentur', 'Beratung', 'Gesundheit & Pflege', 'Sonstiges'];

  var S = { user: null, profile: null, members: [], cid: null, pending: 0, pollT: null };

  /* ---------- Hilfen ---------- */
  function $(id) { return document.getElementById(id); }
  function role() { var m = cur(); return m ? m.role : null; }
  function cur() { return S.members.filter(function (m) { return m.company_id === S.cid; })[0] || null; }
  function company() { var m = cur(); return m ? m.companies : null; }
  function is(list) { return list.indexOf(role()) !== -1; }
  function grantable() {
    var r = role();
    if (r === 'owner') return ROLE_ORDER.slice();
    if (r === 'admin') return ROLE_ORDER.filter(function (x) { return x !== 'owner'; });
    if (r === 'hr') return ['employee'];
    return [];
  }
  function roleTag(r) { var d = ROLES[r] || ROLES.employee; return L.tag(d.label, d.color); }
  function firstName() { var n = (S.profile && S.profile.full_name) || ''; return n.split(' ')[0] || 'da'; }
  function initials(name) { var p = (name || '?').trim().split(/\s+/); return ((p[0] || '?').charAt(0) + (p[1] ? p[1].charAt(0) : '')).toUpperCase(); }
  function av(name) { return '<span class="rw-av">' + L.h(initials(name)) + '</span>'; }
  function date(d) { return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  function time(d) { return new Date(d).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); }
  function dayLabel(d) {
    var x = new Date(d), t = new Date(); t.setHours(0, 0, 0, 0);
    var diff = Math.round((new Date(x.getFullYear(), x.getMonth(), x.getDate()) - t) / 864e5);
    if (diff === 0) return 'Heute'; if (diff === 1) return 'Morgen';
    return x.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
  }
  function fail(e) { L.toast(lincomError(e), 'warn'); }
  async function q(p) { var r = await p; if (r.error) throw r.error; return r.data; }
  function copy(text, label) {
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { L.toast((label || 'Text') + ' kopiert'); }, function () { L.toast('Kopieren nicht möglich', 'warn'); });
  }

  /* ---------- Daten laden ---------- */
  async function loadMe() {
    var u = await sb.auth.getUser();
    if (u.error || !u.data.user) { location.replace('login.html'); return false; }
    S.user = u.data.user;
    S.profile = await q(sb.from('profiles').select('full_name').eq('id', S.user.id).maybeSingle()) || { full_name: '' };
    S.members = await q(sb.from('memberships')
      .select('company_id, role, employee_id, created_at, companies(id, name, industry, searchable, join_code, plan)')
      .eq('user_id', S.user.id).order('created_at'));
    var saved = null; try { saved = localStorage.getItem('lincomCompany'); } catch (e) {}
    S.cid = S.members.some(function (m) { return m.company_id === saved; }) ? saved : (S.members[0] ? S.members[0].company_id : null);
    S.pending = 0;
    if (S.cid && is(['owner', 'admin', 'hr'])) {
      var c = await sb.from('join_requests').select('id', { count: 'exact', head: true }).eq('company_id', S.cid).eq('status', 'pending');
      S.pending = c.count || 0;
    }
    return true;
  }
  function setCompany(id) { S.cid = id; try { localStorage.setItem('lincomCompany', id); } catch (e) {} }

  /* ---------- Rahmen ---------- */
  var NAV = [
    { key: 'uebersicht', label: 'Übersicht', icon: 'layout-dashboard' },
    { key: 'mitglieder', label: 'Mitglieder', icon: 'users' },
    { key: 'anfragen', label: 'Beitrittsanfragen', icon: 'user-plus', roles: ['owner', 'admin', 'hr'] },
    { key: 'firma', label: 'Firma', icon: 'building-2', roles: ['owner', 'admin'] }
  ];

  function renderSidebar(route) {
    var c = company(), html = '';
    html += '<div class="rw-switch"><button class="brand rw-switch-btn" id="switch-btn"><span class="brand-mark">' + L.h(c.name.charAt(0).toUpperCase()) + '</span><span class="brand-name">' + L.h(c.name) + '</span>' + L.icon('chevrons-up-down', 'rw-chev') + '</button>' +
      '<div class="menu rw-switch-menu" id="switch-menu">' +
      S.members.map(function (m) {
        return '<button class="nav-item" data-company="' + m.company_id + '">' + L.icon(m.company_id === S.cid ? 'check' : 'building-2') + '<span>' + L.h(m.companies.name) + '</span>' + roleTag(m.role) + '</button>';
      }).join('') +
      '<div class="rw-sep"></div><a class="nav-item" href="#/neu">' + L.icon('plus') + '<span>Weitere Firma anlegen oder beitreten</span></a></div></div>';
    NAV.forEach(function (n) {
      if (n.roles && !is(n.roles)) return;
      var count = n.key === 'anfragen' && S.pending ? '<span class="nav-count">' + S.pending + '</span>' : '';
      html += '<a href="#/' + n.key + '" class="nav-item' + (route === n.key ? ' is-active' : '') + '">' + L.icon(n.icon) + '<span>' + n.label + '</span>' + count + '</a>';
    });
    html += '<div class="nav-label">Bald verfügbar</div>';
    [['calendar-clock', 'Schichtplanung'], ['users-round', 'Personal'], ['wallet', 'Finanzen']].forEach(function (x) {
      html += '<a href="demo.html" class="nav-item nav-muted" title="In der Demo ansehen">' + L.icon(x[0]) + '<span>' + x[1] + '</span><span class="rw-soon">Demo</span></a>';
    });
    html += '<div class="sidebar-bottom">' +
      '<a href="#/konto" class="nav-item' + (route === 'konto' ? ' is-active' : '') + '">' + L.icon('circle-user') + '<span>' + L.h(S.profile.full_name || S.user.email) + '</span></a>' +
      '<button class="nav-item" id="logout">' + L.icon('log-out') + '<span>Abmelden</span></button></div>';
    $('sidebar').innerHTML = html;

    $('switch-btn').onclick = function (e) { e.stopPropagation(); $('switch-menu').classList.toggle('is-open'); };
    document.querySelectorAll('[data-company]').forEach(function (b) {
      b.onclick = async function () { setCompany(b.dataset.company); await refresh(); location.hash = '#/uebersicht'; };
    });
    $('logout').onclick = logout;
  }
  document.addEventListener('click', function () { var m = $('switch-menu'); if (m) m.classList.remove('is-open'); });

  function frame(o) {
    var c = company();
    return '<div class="topbar"><button class="icon-btn menu-btn" id="menu-btn" aria-label="Menü">' + L.icon('menu') + '</button>' +
      '<nav class="crumbs"><a href="#/uebersicht">' + L.h(c.name) + '</a>' + (o.crumb ? '<span class="crumb-sep">/</span><span>' + L.h(o.crumb) + '</span>' : '') + '</nav>' +
      '<span class="spacer"></span><span class="topbar-note">' + roleTag(role()) + '</span></div>' +
      '<div class="page"><div class="page-head">' + (o.icon ? '<div class="page-icon">' + L.icon(o.icon) + '</div>' : '') +
      '<div class="page-title-row"><h1>' + L.h(o.title) + '</h1>' + (o.actions ? '<div class="page-actions">' + o.actions + '</div>' : '') + '</div>' +
      (o.desc ? '<p class="page-desc">' + o.desc + '</p>' : '') + '</div><div class="page-body">' + o.html + '</div></div>';
  }

  async function render() {
    clearInterval(S.pollT);
    var route = (location.hash.replace(/^#\/?/, '') || 'uebersicht').split('/')[0];
    if (!S.members.length || route === 'neu') return renderOnboarding();
    $('onboard').hidden = true; $('app').hidden = false;
    var page = PAGES[route] || PAGES.uebersicht;
    if (page.roles && !is(page.roles)) { location.hash = '#/uebersicht'; return; }
    renderSidebar(route);
    var main = $('main');
    main.innerHTML = frame({ title: page.title, icon: page.icon, crumb: route === 'uebersicht' ? '' : page.title, html: '<div class="rw-skel"></div>' });
    L.refreshIcons();
    try {
      var o = await page.load();
      o.title = o.title || page.title; o.icon = page.icon; o.crumb = route === 'uebersicht' ? '' : page.title;
      main.innerHTML = frame(o);
      L.refreshIcons();
      if (o.mount) o.mount(main);
    } catch (e) {
      main.querySelector('.page-body').innerHTML = '<div class="callout warn">' + L.icon('triangle-alert') + '<span>Konnte nicht geladen werden: ' + L.h(lincomError(e)) + '</span></div>';
      L.refreshIcons();
    }
    $('menu-btn').onclick = function () { $('app').classList.toggle('sidebar-open'); };
    $('app').classList.remove('sidebar-open');
    document.title = page.title + ' – ' + company().name;
  }

  async function refresh() { if (await loadMe()) render(); }

  async function logout() {
    await sb.auth.signOut();
    try { localStorage.removeItem('lincomCompany'); } catch (e) {}
    location.replace('index.html');
  }

  /* ---------- Seiten ---------- */
  var PAGES = {};

  PAGES.uebersicht = {
    title: 'Übersicht', icon: 'layout-dashboard',
    load: async function () {
      var c = company(), manage = is(['owner', 'admin', 'hr']), seesAll = is(['owner', 'admin', 'planner', 'hr']);
      var html = '';
      if (manage) {
        var mem = await sb.from('memberships').select('user_id', { count: 'exact', head: true }).eq('company_id', S.cid);
        html += '<div class="stats">' +
          '<a class="stat" href="#/mitglieder"><span class="stat-label">' + L.icon('users') + 'Mitglieder</span><span class="stat-value">' + (mem.count || 0) + '</span></a>' +
          '<a class="stat" href="#/anfragen"><span class="stat-label">' + L.icon('user-plus') + 'Offene Anfragen</span><span class="stat-value">' + S.pending + '</span>' + (S.pending ? '<span class="stat-sub warn">Bitte prüfen</span>' : '<span class="stat-sub">Alles erledigt</span>') + '</a>' +
          '<div class="stat rw-code"><span class="stat-label">' + L.icon('key-round') + 'Firmencode zum Beitreten</span><span class="stat-value mono">' + L.h(c.join_code) + '</span>' +
          '<button class="btn btn-sm" id="copy-code">' + L.icon('copy') + 'Kopieren</button></div></div>';
      }
      // Schichten: Rechte entscheidet die Datenbank (Mitarbeiter: eigene + offene)
      var shifts = await q(sb.from('shifts').select('id, starts_at, ends_at, area, employee_id')
        .eq('company_id', S.cid).gte('ends_at', new Date().toISOString()).order('starts_at').limit(8));
      var names = {};
      if (seesAll && shifts.length) {
        var emps = await q(sb.from('employees').select('id, first_name, last_name').eq('company_id', S.cid));
        emps.forEach(function (e) { names[e.id] = e.first_name + ' ' + (e.last_name || ''); });
      }
      var me = cur().employee_id;
      html += '<h3 class="sub-title">' + (seesAll ? 'Nächste Schichten im Team' : 'Deine nächsten Schichten') + '</h3>';
      html += shifts.length ? '<ul class="rw-shifts">' + shifts.map(function (s) {
        var who = !s.employee_id ? L.tag('Offen', 'orange') : (s.employee_id === me ? L.tag('Du', 'blue') : L.h(names[s.employee_id] || ''));
        return '<li><span class="rw-day">' + dayLabel(s.starts_at) + '</span><b>' + time(s.starts_at) + '–' + time(s.ends_at) + '</b><span class="muted">' + L.h(s.area || '') + '</span><span class="spacer"></span>' + who + '</li>';
      }).join('') + '</ul>' : L.empty('calendar', seesAll ? 'Noch keine Schichten geplant.' : 'Für dich sind noch keine Schichten eingetragen.');
      html += '<div class="callout info">' + L.icon('sparkles') + '<span>Dein Firmenbereich ist echt: Konten, Rollen und Beitritte laufen über die Datenbank. Als Nächstes ziehen <b>Schichtplanung</b>, <b>Personal</b> und <b>Finanzen</b> um – bis dahin kannst du sie in der <a href="demo.html">Demo</a> ansehen.</span></div>';
      return {
        title: 'Hallo ' + firstName() + '!',
        desc: L.h(c.name) + (c.industry ? ' · ' + L.h(c.industry) : '') + ' · Deine Rolle: ' + roleTag(role()),
        html: html,
        mount: function (root) { var b = root.querySelector('#copy-code'); if (b) b.onclick = function () { copy(c.join_code, 'Firmencode'); }; }
      };
    }
  };

  PAGES.mitglieder = {
    title: 'Mitglieder', icon: 'users',
    load: async function () {
      var rows = await q(sb.from('memberships').select('user_id, role, created_at').eq('company_id', S.cid).order('created_at'));
      var profs = await q(sb.from('profiles').select('id, full_name').in('id', rows.map(function (r) { return r.user_id; })));
      var pn = {}; profs.forEach(function (p) { pn[p.id] = p.full_name; });
      var g = grantable();
      rows.sort(function (a, b) { return ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role); });
      var html = '<div class="table-wrap"><table class="db"><thead><tr><th>' + L.icon('user') + 'Name</th><th>' + L.icon('shield') + 'Rolle</th><th>' + L.icon('calendar') + 'Dabei seit</th><th></th></tr></thead><tbody>' +
        rows.map(function (r) {
          var self = r.user_id === S.user.id, name = pn[r.user_id] || 'Ohne Namen';
          var canEdit = !self && g.indexOf(r.role) !== -1 && g.length > 1;
          var roleCell = canEdit ? '<select class="sel-sm" data-role="' + r.user_id + '">' + g.map(function (x) {
            return '<option value="' + x + '"' + (x === r.role ? ' selected' : '') + '>' + ROLES[x].label + '</option>';
          }).join('') + '</select>' : roleTag(r.role);
          var act = self ? '<button class="btn btn-sm" data-leave>Firma verlassen</button>'
            : (g.indexOf(r.role) !== -1 ? '<button class="btn btn-sm btn-ghost-danger" data-remove="' + r.user_id + '" data-name="' + L.h(name) + '">Entfernen</button>' : '');
          return '<tr><td><span class="rw-person">' + av(name) + '<b>' + L.h(name) + '</b>' + (self ? '<span class="muted">(du)</span>' : '') + '</span></td><td>' + roleCell + '</td><td>' + date(r.created_at) + '</td><td class="row-actions">' + act + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      html += '<h3 class="sub-title">Was die Rollen dürfen</h3><div class="rw-roles">' + ROLE_ORDER.map(function (x) {
        return '<div class="rw-role">' + roleTag(x) + '<span>' + ROLES[x].desc + '</span></div>';
      }).join('') + '</div>';
      return {
        desc: rows.length + (rows.length === 1 ? ' Person hat' : ' Personen haben') + ' Zugriff auf ' + L.h(company().name) + '.',
        actions: is(['owner', 'admin', 'hr']) ? '<a class="btn btn-primary" href="#/anfragen">' + L.icon('user-plus') + 'Personen hinzufügen</a>' : '',
        html: html,
        mount: function (root) {
          root.querySelectorAll('[data-role]').forEach(function (sel) {
            var before = sel.value;
            sel.onchange = async function () {
              try { await q(sb.rpc('set_member_role', { p_company: S.cid, p_user: sel.dataset.role, p_role: sel.value })); before = sel.value; L.toast('Rolle geändert: ' + ROLES[sel.value].label); }
              catch (e) { sel.value = before; fail(e); }
            };
          });
          root.querySelectorAll('[data-remove]').forEach(function (b) {
            b.onclick = function () {
              L.confirm('Mitglied entfernen?', b.dataset.name + ' verliert sofort den Zugriff auf diese Firma. Der Eintrag im Personalstamm bleibt erhalten.', 'Entfernen', async function () {
                try { await q(sb.rpc('remove_member', { p_company: S.cid, p_user: b.dataset.remove })); L.toast(b.dataset.name + ' wurde entfernt'); render(); } catch (e) { fail(e); }
              });
            };
          });
          var lv = root.querySelector('[data-leave]');
          if (lv) lv.onclick = function () {
            L.confirm('Firma verlassen?', 'Du verlierst den Zugriff auf ' + company().name + '. Um wieder beizutreten, brauchst du eine neue Bestätigung.', 'Verlassen', async function () {
              try { await q(sb.rpc('remove_member', { p_company: S.cid, p_user: S.user.id })); try { localStorage.removeItem('lincomCompany'); } catch (e) {} await refresh(); location.hash = '#/uebersicht'; L.toast('Du hast die Firma verlassen'); } catch (e) { fail(e); }
            });
          };
        }
      };
    }
  };

  PAGES.anfragen = {
    title: 'Beitrittsanfragen', icon: 'user-plus', roles: ['owner', 'admin', 'hr'],
    load: async function () {
      var c = company();
      var reqs = await q(sb.from('join_requests').select('id, user_id, message, created_at').eq('company_id', S.cid).eq('status', 'pending').order('created_at'));
      var pn = {};
      if (reqs.length) (await q(sb.from('profiles').select('id, full_name').in('id', reqs.map(function (r) { return r.user_id; })))).forEach(function (p) { pn[p.id] = p.full_name; });
      var html = '<div class="rw-invite"><div><b>So kommt dein Team dazu</b><p>Mitarbeitende registrieren sich bei Lincom und suchen nach „' + L.h(c.name) + '“' + (c.searchable ? '' : ' (Suche ist ausgeschaltet)') + ' oder geben den Firmencode ein. Danach erscheint die Anfrage hier.</p></div>' +
        '<div class="rw-code-box"><span class="muted">Firmencode</span><b class="mono">' + L.h(c.join_code) + '</b><button class="btn btn-sm" id="copy-code">' + L.icon('copy') + 'Kopieren</button><button class="btn btn-sm" id="copy-link">' + L.icon('link') + 'Einladungstext</button></div></div>';
      html += '<h3 class="sub-title">Offene Anfragen</h3>';
      html += reqs.length ? '<div class="rw-reqs">' + reqs.map(function (r) {
        var name = pn[r.user_id] || 'Ohne Namen';
        return '<div class="rw-req"><div class="rw-person">' + av(name) + '<div><b>' + L.h(name) + '</b><span class="muted">angefragt am ' + date(r.created_at) + '</span></div></div>' +
          (r.message ? '<p class="rw-msg">„' + L.h(r.message) + '“</p>' : '') +
          '<div class="rw-req-actions"><button class="btn btn-sm" data-reject="' + r.id + '" data-name="' + L.h(name) + '">Ablehnen</button><button class="btn btn-sm btn-primary" data-approve="' + r.id + '" data-name="' + L.h(name) + '">' + L.icon('check') + 'Annehmen …</button></div></div>';
      }).join('') + '</div>' : L.empty('inbox', 'Keine offenen Anfragen.');
      return {
        desc: 'Beim Annehmen legst du fest, was die Person sehen und tun darf.',
        html: html,
        mount: function (root) {
          root.querySelector('#copy-code').onclick = function () { copy(c.join_code, 'Firmencode'); };
          root.querySelector('#copy-link').onclick = function () {
            copy('Hallo! Tritt unserem Firmenbereich „' + c.name + '“ in Lincom bei: Registriere dich unter ' + LINCOM_BASE + 'login.html#registrieren und gib danach den Firmencode ' + c.join_code + ' ein.', 'Einladungstext');
          };
          root.querySelectorAll('[data-reject]').forEach(function (b) {
            b.onclick = function () {
              L.confirm('Anfrage ablehnen?', b.dataset.name + ' bekommt keinen Zugriff. Die Person kann später erneut anfragen.', 'Ablehnen', async function () {
                try { await q(sb.rpc('decide_join_request', { p_request: b.dataset.reject, p_approve: false })); L.toast('Anfrage abgelehnt'); await refresh(); } catch (e) { fail(e); }
              });
            };
          });
          root.querySelectorAll('[data-approve]').forEach(function (b) { b.onclick = function () { approve(b.dataset.approve, b.dataset.name); }; });
        }
      };
    }
  };

  async function approve(reqId, name) {
    var g = grantable(), free = [];
    try { free = await q(sb.from('employees').select('id, first_name, last_name').eq('company_id', S.cid).is('user_id', null).order('first_name')); } catch (e) {}
    var body = '<p class="muted rw-lead">Welche Rolle bekommt <b>' + L.h(name) + '</b>?</p><div class="rw-role-pick">' + g.map(function (x, i) {
      return '<label class="rw-pick"><input type="radio" name="role" value="' + x + '"' + (x === 'employee' || (i === 0 && g.indexOf('employee') === -1) ? ' checked' : '') + '><span>' + roleTag(x) + '<small>' + ROLES[x].desc + '</small></span></label>';
    }).join('') + '</div>';
    if (free.length) body += L.field('Im Personalstamm', L.select('employee', [['', 'Neuen Eintrag anlegen']].concat(free.map(function (e) { return [e.id, 'Verknüpfen mit ' + e.first_name + ' ' + (e.last_name || '')]; })), ''), 'Falls die Person schon als Mitarbeiter:in angelegt ist.');
    L.modal({
      title: 'Anfrage annehmen', body: body, submit: 'Annehmen',
      onSubmit: function (d, form) {
        var btn = form.querySelector('button[type=submit]'); btn.disabled = true;
        q(sb.rpc('decide_join_request', { p_request: reqId, p_approve: true, p_role: d.role, p_employee: d.employee || null }))
          .then(async function () { L.closeModal(); L.toast(name + ' ist jetzt dabei als ' + ROLES[d.role].label); await refresh(); })
          .catch(function (e) { btn.disabled = false; fail(e); });
        return false;
      }
    });
  }

  PAGES.firma = {
    title: 'Firma', icon: 'building-2', roles: ['owner', 'admin'],
    load: async function () {
      var c = company();
      var html = '<form class="rw-form" id="f-company" novalidate>' +
        L.field('Firmenname', '<input name="name" value="' + L.h(c.name) + '" maxlength="120" required>') +
        L.field('Branche', L.select('industry', [['', '– bitte wählen –']].concat(INDUSTRIES), c.industry || '')) +
        '<label class="rw-toggle"><span class="switch"><input type="checkbox" name="searchable"' + (c.searchable ? ' checked' : '') + '><span></span></span><span><b>In der Firmensuche anzeigen</b><small>Mitarbeitende finden die Firma über ihren Namen und können eine Anfrage senden. Ausgeschaltet geht der Beitritt nur mit Firmencode. Jede Anfrage musst du trotzdem bestätigen.</small></span></label>' +
        '<div class="rw-form-foot"><button class="btn btn-primary" type="submit">Speichern</button></div></form>' +
        '<h3 class="sub-title">Abo</h3><div class="callout info">' + L.icon('badge-check') + '<span><b>Kostenlose Testphase.</b> Abo und Bezahlung werden als Nächstes angebunden.</span></div>';
      return {
        desc: 'Stammdaten und Sichtbarkeit deines Firmenbereichs.',
        html: html,
        mount: function (root) {
          root.querySelector('#f-company').onsubmit = async function (e) {
            e.preventDefault();
            var f = this, name = f.name.value.trim();
            if (name.length < 2) { f.name.classList.add('invalid'); f.name.focus(); return; }
            try {
              await q(sb.from('companies').update({ name: name, industry: f.industry.value || null, searchable: f.searchable.checked }).eq('id', S.cid));
              L.toast('Gespeichert'); await refresh();
            } catch (er) { fail(er); }
          };
        }
      };
    }
  };

  PAGES.konto = {
    title: 'Mein Konto', icon: 'circle-user',
    load: async function () {
      var html = '<form class="rw-form" id="f-profile" novalidate>' +
        L.field('Vor- und Nachname', '<input name="full_name" value="' + L.h(S.profile.full_name) + '" maxlength="120" required>') +
        L.field('E-Mail-Adresse', '<input value="' + L.h(S.user.email) + '" disabled>') +
        '<div class="rw-form-foot"><button class="btn btn-primary" type="submit">Speichern</button></div></form>' +
        '<h3 class="sub-title">Passwort ändern</h3><form class="rw-form" id="f-pass" novalidate>' +
        L.field('Neues Passwort', '<input type="password" name="pass" minlength="8" autocomplete="new-password" placeholder="Mindestens 8 Zeichen" required>') +
        '<div class="rw-form-foot"><button class="btn" type="submit">Passwort ändern</button></div></form>' +
        '<h3 class="sub-title">Abmelden</h3><button class="btn" id="logout2">' + L.icon('log-out') + 'Abmelden</button>';
      return {
        desc: 'Dein persönliches Konto – gilt für alle Firmen, in denen du Mitglied bist.',
        html: html,
        mount: function (root) {
          root.querySelector('#f-profile').onsubmit = async function (e) {
            e.preventDefault(); var v = this.full_name.value.trim();
            if (!v) { this.full_name.classList.add('invalid'); return; }
            try { await q(sb.from('profiles').update({ full_name: v }).eq('id', S.user.id)); L.toast('Name gespeichert'); await refresh(); } catch (er) { fail(er); }
          };
          root.querySelector('#f-pass').onsubmit = async function (e) {
            e.preventDefault(); var f = this;
            if (f.pass.value.length < 8) { f.pass.classList.add('invalid'); L.toast('Das Passwort braucht mindestens 8 Zeichen', 'warn'); return; }
            var r = await sb.auth.updateUser({ password: f.pass.value });
            if (r.error) fail(r.error); else { f.reset(); L.toast('Passwort geändert'); }
          };
          root.querySelector('#logout2').onclick = logout;
        }
      };
    }
  };

  /* ---------- Onboarding: Firma anlegen oder beitreten ---------- */
  async function renderOnboarding() {
    $('app').hidden = true;
    var box = $('onboard'); box.hidden = false;
    var back = S.members.length ? '<a class="btn btn-ghost" href="#/uebersicht">' + L.icon('arrow-left') + 'Zurück zu ' + L.h(company().name) + '</a>' : '';
    var reqs = [];
    try { reqs = await q(sb.rpc('my_join_requests')); } catch (e) {}
    var pending = reqs.filter(function (r) { return r.status === 'pending'; });

    box.innerHTML =
      '<header class="rw-top"><span class="brand"><span class="brand-mark">L</span><span class="brand-name">Lincom</span></span><span class="spacer"></span>' + back +
      '<span class="rw-me">' + L.h(S.user.email) + '</span><button class="btn btn-ghost" id="ob-logout">' + L.icon('log-out') + 'Abmelden</button></header>' +
      '<div class="rw-ob-inner">' +
      '<h1>' + (S.members.length ? 'Weitere Firma' : 'Willkommen, ' + L.h(firstName()) + '!') + '</h1>' +
      '<p class="rw-sub">Wie möchtest du Lincom nutzen?</p>' +
      (pending.length ? '<div class="rw-pending">' + pending.map(function (r) {
        return '<div class="rw-pending-item">' + L.icon('hourglass') + '<div><b>Anfrage an ' + L.h(r.company_name) + ' gesendet</b><span>Sobald sie angenommen wird, kommst du hier automatisch weiter.</span></div><button class="btn btn-sm" data-cancel="' + r.id + '">Zurückziehen</button></div>';
      }).join('') + '</div>' : '') +
      '<div class="rw-ob-grid">' +
        '<section class="rw-ob-card"><div class="rw-ob-icon">' + L.icon('building-2') + '</div><h2>Firma anlegen</h2><p>Für Inhaber und Geschäftsführung. Du legst den Firmenbereich an und lädst dein Team ein.</p>' +
          '<form id="f-create" novalidate>' + L.field('Firmenname', '<input name="name" maxlength="120" placeholder="z. B. Miles Mobility" required>') +
          L.field('Branche', L.select('industry', [['', '– bitte wählen –']].concat(INDUSTRIES), '')) +
          '<button class="btn btn-primary btn-block" type="submit">Firma anlegen</button></form>' +
          '<p class="rw-fine">' + L.icon('info') + 'Du wirst Inhaber:in. Aktuell kostenlose Testphase – das Abo wird später angebunden.</p></section>' +
        '<section class="rw-ob-card"><div class="rw-ob-icon">' + L.icon('user-plus') + '</div><h2>Meiner Firma beitreten</h2><p>Für Mitarbeitende. Such deine Firma oder gib den Code ein, den du bekommen hast.</p>' +
          '<label class="field"><span class="field-label">Firma suchen</span><span class="rw-search">' + L.icon('search') + '<input id="ob-q" placeholder="Firmenname (mind. 3 Zeichen)" autocomplete="off"></span></label>' +
          '<div id="ob-results" class="rw-results"></div>' +
          '<form id="f-code" class="rw-code-form" novalidate>' + L.field('Oder Firmencode', '<input name="code" maxlength="12" placeholder="z. B. 7F3A9C21" class="mono" autocomplete="off" required>') +
          '<button class="btn" type="submit">Anfrage senden</button></form></section>' +
      '</div>' +
      (reqs.some(function (r) { return r.status === 'rejected'; }) ? '<p class="rw-fine center">' + reqs.filter(function (r) { return r.status === 'rejected'; }).map(function (r) { return 'Deine Anfrage an ' + L.h(r.company_name) + ' wurde abgelehnt.'; }).join(' ') + '</p>' : '') +
      '</div>';
    L.refreshIcons();

    $('ob-logout').onclick = logout;
    box.querySelectorAll('[data-cancel]').forEach(function (b) {
      b.onclick = async function () { try { await q(sb.rpc('cancel_join_request', { p_request: b.dataset.cancel })); L.toast('Anfrage zurückgezogen'); renderOnboarding(); } catch (e) { fail(e); } };
    });

    $('f-create').onsubmit = async function (e) {
      e.preventDefault(); var f = this, name = f.name.value.trim();
      if (name.length < 2) { f.name.classList.add('invalid'); f.name.focus(); return; }
      var btn = f.querySelector('button'); btn.disabled = true;
      try {
        var id = await q(sb.rpc('create_company', { p_name: name, p_industry: f.industry.value || null }));
        setCompany(id); await loadMe(); location.hash = '#/uebersicht'; render();
        L.toast('„' + name + '“ ist angelegt – willkommen!');
      } catch (er) { btn.disabled = false; fail(er); }
    };

    var t = null, input = $('ob-q');
    input.oninput = function () {
      clearTimeout(t);
      var v = input.value.trim(), out = $('ob-results');
      if (v.length < 3) { out.innerHTML = ''; return; }
      t = setTimeout(async function () {
        try {
          var res = await q(sb.rpc('search_companies', { q: v }));
          if (input.value.trim() !== v) return;
          out.innerHTML = res.length ? res.map(function (c) {
            return '<div class="rw-result"><span class="brand-mark sm">' + L.h(c.name.charAt(0).toUpperCase()) + '</span><div><b>' + L.h(c.name) + '</b>' + (c.industry ? '<span class="muted">' + L.h(c.industry) + '</span>' : '') + '</div><button class="btn btn-sm btn-primary" data-join="' + c.id + '" data-name="' + L.h(c.name) + '">Anfrage senden</button></div>';
          }).join('') : '<p class="rw-fine">Keine Firma gefunden. Frag nach dem Firmencode.</p>';
          L.refreshIcons();
          out.querySelectorAll('[data-join]').forEach(function (b) { b.onclick = function () { askJoin(b.dataset.name, function (msg) { return sb.rpc('request_join', { p_company: b.dataset.join, p_message: msg }); }); }; });
        } catch (er) { fail(er); }
      }, 300);
    };

    $('f-code').onsubmit = function (e) {
      e.preventDefault(); var code = this.code.value.trim();
      if (code.length < 4) { this.code.classList.add('invalid'); this.code.focus(); return; }
      askJoin('diese Firma', function (msg) { return sb.rpc('request_join_by_code', { p_code: code, p_message: msg }); });
    };

    // Solange eine Anfrage offen ist, regelmäßig prüfen, ob sie angenommen wurde
    if (pending.length) S.pollT = setInterval(async function () {
      var r = await sb.from('memberships').select('company_id').eq('user_id', S.user.id);
      if (!r.error && r.data.length > S.members.length) {
        clearInterval(S.pollT);
        var fresh = r.data.filter(function (m) { return !S.members.some(function (x) { return x.company_id === m.company_id; }); })[0];
        if (fresh) setCompany(fresh.company_id);
        await loadMe(); location.hash = '#/uebersicht'; render(); L.toast('Deine Anfrage wurde angenommen – willkommen!');
      }
    }, 15000);
  }

  function askJoin(name, call) {
    L.modal({
      title: 'Anfrage an ' + name, submit: 'Anfrage senden',
      body: '<p class="muted rw-lead">Die Geschäftsführung oder Personalabteilung bestätigt deine Anfrage und legt fest, was du sehen darfst.</p>' +
        L.field('Nachricht (optional)', '<textarea name="message" rows="3" maxlength="500" placeholder="z. B. Hallo, ich bin Anna aus dem Service-Team."></textarea>'),
      onSubmit: function (d, form) {
        var btn = form.querySelector('button[type=submit]'); btn.disabled = true;
        q(call(d.message || null)).then(function () { L.closeModal(); L.toast('Anfrage gesendet'); renderOnboarding(); })
          .catch(function (e) { btn.disabled = false; fail(e); });
        return false;
      }
    });
  }

  /* ---------- Start ---------- */
  async function start() {
    $('sidebar-backdrop').onclick = function () { $('app').classList.remove('sidebar-open'); };
    try {
      if (!(await loadMe())) return;
    } catch (e) {
      $('loading').innerHTML = '<span>' + L.h(lincomError(e)) + '</span><a class="btn" href="login.html">Zur Anmeldung</a>';
      return;
    }
    $('loading').remove();
    window.addEventListener('hashchange', render);
    render();
    sb.auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_OUT') location.replace('login.html'); });
  }
  start();
})(window.L);
