import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { colors } from '../lib/theme';

// Einstiegspunkt: leitet je nach Anmeldestatus und Firmenzugehörigkeit
// direkt weiter (kein eigener Screen).
export default function Index() {
  const { loading, session, memberships } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!session) return <Redirect href="/login" />;
  if (memberships.length === 0) return <Redirect href="/onboarding" />;
  return <Redirect href="/(app)" />;
}
