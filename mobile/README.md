# Lincom – iOS/Android App (Expo)

Erste Version der Lincom-App für Mitarbeiter: Login, "Mein Bereich" (Schichten,
Urlaub, Vertrag), Schichtplan, Team/Firma, Konto. Nutzt dieselbe Supabase-
Datenbank wie die Webapp – gleiche Konten, gleiche Firmen, gleiche Rechte.

## Lokal starten (auf deinem eigenen Rechner, kein Mac/Xcode nötig)

1. [Node.js](https://nodejs.org) installieren (falls noch nicht vorhanden).
2. Repo klonen bzw. aktualisieren, dann:
   ```bash
   cd mobile
   npm install
   npx expo start
   ```
3. Die kostenlose **Expo Go**-App auf deinem iPhone aus dem App Store laden.
4. Den im Terminal angezeigten QR-Code mit der iPhone-Kamera scannen (öffnet
   automatisch in Expo Go). Die App läuft dann sofort auf deinem Handy, jede
   Codeänderung erscheint automatisch (Hot Reload) – ganz ohne Build oder
   App-Store-Freigabe.

## Struktur

- `app/` – Screens/Navigation (Expo Router, dateibasiert)
  - `login.tsx`, `onboarding.tsx` – Anmeldung, Firma erstellen/beitreten
  - `(app)/index.tsx` – Mein Bereich
  - `(app)/plan.tsx` – Schichtplan (Wochenansicht)
  - `(app)/team.tsx` – Team/Firma, Beitrittsanfragen, Mitglieder
  - `(app)/account.tsx` – Konto/Profil
- `lib/` – Supabase-Client, Auth-Context, Datenzugriffe
- `components/` – wiederverwendbare UI (z. B. `AbsenceModal`)

## Nächste Schritte (noch offen)

- Push-Benachrichtigungen (Expo Notifications)
- Tauschbörse, Zeiterfassung/Stempeluhr, eigene Dokumente als eigene Screens
- App-Icon/Splash-Screen, App-Store-Assets
- TestFlight-Build über EAS (`eas build --platform ios`), sobald ein Apple-
  Developer-Account vorhanden ist
