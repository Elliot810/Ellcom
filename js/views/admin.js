/* Bürokratie & Verwaltung – Fristen, Dokumente, Pflichten-Check */
(function (L) {
  'use strict';

  var CAT = { Steuern: 'red', Personal: 'blue', Betrieb: 'green', 'Verträge': 'purple', Sonstiges: 'gray' };

  function deadlines() {
    var S = L.S, T = L.todayIso(), showDone = !!S.ui.showDone;
    var list = S.deadlines.filter(function (f) { return showDone || !f.done; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var groups = {};
    list.forEach(function (f) { var k = f.date.slice(0, 7); (groups[k] = groups[k] || []).push(f); });
    var html = '<div class="filters"><label class="check inline"><input type="checkbox" id="show-done"' + (showDone ? ' checked' : '') + '><span>Erledigte anzeigen</span></label></div>';
    html += Object.keys(groups).length ? Object.keys(groups).map(function (k) {
      var d = L.parse(k + '-01');
      return '<h3 class="sub-title">' + L.MONTHS[d.getMonth()] + ' ' + d.getFullYear() + '</h3><ul class="deadlines">' + groups[k].map(function (f) {
        var n = L.days(T, f.date), cls = f.done ? 'done' : (n < 0 ? 'late' : (n <= 7 ? 'soon' : ''));
        return '<li class="' + cls + '"><input type="checkbox" data-f="' + f.id + '"' + (f.done ? ' checked' : '') + '><div class="dl-date"><b>' + L.parse(f.date).getDate() + '</b><span>' + L.WD[L.wdIdx(f.date)] + '</span></div>' +
          '<div class="dl-text"><span>' + L.h(f.title) + '</span><span class="muted small">' + (f.done ? 'erledigt' : L.rel(f.date)) + '</span></div>' + L.tag(f.cat, CAT[f.cat] || 'gray') + '</li>';
      }).join('') + '</ul>';
    }).join('') : L.empty('calendar-check', 'Keine offenen Fristen.');
    html += '<p class="muted small note">' + L.icon('info', 'tiny') + 'Fristen vereinfacht berechnet (monatliche Voranmeldung ohne Dauerfristverlängerung, Wochenenden berücksichtigt, Feiertage nicht). Keine Steuer- oder Rechtsberatung.</p>';
    return {
      title: 'Bürokratie & Verwaltung', icon: 'landmark',
      actions: '<button class="btn btn-primary" id="add-f">' + L.icon('plus') + 'Frist hinzufügen</button>',
      html: html,
      mount: function (root, main) {
        root.querySelector('#show-done').onchange = function () { S.ui.showDone = this.checked; L.save(); L.render(); };
        root.querySelectorAll('[data-f]').forEach(function (c) { c.onchange = function () { var f = S.deadlines.filter(function (x) { return x.id === c.dataset.f; })[0]; f.done = c.checked; L.save(); if (c.checked) L.toast('Erledigt: ' + f.title); setTimeout(L.render, 250); }; });
        main.querySelector('#add-f').onclick = function () {
          L.modal({ title: 'Frist hinzufügen', submit: 'Speichern',
            body: L.field('Titel', L.input('title', '', 'required')) + '<div class="grid-2">' + L.field('Datum', L.input('date', L.add(T, 14), 'type="date" required')) + L.field('Kategorie', L.select('cat', Object.keys(CAT), 'Sonstiges')) + '</div>',
            onSubmit: function (d) { S.deadlines.push({ id: L.uid('f'), title: d.title, date: d.date, cat: d.cat, done: false }); L.save(); L.toast('Frist angelegt'); L.render(); } });
        };
      }
    };
  }

  function documents() {
    var S = L.S;
    var empDocs = S.docs.map(function (d) { var e = L.emp(d.empId); return { name: d.name, cat: 'Personal', date: d.date, note: e ? L.name(e) : '', status: d.status, link: e ? '#/personal/mitarbeiter/' + e.id : null }; });
    var all = S.documents.map(function (d) { return { name: d.name, cat: d.cat, date: d.date, note: d.note, status: '', link: null }; }).concat(L.on('personal') ? empDocs : []);
    var filter = S.ui.docFilter || 'Alle';
    var cats = ['Alle'].concat(Object.keys(all.reduce(function (m, d) { m[d.cat] = 1; return m; }, {})));
    var list = all.filter(function (d) { return filter === 'Alle' || d.cat === filter; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var html = '<div class="filters">' + cats.map(function (c) { return '<button class="chip' + (c === filter ? ' is-active' : '') + '" data-c="' + c + '">' + c + '</button>'; }).join('') + '</div>';
    html += '<div class="table-wrap"><table class="db"><thead><tr><th>' + L.icon('file-text') + 'Dokument</th><th>' + L.icon('tag') + 'Kategorie</th><th>' + L.icon('calendar') + 'Datum</th><th>' + L.icon('text') + 'Bezug / Notiz</th></tr></thead><tbody>' +
      list.map(function (d) {
        return '<tr' + (d.link ? ' class="row-link" data-link="' + d.link + '"' : '') + '><td>' + L.icon('file-text', 'muted-icon') + ' ' + L.h(d.name) + (d.status && d.status.indexOf('Entwurf') !== -1 ? ' ' + L.tag('Entwurf', 'yellow') : '') + '</td><td>' + L.tag(d.cat, 'gray') + '</td><td>' + L.fd(d.date) + '</td><td class="muted">' + L.h(d.note) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    return {
      title: 'Dokumente & Verträge', icon: 'folder-open',
      actions: '<button class="btn btn-primary" id="upl">' + L.icon('upload') + 'Hochladen</button>',
      html: html,
      mount: function (root, main) {
        root.querySelectorAll('[data-c]').forEach(function (b) { b.onclick = function () { S.ui.docFilter = b.dataset.c; L.save(); L.render(); }; });
        root.querySelectorAll('[data-link]').forEach(function (r) { r.onclick = function () { L.go(r.dataset.link); }; });
        main.querySelector('#upl').onclick = function () {
          L.modal({ title: 'Dokument ablegen', submit: 'Ablegen',
            body: L.field('Name', L.input('name', '', 'required')) + '<div class="grid-2">' + L.field('Kategorie', L.select('cat', ['Vertrag', 'Recht', 'Versicherung', 'Datenschutz', 'Gründung', 'Sonstiges'], 'Vertrag')) + L.field('Datum', L.input('date', L.todayIso(), 'type="date"')) + '</div>' + L.field('Notiz', L.input('note', '')) +
              '<p class="muted small">Der echte Datei-Upload folgt mit der Datenbank-Anbindung.</p>',
            onSubmit: function (d) { S.documents.push({ id: L.uid('g'), name: d.name, cat: d.cat, date: d.date, note: d.note }); L.save(); L.toast('Dokument abgelegt'); L.render(); } });
        };
      }
    };
  }

  function compliance() {
    var S = L.S;
    var items = S.compliance.slice();
    // Personalbezogene Pflicht aus der Personalakte ableiten (Verknüpfung)
    var food = L.activeEmployees().filter(function (e) { return ['Küche', 'Service', 'Events'].indexOf(e.dept) !== -1; });
    var missing = food.filter(function (e) { return !S.docs.some(function (d) { return d.empId === e.id && d.name.indexOf('IfSG') !== -1; }); });
    var done = items.filter(function (i) { return i.done; }).length + (missing.length ? 0 : 1);
    var total = items.length + 1;
    var groups = {};
    items.forEach(function (i) { (groups[i.group] = groups[i.group] || []).push(i); });
    var html = '<div class="compliance-head"><div class="big-pct">' + Math.round(done / total * 100) + ' %</div><div><b>' + done + ' von ' + total + ' Punkten erfüllt</b>' + L.progress(done, total) + '</div></div>';
    html += Object.keys(groups).map(function (g) {
      return '<h3 class="sub-title">' + L.h(g) + '</h3><ul class="checklist big">' + groups[g].map(function (i) {
        return '<li><label><input type="checkbox" data-q="' + i.id + '"' + (i.done ? ' checked' : '') + '><span' + (i.done ? ' class="done"' : '') + '>' + L.h(i.label) + '</span></label>' +
          (i.id === 'q4' && L.on('organisation') ? '<a class="small" href="#/organisation/aufgaben">Aufgabe ansehen</a>' : '') + '</li>';
      }).join('') + '</ul>';
    }).join('');
    html += '<h3 class="sub-title">Personal</h3><ul class="checklist big"><li class="' + (missing.length ? 'warn-item' : '') + '"><label><input type="checkbox" disabled' + (missing.length ? '' : ' checked') + '><span' + (missing.length ? '' : ' class="done"') + '>Belehrung nach § 43 IfSG für alle Mitarbeitenden mit Lebensmittelkontakt</span></label>' +
      (missing.length ? '<span class="hint-warn">fehlt: ' + missing.map(function (e) { return '<a href="#/personal/mitarbeiter/' + e.id + '">' + L.h(e.first) + '</a>'; }).join(', ') + '</span>' : '<span class="muted small">automatisch aus der Personalakte</span>') + '</li></ul>';
    html += '<p class="muted small note">' + L.icon('info', 'tiny') + 'Checkliste zur Orientierung, keine Rechtsberatung. Welche Pflichten gelten, hängt von Branche, Rechtsform und Größe ab.</p>';
    return {
      title: 'Pflichten-Check', icon: 'shield-check', html: html,
      mount: function (root) {
        root.querySelectorAll('[data-q]').forEach(function (c) { c.onchange = function () { var q = S.compliance.filter(function (x) { return x.id === c.dataset.q; })[0]; q.done = c.checked; L.save(); L.render(); }; });
      }
    };
  }

  L.views.verwaltung = function (sub) {
    if (sub === 'dokumente') return documents();
    if (sub === 'pflichten') return compliance();
    return deadlines();
  };
})(window.L);
