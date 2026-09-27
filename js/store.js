/* Lincom Demo – Beispieldaten, Speicher (nur dieser Browser) und Geschäftslogik */
(function (L) {
  'use strict';

  var KEY = 'lincomDemo_v1';

  /* Anker-Woche: laufende Woche, am Wochenende bereits die kommende */
  function anchorWeek() {
    var t = L.todayIso();
    var ws = L.weekStart(t);
    return L.wdIdx(t) >= 5 ? L.add(ws, 7) : ws;
  }
  L.anchorWeek = anchorWeek;

  function nextWeekday(iso) { while (L.wdIdx(iso) >= 5) iso = L.add(iso, 1); return iso; }
  function nextOn(dayOfMonth, months) {
    var t = L.parse(L.todayIso());
    for (var i = 0; i < 16; i++) {
      var d = new Date(t.getFullYear(), t.getMonth() + i, dayOfMonth);
      if ((!months || months.indexOf(d.getMonth() + 1) !== -1) && L.iso(d) >= L.todayIso()) return nextWeekday(L.iso(d));
    }
  }
  function thirdLastBankday(offsetMonths) {
    var t = L.today();
    var last = new Date(t.getFullYear(), t.getMonth() + 1 + offsetMonths, 0);
    var n = 0, d = last;
    while (true) { if (d.getDay() !== 0 && d.getDay() !== 6) { n++; if (n === 3) break; } d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1); }
    return L.iso(d);
  }
  function minusWorkdays(iso, k) { var d = iso; while (k > 0) { d = L.add(d, -1); if (L.wdIdx(d) < 5) k--; } return d; }

  function seed() {
    var T = L.todayIso(), A = anchorWeek(), P = L.add(A, -7), N = L.add(A, 7);
    var s = {
      version: 1,
      anchor: A,
      company: { name: '', branche: 'Event & Catering' },
      modules: { finanzen: true, kunden: true, personal: true, schichten: true, organisation: true, verwaltung: true },
      settings: { revenue: 31000, materialPct: 15, agPct: 21 },
      ui: {}
    };

    s.employees = [
      { id: 'e1', first: 'Anna', last: 'Meier', role: 'Buchhaltung & Verwaltung', dept: 'Verwaltung', type: 'Teilzeit', hoursWeek: 30, rate: 22, vacation: 24, start: '2023-02-01', email: 'anna.meier@firma.de', phone: '0151 2345678', manager: null, color: '#9a6b4f', status: 'aktiv' },
      { id: 'e2', first: 'Jonas', last: 'Keller', role: 'Küchenleitung', dept: 'Küche', type: 'Vollzeit', hoursWeek: 40, rate: 21, vacation: 28, start: '2022-09-01', email: 'jonas.keller@firma.de', phone: '0152 3456789', manager: null, color: '#c77a2e', status: 'aktiv' },
      { id: 'e3', first: 'Sara', last: 'Becker', role: 'Projektleitung Events', dept: 'Events', type: 'Vollzeit', hoursWeek: 40, rate: 24, vacation: 28, start: '2023-05-15', email: 'sara.becker@firma.de', phone: '0157 4567890', manager: null, color: '#6b5bb5', status: 'aktiv' },
      { id: 'e4', first: 'Tim', last: 'Richter', role: 'Werkstudent Events', dept: 'Events', type: 'Werkstudent', hoursWeek: 20, rate: 15, vacation: 20, start: '2025-10-01', email: 'tim.richter@firma.de', phone: '0160 5678901', manager: 'e3', color: '#3f7fbf', status: 'aktiv' },
      { id: 'e5', first: 'Leonie', last: 'Wagner', role: 'Servicekraft', dept: 'Service', type: 'Teilzeit', hoursWeek: 25, rate: 14.5, vacation: 25, start: '2024-04-01', email: 'leonie.wagner@firma.de', phone: '0170 6789012', manager: 'e3', color: '#c2507a', status: 'aktiv' },
      { id: 'e6', first: 'Murat', last: 'Yilmaz', role: 'Koch', dept: 'Küche', type: 'Vollzeit', hoursWeek: 40, rate: 17, vacation: 28, start: '2024-01-08', email: 'murat.yilmaz@firma.de', phone: '0171 7890123', manager: 'e2', color: '#4d8f6a', status: 'aktiv' },
      { id: 'e7', first: 'Clara', last: 'Hoffmann', role: 'Servicekraft (Minijob)', dept: 'Service', type: 'Minijob', hoursWeek: 10, rate: 14, vacation: 12, start: '2025-03-01', email: 'clara.hoffmann@firma.de', phone: '0172 8901234', manager: 'e3', color: '#b8962e', status: 'offboarding', end: L.iso(new Date(L.today().getFullYear(), L.today().getMonth() + 2, 0)) },
      { id: 'e8', first: 'Paul', last: 'Schneider', role: 'Fahrer & Lager', dept: 'Logistik', type: 'Vollzeit', hoursWeek: 38, rate: 16, vacation: 26, start: '2024-06-01', email: 'paul.schneider@firma.de', phone: '0173 9012345', manager: 'e2', color: '#5f7482', status: 'aktiv' },
      { id: 'e9', first: 'Nina', last: 'Frank', role: 'Servicekraft', dept: 'Service', type: 'Teilzeit', hoursWeek: 25, rate: 14.5, vacation: 25, start: N, email: 'nina.frank@firma.de', phone: '0174 0123456', manager: 'e3', color: '#2f8f8a', status: 'onboarding' }
    ];

    s.availability = { e4: [0, 1], e5: [6], e7: [0, 1, 2, 3, 4], e9: [5] };

    s.docs = [];
    s.employees.forEach(function (e) {
      s.docs.push({ id: L.uid('d'), empId: e.id, name: 'Arbeitsvertrag', cat: 'Vertrag', date: e.start, status: e.status === 'onboarding' ? 'Entwurf aus Vorlage' : 'Unterschrieben' });
      if (['Küche', 'Service', 'Events'].indexOf(e.dept) !== -1 && e.status !== 'onboarding') {
        s.docs.push({ id: L.uid('d'), empId: e.id, name: 'Belehrung nach § 43 IfSG', cat: 'Nachweis', date: e.start, status: 'Vorhanden' });
      }
    });
    s.docs.push({ id: L.uid('d'), empId: 'e7', name: 'Kündigungsbestätigung', cat: 'Personal', date: L.add(T, -12), status: 'Versendet' });

    /* Schichten: Vorwoche, Anker-Woche, Folgewoche */
    s.shifts = [];
    function add(ws, d, start, end, area, emp) { s.shifts.push({ id: L.uid('s'), date: L.add(ws, d), start: start, end: end, area: area, empId: emp || null }); }
    function week(ws, v) {
      for (var d = 0; d < 5; d++) {
        add(ws, d, '07:00', '15:00', 'Küche', 'e2');
        add(ws, d, '10:00', '18:00', 'Küche', 'e6');
        add(ws, d, '06:00', '14:00', 'Logistik', 'e8');
      }
      var service = v === 'next' ? { 0: 'e5', 1: 'e5', 2: 'e5', 3: 'e9', 4: 'e9' } : { 0: 'e5', 1: 'e5', 2: null, 3: 'e5', 4: null };
      for (d = 0; d < 5; d++) add(ws, d, '11:00', '19:00', 'Service', service[d]);
      add(ws, 5, '12:00', '20:00', 'Küche', 'e6');
      add(ws, 5, '14:00', '23:00', 'Events', 'e3');
      add(ws, 5, '16:00', '23:00', 'Events', 'e4');
      add(ws, 5, '16:00', '23:00', 'Service', null);
      add(ws, 5, '10:00', '16:00', 'Service', 'e7');
      add(ws, 6, '10:00', '16:00', 'Service', 'e7');
    }
    week(P, 'prev'); week(A, 'anchor'); week(N, 'next');
    // Vorwoche vollständig besetzen
    s.shifts.forEach(function (sh) { if (sh.date < A && !sh.empId) sh.empId = sh.area === 'Service' ? 'e5' : 'e4'; });

    function shiftOf(emp, date, area) { return s.shifts.filter(function (x) { return x.empId === emp && x.date === date && (!area || x.area === area); })[0]; }

    s.absences = [
      { id: 'a1', empId: 'e5', type: 'Urlaub', from: L.add(A, 2), to: L.add(A, 4), status: 'genehmigt', note: '' },
      { id: 'a2', empId: 'e6', type: 'Krank', from: A, to: L.add(A, 1), status: 'gemeldet', note: 'AU liegt vor' },
      { id: 'a3', empId: 'e2', type: 'Urlaub', from: N, to: L.add(N, 4), status: 'beantragt', note: 'Familienbesuch' },
      { id: 'a4', empId: 'e4', type: 'Urlaub', from: L.add(A, 21), to: L.add(A, 22), status: 'beantragt', note: 'Prüfungsphase' },
      { id: 'a5', empId: 'e3', type: 'Weiterbildung', from: L.add(A, 16), to: L.add(A, 16), status: 'genehmigt', note: 'Seminar Eventrecht' },
      { id: 'a6', empId: 'e1', type: 'Urlaub', from: L.add(A, -40), to: L.add(A, -36), status: 'genehmigt', note: '' },
      { id: 'a7', empId: 'e8', type: 'Urlaub', from: L.add(A, -70), to: L.add(A, -61), status: 'genehmigt', note: '' }
    ];

    s.swaps = [
      { id: 'w1', shiftId: shiftOf('e8', L.add(A, 4)).id, from: 'e8', to: null, status: 'offen', note: 'Familienfeier' },
      { id: 'w2', shiftId: shiftOf('e6', L.add(A, 5), 'Küche').id, from: 'e6', to: 'e2', status: 'offen', note: 'Jonas hat zugesagt' }
    ];

    s.customers = [
      { id: 'c1', name: 'Hofmann & Partner Steuerberatung', contact: 'Dr. Petra Hofmann', email: 'kontakt@hofmann-partner.de', stage: 'Kunde', value: 4300, last: L.add(T, -4), rate: 65 },
      { id: 'c2', name: 'Brauhaus Weber', contact: 'Thomas Weber', email: 'info@brauhaus-weber.de', stage: 'Angebot', value: 6800, last: L.add(T, -2), rate: 60 },
      { id: 'c3', name: 'Kiezkraft GmbH', contact: 'Lea Brandt', email: 'lea@kiezkraft.de', stage: 'Kunde', value: 12400, last: L.add(T, -1), rate: 58 },
      { id: 'c4', name: 'Kulturverein Nordlicht e.V.', contact: 'Jan Ohlsen', email: 'vorstand@nordlicht-ev.de', stage: 'Verhandlung', value: 3200, last: L.add(T, -6), rate: 55 },
      { id: 'c5', name: 'Müller Architekten', contact: 'Frank Müller', email: 'buero@mueller-architekten.de', stage: 'Kunde', value: 3900, last: L.add(T, -9), rate: 60 },
      { id: 'c6', name: 'Galerie Blau', contact: 'Mira Blau', email: 'mira@galerie-blau.de', stage: 'Verloren', value: 1800, last: L.add(T, -30), rate: 60 },
      { id: 'c7', name: 'Physiopraxis Lange', contact: 'Sven Lange', email: 'praxis@lange-physio.de', stage: 'Lead', value: 1500, last: L.add(T, -3), rate: 60 },
      { id: 'c8', name: 'Nachbarschaftshaus Süd', contact: 'Ayla Demir', email: 'team@nh-sued.de', stage: 'Lead', value: 2200, last: L.add(T, -1), rate: 55 }
    ];

    s.projects = [
      { id: 'p1', name: 'Sommerfest Kiezkraft', customerId: 'c3', status: 'Abschluss', due: L.add(T, 7) },
      { id: 'p2', name: 'Weihnachtsfeier Hofmann', customerId: 'c1', status: 'In Planung', due: L.add(T, 75) },
      { id: 'p3', name: 'Onboarding Nina', customerId: null, status: 'Läuft', due: N },
      { id: 'p4', name: 'Verwaltung', customerId: null, status: 'Laufend', due: null },
      { id: 'p5', name: 'Vertrieb', customerId: null, status: 'Laufend', due: null }
    ];

    s.time = [
      { id: 't1', empId: 'e3', date: L.add(T, -9), start: '09:00', end: '17:30', pause: 30, customerId: 'c3', projectId: 'p1', billable: true, billed: false },
      { id: 't2', empId: 'e4', date: L.add(T, -9), start: '12:00', end: '18:00', pause: 0, customerId: 'c3', projectId: 'p1', billable: true, billed: false },
      { id: 't3', empId: 'e3', date: L.add(T, -6), start: '10:00', end: '16:00', pause: 30, customerId: 'c1', projectId: 'p2', billable: true, billed: false },
      { id: 't4', empId: 'e3', date: L.add(T, -2), start: '13:00', end: '23:30', pause: 45, customerId: 'c3', projectId: 'p1', billable: true, billed: false },
      { id: 't5', empId: 'e4', date: L.add(T, -2), start: '15:00', end: '23:30', pause: 30, customerId: 'c3', projectId: 'p1', billable: true, billed: false },
      { id: 't6', empId: 'e2', date: L.add(T, -2), start: '08:00', end: '16:00', pause: 30, customerId: 'c3', projectId: 'p1', billable: true, billed: false },
      { id: 't7', empId: 'e3', date: L.add(T, -12), start: '09:00', end: '15:00', pause: 0, customerId: 'c5', projectId: null, billable: true, billed: true },
      { id: 't8', empId: 'e1', date: L.add(T, -3), start: '08:30', end: '14:30', pause: 30, customerId: null, projectId: 'p4', billable: false, billed: false }
    ];
    s.clock = null;

    s.invoices = [
      { id: 'i1', no: '2026-041', customerId: 'c5', date: L.add(T, -20), due: L.add(T, -6), status: 'Bezahlt', paid: L.add(T, -8), items: [{ desc: 'Catering Büroeröffnung', qty: 1, price: 2480 }, { desc: 'Eventplanung', qty: 6, price: 60 }] },
      { id: 'i2', no: '2026-042', customerId: 'c3', date: L.add(T, -8), due: L.add(T, 6), status: 'Offen', items: [{ desc: 'Anzahlung Catering Sommerfest', qty: 1, price: 3500 }] },
      { id: 'i3', no: '2026-043', customerId: 'c1', date: L.add(T, -24), due: L.add(T, -10), status: 'Offen', items: [{ desc: 'Anzahlung 50 % Weihnachtsfeier', qty: 1, price: 2150 }] },
      { id: 'i4', no: '2026-044', customerId: 'c5', date: L.add(T, -3), due: L.add(T, 11), status: 'Offen', items: [{ desc: 'Nachlieferung Getränke', qty: 1, price: 386 }] }
    ];

    s.expenses = [
      { id: 'x1', date: L.add(T, -26), desc: 'Miete Küche & Lager', cat: 'Miete', amount: 2450, recurring: true },
      { id: 'x2', date: L.add(T, -25), desc: 'Leasing Transporter', cat: 'Fahrzeuge', amount: 489, recurring: true },
      { id: 'x3', date: L.add(T, -24), desc: 'Betriebshaftpflicht & Inventar', cat: 'Versicherungen', amount: 212, recurring: true },
      { id: 'x4', date: L.add(T, -22), desc: 'Software-Abos', cat: 'Software', amount: 149, recurring: true },
      { id: 'x5', date: L.add(T, -20), desc: 'Strom & Gas', cat: 'Energie', amount: 540, recurring: true },
      { id: 'x6', date: L.add(T, -18), desc: 'Steuerberatung (Pauschale)', cat: 'Beratung', amount: 350, recurring: true },
      { id: 'x7', date: L.add(T, -5), desc: 'Wareneinkauf Großhandel', cat: 'Wareneinsatz', amount: 3180, recurring: false },
      { id: 'x8', date: L.add(T, -11), desc: 'Getränke für Sommerfest', cat: 'Wareneinsatz', amount: 1240, recurring: false },
      { id: 'x9', date: L.add(T, -15), desc: 'Reparatur Kühlzelle', cat: 'Instandhaltung', amount: 620, recurring: false }
    ];

    var ustDue = nextOn(10);
    s.tasks = [
      { id: 'k1', title: 'Umsatzsteuer-Voranmeldung abgeben', done: false, prio: 'Hoch', due: L.add(ustDue, -2), projectId: 'p4', owner: 'e1' },
      { id: 'k2', title: 'Rechnung Sommerfest Kiezkraft erstellen', done: false, prio: 'Hoch', due: L.add(T, 2), projectId: 'p1', owner: 'e1' },
      { id: 'k3', title: 'Belehrung nach § 43 IfSG für Nina organisieren', done: false, prio: 'Hoch', due: L.add(N, -2), projectId: 'p3', owner: 'e1' },
      { id: 'k4', title: 'Angebot an Brauhaus Weber nachfassen', done: false, prio: 'Mittel', due: L.add(T, 1), projectId: 'p5', owner: null },
      { id: 'k5', title: 'Menü für Weihnachtsfeier Hofmann abstimmen', done: false, prio: 'Mittel', due: L.add(T, 5), projectId: 'p2', owner: 'e2' },
      { id: 'k6', title: 'Nachbereitung Sommerfest: Equipment zurück ins Lager', done: true, prio: 'Mittel', due: L.add(T, -1), projectId: 'p1', owner: 'e8' },
      { id: 'k7', title: 'Wartungsvertrag Kühlzelle prüfen', done: false, prio: 'Niedrig', due: L.add(T, 10), projectId: 'p4', owner: 'e2' },
      { id: 'k8', title: 'AGB aktualisieren', done: false, prio: 'Niedrig', due: L.add(T, 14), projectId: 'p4', owner: null },
      { id: 'k9', title: 'Location-Besichtigung Weihnachtsfeier', done: true, prio: 'Mittel', due: L.add(T, -4), projectId: 'p2', owner: 'e3' },
      { id: 'k10', title: 'Arbeitskleidung für Nina bestellen', done: false, prio: 'Niedrig', due: L.add(N, -3), projectId: 'p3', owner: 'e1' }
    ];

    var svPay = thirdLastBankday(0) >= T ? thirdLastBankday(0) : thirdLastBankday(1);
    s.deadlines = [
      { id: 'f1', title: 'Umsatzsteuer-Voranmeldung', date: ustDue, cat: 'Steuern', done: false },
      { id: 'f2', title: 'Lohnsteuer-Anmeldung', date: ustDue, cat: 'Steuern', done: false },
      { id: 'f3', title: 'Beitragsnachweise an Krankenkassen', date: minusWorkdays(svPay, 2) >= T ? minusWorkdays(svPay, 2) : minusWorkdays(thirdLastBankday(1), 2), cat: 'Personal', done: false },
      { id: 'f4', title: 'Sozialversicherungsbeiträge fällig', date: svPay, cat: 'Personal', done: false },
      { id: 'f5', title: 'Gewerbesteuer-Vorauszahlung', date: nextOn(15, [2, 5, 8, 11]), cat: 'Steuern', done: false },
      { id: 'f6', title: 'Einkommen-/Körperschaftsteuer-Vorauszahlung', date: nextOn(10, [3, 6, 9, 12]), cat: 'Steuern', done: false },
      { id: 'f7', title: 'Interne Hygienekontrolle Küche', date: L.add(T, 18), cat: 'Betrieb', done: false },
      { id: 'f8', title: 'Kfz-Versicherung Transporter verlängern', date: L.add(T, 40), cat: 'Verträge', done: false }
    ];

    s.documents = [
      { id: 'g1', name: 'Gesellschaftsvertrag', cat: 'Gründung', date: '2022-06-14', note: 'Notariell beurkundet' },
      { id: 'g2', name: 'Gewerbeanmeldung', cat: 'Gründung', date: '2022-07-01', note: 'Bezirksamt' },
      { id: 'g3', name: 'Mietvertrag Küche & Lager', cat: 'Vertrag', date: '2022-08-01', note: 'Kündigungsfrist 6 Monate' },
      { id: 'g4', name: 'Leasingvertrag Transporter', cat: 'Vertrag', date: '2024-03-12', note: 'Laufzeit 36 Monate' },
      { id: 'g5', name: 'Betriebshaftpflicht-Police', cat: 'Versicherung', date: '2025-01-01', note: 'Jährliche Verlängerung' },
      { id: 'g6', name: 'AGB (Stand 2024)', cat: 'Recht', date: '2024-02-01', note: 'Aktualisierung geplant' },
      { id: 'g7', name: 'Datenschutzerklärung Website', cat: 'Recht', date: '2025-05-20', note: '' },
      { id: 'g8', name: 'Auftragsverarbeitungsvertrag Lohnbüro', cat: 'Datenschutz', date: '2024-09-03', note: '' }
    ];

    s.compliance = [
      { id: 'q1', group: 'Website & Online', label: 'Impressum vollständig', done: true },
      { id: 'q2', group: 'Website & Online', label: 'Datenschutzerklärung aktuell', done: true },
      { id: 'q3', group: 'Website & Online', label: 'Cookie-Einwilligung eingerichtet', done: true },
      { id: 'q4', group: 'Website & Online', label: 'AGB aktuell (letzte Prüfung < 12 Monate)', done: false },
      { id: 'q5', group: 'Datenschutz intern', label: 'Verzeichnis von Verarbeitungstätigkeiten', done: false },
      { id: 'q6', group: 'Datenschutz intern', label: 'Auftragsverarbeitungsverträge mit Dienstleistern', done: true },
      { id: 'q7', group: 'Datenschutz intern', label: 'Mitarbeitende auf Vertraulichkeit verpflichtet', done: true },
      { id: 'q8', group: 'Betrieb', label: 'Gefährdungsbeurteilung Arbeitsplätze', done: true },
      { id: 'q9', group: 'Betrieb', label: 'Erste-Hilfe-Ausbildung im Team vorhanden', done: false },
      { id: 'q10', group: 'Betrieb', label: 'Eigenkontrollsystem Hygiene (HACCP) dokumentiert', done: true }
    ];

    s.onboarding = [
      { id: 'o1', empId: 'e9', kind: 'Onboarding', date: N, tasks: [
        { t: 'Arbeitsvertrag unterschrieben zurück', done: true },
        { t: 'Personalfragebogen & Steuer-ID erhalten', done: true },
        { t: 'Sozialversicherungsnummer & Krankenkasse erfasst', done: true },
        { t: 'Belehrung nach § 43 IfSG (Gesundheitsamt)', done: false },
        { t: 'Arbeitskleidung bestellt', done: false },
        { t: 'Zugang zu Lincom & Schichtplan eingerichtet', done: false },
        { t: 'Einarbeitung Service in der ersten Woche geplant', done: false }
      ] },
      { id: 'o2', empId: 'e7', kind: 'Offboarding', date: null, tasks: [
        { t: 'Kündigungsbestätigung versendet', done: true },
        { t: 'Resturlaub geklärt', done: false },
        { t: 'Arbeitszeugnis erstellt', done: false },
        { t: 'Schlüssel & Arbeitskleidung zurückerhalten', done: false },
        { t: 'Abmeldung bei der Minijob-Zentrale', done: false }
      ] }
    ];
    s.onboarding[1].date = s.employees[6].end;

    s.candidates = [
      { id: 'r1', name: 'Hanna Schulz', position: 'Koch/Köchin (Vollzeit)', stage: 'Angebot', rating: 5, date: L.add(T, -6), note: 'Erfahrung Großküche, ab nächstem Monat verfügbar' },
      { id: 'r2', name: 'Julia Krause', position: 'Servicekraft (Teilzeit)', stage: 'Gespräch', rating: 4, date: L.add(T, -4), note: 'Probearbeit vereinbaren' },
      { id: 'r3', name: 'Ole Petersen', position: 'Servicekraft (Teilzeit)', stage: 'Gespräch', rating: 3, date: L.add(T, -3), note: '' },
      { id: 'r4', name: 'Mehmet Aydin', position: 'Koch/Köchin (Vollzeit)', stage: 'Neu', rating: 0, date: L.add(T, -1), note: '' },
      { id: 'r5', name: 'Felix Braun', position: 'Werkstudent Events', stage: 'Neu', rating: 0, date: L.add(T, -2), note: '' },
      { id: 'r6', name: 'Nina Frank', position: 'Servicekraft (Teilzeit)', stage: 'Eingestellt', rating: 5, date: L.add(T, -15), note: 'Start ' + L.fd(N), empId: 'e9' }
    ];

    s.tickets = [
      { id: 'u1', topic: 'Rechnungen & Zahlungen', subject: 'Frage zur Anzahlung Weihnachtsfeier', customerId: 'c1', date: L.add(T, -1), done: false },
      { id: 'u2', topic: 'Angebote', subject: 'Vegane Menü-Optionen gewünscht', customerId: 'c2', date: L.add(T, -1), done: false },
      { id: 'u3', topic: 'Rechnungen & Zahlungen', subject: 'Rechnungsadresse ändern', customerId: 'c3', date: L.add(T, -3), done: true },
      { id: 'u4', topic: 'Termine', subject: 'Aufbauzeit Sommerfest verschieben', customerId: 'c3', date: L.add(T, -5), done: true },
      { id: 'u5', topic: 'Reklamation', subject: 'Fehlende Stehtische', customerId: 'c5', date: L.add(T, -2), done: false },
      { id: 'u6', topic: 'Termine', subject: 'Besichtigung vor Ort', customerId: 'c4', date: L.add(T, -4), done: false }
    ];

    s.webRequests = [{ date: L.add(T, -14), text: 'Neue Fotos vom Sommerfest in die Galerie', status: 'Erledigt' }];

    var now = L.today();
    s.cashflow = { values: [18400, 21200, 19800, 24600, 23100, 27900, 26400, 31200, 34800], end: L.iso(new Date(now.getFullYear(), now.getMonth(), 1)) };
    return s;
  }

  /* ---------- Laden / Speichern ---------- */
  L.load = function () {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    if (!s || s.version !== 1 || s.anchor !== anchorWeek()) { s = seed(); }
    L.S = s;
    L.save();
  };
  L.save = function () { try { localStorage.setItem(KEY, JSON.stringify(L.S)); } catch (e) {} };
  L.reset = function () { L.S = seed(); L.save(); };

  /* ---------- Zugriff ---------- */
  function by(list, id) { return (L.S[list] || []).filter(function (x) { return x.id === id; })[0]; }
  L.emp = function (id) { return by('employees', id); };
  L.cust = function (id) { return by('customers', id); };
  L.proj = function (id) { return by('projects', id); };
  L.shift = function (id) { return by('shifts', id); };
  L.name = function (e) { return e ? e.first + ' ' + e.last : 'Offen'; };
  L.on = function (m) { return !L.S.modules || L.S.modules[m] !== false; };
  L.activeEmployees = function () { return L.S.employees.filter(function (e) { return e.status !== 'ausgetreten'; }); };
  L.shiftStaff = function () { return L.activeEmployees().filter(function (e) { return e.dept !== 'Verwaltung'; }); };

  L.company = function () {
    if (L.S.company && L.S.company.name) return L.S.company.name;
    var email = sessionStorage.getItem('lincomDemoEmail') || '';
    var freemail = ['gmail', 'googlemail', 'icloud', 'me', 'gmx', 'web', 'outlook', 'hotmail', 'yahoo', 't-online', 'live', 'posteo', 'mail', 'proton', 'protonmail'];
    var dom = (email.split('@')[1] || '').split('.')[0];
    if (!dom || freemail.indexOf(dom) !== -1) return 'Muster Events GmbH';
    var sp = { gmbh: 'GmbH', ag: 'AG', ug: 'UG', kg: 'KG', ohg: 'OHG', ev: 'e.V.' };
    return dom.split('-').map(function (w) { return sp[w] || (w.charAt(0).toUpperCase() + w.slice(1)); }).join(' ');
  };

  /* ---------- Personal ---------- */
  L.absenceOn = function (empId, iso, includePending) {
    return L.S.absences.filter(function (a) {
      return a.empId === empId && a.from <= iso && a.to >= iso && (a.status === 'genehmigt' || a.status === 'gemeldet' || (includePending && a.status === 'beantragt'));
    })[0];
  };
  L.unavailable = function (empId, iso) { return (L.S.availability[empId] || []).indexOf(L.wdIdx(iso)) !== -1; };
  L.vacation = function (e) {
    var y = String(L.today().getFullYear());
    var used = 0, planned = 0, today = L.todayIso();
    L.S.absences.forEach(function (a) {
      if (a.empId !== e.id || a.type !== 'Urlaub' || a.from.slice(0, 4) !== y) return;
      var n = L.workdays(a.from, a.to);
      if (a.status === 'genehmigt') { if (a.to < today) used += n; else planned += n; }
      if (a.status === 'beantragt') planned += n;
    });
    return { entitled: e.vacation, used: used, planned: planned, rest: e.vacation - used - planned };
  };

  L.approveAbsence = function (id, ok) {
    var a = L.S.absences.filter(function (x) { return x.id === id; })[0];
    if (!a) return;
    a.status = ok ? 'genehmigt' : 'abgelehnt';
    L.save();
    var e = L.emp(a.empId);
    if (!ok) return L.toast('Antrag von ' + e.first + ' abgelehnt');
    var clash = L.S.shifts.filter(function (s) { return s.empId === a.empId && s.date >= a.from && s.date <= a.to; });
    L.toast(a.type + ' von ' + e.first + ' genehmigt');
    if (clash.length) setTimeout(function () { L.toast(clash.length + ' Schicht' + (clash.length > 1 ? 'en' : '') + ' von ' + e.first + ' im Zeitraum – im Schichtplan rot markiert', 'warn'); }, 400);
  };

  /* ---------- Schichten ---------- */
  L.shiftHours = function (s) {
    var h = L.hours(s.start, s.end, 0);
    var pause = h > 9 ? 45 : (h > 6 ? 30 : 0); // gesetzliche Mindestpause (ArbZG § 4)
    return L.hours(s.start, s.end, pause);
  };
  L.shiftConflict = function (s) {
    if (!s.empId) return null;
    var e = L.emp(s.empId);
    if (!e) return null;
    var a = L.absenceOn(s.empId, s.date);
    if (a) return e.first + ' ist abwesend (' + a.type + ')';
    if (e.start > s.date) return e.first + ' startet erst am ' + L.fd(e.start);
    if (e.end && e.end < s.date) return e.first + ' ist dann nicht mehr im Unternehmen';
    if (L.unavailable(s.empId, s.date)) return e.first + ' ist ' + L.WD[L.wdIdx(s.date)] + ' nicht verfügbar';
    var dbl = L.S.shifts.filter(function (x) {
      return x !== s && x.empId === s.empId && x.date === s.date && L.minutes(x.start) < L.minutes(s.end) && L.minutes(s.start) < L.minutes(x.end);
    });
    if (dbl.length) return 'Überschneidung mit weiterer Schicht';
    return null;
  };
  L.weekShifts = function (ws) { var we = L.add(ws, 6); return L.S.shifts.filter(function (s) { return s.date >= ws && s.date <= we; }); };
  L.weekCost = function (ws) {
    var r = { hours: 0, wage: 0, open: 0, conflicts: 0, byEmp: {} };
    L.weekShifts(ws).forEach(function (s) {
      if (!s.empId) { r.open++; return; }
      if (L.shiftConflict(s)) r.conflicts++;
      var e = L.emp(s.empId), h = L.shiftHours(s);
      r.hours += h; r.wage += h * e.rate;
      r.byEmp[s.empId] = (r.byEmp[s.empId] || 0) + h;
    });
    r.total = r.wage * (1 + L.S.settings.agPct / 100);
    return r;
  };
  L.monthlyPersonnel = function () {
    var wk = L.weekCost(L.S.anchor);
    var salaried = L.activeEmployees().filter(function (e) { return e.dept === 'Verwaltung'; })
      .reduce(function (sum, e) { return sum + e.hoursWeek * e.rate; }, 0);
    var factor = 1 + L.S.settings.agPct / 100;
    return { shifts: wk.wage * 4.33 * factor, salaried: salaried * 4.33 * factor, total: (wk.wage + salaried) * 4.33 * factor };
  };

  /* ---------- Finanzen ---------- */
  L.VAT = 0.19;
  L.invNet = function (i) { return i.items.reduce(function (s, it) { return s + it.qty * it.price; }, 0); };
  L.invGross = function (i) { return L.invNet(i) * (1 + L.VAT); };
  L.invStatus = function (i) { return i.status === 'Offen' && i.due < L.todayIso() ? 'Überfällig' : i.status; };
  L.openReceivables = function () {
    return L.S.invoices.filter(function (i) { return i.status === 'Offen'; }).reduce(function (s, i) { return s + L.invGross(i); }, 0);
  };
  L.fixedCosts = function () { return L.S.expenses.filter(function (x) { return x.recurring; }).reduce(function (s, x) { return s + x.amount; }, 0); };
  L.nextInvNo = function () {
    var max = L.S.invoices.reduce(function (m, i) { return Math.max(m, parseInt(i.no.split('-')[1], 10)); }, 0);
    return L.today().getFullYear() + '-' + String(max + 1).padStart(3, '0');
  };
  L.entryHours = function (t) { return L.hours(t.start, t.end, t.pause); };
  L.unbilled = function (custId) {
    return L.S.time.filter(function (t) { return t.billable && !t.billed && (!custId || t.customerId === custId); });
  };
  L.billCustomer = function (custId) {
    var entries = L.unbilled(custId);
    if (!entries.length) return null;
    var c = L.cust(custId), groups = {};
    entries.forEach(function (t) {
      var key = t.projectId ? (L.proj(t.projectId) || {}).name : 'Leistungen';
      groups[key] = (groups[key] || 0) + L.entryHours(t);
      t.billed = true;
    });
    var inv = {
      id: L.uid('i'), no: L.nextInvNo(), customerId: custId, date: L.todayIso(), due: L.add(L.todayIso(), 14), status: 'Entwurf',
      entryIds: entries.map(function (t) { return t.id; }),
      items: Object.keys(groups).map(function (k) { return { desc: k + ' – Personaleinsatz lt. Zeiterfassung', qty: Math.round(groups[k] * 100) / 100, price: c.rate }; })
    };
    L.S.invoices.push(inv);
    // Verknüpfung: passende Aufgabe „Rechnung … erstellen“ automatisch erledigen
    L.S.tasks.forEach(function (t) {
      var p = t.projectId ? L.proj(t.projectId) : null;
      if (!t.done && /Rechnung/.test(t.title) && p && p.customerId === custId) t.done = true;
    });
    L.save();
    return inv;
  };
  L.forecast = function () {
    var cf = L.S.cashflow, st = L.S.settings;
    var end = L.parse(cf.end), n = cf.values.length, labels = [];
    for (var i = n - 1; i >= 0; i--) { var d = new Date(end.getFullYear(), end.getMonth() - i, 1); labels.push(L.MON[d.getMonth()]); }
    var pers = L.monthlyPersonnel().total, fixed = L.fixedCosts(), material = st.revenue * st.materialPct / 100;
    var net = st.revenue - material - fixed - pers;
    var actual = cf.values.slice(), fc = cf.values.map(function () { return null; });
    fc[n - 1] = actual[n - 1];
    var bal = actual[n - 1];
    for (var k = 1; k <= 3; k++) {
      var d2 = new Date(end.getFullYear(), end.getMonth() + k, 1);
      labels.push(L.MON[d2.getMonth()]);
      bal += net + (k === 1 ? L.openReceivables() * 0.5 : 0);
      actual.push(null); fc.push(Math.round(bal));
    }
    return { labels: labels, actual: actual, forecast: fc, parts: { revenue: st.revenue, material: material, fixed: fixed, personnel: pers, net: net }, balance: cf.values[n - 1] };
  };

  /* ---------- Zähler für Navigation ---------- */
  L.counts = function () {
    var T = L.todayIso();
    return {
      finanzen: L.S.invoices.filter(function (i) { return L.invStatus(i) === 'Überfällig'; }).length,
      personal: L.S.absences.filter(function (a) { return a.status === 'beantragt'; }).length,
      schichten: L.S.swaps.filter(function (w) { return w.status === 'offen'; }).length +
        L.S.shifts.filter(function (s) { return !s.empId && s.date >= T && s.date <= L.add(L.S.anchor, 13); }).length,
      organisation: L.S.tasks.filter(function (t) { return !t.done && t.due && t.due < T; }).length,
      verwaltung: L.S.deadlines.filter(function (f) { return !f.done && L.days(T, f.date) <= 14 && L.days(T, f.date) >= 0; }).length,
      kunden: L.S.tickets.filter(function (t) { return !t.done; }).length
    };
  };
})(window.L);
