/* Rechter Bereich – Atlas AI, Webdesign, Templates, Einklappen, Profilmenü */
(function (L) {
  'use strict';

  /* ---------- Vorlagen ---------- */
  var TPL = [
    { group: 'Finanzen', items: [
      { key: 'rechnung', icon: 'receipt', name: 'Rechnung Standard', desc: 'Mit Pflichtangaben, USt. und Zahlungsziel' },
      { key: 'mahnung', icon: 'bell-ring', name: 'Zahlungserinnerung', desc: 'Freundliche erste Erinnerung' },
      { key: 'angebot', icon: 'file-text', name: 'Angebot', desc: 'Leistungen, Preise, Gültigkeit' }] },
    { group: 'Kunden', items: [
      { key: 'willkommen', icon: 'mail-open', name: 'Willkommensschreiben', desc: 'Für neue Kunden nach Auftrag' },
      { key: 'followup', icon: 'reply', name: 'Follow-up nach Angebot', desc: 'Nachfassen nach 5–7 Tagen' }] },
    { group: 'Personal', items: [
      { key: 'vertrag', icon: 'file-signature', name: 'Arbeitsvertrag', desc: 'Vollzeit, Teilzeit, Minijob – legt Personalakte an' },
      { key: 'stelle', icon: 'megaphone', name: 'Stellenanzeige', desc: 'Für Website und Jobportale' },
      { key: 'urlaub', icon: 'plane', name: 'Urlaubsantrag', desc: 'Direkt als Antrag im System' },
      { key: 'onboarding', icon: 'list-checks', name: 'Onboarding-Checkliste', desc: 'Erste Tage strukturiert' }] },
    { group: 'Verwaltung', items: [
      { key: 'agb', icon: 'scale', name: 'AGB-Grundgerüst', desc: 'Struktur für Dienstleister' },
      { key: 'sop', icon: 'book-open-check', name: 'SOP-Vorlage', desc: 'Standardabläufe dokumentieren' },
      { key: 'monat', icon: 'calendar-check-2', name: 'Checkliste Monatsabschluss', desc: 'Belege, USt., Lohn, Ablage' }] }
  ];

  function docText(key, ctx) {
    var co = L.company(), today = L.fd(L.todayIso());
    var c = (ctx && ctx.customer) || L.S.customers.filter(function (x) { return x.stage === 'Angebot'; })[0] || L.S.customers[0];
    switch (key) {
      case 'angebot': return 'ANGEBOT\n' + co + ' · ' + today + '\n\nAn: ' + c.name + ', ' + c.contact + '\n\nVielen Dank für Ihre Anfrage. Gerne bieten wir Ihnen folgende Leistungen an:\n\n1. Konzeption & Eventplanung ………… [Stunden] × ' + L.eur(c.rate) + '\n2. Catering pro Person ………… [Anzahl] × [Preis]\n3. Personal vor Ort ………… [Stunden] × [Satz]\n\nZwischensumme netto: [Betrag]\nzzgl. 19 % USt.\n\nDieses Angebot ist 30 Tage gültig. Wir freuen uns auf Ihre Rückmeldung.\n\nMit freundlichen Grüßen\n' + co;
      case 'willkommen': return 'Liebe/r ' + c.contact + ',\n\nherzlich willkommen bei ' + co + '! Wir freuen uns sehr auf die Zusammenarbeit.\n\nSo geht es weiter:\n• Ihre feste Ansprechpartnerin ist Sara Becker (Projektleitung).\n• In den nächsten Tagen melden wir uns für ein kurzes Abstimmungsgespräch.\n• Alle Unterlagen erhalten Sie gesammelt per E-Mail.\n\nBei Fragen sind wir jederzeit erreichbar.\n\nHerzliche Grüße\n' + co;
      case 'followup': return 'Hallo ' + c.contact + ',\n\nich wollte kurz nachhaken, ob Sie unser Angebot vom [Datum] bereits prüfen konnten. Gerne passen wir einzelne Punkte an oder besprechen offene Fragen in einem kurzen Telefonat.\n\nPasst Ihnen [Vorschlag Termin]?\n\nViele Grüße\n' + co;
      case 'stelle': return 'Wir suchen: Servicekraft (m/w/d) in Teilzeit\n\n' + co + ' ist ein Event- und Catering-Team aus Berlin. Für unsere Veranstaltungen suchen wir Verstärkung im Service.\n\nDeine Aufgaben\n• Gäste bei Events und im Tagesgeschäft betreuen\n• Auf- und Abbau, Getränke- und Speiseservice\n\nDas bringst du mit\n• Freude am Umgang mit Menschen\n• Belehrung nach § 43 IfSG (oder Bereitschaft, sie zu machen)\n• Flexibilität für Abend- und Wochenendeinsätze\n\nWir bieten\n• Planbare Schichten über die Lincom-App, Schichttausch per Klick\n• Ein herzliches Team\n\nBewirb dich unter jobs@' + co.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.de';
      case 'agb': return 'ALLGEMEINE GESCHÄFTSBEDINGUNGEN – GRUNDGERÜST\n\n§ 1 Geltungsbereich\n§ 2 Vertragsschluss und Angebote\n§ 3 Leistungsumfang\n§ 4 Preise und Zahlungsbedingungen\n§ 5 Stornierung durch den Auftraggeber\n§ 6 Mitwirkungspflichten des Auftraggebers\n§ 7 Haftung\n§ 8 Schlussbestimmungen\n\nHinweis: Muster-Struktur ohne Rechtsprüfung. Vor Verwendung anwaltlich prüfen lassen.';
      case 'sop': return 'SOP: [Name des Ablaufs]\nVerantwortlich: [Rolle] · Stand: ' + today + '\n\nZiel\n[Wofür gibt es diesen Ablauf?]\n\nAuslöser\n[Wann startet der Ablauf?]\n\nSchritte\n1. …\n2. …\n3. …\n\nQualitätscheck\n[Woran erkennt man, dass es richtig gemacht wurde?]\n\nAblage\n[Wo werden Ergebnisse gespeichert?]';
      case 'monat': return 'CHECKLISTE MONATSABSCHLUSS\n\n☐ Alle Ausgangsrechnungen des Monats erstellt\n☐ Offene Stunden aus der Zeiterfassung abgerechnet\n☐ Zahlungseingänge abgeglichen, Erinnerungen versendet\n☐ Belege vollständig erfasst\n☐ Stundenzettel / Schichten für die Lohnabrechnung freigegeben\n☐ Umsatzsteuer-Voranmeldung vorbereitet (fällig am 10.)\n☐ Unterlagen an Steuerberatung übergeben';
      case 'onboarding': return 'ONBOARDING-CHECKLISTE\n\nVor dem ersten Tag\n☐ Arbeitsvertrag unterschrieben zurück\n☐ Personalfragebogen & Steuer-ID\n☐ Sozialversicherungsnummer & Krankenkasse\n☐ Belehrung nach § 43 IfSG (bei Lebensmittelkontakt)\n☐ Arbeitskleidung & Zugänge\n\nErste Woche\n☐ Team vorstellen, Rundgang\n☐ Einarbeitung mit Pate/Patin\n☐ Feedbackgespräch am Ende der Woche';
    }
    return '';
  }

  L.useTemplate = function (key, ctx) {
    if (key === 'rechnung') { if (L.on('finanzen')) { L.go('#/finanzen/rechnungen'); setTimeout(function () { L.newInvoice(); }, 60); } return; }
    if (key === 'vertrag') { if (L.on('personal')) L.addEmployee(); return; }
    if (key === 'urlaub') { if (L.on('personal')) L.newAbsence(); return; }
    if (key === 'mahnung') {
      var over = L.S.invoices.filter(function (i) { return L.invStatus(i) === 'Überfällig'; })[0] || L.S.invoices.filter(function (i) { return i.status === 'Offen'; })[0];
      if (over) L.remind(over.id); else L.toast('Keine offenen Rechnungen für eine Erinnerung', 'warn');
      return;
    }
    var t = null;
    TPL.forEach(function (g) { g.items.forEach(function (i) { if (i.key === key) t = i; }); });
    L.modal({
      title: 'Vorlage: ' + t.name, wide: true, submit: key === 'stelle' ? 'Veröffentlichen (Demo)' : 'Als Dokument ablegen',
      body: '<p class="muted small">' + L.icon('sparkles', 'tiny') + 'Automatisch mit deinen Lincom-Daten befüllt. Muster – vor Verwendung prüfen.</p><textarea name="text" rows="16" class="mono-text">' + L.h(docText(key, ctx)) + '</textarea>',
      footerLeft: '<button type="button" class="btn" id="tpl-copy">' + L.icon('copy') + 'Kopieren</button>',
      onMount: function (f) {
        f.querySelector('#tpl-copy').onclick = function () {
          var txt = f.text.value;
          if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { L.toast('In die Zwischenablage kopiert'); }, function () { L.toast('Kopieren nicht möglich', 'warn'); });
        };
      },
      onSubmit: function () {
        if (key === 'stelle') { L.toast('Stellenanzeige gespeichert – Veröffentlichung auf Jobportalen folgt (Demo)'); return; }
        L.S.documents.push({ id: L.uid('g'), name: t.name + (ctx && ctx.customer ? ' – ' + ctx.customer.name : ''), cat: 'Vorlage', date: L.todayIso(), note: 'Aus Vorlage erstellt' });
        L.save(); L.toast('Als Dokument abgelegt (Verwaltung → Dokumente)'); if (L.route().area === 'verwaltung') L.render();
      }
    });
  };

  function renderTemplates() {
    var box = document.getElementById('tab-tpl');
    var q = (L.S.ui.tplQuery || '').toLowerCase();
    box.innerHTML = '<div class="side-page"><div class="side-head"><h2>Templates</h2><p class="muted">Vorlagen werden automatisch mit Firmen-, Kunden- und Mitarbeiterdaten befüllt.</p>' +
      '<label class="search-box">' + L.icon('search') + '<input id="tpl-q" placeholder="Vorlage suchen …" value="' + L.h(L.S.ui.tplQuery || '') + '"></label></div>' +
      TPL.map(function (g) {
        var items = g.items.filter(function (i) { return !q || (i.name + ' ' + i.desc).toLowerCase().indexOf(q) !== -1; });
        if (!items.length) return '';
        return '<div class="tpl-group"><div class="nav-label">' + g.group + '</div>' + items.map(function (i) {
          return '<button class="tpl" data-tpl="' + i.key + '"><span class="tpl-icon">' + L.icon(i.icon) + '</span><span class="tpl-text"><b>' + i.name + '</b><span class="muted small">' + i.desc + '</span></span><span class="tpl-use">Verwenden</span></button>';
        }).join('') + '</div>';
      }).join('') + '</div>';
    L.refreshIcons();
    var inp = box.querySelector('#tpl-q');
    inp.oninput = function () { L.S.ui.tplQuery = inp.value; var pos = inp.selectionStart; renderTemplates(); var n = document.getElementById('tpl-q'); n.focus(); n.setSelectionRange(pos, pos); };
    box.querySelectorAll('[data-tpl]').forEach(function (b) { b.onclick = function () { L.useTemplate(b.dataset.tpl); }; });
  }

  function renderWeb() {
    var box = document.getElementById('tab-web'), S = L.S;
    var slug = L.company().toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    box.innerHTML = '<div class="side-page"><div class="side-head"><h2>Webdesign</h2><p class="muted">Deine Website – erstellt zum Festpreis, Hosting im Abo. Änderungswünsche einfach hier einreichen.</p></div>' +
      '<section class="card card-flat"><div class="card-head"><span class="card-title">' + L.icon('globe') + L.h(slug) + '.de</span>' + L.tag('Online', 'green') + '</div>' +
      '<div class="props">' + L.prop('server', 'Hosting', 'Im Abo enthalten') + L.prop('lock', 'SSL-Zertifikat', 'Aktiv') + L.prop('history', 'Letzte Änderung', L.fd(S.webRequests[0] ? S.webRequests[0].date : L.todayIso())) + '</div>' +
      '<a class="btn" href="index.html" target="_blank" rel="noopener">' + L.icon('external-link') + 'Website ansehen</a></section>' +
      '<section class="card card-flat"><div class="card-head"><span class="card-title">' + L.icon('pencil-line') + 'Änderung anfragen</span></div>' +
      '<textarea id="web-req" rows="3" placeholder="z. B. Neue Öffnungszeiten eintragen, Foto im Header tauschen …"></textarea>' +
      '<div class="row-end"><button class="btn btn-primary" id="web-send">Absenden</button></div>' +
      (S.webRequests.length ? '<ul class="mini-list">' + S.webRequests.slice().reverse().map(function (r) { return '<li><span>' + L.h(r.text) + '</span><span class="muted">' + L.fds(r.date) + '</span>' + L.tag(r.status, r.status === 'Erledigt' ? 'green' : 'yellow') + '</li>'; }).join('') + '</ul>' : '') + '</section>' +
      '<section class="card card-flat"><div class="card-head"><span class="card-title">' + L.icon('layout-template') + 'Neue Website oder Landingpage</span></div><p class="muted">Kurzes Briefing ausfüllen – Lincom erstellt die Seite zum Festpreis.</p><button class="btn" id="web-new">Briefing starten</button></section></div>';
    L.refreshIcons();
    box.querySelector('#web-send').onclick = function () {
      var t = box.querySelector('#web-req').value.trim();
      if (!t) return L.toast('Bitte beschreibe die gewünschte Änderung', 'warn');
      S.webRequests.push({ date: L.todayIso(), text: t, status: 'In Bearbeitung' }); L.save(); L.toast('Änderungswunsch übermittelt'); renderWeb();
    };
    box.querySelector('#web-new').onclick = function () {
      L.modal({ title: 'Website-Briefing', submit: 'Anfrage senden',
        body: L.field('Was soll die Seite erreichen?', L.input('goal', '', 'required placeholder="z. B. Anfragen für Firmenfeiern gewinnen"')) + L.field('Welche Seiten?', L.input('pages', 'Start, Leistungen, Referenzen, Kontakt')) + L.field('Stil / Vorbilder', L.input('style', '')),
        onSubmit: function (d) { S.webRequests.push({ date: L.todayIso(), text: 'Neue Seite: ' + d.goal, status: 'In Bearbeitung' }); L.save(); L.toast('Briefing gesendet – Festpreis-Angebot folgt (Demo)'); renderWeb(); } });
    };
  }

  /* ---------- Atlas: Demo-Antworten aus Lincom-Daten ---------- */
  L.atlasReply = function (text) {
    if (L.tourAnswer) { var ta = L.tourAnswer(text); if (ta) return ta; }
    var q = text.toLowerCase(), S = L.S, T = L.todayIso();
    if (/rechnung|forderung|zahl|offen|mahn/.test(q) && L.on('finanzen')) {
      var open = S.invoices.filter(function (i) { return i.status === 'Offen'; });
      var over = open.filter(function (i) { return L.invStatus(i) === 'Überfällig'; });
      return 'Aktuell sind ' + open.length + ' Rechnungen offen, zusammen ' + L.eur(L.openReceivables(), 0) + ' brutto.' +
        (over.length ? ' Überfällig: ' + over.map(function (i) { return i.no + ' (' + L.cust(i.customerId).name + ', seit ' + L.days(i.due, T) + ' Tagen)'; }).join(', ') + '. Soll ich eine Zahlungserinnerung vorbereiten?' : ' Nichts ist überfällig.');
    }
    if (/urlaub|abwesen|krank|frei/.test(q) && L.on('personal')) {
      var abs = L.activeEmployees().filter(function (e) { return L.absenceOn(e.id, T); });
      var pend = S.absences.filter(function (a) { return a.status === 'beantragt'; });
      return (abs.length ? 'Heute abwesend: ' + abs.map(function (e) { return e.first + ' (' + L.absenceOn(e.id, T).type + ')'; }).join(', ') + '.' : 'Heute ist niemand abwesend.') +
        (pend.length ? ' Offene Anträge: ' + pend.map(function (a) { return L.emp(a.empId).first + ' ' + L.fds(a.from) + '–' + L.fds(a.to); }).join(', ') + '.' : '');
    }
    if (/schicht|dienst|plan|personalkost/.test(q) && L.on('schichten')) {
      var c = L.weekCost(S.anchor);
      return 'KW ' + L.kw(S.anchor) + ': ' + L.num(c.hours, 1) + ' h geplant, ' + L.eur(c.total, 0) + ' Personalkosten inkl. Arbeitgeberanteil. ' + c.open + ' Schichten sind offen, ' + c.conflicts + ' haben einen Konflikt (Abwesenheit oder Verfügbarkeit).';
    }
    if (/cash|liquid|prognose|geld|konto/.test(q) && L.on('finanzen')) {
      var f = L.forecast();
      return 'Kontostand ' + L.eur(f.balance, 0) + '. Bei den aktuellen Annahmen liegt das Monatsergebnis bei ' + L.eur(f.parts.net, 0) + ' – Prognose in drei Monaten: ' + L.eur(f.forecast[f.forecast.length - 1], 0) + '. Größter Kostenblock sind die Personalkosten mit ' + L.eur(f.parts.personnel, 0) + ' pro Monat.';
    }
    if (/aufgabe|todo|to-do|erledigen/.test(q) && L.on('organisation')) {
      var ts = S.tasks.filter(function (t) { return !t.done; }).sort(function (a, b) { return (a.due || '9') < (b.due || '9') ? -1 : 1; });
      return ts.length + ' Aufgaben sind offen. Als Nächstes: ' + ts.slice(0, 3).map(function (t) { return '„' + t.title + '“' + (t.due ? ' (' + L.rel(t.due) + ')' : ''); }).join(', ') + '.';
    }
    if (/frist|steuer|finanzamt/.test(q) && L.on('verwaltung')) {
      var fs = S.deadlines.filter(function (x) { return !x.done && x.date >= T; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }).slice(0, 3);
      return 'Nächste Fristen: ' + fs.map(function (x) { return x.title + ' am ' + L.fd(x.date); }).join('; ') + '.';
    }
    return 'In dieser Demo antworte ich mit Daten aus deinem Lincom-Konto. Frag mich zum Beispiel nach offenen Rechnungen, Abwesenheiten, dem Schichtplan, der Liquidität, Aufgaben oder Fristen. Die echte Anbindung an Atlas folgt.';
  };

  // Nur Live-Daten zu einem Stichwort (für die Einführungstour)
  L.atlasData = function (keyword) {
    var r = L.atlasReply(keyword);
    return /^In dieser Demo antworte/.test(r) ? null : r;
  };

  /* ---------- Initialisierung ---------- */
  L.initPanel = function () {
    var S = L.S, email = L.email;
    var initial = email.charAt(0).toUpperCase();
    document.getElementById('avatar').textContent = initial;
    document.getElementById('menu-email').textContent = email;
    var local = email.split('@')[0], parts = local.split(/[._-]/).filter(Boolean);
    document.getElementById('at-initials').textContent = ((parts[0] || 'D').charAt(0) + (parts[1] ? parts[1].charAt(0) : ((parts[0] || 'e').charAt(1) || ''))).toUpperCase();
    document.getElementById('at-username').textContent = local.replace(/[._-]/g, '').toLowerCase();

    document.getElementById('avatar').addEventListener('click', function (e) { e.stopPropagation(); document.getElementById('menu').classList.toggle('is-open'); });
    document.addEventListener('click', function () { document.getElementById('menu').classList.remove('is-open'); });
    document.getElementById('logout').addEventListener('click', function () { sessionStorage.removeItem('lincomDemoEmail'); window.location.href = 'index.html'; });
    document.getElementById('menu-settings').addEventListener('click', function () { L.go('#/einstellungen'); });
    document.getElementById('menu-tour').addEventListener('click', function () { if (L.tour) L.tour.start(); });
    document.getElementById('at-theme').addEventListener('click', function () { document.getElementById('tab-atlas').classList.toggle('atlas-light'); });

    function openTab(name) {
      document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('is-active', t.dataset.tab === name); });
      document.querySelectorAll('.rail-btn[data-open]').forEach(function (b) { b.classList.toggle('is-active', b.dataset.open === name); });
      document.querySelectorAll('.tab-body').forEach(function (b) { b.classList.toggle('is-active', b.id === 'tab-' + name); });
      if (name === 'tpl') renderTemplates();
      if (name === 'web') renderWeb();
    }
    L.openTab = openTab;
    document.querySelectorAll('.tab').forEach(function (tab) { tab.addEventListener('click', function () { openTab(tab.dataset.tab); }); });

    var appEl = document.querySelector('.app'), avatarWrap = document.getElementById('avatar-wrap');
    // Die Leiste bleibt immer rechts; der Bereich startet eingeklappt
    var toggle = document.getElementById('panel-open');
    document.getElementById('rail').appendChild(avatarWrap);
    function setCollapsed(c) {
      appEl.classList.toggle('panel-collapsed', c);
      document.getElementById('menu').classList.remove('is-open');
      toggle.innerHTML = L.icon(c ? 'panel-right-open' : 'panel-right-close');
      toggle.title = c ? 'Bereich ausklappen' : 'Bereich einklappen';
      toggle.setAttribute('aria-label', toggle.title);
      L.refreshIcons();
      setTimeout(L.redrawCharts, 300);
    }
    L.panelCollapsed = function () { return appEl.classList.contains('panel-collapsed'); };
    L.setPanelCollapsed = function (c) { if (appEl.classList.contains('panel-collapsed') !== c) setCollapsed(c); };
    document.getElementById('panel-close').addEventListener('click', function () { setCollapsed(true); });
    toggle.addEventListener('click', function () { setCollapsed(!L.panelCollapsed()); });
    document.querySelectorAll('.rail-btn[data-open]').forEach(function (b) {
      b.addEventListener('click', function () {
        // Klick auf den offenen Tab klappt zu, sonst Tab öffnen (und ggf. ausklappen)
        if (!L.panelCollapsed() && b.classList.contains('is-active')) return setCollapsed(true);
        openTab(b.dataset.open); setCollapsed(false);
      });
    });
    openTab('atlas');
    setCollapsed(true);

    document.getElementById('more-toggle').addEventListener('click', function () {
      var extra = document.getElementById('ai-extra');
      var open = extra.classList.toggle('is-open');
      document.getElementById('more-label').textContent = open ? 'Weniger' : 'Mehr';
      var ic = this.querySelector('.at-chev'); if (ic) ic.style.transform = open ? '' : 'rotate(180deg)';
    });

    /* Chat */
    var composer = document.getElementById('composer'), prompt = document.getElementById('prompt'), messages = document.getElementById('messages');
    var headTitle = document.querySelector('.at-head-title'), headSub = document.querySelector('.at-head-sub');
    function addMsg(text, who) { var d = document.createElement('div'); d.className = 'msg ' + who; d.textContent = text; messages.appendChild(d); messages.scrollTop = messages.scrollHeight; }
    function send(text) {
      document.getElementById('ai-empty').style.display = 'none';
      messages.classList.add('is-active');
      if (!messages.children.length) { headTitle.textContent = text.length > 34 ? text.slice(0, 34) + '…' : text; headSub.textContent = 'Demo · Antworten aus deinen Lincom-Daten'; }
      addMsg(text, 'user');
      var typing = document.createElement('div'); typing.className = 'msg ai typing'; typing.innerHTML = '<span></span><span></span><span></span>'; messages.appendChild(typing);
      setTimeout(function () { typing.remove(); addMsg(L.atlasReply(text), 'ai'); }, 650);
    }
    function autosize() { prompt.style.height = 'auto'; prompt.style.height = Math.min(prompt.scrollHeight, 180) + 'px'; }
    prompt.addEventListener('input', autosize);
    composer.addEventListener('submit', function (e) { e.preventDefault(); var t = prompt.value.trim(); if (!t) return; prompt.value = ''; autosize(); send(t); });
    prompt.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); composer.requestSubmit(); } });
    document.querySelectorAll('.at-suggest').forEach(function (b) { b.addEventListener('click', function () { send(b.textContent); }); });
    document.getElementById('new-chat').addEventListener('click', function () {
      messages.innerHTML = ''; messages.classList.remove('is-active'); document.getElementById('ai-empty').style.display = '';
      headTitle.textContent = 'Neue Konversation'; headSub.textContent = 'Bereit für deine erste Frage'; prompt.focus();
    });
    document.querySelectorAll('.at-chat').forEach(function (b) {
      b.addEventListener('click', function () {
        messages.innerHTML = ''; document.getElementById('ai-empty').style.display = 'none'; messages.classList.add('is-active');
        headTitle.textContent = b.textContent; headSub.textContent = 'Gespeicherter Verlauf';
        addMsg('Gespeicherte Verläufe sind in der Demo nicht hinterlegt. Stell einfach eine neue Frage.', 'ai');
      });
    });
  };
})(window.L);
