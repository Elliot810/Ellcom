/* Lincom Demo – Navigation, Routing und Seitenaufbau */
(function (L) {
  'use strict';

  L.views = L.views || {};

  L.NAV = [
    { key: 'finanzen', label: 'Finanzen & Liquidität', icon: 'wallet', subs: [['uebersicht', 'Übersicht'], ['rechnungen', 'Rechnungen'], ['ausgaben', 'Ausgaben']] },
    { key: 'kunden', label: 'Kunden & Vertrieb', icon: 'handshake', subs: [['pipeline', 'Pipeline'], ['liste', 'Alle Kunden'], ['support', 'Support']] },
    { key: 'personal', label: 'Personal', icon: 'users', subs: [['mitarbeiter', 'Mitarbeiter'], ['abwesenheiten', 'Abwesenheiten'], ['onboarding', 'On- & Offboarding'], ['recruiting', 'Recruiting']] },
    { key: 'schichten', label: 'Schichten & Zeiten', icon: 'calendar-clock', subs: [['plan', 'Schichtplan'], ['tausch', 'Tauschbörse'], ['zeiten', 'Zeiterfassung']] },
    { key: 'organisation', label: 'Organisation', icon: 'square-check-big', subs: [['aufgaben', 'Aufgaben'], ['projekte', 'Projekte']] },
    { key: 'verwaltung', label: 'Bürokratie & Verwaltung', icon: 'landmark', subs: [['fristen', 'Fristen'], ['dokumente', 'Dokumente & Verträge'], ['pflichten', 'Pflichten-Check']] }
  ];
  L.navDef = function (key) { return L.NAV.filter(function (n) { return n.key === key; })[0]; };

  function parse() {
    var h = location.hash.replace(/^#\/?/, '');
    var p = h.split('/');
    return { area: p[0] || 'uebersicht', sub: p[1] || '', id: p[2] ? decodeURIComponent(p[2]) : '' };
  }
  L.route = parse;
  L.go = function (hash) { if (location.hash === hash) L.render(); else location.hash = hash; };

  /* ---------- Seitenleiste ---------- */
  function renderSidebar(r) {
    var c = L.counts();
    var html = '<a href="#/uebersicht" class="brand"><span class="brand-mark">L</span><span class="brand-name">' + L.h(L.company()) + '</span></a>';
    html += '<a href="#/uebersicht" class="nav-item' + (r.area === 'uebersicht' ? ' is-active' : '') + '">' + L.icon('layout-dashboard') + '<span>Übersicht</span></a>';
    html += '<div class="nav-label">Bereiche</div>';
    L.NAV.forEach(function (n) {
      if (!L.on(n.key)) return;
      var active = r.area === n.key;
      html += '<a href="#/' + n.key + '" class="nav-item' + (active ? ' is-open' : '') + '">' + L.icon(n.icon) + '<span>' + n.label + '</span>' +
        (c[n.key] ? '<span class="nav-count">' + c[n.key] + '</span>' : '') + '</a>';
      if (active) {
        html += '<div class="nav-subs">';
        n.subs.forEach(function (s) {
          var on = (r.sub || n.subs[0][0]) === s[0];
          html += '<a href="#/' + n.key + '/' + s[0] + '" class="nav-sub' + (on ? ' is-active' : '') + '">' + s[1] + '</a>';
        });
        html += '</div>';
      }
    });
    var off = L.NAV.filter(function (n) { return !L.on(n.key); }).length;
    html += '<a href="#/einstellungen/module" class="nav-item nav-muted">' + L.icon('blocks') + '<span>Module verwalten</span>' + (off ? '<span class="nav-count muted">+' + off + '</span>' : '') + '</a>';
    html += '<div class="sidebar-bottom"><a href="#/einstellungen" class="nav-item' + (r.area === 'einstellungen' && r.sub !== 'module' ? ' is-active' : '') + '">' + L.icon('settings') + '<span>Einstellungen</span></a></div>';
    document.getElementById('sidebar').innerHTML = html;
  }

  /* ---------- Seite ---------- */
  var lastKey = '';
  L.render = function () {
    var r = parse();
    var def = L.navDef(r.area);
    if (def && !L.on(r.area)) { location.hash = '#/uebersicht'; return; }
    if (!L.views[r.area]) { location.hash = '#/uebersicht'; return; }
    if (def && !r.sub) r.sub = def.subs[0][0];

    if (L.timer) { clearInterval(L.timer); L.timer = null; }
    L.charts = [];

    var page = L.views[r.area](r.sub, r.id) || {};
    var crumbs = ['<a href="#/uebersicht">' + L.h(L.company()) + '</a>'];
    if (def) {
      crumbs.push('<a href="#/' + def.key + '">' + def.label + '</a>');
      var sd = def.subs.filter(function (s) { return s[0] === r.sub; })[0];
      if (sd && !page.crumb) crumbs.push('<span>' + sd[1] + '</span>');
    } else if (page.title && r.area !== 'uebersicht') {
      crumbs.push('<span>' + L.h(page.crumbTitle || page.title) + '</span>');
    }
    if (page.crumb) crumbs.push('<span>' + L.h(page.crumb) + '</span>');

    var html = '<div class="topbar"><button class="icon-btn menu-btn" id="menu-btn" aria-label="Menü">' + L.icon('menu') + '</button>' +
      '<nav class="crumbs">' + crumbs.join('<span class="crumb-sep">/</span>') + '</nav><span class="spacer"></span>' +
      '<span class="topbar-note">' + L.icon('flask-conical') + 'Demo · Beispieldaten</span>' +
      '<button class="topbar-btn" id="tour-btn" title="Einführung starten">' + L.icon('graduation-cap') + '<span>Einführung</span></button></div>';
    html += '<div class="page' + (page.wide ? ' page-wide' : '') + '">';
    if (page.pre) html += page.pre;
    if (!page.noHead) {
      html += '<div class="page-head">' + (page.icon ? '<div class="page-icon">' + L.icon(page.icon) + '</div>' : '') +
        '<div class="page-title-row"><h1>' + L.h(page.title || '') + '</h1>' + (page.actions ? '<div class="page-actions">' + page.actions + '</div>' : '') + '</div>' +
        (page.desc ? '<p class="page-desc">' + page.desc + '</p>' : '') + '</div>';
    }
    if (def && !page.noTabs) {
      html += '<nav class="view-tabs">' + def.subs.map(function (s) {
        return '<a href="#/' + def.key + '/' + s[0] + '" class="view-tab' + (s[0] === r.sub ? ' is-active' : '') + '">' + s[1] + '</a>';
      }).join('') + '</nav>';
    }
    html += '<div class="page-body">' + (page.html || '') + '</div></div>';

    var main = document.getElementById('main');
    var key = r.area + '/' + r.sub + '/' + r.id;
    var keep = key === lastKey ? main.scrollTop : 0;
    main.innerHTML = html;
    lastKey = key;
    renderSidebar(r);
    L.refreshIcons();
    document.getElementById('tour-btn').addEventListener('click', function () { if (L.tour) L.tour.start(); });
    document.getElementById('menu-btn').addEventListener('click', function () { document.querySelector('.app').classList.toggle('sidebar-open'); });
    document.querySelector('.app').classList.remove('sidebar-open');
    if (page.mount) page.mount(main.querySelector('.page-body'), main);
    L.refreshIcons();
    main.scrollTop = keep;
    document.title = (page.title && r.area !== 'uebersicht' ? page.title : 'Übersicht') + ' – Lincom';
  };
  L.rerender = function () { L.render(); };

  /* ---------- Start ---------- */
  L.start = function () {
    var email = sessionStorage.getItem('lincomDemoEmail');
    if (!email) { window.location.href = 'login.html'; return; }
    L.email = email;
    L.load();
    if (L.initPanel) L.initPanel();
    window.addEventListener('hashchange', L.render);
    document.getElementById('sidebar-backdrop').addEventListener('click', function () { document.querySelector('.app').classList.remove('sidebar-open'); });
    L.render();
    if (L.tour) L.tour.auto();
  };
})(window.L);
