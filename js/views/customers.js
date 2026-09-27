/* Kunden & Vertrieb */
(function (L) {
  'use strict';

  var STAGES = ['Lead', 'Angebot', 'Verhandlung', 'Kunde', 'Verloren'];
  var STAGE_COLOR = { Lead: 'gray', Angebot: 'yellow', Verhandlung: 'orange', Kunde: 'green', Verloren: 'red' };

  function revenue(cid) {
    return L.S.invoices.filter(function (i) { return i.customerId === cid && i.status !== 'Entwurf'; }).reduce(function (s, i) { return s + L.invGross(i); }, 0);
  }

  function newCustomer() {
    L.modal({
      title: 'Neuer Kontakt', submit: 'Anlegen',
      body: L.field('Firma / Name', L.input('name', '', 'required')) +
        '<div class="grid-2">' + L.field('Ansprechpartner', L.input('contact', '')) + L.field('E-Mail', L.input('email', '', 'type="email"')) + '</div>' +
        '<div class="grid-2">' + L.field('Phase', L.select('stage', STAGES.slice(0, 4), 'Lead')) + L.field('Geschätzter Wert (€)', L.input('value', '', 'type="number" min="0" step="100"')) + '</div>' +
        L.field('Stundensatz (€)', L.input('rate', '60', 'type="number" min="0" step="1"'), 'Wird für Rechnungen aus der Zeiterfassung verwendet.'),
      onSubmit: function (d) {
        L.S.customers.push({ id: L.uid('c'), name: d.name, contact: d.contact, email: d.email, stage: d.stage, value: Number(d.value) || 0, last: L.todayIso(), rate: Number(d.rate) || 60 });
        L.save(); L.toast(d.name + ' angelegt'); L.render();
      }
    });
  }

  L.customerDetail = function (cid) {
    var c = L.cust(cid);
    var inv = L.S.invoices.filter(function (i) { return i.customerId === cid; });
    var open = L.unbilled(cid), openH = open.reduce(function (s, t) { return s + L.entryHours(t); }, 0);
    var projects = L.S.projects.filter(function (p) { return p.customerId === cid; });
    var body = '<div class="props">' +
      prop('user', 'Ansprechpartner', L.h(c.contact || '–')) + prop('mail', 'E-Mail', L.h(c.email || '–')) +
      prop('circle-dot', 'Phase', L.tag(c.stage, STAGE_COLOR[c.stage])) + prop('euro', 'Potenzial', L.eur(c.value, 0)) +
      prop('clock', 'Stundensatz', L.eur(c.rate, 0)) + prop('history', 'Letzter Kontakt', L.fd(c.last) + ' (' + L.rel(c.last) + ')') + '</div>';
    body += '<h3 class="sub-title">Rechnungen</h3>' + (inv.length ? '<ul class="mini-list">' + inv.map(function (i) {
      var st = L.invStatus(i);
      return '<li><span class="mono">' + i.no + '</span><span>' + L.fd(i.date) + '</span><span class="num">' + L.eur(L.invGross(i)) + '</span>' + L.tag(st, { 'Entwurf': 'gray', 'Offen': 'blue', 'Überfällig': 'red', 'Bezahlt': 'green' }[st]) + '</li>';
    }).join('') + '</ul>' : '<p class="muted">Noch keine Rechnungen.</p>');
    if (L.on('schichten') || open.length) body += '<h3 class="sub-title">Offene Stunden</h3>' + (open.length ? '<p>' + L.num(openH, 1) + ' h aus der Zeiterfassung, noch nicht abgerechnet (' + L.eur(openH * c.rate) + ' netto).</p>' : '<p class="muted">Keine offenen Stunden.</p>');
    if (projects.length) body += '<h3 class="sub-title">Projekte</h3><ul class="mini-list">' + projects.map(function (p) { return '<li><span>' + L.h(p.name) + '</span>' + L.tag(p.status, 'blue') + '</li>'; }).join('') + '</ul>';
    L.modal({
      title: c.name, wide: true, body: body, noFocus: true,
      footerLeft: '<button type="button" class="btn" id="cd-offer">' + L.icon('file-text') + 'Angebot aus Vorlage</button><button type="button" class="btn" id="cd-contact">' + L.icon('phone') + 'Kontakt vermerken</button>' +
        (open.length && L.on('finanzen') ? '<button type="button" class="btn btn-primary" id="cd-bill">' + L.icon('receipt') + 'Stunden abrechnen</button>' : ''),
      onMount: function (f) {
        f.querySelector('#cd-contact').onclick = function () { c.last = L.todayIso(); L.save(); L.toast('Kontakt mit ' + c.name + ' vermerkt'); L.closeModal(); L.render(); };
        f.querySelector('#cd-offer').onclick = function () { L.closeModal(); L.useTemplate('angebot', { customer: c }); };
        var b = f.querySelector('#cd-bill');
        if (b) b.onclick = function () { var i = L.billCustomer(cid); L.closeModal(); L.render(); L.invoicePreview(i); };
      }
    });
  };
  function prop(icon, label, val) { return '<div class="prop"><span class="prop-label">' + L.icon(icon) + label + '</span><span class="prop-val">' + val + '</span></div>'; }
  L.prop = prop;

  function pipeline() {
    var S = L.S;
    var html = '<div class="board">' + STAGES.map(function (st) {
      var list = S.customers.filter(function (c) { return c.stage === st; });
      var sum = list.reduce(function (s, c) { return s + c.value; }, 0);
      return '<div class="col" data-stage="' + st + '"><div class="col-head">' + L.tag(st, STAGE_COLOR[st]) + '<span class="muted">' + list.length + '</span><span class="spacer"></span><span class="muted small">' + L.eur(sum, 0) + '</span></div>' +
        list.map(function (c) {
          return '<div class="bcard" data-id="' + c.id + '"><div class="bcard-title">' + L.h(c.name) + '</div><div class="bcard-meta">' + L.h(c.contact || '') + '</div>' +
            '<div class="bcard-foot"><span>' + L.eur(c.value, 0) + '</span><span class="muted">' + L.rel(c.last) + '</span></div></div>';
        }).join('') + '<button class="col-add" data-add="' + st + '">' + L.icon('plus') + 'Neu</button></div>';
    }).join('') + '</div>';
    var won = S.customers.filter(function (c) { return c.stage === 'Kunde'; }).length, lost = S.customers.filter(function (c) { return c.stage === 'Verloren'; }).length;
    var pipe = S.customers.filter(function (c) { return ['Lead', 'Angebot', 'Verhandlung'].indexOf(c.stage) !== -1; }).reduce(function (s, c) { return s + c.value; }, 0);
    return {
      title: 'Kunden & Vertrieb', icon: 'handshake', wide: true,
      desc: 'Pipeline-Volumen <b>' + L.eur(pipe, 0) + '</b> · Abschlussquote <b>' + Math.round(won / Math.max(1, won + lost) * 100) + ' %</b> · Karten per Drag &amp; Drop verschieben',
      actions: '<button class="btn btn-primary" id="add-c">' + L.icon('plus') + 'Neuer Kontakt</button>',
      html: html,
      mount: function (root, main) {
        main.querySelector('#add-c').onclick = newCustomer;
        root.querySelectorAll('[data-add]').forEach(function (b) { b.onclick = newCustomer; });
        root.querySelectorAll('.bcard').forEach(function (el) { el.onclick = function () { L.customerDetail(el.dataset.id); }; });
        L.dnd(root, {
          item: '.bcard', zone: '.col', onDrop: function (id, zone) {
            var c = L.cust(id), st = zone.dataset.stage;
            if (c.stage === st) return;
            c.stage = st; c.last = L.todayIso(); L.save();
            L.toast(st === 'Kunde' ? 'Gewonnen: ' + c.name + ' ist jetzt Kunde' : c.name + ' → ' + st);
            L.render();
          }
        });
      }
    };
  }

  function list() {
    var S = L.S;
    var rows = S.customers.slice().sort(function (a, b) { return STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage) || a.name.localeCompare(b.name); });
    var html = '<div class="table-wrap"><table class="db"><thead><tr><th>' + L.icon('building-2') + 'Kunde</th><th>' + L.icon('user') + 'Ansprechpartner</th><th>' + L.icon('circle-dot') + 'Phase</th><th class="num">' + L.icon('euro') + 'Umsatz</th><th class="num">' + L.icon('timer') + 'Offene Std.</th><th>' + L.icon('history') + 'Letzter Kontakt</th></tr></thead><tbody>' +
      rows.map(function (c) {
        var h = L.unbilled(c.id).reduce(function (s, t) { return s + L.entryHours(t); }, 0);
        return '<tr class="row-link" data-c="' + c.id + '"><td><b>' + L.h(c.name) + '</b></td><td>' + L.h(c.contact || '–') + '</td><td>' + L.tag(c.stage, STAGE_COLOR[c.stage]) + '</td><td class="num">' + (revenue(c.id) ? L.eur(revenue(c.id), 0) : '–') + '</td><td class="num">' + (h ? L.num(h, 1) + ' h' : '–') + '</td><td>' + L.rel(c.last) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    return {
      title: 'Alle Kunden', icon: 'building-2',
      actions: '<button class="btn btn-primary" id="add-c">' + L.icon('plus') + 'Neuer Kontakt</button>',
      html: html,
      mount: function (root, main) {
        main.querySelector('#add-c').onclick = newCustomer;
        root.querySelectorAll('[data-c]').forEach(function (r) { r.onclick = function () { L.customerDetail(r.dataset.c); }; });
      }
    };
  }

  function support() {
    var S = L.S, filter = S.ui.tFilter || 'Offen';
    var topics = {};
    S.tickets.forEach(function (t) { topics[t.topic] = (topics[t.topic] || 0) + 1; });
    var keys = Object.keys(topics).sort(function (a, b) { return topics[b] - topics[a]; }), max = topics[keys[0]] || 1;
    var list = S.tickets.filter(function (t) { return filter === 'Alle' || (filter === 'Offen' ? !t.done : t.done); }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var html = '<div class="split">' +
      '<div><div class="filters">' + ['Offen', 'Gelöst', 'Alle'].map(function (f) { return '<button class="chip' + (f === filter ? ' is-active' : '') + '" data-f="' + f + '">' + f + '</button>'; }).join('') + '</div>' +
      (list.length ? '<div class="table-wrap"><table class="db"><thead><tr><th></th><th>' + L.icon('text') + 'Betreff</th><th>' + L.icon('building-2') + 'Kunde</th><th>' + L.icon('tag') + 'Thema</th><th>' + L.icon('clock') + 'Eingang</th></tr></thead><tbody>' +
        list.map(function (t) {
          return '<tr><td class="w-check"><input type="checkbox" data-t="' + t.id + '"' + (t.done ? ' checked' : '') + '></td><td' + (t.done ? ' class="done"' : '') + '>' + L.h(t.subject) + '</td><td>' + L.h(L.cust(t.customerId).name) + '</td><td>' + L.tag(t.topic, 'gray') + '</td><td>' + L.rel(t.date) + '</td></tr>';
        }).join('') + '</tbody></table></div>' : L.empty('inbox', 'Keine Tickets in dieser Ansicht.')) + '</div>' +
      '<section class="card card-flat"><div class="card-head"><span class="card-title">' + L.icon('chart-bar') + 'Nach Themen</span></div><ul class="topics">' +
      keys.map(function (k) { return '<li class="topic"><span>' + L.h(k) + '</span><span class="topic-count">' + topics[k] + '</span><span class="topic-bar"><span style="width:' + (topics[k] / max * 100) + '%"></span></span></li>'; }).join('') + '</ul></section></div>';
    return {
      title: 'Support', icon: 'life-buoy', html: html,
      mount: function (root) {
        root.querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { S.ui.tFilter = b.dataset.f; L.save(); L.render(); }; });
        root.querySelectorAll('[data-t]').forEach(function (c) { c.onchange = function () { var t = S.tickets.filter(function (x) { return x.id === c.dataset.t; })[0]; t.done = c.checked; L.save(); L.toast(c.checked ? 'Ticket gelöst' : 'Ticket wieder geöffnet'); setTimeout(L.render, 250); }; });
      }
    };
  }

  L.views.kunden = function (sub) {
    if (sub === 'liste') return list();
    if (sub === 'support') return support();
    return pipeline();
  };
})(window.L);
