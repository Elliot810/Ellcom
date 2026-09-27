/* Lincom Demo – Einführungstour (Spotlight mit Erklärbox) */
(function (L) {
  'use strict';

  /* ---------- Schritte ----------
     route:  Seite, die für den Schritt geöffnet wird
     target: CSS-Selektor des hervorgehobenen Elements (mehrere Treffer = gemeinsamer Rahmen)
     mod:    Schritt nur zeigen, wenn das Modul aktiv ist
     panel:  rechten Bereich aufklappen (und ggf. Tab öffnen)
     place:  bevorzugte Seite der Erklärbox
     ask:    Satzanfang für „Atlas fragen“
     more:   ausführlichere Antwort von Atlas
     data:   Stichwort, zu dem Atlas zusätzlich Live-Daten nennt */
  var STEPS = [
    {
      route: '#/uebersicht',
      title: 'Willkommen bei Lincom',
      text: 'Lincom bündelt Finanzen, Kunden, Personal, Schichten und Verwaltung an einem Ort. Diese kurze Tour zeigt dir, wo du was findest.',
      ask: 'Erkläre mir, was ich mit Lincom alles machen kann',
      more: 'Lincom ist eine Plattform für die komplette Unternehmensverwaltung. Statt einzelner Programme für Buchhaltung, Personal, Schichtplanung und Kundenpflege arbeitest du in einem System, in dem die Daten zusammenhängen:\n\n• Ein geänderter Schichtplan verändert sofort die Personalkosten in der Liquiditätsprognose.\n• Erfasste Arbeitsstunden werden mit einem Klick zur Rechnung.\n• Stellst du jemanden ein, entstehen Personalakte, Vertragsentwurf und Onboarding-Checkliste automatisch.\n\nModule, die du nicht brauchst, kannst du einfach ausschalten.'
    },
    {
      route: '#/uebersicht', target: '#sidebar', place: 'right', pad: 0,
      title: 'Navigation',
      text: 'Links findest du alle Bereiche. Die Zahlen neben einem Bereich zeigen, wo gerade etwas auf dich wartet.',
      ask: 'Wie funktioniert die Navigation in Lincom',
      more: 'Die Seitenleiste ist nach Bereichen gegliedert: Finanzen, Kunden, Personal, Schichten, Organisation und Verwaltung. Klickst du einen Bereich an, klappen darunter seine Unterseiten auf – zum Beispiel „Rechnungen“ oder „Ausgaben“ bei den Finanzen.\n\nDie grauen Zahlen sind offene Punkte, etwa unbeantwortete Urlaubsanträge oder überfällige Rechnungen. Ganz oben kommst du jederzeit zurück zur Übersicht.'
    },
    {
      route: '#/uebersicht', target: '#main .stats', place: 'bottom',
      title: 'Kennzahlen auf einen Blick',
      text: 'Die wichtigsten Zahlen aus allen Modulen. Ein Klick auf eine Kachel führt direkt in den passenden Bereich.',
      ask: 'Erkläre mir die Kennzahlen auf der Übersicht',
      more: 'Die Kacheln fassen den aktuellen Stand zusammen: Kontostand, offene Forderungen, wer heute im Dienst ist und die nächste Frist. Die Werte werden live aus den Modulen berechnet – änderst du irgendwo etwas, stimmt die Übersicht sofort.\n\nJede Kachel ist ein Link: Ein Klick auf „Offene Forderungen“ öffnet zum Beispiel direkt die Rechnungsliste.',
      data: 'liquidität'
    },
    {
      route: '#/uebersicht', target: '#main .attention', place: 'bottom',
      title: 'Braucht deine Aufmerksamkeit',
      text: 'Hier sammelt Lincom offene Punkte aus allen Bereichen – Urlaubsanträge, überfällige Rechnungen, offene Schichten. Die meisten erledigst du direkt hier mit einem Klick.',
      ask: 'Wie gehe ich am besten mit der Liste „Braucht deine Aufmerksamkeit“ um',
      more: 'Die Liste ist deine tägliche Arbeitsliste. Lincom sucht in allen Modulen nach Dingen, die eine Entscheidung brauchen, und sortiert sie hier ein.\n\nDie Buttons rechts erledigen den Punkt direkt: Urlaub genehmigen, eine Zahlungserinnerung schicken oder offene Stunden abrechnen. Ist ein Punkt erledigt, verschwindet er automatisch. Am besten schaust du einmal am Tag hier vorbei.'
    },
    {
      mod: 'finanzen', route: '#/finanzen/uebersicht', target: '#main .split', place: 'bottom',
      title: 'Liquidität & Prognose',
      text: 'Kontostand, Verlauf und eine Prognose für die nächsten drei Monate. Änderst du rechts die Annahmen, rechnet die Kurve sofort neu.',
      ask: 'Wie funktioniert die Liquiditätsprognose',
      more: 'Die durchgezogene Linie zeigt den Kontostand der letzten Monate, die gestrichelte die Prognose. Berechnet wird sie aus deinen Annahmen rechts: durchschnittlicher Umsatz, Wareneinsatz, Fixkosten und Personalkosten.\n\nDie Personalkosten kommen dabei nicht aus einer Schätzung, sondern direkt aus dem Schichtplan – inklusive Arbeitgeberanteil zur Sozialversicherung. Planst du mehr Schichten, siehst du hier sofort, was das für dein Konto bedeutet.',
      data: 'liquidität'
    },
    {
      mod: 'kunden', route: '#/kunden/pipeline', target: '#main .board', place: 'bottom',
      title: 'Kunden-Pipeline',
      text: 'Ziehe Kontakte per Drag & Drop von „Lead“ bis „Auftrag“. Ein Klick auf eine Karte öffnet alle Details, Stunden und Rechnungen des Kunden.',
      ask: 'Erkläre mir die Kunden-Pipeline',
      more: 'Die Pipeline zeigt, in welcher Phase jeder Kontakt gerade ist – vom ersten Kontakt bis zum laufenden Auftrag. Verschiebe eine Karte einfach mit der Maus in die nächste Spalte.\n\nIn der Detailansicht eines Kunden siehst du Ansprechpartner, Stundensatz, erfasste Stunden und Rechnungen. Von dort kannst du ein Angebot aus einer Vorlage erstellen oder offene Stunden direkt abrechnen.'
    },
    {
      mod: 'personal', route: '#/personal/mitarbeiter', target: '#main .table-wrap', place: 'top',
      title: 'Mitarbeiter',
      text: 'Die digitale Personalakte: Vertrag, Stunden, Urlaub und Dokumente pro Person. Fehlt etwas Wichtiges, weist Lincom dich darauf hin.',
      ask: 'Wie funktioniert die Personalakte',
      more: 'Klick auf eine Person, um ihre Personalakte zu öffnen. Dort findest du Vertragsart, Wochenstunden, Stundenlohn, Urlaub, Tage ohne Verfügbarkeit und alle Dokumente.\n\nLincom prüft dabei mit: Fehlt zum Beispiel die Belehrung nach dem Infektionsschutzgesetz für jemanden, der mit Lebensmitteln arbeitet, siehst du einen Hinweis – und kannst das Dokument direkt nachtragen.'
    },
    {
      mod: 'personal', route: '#/personal/abwesenheiten', target: '#main .cal', place: 'bottom',
      title: 'Abwesenheiten',
      text: 'Urlaub und Krankheit im Monatskalender. Genehmigst du einen Antrag, prüft Lincom automatisch, ob dadurch Schichten unbesetzt bleiben.',
      ask: 'Wie genehmige ich Urlaub und was passiert dann mit den Schichten',
      more: 'Offene Anträge erscheinen unter dem Kalender und auf der Übersicht. Mit „Genehmigen“ wird der Urlaub eingetragen und vom Resturlaub abgezogen.\n\nGleichzeitig schaut Lincom in den Schichtplan: Ist die Person in diesem Zeitraum eingeplant, wird die Schicht als Konflikt markiert, damit du rechtzeitig Ersatz findest – zum Beispiel über die Tauschbörse.',
      data: 'urlaub'
    },
    {
      mod: 'personal', route: '#/personal/recruiting', target: '#main .board', place: 'bottom',
      title: 'Recruiting',
      text: 'Bewerber wandern per Drag & Drop durch den Prozess. „Einstellen“ legt Personalakte, Vertragsentwurf und Onboarding-Checkliste automatisch an.',
      ask: 'Erkläre mir, was beim Einstellen einer Person automatisch passiert',
      more: 'Klickst du bei einer Bewerbung auf „Einstellen“, übernimmt Lincom die Daten und erledigt mehrere Schritte auf einmal:\n\n• Die Person wird als Mitarbeiter angelegt.\n• Ein Arbeitsvertrag wird als Entwurf unter Dokumente abgelegt.\n• Eine Onboarding-Checkliste startet – mit Punkten wie Sozialversicherungsnummer, IfSG-Belehrung und Einarbeitung.\n• Soll die Person Schichten übernehmen, erscheint sie direkt im Schichtplan.'
    },
    {
      mod: 'schichten', route: '#/schichten/plan', target: '#main .plan-wrap', place: 'top',
      title: 'Schichtplan',
      text: 'Plane die Woche per Drag & Drop. Lincom erkennt Konflikte mit Urlaub oder Verfügbarkeit, zieht Pausen nach Arbeitszeitgesetz ab und rechnet die Personalkosten sofort mit.',
      ask: 'Wie geht das Planen im Schichtplan',
      more: 'So planst du eine Schicht:\n\n1. Fahre über eine Tageszelle und klick auf das kleine Plus – oder oben auf „Schicht“ –, um eine neue Schicht anzulegen.\n2. Bestehende Schichten ziehst du mit der Maus auf eine andere Person oder einen anderen Tag.\n3. Ein Klick auf eine Schicht öffnet sie zum Bearbeiten.\n\nRot umrandete Schichten haben einen Konflikt, etwa weil die Person Urlaub hat. Pausen werden nach dem Arbeitszeitgesetz automatisch abgezogen (30 Minuten ab 6 Stunden, 45 Minuten ab 9 Stunden). Die Kosten oben fließen direkt in die Liquiditätsprognose.',
      data: 'schicht'
    },
    {
      mod: 'schichten', route: '#/schichten/zeiten', target: '#main .clock', place: 'right',
      title: 'Stempeluhr & Zeiterfassung',
      text: 'Ein- und Ausstempeln mit einem Klick. Stunden für Kunden kannst du daneben direkt in eine Rechnung umwandeln.',
      ask: 'Wie geht die Zeiterfassung und Abrechnung',
      more: 'Wähle Mitarbeiter und optional einen Kunden und klick auf „Einstempeln“. Die Uhr läuft, bis du ausstempelst – danach steht der Eintrag in der Tabelle darunter.\n\nAlle Stunden, die einem Kunden zugeordnet und noch nicht abgerechnet sind, erscheinen rechts unter „Noch nicht abgerechnet“. Ein Klick auf „Rechnung erstellen“ macht daraus einen Rechnungsentwurf mit dem Stundensatz des Kunden.'
    },
    {
      mod: 'organisation', route: '#/organisation/aufgaben', target: '#main .table-wrap', place: 'top',
      title: 'Aufgaben',
      text: 'Alle To-dos mit Projekt, Zuständigkeit und Fälligkeit. Eine neue Aufgabe tippst du einfach in die letzte Zeile und drückst Enter.',
      ask: 'Erkläre mir, wie ich Aufgaben am besten organisiere',
      more: 'Aufgaben kannst du Projekten und Personen zuordnen und mit einem Fälligkeitsdatum versehen. Über die Filter oben wechselst du zwischen offenen und erledigten Aufgaben oder zeigst nur ein bestimmtes Projekt.\n\nManche Aufgaben erledigt Lincom selbst: Erstellst du etwa eine Rechnung für einen Kunden, wird die passende Aufgabe „Rechnung erstellen“ automatisch abgehakt.',
      data: 'aufgabe'
    },
    {
      mod: 'verwaltung', route: '#/verwaltung/fristen', target: '#main .deadlines', place: 'top',
      title: 'Fristen & Bürokratie',
      text: 'Umsatzsteuer, Lohnsteuer, Sozialversicherung: Lincom berechnet die nächsten Termine und erinnert dich rechtzeitig.',
      ask: 'Erkläre mir, welche Fristen Lincom für mich im Blick behält',
      more: 'Lincom trägt die wiederkehrenden Termine automatisch ein: Umsatzsteuer-Voranmeldung und Lohnsteuer-Anmeldung zum 10. des Folgemonats, die Sozialversicherungsbeiträge zum drittletzten Bankarbeitstag und die Beitragsnachweise zwei Arbeitstage vorher. Eigene Fristen kannst du dazulegen.\n\nWichtig: In der Demo sind die Termine vereinfacht berechnet (z. B. ohne Feiertage und ohne Dauerfristverlängerung) und ersetzen keine Steuerberatung.',
      data: 'frist'
    },
    {
      route: '#/uebersicht', target: '#sidebar .nav-muted', place: 'right',
      title: 'Module verwalten',
      text: 'Brauchst du einen Bereich nicht, schaltest du ihn hier ab. Lincom wächst mit deinem Unternehmen.',
      ask: 'Wie funktioniert das Ein- und Ausschalten von Modulen',
      more: 'Unter „Module verwalten“ kannst du jeden Bereich einzeln ein- oder ausschalten. Es gibt außerdem Voreinstellungen nach Unternehmensart: „Freelancer“ (ohne Personal und Schichten), „Startup / Agentur“ (mit Personal) und „Gastro / Handel / Events“ (mit allem).\n\nAusgeschaltete Module verschwinden aus Navigation und Übersicht. Die Daten bleiben erhalten – schaltest du ein Modul wieder ein, ist alles wieder da.'
    },
    {
      route: '#/uebersicht', target: '#tab-atlas', panel: 'atlas', place: 'left', pad: 0,
      title: 'Atlas AI',
      text: 'Deine KI-Assistenz. Atlas kennt deine Lincom-Daten und beantwortet Fragen zu Rechnungen, Schichten, Urlaub oder Fristen.',
      ask: 'Erkläre mir, wobei du mir in Lincom helfen kannst',
      more: 'Ich beantworte Fragen zu deinen Daten in Lincom – zum Beispiel:\n\n• „Welche Rechnungen sind offen?“\n• „Wer ist heute abwesend?“\n• „Wie sieht der Schichtplan diese Woche aus?“\n• „Wie entwickelt sich unsere Liquidität?“\n• „Welche Fristen stehen an?“\n\nIn dieser Demo antworte ich mit den Beispieldaten deines Kontos. Die vollständige Anbindung an Atlas folgt.'
    },
    {
      route: '#/uebersicht', target: '.panel-top .tab[data-tab="web"], .panel-top .tab[data-tab="tpl"]', panel: true, place: 'bottom',
      title: 'Webdesign & Templates',
      text: 'Unter „Webdesign“ gibst du Änderungen an deiner Webseite in Auftrag. Unter „Templates“ findest du Vorlagen für Angebote, Verträge und Mahnungen – vorausgefüllt mit deinen Daten.',
      ask: 'Erkläre mir Webdesign und Templates',
      more: 'Webdesign: Beschreibe einfach, was sich auf deiner Webseite ändern soll – etwa neue Öffnungszeiten oder ein neues Foto. Die Änderung wird für dich umgesetzt. Für eine komplett neue Seite gibt es ein kurzes Briefing mit Festpreis-Angebot.\n\nTemplates: Wähle eine Vorlage, zum Beispiel ein Angebot, einen Arbeitsvertrag oder eine Zahlungserinnerung. Lincom füllt Kunden-, Mitarbeiter- und Firmendaten automatisch ein. Den Text kannst du anpassen und dann kopieren oder direkt verwenden.'
    },
    {
      route: '#/uebersicht', target: '#tour-btn', place: 'bottom', pad: 4,
      title: 'Du bist startklar',
      text: 'Die Einführung kannst du hier jederzeit neu starten. Viel Erfolg mit Lincom!',
      ask: 'Wie fange ich am besten mit Lincom an',
      more: 'Ein guter Start in drei Schritten:\n\n1. Schau unter „Module verwalten“, welche Bereiche du brauchst, und schalte den Rest ab.\n2. Trag unter „Einstellungen“ Firmenname und Branche ein – der Name erscheint dann automatisch in Rechnungen und Vorlagen.\n3. Arbeite die Liste „Braucht deine Aufmerksamkeit“ auf der Übersicht ab.\n\nWenn du irgendwo nicht weiterkommst, frag mich einfach hier im Chat.'
    }
  ];

  var st = null, seq = 0, els = null, raf = 0;

  /* ---------- Aufbau ---------- */
  function build() {
    if (els) return;
    var root = document.createElement('div');
    root.className = 'tour';
    root.innerHTML =
      '<div class="tour-block"></div>' +
      '<div class="tour-spot"></div>' +
      '<div class="tour-pop is-hidden" role="dialog" aria-modal="true" aria-labelledby="tour-title">' +
        '<span class="tour-arrow"></span>' +
        '<div class="tour-progress"><span></span></div>' +
        '<div class="tour-top"><span class="tour-count"></span><button class="tour-x" type="button" aria-label="Einführung beenden" title="Einführung beenden">' + L.icon('x') + '</button></div>' +
        '<h3 class="tour-title" id="tour-title"></h3>' +
        '<p class="tour-text"></p>' +
        '<div class="tour-foot">' +
          '<button class="btn btn-sm tour-back" type="button">' + L.icon('arrow-left') + 'Zurück</button>' +
          '<span class="spacer"></span>' +
          '<button class="btn btn-sm tour-ask" type="button">' + L.icon('sparkles') + 'Atlas fragen</button>' +
          '<button class="btn btn-sm btn-primary tour-next" type="button">Verstanden!</button>' +
        '</div>' +
      '</div>';
    var resume = document.createElement('div');
    resume.className = 'tour-resume';
    resume.innerHTML = '<button class="tour-resume-go" type="button">' + L.icon('play') + '<span>Einführung fortsetzen</span><small></small></button>' +
      '<button class="tour-resume-x" type="button" aria-label="Einführung beenden" title="Einführung beenden">' + L.icon('x') + '</button>';
    document.body.appendChild(root);
    document.body.appendChild(resume);
    els = {
      root: root, spot: root.querySelector('.tour-spot'), pop: root.querySelector('.tour-pop'), arrow: root.querySelector('.tour-arrow'),
      bar: root.querySelector('.tour-progress span'), count: root.querySelector('.tour-count'), title: root.querySelector('.tour-title'),
      text: root.querySelector('.tour-text'), back: root.querySelector('.tour-back'), next: root.querySelector('.tour-next'),
      resume: resume, resumeInfo: resume.querySelector('small')
    };
    els.back.onclick = function () { go(-1); };
    els.next.onclick = function () { go(1); };
    root.querySelector('.tour-ask').onclick = askAtlas;
    root.querySelector('.tour-x').onclick = finish;
    root.querySelector('.tour-block').onclick = function () {
      els.pop.classList.remove('nudge'); void els.pop.offsetWidth; els.pop.classList.add('nudge');
    };
    resume.querySelector('.tour-resume-go').onclick = resumeTour;
    resume.querySelector('.tour-resume-x').onclick = finish;
    document.addEventListener('keydown', onKey, true);
    L.refreshIcons();
  }

  function onKey(e) {
    if (!st || st.paused) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(); }
    else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); if (st.i > 0) go(-1); }
  }

  /* ---------- Ziele finden ---------- */
  function visible(el) { var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }
  function targets(step) {
    if (!step.target) return [];
    return [].slice.call(document.querySelectorAll(step.target)).filter(visible);
  }
  function union(list) {
    var r = null;
    list.forEach(function (el) {
      var b = el.getBoundingClientRect();
      if (!r) r = { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
      else { r.left = Math.min(r.left, b.left); r.top = Math.min(r.top, b.top); r.right = Math.max(r.right, b.right); r.bottom = Math.max(r.bottom, b.bottom); }
    });
    return r;
  }

  function prepare(step, cb) {
    if (L.closeModal) L.closeModal();
    var app = document.querySelector('.app'); if (app) app.classList.remove('sidebar-open');
    if (step.panel && L.setPanelCollapsed) {
      L.setPanelCollapsed(false);
      if (typeof step.panel === 'string') L.openTab(step.panel);
    }
    var h = location.hash || '#/uebersicht', moved = !!(step.route && h !== step.route);
    if (moved) L.go(step.route);
    var t0 = Date.now(), limit = moved || step.panel ? 1600 : 150;
    setTimeout(function poll() {
      var t = targets(step);
      if (!step.target || t.length) return cb(t);
      if (Date.now() - t0 > limit) return cb(null);
      setTimeout(poll, 60);
    }, moved ? 120 : 0);   // nach Seitenwechsel erst das Neuzeichnen abwarten
  }

  /* ---------- Schritt anzeigen ---------- */
  function show(i, dir) {
    var token = ++seq, step = st.list[i];
    st.i = i;
    st.busy = true;
    els.pop.classList.add('is-hidden');
    prepare(step, function (t) {
      if (token !== seq || !st) return;
      if (t === null) {                 // Element nicht sichtbar (z. B. schmaler Bildschirm) → überspringen
        var n = i + dir;
        if (n >= st.list.length) return finish();
        if (n < 0) return show(i + 1, 1);
        return show(n, dir);
      }
      if (t.length) reveal(t, true);
      fill(i);
      els.root.classList.add('is-moving');
      clearTimeout(st.movingT);
      st.movingT = setTimeout(function () { if (els) els.root.classList.remove('is-moving'); }, 450);
      setTimeout(function () {
        if (token !== seq || !st) return;
        place();
        st.busy = false;
        els.pop.classList.remove('is-hidden');
        els.next.focus({ preventScroll: true });
      }, 220);
    });
  }

  function reveal(t, force) {
    var u = union(t), vh = window.innerHeight, big = (u.bottom - u.top) > vh * 0.55;
    if (force && !(u.top < 60 || u.bottom > vh - 20 || big)) return;
    st.revealAt = Date.now();
    t[0].scrollIntoView({ block: big ? 'start' : 'center', behavior: 'smooth' });
  }

  function fill(i) {
    var step = st.list[i], n = st.list.length;
    els.count.textContent = 'Schritt ' + (i + 1) + ' von ' + n;
    els.bar.style.width = ((i + 1) / n * 100) + '%';
    els.title.textContent = step.title;
    els.text.textContent = step.text;
    els.back.style.display = i === 0 ? 'none' : '';
  }

  function go(d) {
    if (!st || st.busy) return;
    var n = st.i + d;
    if (n < 0) return;
    if (n >= st.list.length) return finish();
    show(n, d);
  }

  /* ---------- Position von Spotlight und Box ---------- */
  function setBox(el, x, y, w, h) {
    el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px';
    if (w != null) { el.style.width = Math.round(w) + 'px'; el.style.height = Math.round(h) + 'px'; }
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function place() {
    if (!st || st.paused) return;
    var step = st.list[st.i], vw = window.innerWidth, vh = window.innerHeight, m = 16, gap = 14;
    var list = targets(step), r = list.length ? union(list) : null;
    // Ziel komplett außerhalb des Bildschirms (z. B. nach Neuaufbau der Seite) → erneut hinscrollen
    if (r && (r.bottom < 0 || r.top > vh) && !st.busy && Date.now() - (st.revealAt || 0) > 800) reveal(list, false);
    var pw = els.pop.offsetWidth, ph = els.pop.offsetHeight;
    els.arrow.className = 'tour-arrow';

    if (!r) {                                       // ohne Ziel: Box mittig, alles abgedunkelt
      setBox(els.spot, vw / 2, vh / 2, 0, 0);
      setBox(els.pop, (vw - pw) / 2, (vh - ph) / 2);
      return;
    }
    var pad = step.pad != null ? step.pad : 6;
    var s = { left: Math.max(r.left - pad, 2), top: Math.max(r.top - pad, 2), right: Math.min(r.right + pad, vw - 2), bottom: Math.min(r.bottom + pad, vh - 2) };
    if (s.bottom < s.top) s.bottom = s.top;
    if (s.right < s.left) s.right = s.left;
    setBox(els.spot, s.left, s.top, s.right - s.left, s.bottom - s.top);

    var cx = (s.left + s.right) / 2, cy = (s.top + s.bottom) / 2;
    var order = ['bottom', 'top', 'right', 'left'];
    if (step.place) order = [step.place].concat(order.filter(function (p) { return p !== step.place; }));
    for (var k = 0; k < order.length; k++) {
      var p = order[k], x, y;
      if (p === 'bottom') { y = s.bottom + gap; if (y + ph > vh - m) continue; x = clamp(cx - pw / 2, m, vw - m - pw); }
      else if (p === 'top') { y = s.top - gap - ph; if (y < m) continue; x = clamp(cx - pw / 2, m, vw - m - pw); }
      else if (p === 'right') { x = s.right + gap; if (x + pw > vw - m) continue; y = clamp(cy - ph / 2, m, vh - m - ph); }
      else { x = s.left - gap - pw; if (x < m) continue; y = clamp(cy - ph / 2, m, vh - m - ph); }
      setBox(els.pop, x, y);
      els.arrow.classList.add('at-' + p);
      if (p === 'bottom' || p === 'top') { els.arrow.style.left = clamp(cx - x, 18, pw - 18) + 'px'; els.arrow.style.top = ''; }
      else { els.arrow.style.top = clamp(cy - y, 18, ph - 18) + 'px'; els.arrow.style.left = ''; }
      return;
    }
    // Kein Platz außerhalb: Box unten im sichtbaren Bereich des Elements
    setBox(els.pop, clamp(cx - pw / 2, m, vw - m - pw), clamp(s.bottom - ph - m, m, vh - m - ph));
  }

  function loop() {
    if (!st) return;
    if (!st.paused) place();
    raf = requestAnimationFrame(loop);
  }

  /* ---------- Atlas fragen ---------- */
  function askAtlas() {
    var step = st.list[st.i];
    var q = step.ask + ': ' + step.text;
    L.tourPending = { q: q, step: step };
    st.paused = true;
    els.root.classList.remove('is-on');
    els.pop.classList.add('is-hidden');
    els.resumeInfo.textContent = (st.i + 1) + ' / ' + st.list.length;
    els.resume.classList.add('is-on');

    if (L.setPanelCollapsed) L.setPanelCollapsed(false);
    if (L.openTab) L.openTab('atlas');
    var prompt = document.getElementById('prompt');
    prompt.value = q;
    prompt.dispatchEvent(new Event('input'));
    var composer = document.getElementById('composer');
    setTimeout(function () {
      composer.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      prompt.focus({ preventScroll: true });
      prompt.setSelectionRange(q.length, q.length);
      composer.classList.remove('tour-flash'); void composer.offsetWidth; composer.classList.add('tour-flash');
    }, 320);
  }

  // Antwort für Fragen, die aus der Tour kommen
  L.tourAnswer = function (text) {
    var p = L.tourPending;
    if (!p) return null;
    var head = p.step.ask.slice(0, 24).toLowerCase();
    if (text.toLowerCase().indexOf(head) === -1) return null;
    L.tourPending = null;
    var a = p.step.more;
    if (p.step.data && L.atlasData) { var d = L.atlasData(p.step.data); if (d) a += '\n\nAktuell in deinem Konto: ' + d; }
    if (st && st.paused) a += '\n\nUnten links kannst du die Einführung fortsetzen.';
    return a;
  };

  function resumeTour() {
    if (!st) return;
    st.paused = false;
    els.resume.classList.remove('is-on');
    els.root.classList.add('is-on');
    show(st.i, 1);
  }

  /* ---------- Start / Ende ---------- */
  function start() {
    build();
    var side = document.getElementById('sidebar'), sideOn = side && visible(side);
    var list = STEPS.filter(function (s) {
      if (s.mod && !L.on(s.mod)) return false;
      if (!sideOn && s.target && s.target.indexOf('#sidebar') === 0) return false;   // Handy: Seitenleiste ist eingeklappt
      return true;
    });
    if (st) cancelAnimationFrame(raf);
    st = { list: list, i: 0, paused: false };
    L.tourPending = null;
    try { localStorage.setItem('lincomTourSeen', '1'); } catch (e) {}
    els.resume.classList.remove('is-on');
    setBox(els.spot, window.innerWidth / 2, window.innerHeight / 2, 0, 0);
    els.root.classList.add('is-on');
    show(0, 1);
    raf = requestAnimationFrame(loop);
  }

  function finish() {
    if (!els) return;
    seq++;
    st = null;
    cancelAnimationFrame(raf);
    els.root.classList.remove('is-on');
    els.pop.classList.add('is-hidden');
    els.resume.classList.remove('is-on');
  }

  L.tour = {
    start: start,
    finish: finish,
    active: function () { return !!st; },
    auto: function () {
      var seen = false;
      try { seen = localStorage.getItem('lincomTourSeen') === '1'; } catch (e) {}
      if (!seen) setTimeout(start, 500);
    }
  };
})(window.L);
