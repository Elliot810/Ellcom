/* Organisation – Aufgaben & Projekte */
(function (L) {
  'use strict';

  var PRIO = { Hoch: 'red', Mittel: 'yellow', Niedrig: 'gray' };
  var PSTAT = { 'In Planung': 'yellow', 'Läuft': 'blue', 'Laufend': 'gray', 'Abschluss': 'orange', 'Erledigt': 'green' };

  function taskModal(t) {
    var S = L.S, isNew = !t;
    L.modal({
      title: isNew ? 'Neue Aufgabe' : 'Aufgabe bearbeiten', submit: isNew ? 'Anlegen' : 'Speichern',
      body: L.field('Titel', L.input('title', t ? t.title : '', 'required')) +
        '<div class="grid-3">' + L.field('Fällig', L.input('due', t ? (t.due || '') : L.add(L.todayIso(), 3), 'type="date"')) + L.field('Priorität', L.select('prio', ['Hoch', 'Mittel', 'Niedrig'], t ? t.prio : 'Mittel')) +
        L.field('Zuständig', L.select('owner', [['', 'Du']].concat(L.activeEmployees().map(function (e) { return [e.id, L.name(e)]; })), t ? (t.owner || '') : '')) + '</div>' +
        L.field('Projekt', L.select('proj', [['', '–']].concat(S.projects.map(function (p) { return [p.id, p.name]; })), t ? (t.projectId || '') : (S.ui.taskProject || ''))),
      footerLeft: t ? '<button type="button" class="btn btn-ghost-danger" id="t-del">' + L.icon('trash-2') + 'Löschen</button>' : '',
      onMount: function (f) { var d = f.querySelector('#t-del'); if (d) d.onclick = function () { S.tasks = S.tasks.filter(function (x) { return x !== t; }); L.save(); L.closeModal(); L.toast('Aufgabe gelöscht'); L.render(); }; },
      onSubmit: function (d) {
        var x = t || { id: L.uid('k'), done: false };
        x.title = d.title; x.due = d.due || null; x.prio = d.prio; x.owner = d.owner || null; x.projectId = d.proj || null;
        if (isNew) S.tasks.push(x);
        L.save(); L.toast(isNew ? 'Aufgabe angelegt' : 'Gespeichert'); L.render();
      }
    });
  }

  function tasks() {
    var S = L.S, T = L.todayIso(), filter = S.ui.taskFilter || 'Offen', pf = S.ui.taskProject || '';
    var list = S.tasks.filter(function (t) { return (filter === 'Alle' || (filter === 'Offen' ? !t.done : t.done)) && (!pf || t.projectId === pf); })
      .sort(function (a, b) { return (a.done - b.done) || ((a.due || '9') < (b.due || '9') ? -1 : 1); });
    var html = '<div class="filters">' + ['Offen', 'Erledigt', 'Alle'].map(function (f) { return '<button class="chip' + (f === filter ? ' is-active' : '') + '" data-f="' + f + '">' + f + '</button>'; }).join('') +
      '<span class="spacer"></span>' + L.select('pf', [['', 'Alle Projekte']].concat(S.projects.map(function (p) { return [p.id, p.name]; })), pf, 'class="sel-sm" id="pf"') + '</div>';
    html += '<div class="table-wrap"><table class="db"><thead><tr><th class="w-check"></th><th>' + L.icon('text') + 'Aufgabe</th><th>' + L.icon('folder') + 'Projekt</th><th>' + L.icon('calendar') + 'Fällig</th><th>' + L.icon('flag') + 'Priorität</th><th>' + L.icon('user') + 'Zuständig</th></tr></thead><tbody>' +
      list.map(function (t) {
        var p = t.projectId ? L.proj(t.projectId) : null, o = t.owner ? L.emp(t.owner) : null, late = !t.done && t.due && t.due < T;
        return '<tr class="row-link" data-t="' + t.id + '"><td class="w-check"><input type="checkbox" data-done="' + t.id + '"' + (t.done ? ' checked' : '') + '></td><td class="' + (t.done ? 'done' : '') + '">' + L.h(t.title) + '</td>' +
          '<td>' + (p ? L.h(p.name) : '<span class="muted">–</span>') + '</td><td class="' + (late ? 'late' : '') + '">' + (t.due ? L.fds(t.due) + ' <span class="muted">' + L.rel(t.due) + '</span>' : '–') + '</td>' +
          '<td>' + L.tag(t.prio, PRIO[t.prio]) + '</td><td>' + (o ? '<span class="person">' + L.avatar(o, 20) + L.h(o.first) + '</span>' : '<span class="muted">Du</span>') + '</td></tr>';
      }).join('') + '<tr class="add-row"><td class="w-check">' + L.icon('plus') + '</td><td colspan="5"><input id="quick-add" placeholder="Neue Aufgabe eingeben und Enter drücken …"></td></tr></tbody></table></div>';
    return {
      title: 'Organisation', icon: 'square-check-big',
      actions: '<button class="btn btn-primary" id="add-t">' + L.icon('plus') + 'Neue Aufgabe</button>',
      html: html,
      mount: function (root, main) {
        main.querySelector('#add-t').onclick = function () { taskModal(null); };
        root.querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { S.ui.taskFilter = b.dataset.f; L.save(); L.render(); }; });
        root.querySelector('#pf').onchange = function () { S.ui.taskProject = this.value; L.save(); L.render(); };
        root.querySelectorAll('[data-done]').forEach(function (c) {
          c.onclick = function (e) { e.stopPropagation(); };
          c.onchange = function () { var t = S.tasks.filter(function (x) { return x.id === c.dataset.done; })[0]; t.done = c.checked; L.save(); if (c.checked) L.toast('Erledigt: ' + t.title); setTimeout(L.render, 250); };
        });
        root.querySelectorAll('[data-t]').forEach(function (r) { r.onclick = function () { taskModal(S.tasks.filter(function (x) { return x.id === r.dataset.t; })[0]); }; });
        var q = root.querySelector('#quick-add');
        q.onkeydown = function (e) {
          if (e.key === 'Enter' && q.value.trim()) {
            S.tasks.push({ id: L.uid('k'), title: q.value.trim(), done: false, prio: 'Mittel', due: null, projectId: pf || null, owner: null });
            L.save(); L.render(); setTimeout(function () { var n = document.getElementById('quick-add'); if (n) n.focus(); }, 20);
          }
        };
      }
    };
  }

  function projects() {
    var S = L.S;
    var html = '<div class="proj-grid">' + S.projects.map(function (p) {
      var ts = S.tasks.filter(function (t) { return t.projectId === p.id; }), done = ts.filter(function (t) { return t.done; }).length;
      var c = p.customerId ? L.cust(p.customerId) : null;
      var hours = S.time.filter(function (t) { return t.projectId === p.id; }).reduce(function (s, t) { return s + L.entryHours(t); }, 0);
      return '<section class="card card-flat proj" data-p="' + p.id + '"><div class="card-head"><span class="card-title">' + L.icon(c ? 'briefcase' : 'folder') + L.h(p.name) + '</span>' + L.tag(p.status, PSTAT[p.status] || 'gray') + '</div>' +
        '<div class="muted small">' + (c ? L.h(c.name) : 'Intern') + (p.due ? ' · bis ' + L.fd(p.due) : '') + '</div>' +
        '<div class="ob-progress">' + L.progress(done, ts.length) + '<span class="muted small">' + done + '/' + ts.length + ' Aufgaben</span></div>' +
        (hours ? '<div class="muted small">' + L.icon('timer', 'tiny') + L.num(hours, 1) + ' h erfasst</div>' : '') + '</section>';
    }).join('') + '<button class="card card-flat proj proj-add" id="add-p">' + L.icon('plus') + 'Neues Projekt</button></div>';
    return {
      title: 'Projekte', icon: 'folder-kanban', html: html,
      mount: function (root) {
        root.querySelectorAll('[data-p]').forEach(function (el) { el.onclick = function () { S.ui.taskProject = el.dataset.p; S.ui.taskFilter = 'Alle'; L.save(); L.go('#/organisation/aufgaben'); }; });
        root.querySelector('#add-p').onclick = function () {
          L.modal({ title: 'Neues Projekt', submit: 'Anlegen',
            body: L.field('Name', L.input('name', '', 'required')) + '<div class="grid-2">' + L.field('Kunde', L.select('cust', [['', 'Intern']].concat(S.customers.map(function (c) { return [c.id, c.name]; })), '')) + L.field('Fertig bis', L.input('due', '', 'type="date"')) + '</div>',
            onSubmit: function (d) { S.projects.push({ id: L.uid('p'), name: d.name, customerId: d.cust || null, status: 'In Planung', due: d.due || null }); L.save(); L.toast('Projekt angelegt'); L.render(); } });
        };
      }
    };
  }

  L.views.organisation = function (sub) { return sub === 'projekte' ? projects() : tasks(); };
})(window.L);
