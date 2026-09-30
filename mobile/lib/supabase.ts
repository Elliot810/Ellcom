import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Gleiche Datenbank wie die Webapp (Lincom, Frankfurt).
// Der "publishable key" darf öffentlich sein – was jemand sehen oder
// ändern darf, entscheiden die Regeln (RLS) in der Datenbank.
const SUPABASE_URL = 'https://lkdzxltlwgskajpsgoom.supabase.co';
const SUPABASE_KEY = 'sb_publishable_txvHcUHLlksc0gNTP2gLgA_E9SpfkBa';

// SecureStore hat ein Limit von 2048 Zeichen pro Eintrag und ist auf
// nativen Plattformen (iOS/Android) verfügbar; im Web-Preview (Expo Go
// Web-Export) weichen wir auf AsyncStorage aus.
const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: Platform.OS === 'web' ? AsyncStorage : (SecureStoreAdapter as any),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export function lincomError(err: any): string {
  const m = String(err?.message || err?.error_description || err || '');
  const map: [RegExp, string][] = [
    [/invalid login credentials/i, 'E-Mail-Adresse oder Passwort ist falsch.'],
    [/email not confirmed/i, 'Bitte bestätige zuerst deine E-Mail-Adresse – der Link ist in deinem Postfach.'],
    [/user already registered|already been registered/i, 'Für diese E-Mail-Adresse gibt es schon ein Konto. Melde dich an oder setze dein Passwort zurück.'],
    [/password should be at least|password is too short/i, 'Das Passwort ist zu kurz (mindestens 8 Zeichen).'],
    [/weak.?password|pwned/i, 'Dieses Passwort ist zu unsicher. Bitte wähle ein anderes.'],
    [/rate limit|too many requests|security purposes/i, 'Zu viele Versuche in kurzer Zeit. Bitte warte kurz und versuche es erneut.'],
    [/unable to validate email|invalid.*email/i, 'Diese E-Mail-Adresse ist ungültig.'],
    [/failed to fetch|network/i, 'Keine Verbindung. Bitte prüfe deine Internetverbindung.'],
    [/jwt|session.*(missing|expired)|not authenticated/i, 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.'],
  ];
  for (const [re, msg] of map) if (re.test(m)) return msg;
  return m;
}
