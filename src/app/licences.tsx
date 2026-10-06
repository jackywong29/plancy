/**
 * Open-source licences (Settings → Open-source licences).
 *
 * Most of what plancy is built on asks, as its one condition, that its
 * licence travel with every copy — and every copy of plancy is an app on
 * someone's phone. The list is src/legal/licences.json, written by
 * `node scripts/licences.mjs`; packages that share a licence text share a row.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Icon, Screen } from '@/components/ui';
import licences from '@/legal/licences.json';
import { haptic } from '@/lib/haptics';
import { Space, Type, useTheme } from '@/theme/theme';

export default function LicencesScreen() {
  const theme = useTheme();
  const [open, setOpen] = useState<ReadonlySet<number>>(new Set());
  const count = licences.reduce((n, g) => n + g.names.length, 0);

  function toggle(i: number) {
    haptic('select');
    setOpen((s) => {
      const next = new Set(s);
      if (!next.delete(i)) next.add(i);
      return next;
    });
  }

  return (
    <Screen bottomInset={40}>
      <Text style={{ color: theme.ink2, fontSize: Type.footnote, marginTop: 12, marginBottom: 10, marginHorizontal: 4 }}>
        plancy is built on {count} pieces of open-source software. Thank you to everyone who made them. Tap one to read
        its licence.
      </Text>
      <Card>
        {licences.map((g, i) => {
          const expanded = open.has(i);
          return (
            <View key={g.names.join()} style={i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line }}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                accessibilityLabel={`${g.names.join(', ')}, ${g.licence} licence`}
                accessibilityHint={expanded ? 'Hides the licence text' : 'Shows the licence text'}
                onPress={() => toggle(i)}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.ink, fontSize: Type.body }}>{g.names.join(', ')}</Text>
                  <Text style={{ color: theme.ink2, fontSize: Type.footnote, marginTop: 2 }}>{g.licence}</Text>
                </View>
                <Icon name={expanded ? 'chevron.up' : 'chevron.down'} size={14} color={theme.ink3} />
              </Pressable>
              {expanded ? (
                <Text selectable style={[styles.text, { color: theme.ink2 }]}>
                  {g.text}
                </Text>
              ) : null}
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 10, paddingHorizontal: Space.gutter },
  text: { fontFamily: 'Menlo', fontSize: Type.caption, lineHeight: 17, paddingHorizontal: Space.gutter, paddingBottom: 14 },
});
