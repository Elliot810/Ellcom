/* Finanzen & Liquidität */
(function (L) {
  'use strict';

  var STATUS_COLOR = { 'Entwurf': 'gray', 'Offen': 'blue', 'Überfällig': 'red', 'Bezahlt': 'green' };

  L.invoicePreview = function (inv) {
    var c = L.cust(inv.customerId), st = L.invStatus(inv), net = L.invNet(inv);
    var body = '<div class="doc-preview">' +
      '<div class="doc-row"><div><b>' + L.h(L.company()) + '</b><br><span class="muted">Musterstraße 1 · 10827 Berlin</span></div><div class="right">' + L.tag(st, STATUS_COLOR[st]) + '</div></div>' +
      '<div class="doc-row"><div><span class="muted">Rechnung an</span><br>' + L.h(c.name) + '<br>' + L.h(c.contact) + '</div>' +
      '<div class="right"><span class="muted">Rechnungsnr.</span> ' + inv.no + '<br><span class="muted">Datum</span> ' + L.fd(inv.date) + '<br><span class="muted">Fällig</span> ' + L.fd(inv.due) + '</div></div>' +
      '<table class="doc-table"><thead><tr><th>Leistung</th><th class="num">Menge</th><th class="num">Einzelpreis</th><th class="num">Summe</th></tr></thead><tbody>' +
      inv.items.map(function (it) { return '<tr><td>' + L.h(it.desc) + '</td><td class="num">' + L.num(it.qty, 2) + '</td><td class="num">' + L.eur(it.price) + '</td><td class="num">' + L.eur(it.qty * it.price) + '</td></tr>'; }).join('') +
      '</tbody><tfoot><tr><td colspan="3">Netto</td><td class="num">' + L.eur(net) + '</td></tr><tr><td colspan="3">USt. 19 %</td><td class="num">' + L.eur(net * L.VAT) + '</td></tr>' +
      '<tr class="total"><td colspan="3">Gesamt</td><td class="num">' + L.eur(net * (1 + L.VAT)) + '</td></tr></tfoot></table>' +
      '<p class="muted small">Erstellt mit der Vorlage „Rechnung Standard“' + (inv.entryIds ? ' · Positionen automatisch aus der Zeiterfassung übernommen' : '') + '.</p></div>';
    var submit = inv.status === 'Entwurf' ? 'Rechnung versenden' : (inv.status === 'Offen' ? 'Als bezahlt markieren' : null);
    L.modal({
      title: 'Rechnung ' + inv.no, wide: true, body: body, noFocus: true,
      footerLeft: inv.status === 'Entwurf' ? '<button type="button" class="btn btn-ghost-danger" id="inv-del">' + L.icon('trash-2') + 'Entwurf löschen</button>' : '',
      submit: submit,
      onSubmit: submit ? function () {
        if (inv.status === 'Entwurf') { inv.status = 'Offen'; inv.date = L.todayIso(); inv.due = L.add(inv.date, 14); L.toast('Rechnung ' + inv.no + ' versendet (Demo)'); }
        else { inv.status = 'Bezahlt'; inv.paid = L.todayIso(); L.toast('Zahlungseingang für ' + inv.no + ' verbucht'); }
        L.save(); L.render();
      } : null,
      onMount: function (f) {
        var del = f.querySelector('#inv-del');
        if (del) del.onclick = function () {
          (inv.entryIds || []).forEach(function (id) { var t = L.S.time.filter(function (x) { return x.id === id; })[0]; if (t) t.billed = false; });
          L.S.invoices = L.S.invoices.filter(function (x) { return x !== inv; });
          L.save(); L.closeModal(); L.toast('Entwurf gelöscht – Stunden wieder offen'); L.render();
        };
      }
    });
  };

  L.remind = function (id) {
    var inv = L.S.invoices.filter(function (x) { return x.id === id; })[0], c = L.cust(inv.customerId);
    var txt = 'Sehr geehrte/r ' + c.contact + ',\n\nsicher ist es Ihrer Aufmerksamkeit entgangen: Unsere Rechnung ' + inv.no + ' vom ' + L.fd(inv.date) +
      ' über ' + L.eur(L.invGross(inv)) + ' war am ' + L.fd(inv.due) + ' fällig.\n\nWir bitten Sie, den Betrag innerhalb der nächsten 7 Tage zu überweisen. Sollte sich Ihre Zahlung mit diesem Schreiben überschnitten haben, betrachten Sie es bitte als gegenstandslos.\n\nMit freundlichen Grüßen\n' + L.company();
    L.modal({
      title: 'Zahlungserinnerung · ' + inv.no, wide: true, submit: 'Als versendet markieren',
      body: '<p class="muted small">Vorlage „Zahlungserinnerung“ – automatisch mit Rechnungsdaten befüllt.</p>' + L.field('An', L.input('to', c.email)) + L.field('Text', '<textarea name="text" rows="11">' + L.h(txt) + '</textarea>'),
      onSubmit: function () { inv.reminded = L.todayIso(); L.save(); L.toast('Zahlungserinnerung an ' + c.name + ' versendet (Demo)'); L.render(); }
    });
  };

  function newInvoice(prefCust) {
    var custs = L.S.customers.filter(function (c) { return c.stage !== 'Verloren'; }).map(function (c) { return [c.id, c.name]; });
    var rows = [0, 1, 2].map(function (i) {
      return '<div class="line-row">' + L.input('d' + i, '', 'placeholder="Leistung"') + L.input('q' + i, i === 0 ? '1' : '', 'type="number" step="0.25" min="0" placeholder="Menge"') + L.input('p' + i, '', 'type="number" step="0.01" min="0" placeholder="Preis netto"') + '</div>';
    }).join('');
    L.modal({
      title: 'Neue Rechnung', wide: true, submit: 'Als Entwurf speichern',
      body: '<div class="grid-2">' + L.field('Kunde', L.select('customer', custs, prefCust || custs[0][0])) + L.field('Zahlungsziel', L.select('days', [['14', '14 Tage'], ['30', '30 Tage'], ['7', '7 Tage']], '14')) + '</div>' +
        '<div class="hours-hint" id="hours-hint"></div>' +
        '<div class="field"><span class="field-label">Positionen</span>' + rows + '</div>',
      onMount: function (f) {
        function hint() {
          var cid = f.customer.value, h = L.unbilled(cid).reduce(function (s, t) { return s + L.entryHours(t); }, 0);
          var box = f.querySelector('#hours-hint');
          box.innerHTML = h ? L.icon('timer') + '<span>' + L.num(h, 1) + ' h aus der Zeiterfassung sind für diesen Kunden noch offen.</span><button type="button" class="btn btn-sm btn-primary" id="take-hours">Stunden übernehmen</button>' : '';
          box.style.display = h ? '' : 'none';
          L.refreshIcons();
          var b = f.querySelector('#take-hours');
          if (b) b.onclick = function () { var inv = L.billCustomer(cid); L.closeModal(); L.render(); L.invoicePreview(inv); };
        }
        f.customer.onchange = hint; hint();
      },
      onSubmit: function (d) {
        var items = [];
        [0, 1, 2].forEach(function (i) { if (d['d' + i] && Number(d['p' + i]) > 0) items.push({ desc: d['d' + i], qty: Number(d['q' + i]) || 1, price: Number(d['p' + i]) }); });
        if (!items.length) { L.toast('Bitte mindestens eine Position mit Preis eintragen', 'warn'); return false; }
        var inv = { id: L.uid('i'), no: L.nextInvNo(), customerId: d.customer, date: L.todayIso(), due: L.add(L.todayIso(), Number(d.days)), status: 'Entwurf', items: items };
        L.S.invoices.push(inv); L.save(); L.toast('Rechnungsentwurf ' + inv.no + ' angelegt'); L.render();
      }
    });
  }
  L.newInvoice = newInvoice;

  function newExpense() {
    var cats = ['Wareneinsatz', 'Miete', 'Energie', 'Fahrzeuge', 'Versicherungen', 'Software', 'Beratung', 'Instandhaltung', 'Marketing', 'Sonstiges'];
    L.modal({
      title: 'Ausgabe erfassen', submit: 'Speichern',
      body: L.field('Beschreibung', L.input('desc', '', 'required placeholder="z. B. Wareneinkauf"')) +
        '<div class="grid-2">' + L.field('Betrag (brutto)', L.input('amount', '', 'type="number" step="0.01" min="0" required')) + L.field('Datum', L.input('date', L.todayIso(), 'type="date"')) + '</div>' +
        L.field('Kategorie', L.select('cat', cats, 'Wareneinsatz')) + L.check('recurring', 'Wiederkehrend jeden Monat (fließt als Fixkosten in die Prognose)', false) +
        '<p class="muted small">' + L.icon('scan-line') + ' Belege per Foto erfassen folgt, sobald die echte Datenbank angebunden ist.</p>',
      onSubmit: function (d) {
        L.S.expenses.push({ id: L.uid('x'), date: d.date || L.todayIso(), desc: d.desc, cat: d.cat, amount: Number(d.amount), recurring: !!d.recurring });
        L.save(); L.toast('Ausgabe gespeichert'); L.render();
      }
    });
  }

  function overview() {
    var S = L.S, f = L.forecast(), p = f.parts, mp = L.monthlyPersonnel();
    var month = L.todayIso().slice(0, 7);
    var spent = S.expenses.filter(function (x) { return x.date.slice(0, 7) === month; }).reduce(function (s, x) { return s + x.amount; }, 0);
    var html = '<div class="stats">' +
      '<div class="stat"><span class="stat-label">' + L.icon('landmark') + 'Kontostand</span><span class="stat-value">' + L.eur(f.balance, 0) + '</span><span class="stat-sub">Stand ' + L.fd(L.todayIso()) + '</span></div>' +
      '<a class="stat" href="#/finanzen/rechnungen"><span class="stat-label">' + L.icon('receipt') + 'Offene Forderungen</span><span class="stat-value">' + L.eur(L.openReceivables(), 0) + '</span><span class="stat-sub">' + S.invoices.filter(function (i) { return i.status === 'Offen'; }).length + ' Rechnungen</span></a>' +
      '<a class="stat" href="#/finanzen/ausgaben"><span class="stat-label">' + L.icon('shopping-cart') + 'Ausgaben ' + L.MONTHS[L.today().getMonth()] + '</span><span class="stat-value">' + L.eur(spent, 0) + '</span><span class="stat-sub">davon Fixkosten ' + L.eur(L.fixedCosts(), 0) + '</span></a>' +
      (L.on('schichten') ? '<a class="stat" href="#/schichten/plan"><span class="stat-label">' + L.icon('users') + 'Personalkosten / Monat</span><span class="stat-value">' + L.eur(mp.total, 0) + '</span><span class="stat-sub">aus Schichtplan hochgerechnet</span></a>' : '') +
      '</div>';
    html += '<div class="split">' +
      '<section class="card card-flat"><div class="card-head"><span class="card-title">' + L.icon('trending-up') + 'Liquiditätsverlauf & Prognose</span><span class="card-meta"><span class="legend-line"></span>Ist <span class="legend-line dashed"></span>Prognose</span></div>' +
      '<div class="chart-wrap tall" id="fin-chart"><svg></svg><div class="chart-tip"></div></div></section>' +
      '<section class="card card-flat assumptions"><div class="card-head"><span class="card-title">' + L.icon('calculator') + 'Prognose-Annahmen</span></div>' +
      '<label class="as-row"><span>Ø Umsatz / Monat</span><input type="number" step="500" id="as-rev" value="' + S.settings.revenue + '"><span class="unit">€</span></label>' +
      '<label class="as-row"><span>Wareneinsatz</span><input type="number" step="1" id="as-mat" value="' + S.settings.materialPct + '"><span class="unit">%</span></label>' +
      '<label class="as-row"><span>Arbeitgeberanteil SV</span><input type="number" step="0.5" id="as-ag" value="' + S.settings.agPct + '"><span class="unit">%</span></label>' +
      '<div class="as-sep"></div>' +
      '<div class="as-calc"><span>Umsatz</span><b>' + L.eur(p.revenue, 0) + '</b></div>' +
      '<div class="as-calc"><span>– Wareneinsatz</span><b>' + L.eur(p.material, 0) + '</b></div>' +
      '<div class="as-calc"><a href="#/finanzen/ausgaben">– Fixkosten ' + L.icon('link', 'tiny') + '</a><b>' + L.eur(p.fixed, 0) + '</b></div>' +
      '<div class="as-calc"><a href="#/schichten/plan">– Personalkosten ' + L.icon('link', 'tiny') + '</a><b>' + L.eur(p.personnel, 0) + '</b></div>' +
      '<div class="as-calc total ' + (p.net < 0 ? 'neg' : 'pos') + '"><span>Ergebnis / Monat</span><b>' + L.eur(p.net, 0) + '</b></div>' +
      '<p class="muted small">Personalkosten stammen live aus dem Schichtplan (KW ' + L.kw(S.anchor) + ') plus festangestellte Verwaltung. Verschiebst du Schichten, ändert sich die Prognose.</p></section></div>';
    return {
      title: 'Finanzen & Liquidität', icon: 'wallet',
      actions: '<button class="btn" id="add-exp">' + L.icon('plus') + 'Ausgabe</button><button class="btn btn-primary" id="add-inv">' + L.icon('plus') + 'Rechnung</button>',
      html: html,
      mount: function (root, main) {
        L.lineChart(root.querySelector('#fin-chart'), f.labels, f.actual, f.forecast);
        [['as-rev', 'revenue'], ['as-mat', 'materialPct'], ['as-ag', 'agPct']].forEach(function (x) {
          var el = root.querySelector('#' + x[0]);
          el.onchange = function () { S.settings[x[1]] = Number(el.value) || 0; L.save(); L.render(); };
        });
        main.querySelector('#add-inv').onclick = function () { newInvoice(); };
        main.querySelector('#add-exp').onclick = newExpense;
      }
    };
  }

  function invoices() {
    var S = L.S, filter = S.ui.invFilter || 'Alle';
    var list = S.invoices.slice().sort(function (a, b) { return a.no < b.no ? 1 : -1; })
      .filter(function (i) { return filter === 'Alle' || L.invStatus(i) === filter; });
    var counts = {};
    S.invoices.forEach(function (i) { var st = L.invStatus(i); counts[st] = (counts[st] || 0) + 1; });
    var html = '<div class="filters">' + ['Alle', 'Entwurf', 'Offen', 'Überfällig', 'Bezahlt'].map(function (f) {
      return '<button class="chip' + (f === filter ? ' is-active' : '') + '" data-f="' + f + '">' + f + (f !== 'Alle' && counts[f] ? ' <span>' + counts[f] + '</span>' : '') + '</button>';
    }).join('') + '</div>';
    html += list.length ? '<div class="table-wrap"><table class="db"><thead><tr><th>' + L.icon('hash') + 'Nr.</th><th>' + L.icon('building-2') + 'Kunde</th><th>' + L.icon('calendar') + 'Datum</th><th>' + L.icon('calendar-clock') + 'Fällig</th><th class="num">' + L.icon('euro') + 'Betrag</th><th>' + L.icon('circle-dot') + 'Status</th><th></th></tr></thead><tbody>' +
      list.map(function (i) {
        var st = L.invStatus(i);
        return '<tr class="row-link" data-inv="' + i.id + '"><td class="mono">' + i.no + '</td><td>' + L.h(L.cust(i.customerId).name) + '</td><td>' + L.fd(i.date) + '</td><td>' + L.fd(i.due) + (st === 'Überfällig' ? ' <span class="hint-warn">(' + L.days(i.due, L.todayIso()) + ' T.)</span>' : '') + '</td>' +
          '<td class="num">' + L.eur(L.invGross(i)) + '</td><td>' + L.tag(st, STATUS_COLOR[st]) + (i.reminded ? ' ' + L.tag('erinnert', 'orange') : '') + '</td>' +
          '<td class="row-actions">' + (st === 'Überfällig' ? '<button class="btn btn-sm" data-remind="' + i.id + '">Erinnern</button>' : '') + (st === 'Offen' || st === 'Überfällig' ? '<button class="btn btn-sm" data-paid="' + i.id + '">Bezahlt</button>' : '') + (st === 'Entwurf' ? '<button class="btn btn-sm btn-primary" data-send="' + i.id + '">Versenden</button>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : L.empty('receipt', 'Keine Rechnungen in dieser Ansicht.');
    return {
      title: 'Rechnungen', icon: 'receipt', crumbTitle: 'Rechnungen',
      actions: '<button class="btn btn-primary" id="add-inv">' + L.icon('plus') + 'Neue Rechnung</button>',
      html: html,
      mount: function (root, main) {
        main.querySelector('#add-inv').onclick = function () { newInvoice(); };
        root.querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { S.ui.invFilter = b.dataset.f; L.save(); L.render(); }; });
        root.querySelectorAll('[data-inv]').forEach(function (r) { r.onclick = function (e) { if (e.target.closest('button')) return; L.invoicePreview(S.invoices.filter(function (x) { return x.id === r.dataset.inv; })[0]); }; });
        root.querySelectorAll('[data-remind]').forEach(function (b) { b.onclick = function () { L.remind(b.dataset.remind); }; });
        root.querySelectorAll('[data-paid]').forEach(function (b) { b.onclick = function () { var i = S.invoices.filter(function (x) { return x.id === b.dataset.paid; })[0]; i.status = 'Bezahlt'; i.paid = L.todayIso(); L.save(); L.toast('Zahlungseingang für ' + i.no + ' verbucht'); L.render(); }; });
        root.querySelectorAll('[data-send]').forEach(function (b) { b.onclick = function () { var i = S.invoices.filter(function (x) { return x.id === b.dataset.send; })[0]; i.status = 'Offen'; i.date = L.todayIso(); i.due = L.add(i.date, 14); L.save(); L.toast('Rechnung ' + i.no + ' versendet (Demo)'); L.render(); }; });
      }
    };
  }

  function expenses() {
    var S = L.S;
    var list = S.expenses.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var cats = {};
    list.forEach(function (x) { cats[x.cat] = (cats[x.cat] || 0) + x.amount; });
    var keys = Object.keys(cats).sort(function (a, b) { return cats[b] - cats[a]; }), max = cats[keys[0]] || 1;
    var total = list.reduce(function (s, x) { return s + x.amount; }, 0);
    var html = '<div class="split">' +
      '<div class="table-wrap"><table class="db"><thead><tr><th>' + L.icon('calendar') + 'Datum</th><th>' + L.icon('text') + 'Beschreibung</th><th>' + L.icon('tag') + 'Kategorie</th><th class="num">' + L.icon('euro') + 'Betrag</th><th></th></tr></thead><tbody>' +
      list.map(function (x) {
        return '<tr><td>' + L.fd(x.date) + '</td><td>' + L.h(x.desc) + (x.recurring ? ' ' + L.tag('monatlich', 'purple') : '') + '</td><td>' + L.tag(x.cat, x.cat === 'Wareneinsatz' ? 'orange' : 'gray') + '</td><td class="num">' + L.eur(x.amount) + '</td>' +
          '<td class="row-actions"><button class="icon-btn" data-del="' + x.id + '" aria-label="Löschen">' + L.icon('trash-2') + '</button></td></tr>';
      }).join('') + '</tbody><tfoot><tr><td colspan="3">Summe</td><td class="num">' + L.eur(total) + '</td><td></td></tr></tfoot></table></div>' +
      '<section class="card card-flat"><div class="card-head"><span class="card-title">' + L.icon('chart-bar') + 'Nach Kategorie</span></div><ul class="topics">' +
      keys.map(function (k) { return '<li class="topic"><span>' + L.h(k) + '</span><span class="topic-count">' + L.eur(cats[k], 0) + '</span><span class="topic-bar"><span style="width:' + (cats[k] / max * 100) + '%"></span></span></li>'; }).join('') +
      '</ul><div class="ticket-foot"><span>Fixkosten / Monat <b>' + L.eur(L.fixedCosts(), 0) + '</b></span></div></section></div>';
    return {
      title: 'Ausgaben', icon: 'shopping-cart',
      actions: '<button class="btn btn-primary" id="add-exp">' + L.icon('plus') + 'Ausgabe erfassen</button>',
      html: html,
      mount: function (root, main) {
        main.querySelector('#add-exp').onclick = newExpense;
        root.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () { S.expenses = S.expenses.filter(function (x) { return x.id !== b.dataset.del; }); L.save(); L.toast('Ausgabe gelöscht'); L.render(); }; });
      }
    };
  }

  L.views.finanzen = function (sub) {
    if (sub === 'rechnungen') return invoices();
    if (sub === 'ausgaben') return expenses();
    return overview();
  };
})(window.L);
