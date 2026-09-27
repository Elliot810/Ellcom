/* Einstellungen & Modul-Baukasten */
(function (L) {
  'use strict';

  var MODS = [
    { key: 'finanzen', icon: 'wallet', name: 'Finanzen & Liquidität', desc: 'Rechnungen, Ausgaben, Zahlungserinnerungen und Liquiditätsprognose.' },
    { key: 'kunden', icon: 'handshake', name: 'Kunden & Vertrieb', desc: 'Pipeline, Kundenkartei und Support-Tickets.' },
    { key: 'personal', icon: 'users', name: 'Personal', desc: 'Personalakte, Urlaub & Abwesenheiten, On-/Offboarding, Recruiting.' },
    { key: 'schichten', icon: 'calendar-clock', name: 'Schichtplanung & Zeiten', desc: 'Schichtplan mit Drag & Drop, Tauschbörse, Stempeluhr. Für Betriebe mit Schichtarbeit.' },
    { key: 'organisation', icon: 'square-check-big', name: 'Organisation', desc: 'Aufgaben und Projekte für das ganze Team.' },
    { key: 'verwaltung', icon: 'landmark', name: 'Bürokratie & Verwaltung', desc: 'Fristen, Dokumentenablage und Pflichten-Check.' }
  ];
  var PRESETS = [
    { name: 'Freelancer', icon: 'user', mods: ['finanzen', 'kunden', 'organisation', 'verwaltung'], desc: 'Allein selbstständig' },
    { name: 'Startup / Agentur', icon: 'rocket', mods: ['finanzen', 'kunden', 'personal', 'organisation', 'verwaltung'], desc: 'Kleines Team, Projekte' },
    { name: 'Gastro / Handel / Events', icon: 'utensils', mods: ['finanzen', 'kunden', 'personal', 'schichten', 'organisation', 'verwaltung'], desc: 'Team mit Schichtarbeit' }
  ];

  function modules() {
    var S = L.S;
    var html = '<h3 class="sub-title">Schnellstart nach Unternehmensart</h3><div class="presets">' + PRESETS.map(function (p, i) {
      var active = MODS.every(function (m) { return (p.mods.indexOf(m.key) !== -1) === L.on(m.key); });
      return '<button class="preset' + (active ? ' is-active' : '') + '" data-preset="' + i + '">' + L.icon(p.icon) + '<b>' + p.name + '</b><span class="muted small">' + p.desc + ' · ' + p.mods.length + ' Module</span></button>';
    }).join('') + '</div>';
    html += '<h3 class="sub-title">Module</h3><div class="mod-list">' + MODS.map(function (m) {
      var on = L.on(m.key);
      return '<label class="mod' + (on ? ' on' : '') + '"><span class="mod-icon">' + L.icon(m.icon) + '</span><span class="mod-text"><b>' + m.name + '</b><span class="muted small">' + m.desc + '</span></span>' +
        '<span class="switch"><input type="checkbox" data-mod="' + m.key + '"' + (on ? ' checked' : '') + '><span></span></span></label>';
    }).join('') + '</div>';
    html += '<div class="callout info">' + L.icon('info') + '<span>Ausgeschaltete Module verschwinden aus Navigation und Übersicht. Die Daten bleiben erhalten, Verknüpfungen (z. B. Personalkosten aus dem Schichtplan) laufen nur, wenn beide Module aktiv sind.</span></div>';
    return {
      title: 'Module verwalten', icon: 'blocks', crumbTitle: 'Module',
      desc: 'Lincom ist ein Baukasten: Jedes Unternehmen schaltet nur ein, was es wirklich braucht – so bleibt die Oberfläche übersichtlich.',
      html: html,
      mount: function (root) {
        root.querySelectorAll('[data-mod]').forEach(function (c) {
          c.onchange = function () { S.modules[c.dataset.mod] = c.checked; L.save(); L.toast((c.checked ? 'Aktiviert: ' : 'Ausgeblendet: ') + MODS.filter(function (m) { return m.key === c.dataset.mod; })[0].name); L.render(); };
        });
        root.querySelectorAll('[data-preset]').forEach(function (b) {
          b.onclick = function () { var p = PRESETS[Number(b.dataset.preset)]; MODS.forEach(function (m) { S.modules[m.key] = p.mods.indexOf(m.key) !== -1; }); L.save(); L.toast('Ansicht für „' + p.name + '“ eingerichtet'); L.render(); };
        });
      }
    };
  }

  function settings() {
    var S = L.S;
    var html = '<h3 class="sub-title">Unternehmen</h3><div class="settings-form">' +
      L.field('Firmenname', '<input id="s-name" value="' + L.h(L.company()) + '">', 'Erscheint in Begrüßung, Rechnungen und Vorlagen.') +
      L.field('Branche', L.select('branche', ['Event & Catering', 'Gastronomie', 'Einzelhandel', 'Agentur', 'Handwerk', 'Beratung', 'Sonstiges'], S.company.branche, 'id="s-branche"')) + '</div>';
    html += '<h3 class="sub-title">Module</h3><p><a class="btn" href="#/einstellungen/module">' + L.icon('blocks') + 'Module verwalten</a> <span class="muted">' + MODS.filter(function (m) { return L.on(m.key); }).length + ' von ' + MODS.length + ' aktiv</span></p>';
    html += '<h3 class="sub-title">Konto</h3><div class="props">' + L.prop('mail', 'Angemeldet als', L.h(L.email)) + L.prop('badge-check', 'Tarif', 'Demo') + L.prop('server', 'Datenspeicherung', 'Nur in diesem Browser (Demo)') + '</div>';
    html += '<h3 class="sub-title">Demo</h3><div class="callout info">' + L.icon('flask-conical') + '<span>Alle Änderungen werden nur lokal in diesem Browser gespeichert. Zum Neustart mit frischen Beispieldaten:</span><button class="btn btn-sm" id="reset">Demo zurücksetzen</button></div>';
    return {
      title: 'Einstellungen', icon: 'settings', html: html,
      mount: function (root) {
        root.querySelector('#s-name').onchange = function () { S.company.name = this.value.trim(); L.save(); L.toast('Firmenname gespeichert'); L.render(); };
        root.querySelector('#s-branche').onchange = function () { S.company.branche = this.value; L.save(); L.toast('Gespeichert'); };
        root.querySelector('#reset').onclick = function () { L.confirm('Demo zurücksetzen?', 'Alle Änderungen gehen verloren und die Beispieldaten werden neu erzeugt.', 'Zurücksetzen', function () { L.reset(); L.toast('Demo zurückgesetzt'); L.go('#/uebersicht'); }); };
      }
    };
  }

  L.views.einstellungen = function (sub) { return sub === 'module' ? modules() : settings(); };
})(window.L);
