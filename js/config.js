/* Lincom – Verbindung zur Datenbank (Supabase, Frankfurt).
   Der „publishable key“ ist für die Webseite gedacht und darf öffentlich sein:
   Was jemand sehen oder ändern darf, entscheiden die Regeln in der Datenbank. */
window.LINCOM_CONFIG = {
  url: 'https://lkdzxltlwgskajpsgoom.supabase.co',
  key: 'sb_publishable_txvHcUHLlksc0gNTP2gLgA_E9SpfkBa'
};

(function () {
  var c = window.LINCOM_CONFIG;
  // Adresse merken, bevor Supabase Token aus dem Link entfernt (z. B. Passwort-Link)
  window.LINCOM_INITIAL_HASH = location.hash;
  window.sb = window.supabase.createClient(c.url, c.key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  // Basis-URL der Seite (funktioniert lokal und auf GitHub Pages)
  window.LINCOM_BASE = new URL('.', location.href).href;

  // Supabase-Fehlermeldungen verständlich auf Deutsch
  window.lincomError = function (err) {
    var m = (err && (err.message || err.error_description || err)) + '';
    var map = [
      [/invalid login credentials/i, 'E-Mail-Adresse oder Passwort ist falsch.'],
      [/email not confirmed/i, 'Bitte bestätige zuerst deine E-Mail-Adresse – der Link ist in deinem Postfach.'],
      [/user already registered|already been registered/i, 'Für diese E-Mail-Adresse gibt es schon ein Konto. Melde dich an oder setze dein Passwort zurück.'],
      [/password should be at least|password is too short/i, 'Das Passwort ist zu kurz (mindestens 8 Zeichen).'],
      [/weak.?password|pwned/i, 'Dieses Passwort ist zu unsicher. Bitte wähle ein anderes.'],
      [/rate limit|too many requests|security purposes/i, 'Zu viele Versuche in kurzer Zeit. Bitte warte kurz und versuche es erneut.'],
      [/unable to validate email|invalid.*email/i, 'Diese E-Mail-Adresse ist ungültig.'],
      [/same.?password|should be different/i, 'Das neue Passwort muss sich vom alten unterscheiden.'],
      [/failed to fetch|network/i, 'Keine Verbindung. Bitte prüfe deine Internetverbindung.'],
      [/jwt|session.*(missing|expired)|not authenticated|nicht angemeldet/i, 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.']
    ];
    for (var i = 0; i < map.length; i++) if (map[i][0].test(m)) return map[i][1];
    return m;
  };
})();
