/** Pick the currency Finance uses. Pushed from Settings → Currency. */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Card, Icon, Row, Screen } from '@/components/ui';
import { useStore } from '@/data/store';
import { CURRENCIES } from '@/lib/currencies';
import { formatMoney } from '@/lib/format';
import { Space, Type, useTheme } from '@/theme/theme';

export default function CurrencyScreen() {
  const { settings, setSetting } = useStore();
  const theme = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState('');

  const needle = query.trim().toLowerCase();
  const list = CURRENCIES.filter((c) => !needle || c.code.toLowerCase().includes(needle) || c.name.toLowerCase().includes(needle));
  // The current one first, even if it's not in the curated list.
  const current = CURRENCIES.find((c) => c.code === settings.currency) ?? { code: settings.currency, name: '' };
  const rows = needle ? list : [current, ...list.filter((c) => c.code !== current.code)];

  return (
    <Screen bottomInset={40}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: theme.card, marginBottom: 12 }}>
        <Icon name="magnifyingglass" size={16} color={theme.ink3} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search currencies"
          placeholderTextColor={theme.ink3}
          keyboardAppearance={theme.scheme}
          clearButtonMode="while-editing"
          autoCorrect={false}
          accessibilityLabel="Search currencies"
          style={{ flex: 1, color: theme.ink, fontSize: Type.body, paddingVertical: 11 }}
        />
      </View>
      <Card>
        {rows.map((c, i) => {
          const selected = c.code === settings.currency;
          return (
            <Row
              key={c.code}
              first={i === 0}
              accessibilityLabel={`${c.name || c.code}, ${c.code}${selected ? ', selected' : ''}`}
              onPress={() => {
                setSetting('currency', c.code);
                router.back();
              }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.ink, fontSize: Type.body }}>{c.name || c.code}</Text>
                <Text style={{ color: theme.ink2, fontSize: Type.footnote }}>
                  {c.code} · {formatMoney(123456, c.code)}
                </Text>
              </View>
              {selected ? <Icon name="checkmark" size={18} color={theme.accentText} weight="semibold" /> : null}
            </Row>
          );
        })}
      </Card>
      <Text style={{ color: theme.ink2, fontSize: Type.footnote, marginTop: 7, marginHorizontal: Space.gutter }}>
        Amounts you already entered keep their numbers; only the symbol changes.
      </Text>
    </Screen>
  );
}
