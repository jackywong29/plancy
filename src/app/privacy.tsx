/**
 * The privacy policy, in the app itself (Settings → Privacy policy).
 *
 * App Review asks for the policy to be reachable inside the app as well as
 * linked from the App Store. Reading it here works offline and can't drift
 * from the website copy: both come from src/legal/privacy.ts.
 */
import { Text, View } from 'react-native';

import { Card, Screen } from '@/components/ui';
import { PRIVACY } from '@/legal/privacy';
import { Type, useTheme } from '@/theme/theme';

export default function PrivacyScreen() {
  const theme = useTheme();
  const para = { color: theme.ink, fontSize: Type.body, lineHeight: 23 };
  return (
    <Screen bottomInset={40}>
      <Text style={{ color: theme.ink2, fontSize: Type.footnote, marginTop: 12, marginBottom: 10 }}>
        Effective {PRIVACY.effective}
      </Text>
      <Card style={{ padding: 16, gap: 12 }}>
        {PRIVACY.intro.map((p) => (
          <Text key={p} style={para}>
            {p}
          </Text>
        ))}
      </Card>
      {PRIVACY.sections.map((s) => (
        <View key={s.heading} style={{ marginTop: 22, gap: 8 }}>
          <Text accessibilityRole="header" style={{ color: theme.ink, fontSize: Type.sectionTitle, fontWeight: '600' }}>
            {s.heading}
          </Text>
          {s.paragraphs.map((p) => (
            <Text key={p} style={para}>
              {p}
            </Text>
          ))}
        </View>
      ))}
    </Screen>
  );
}
