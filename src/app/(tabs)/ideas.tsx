import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BigTitle, Card, Chip, Empty, Icon, RoundButton, Screen } from '@/components/ui';
import { useStore } from '@/data/store';
import { Space, Type, useTheme } from '@/theme/theme';

export default function IdeasScreen() {
  const { ideas, addIdea, toggleStar, deleteIdea } = useStore();
  const theme = useTheme();
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState('all');

  const tags = [...new Set(ideas.map((i) => i.tag).filter(Boolean))].sort();
  const starred = ideas.filter((i) => i.starred).length;
  const visible = ideas
    .filter((i) => (filter === 'all' ? true : filter === 'starred' ? i.starred : i.tag === filter))
    // Starred ideas float to the top, then newest first.
    .sort((a, b) => Number(b.starred) - Number(a.starred) || b.createdAt - a.createdAt);

  function commit() {
    if (!draft.trim()) return;
    addIdea(draft);
    setDraft('');
    setFilter('all');
  }

  return (
    <Screen>
      <View style={{ minHeight: 44 }} />
      <BigTitle subtitle={`${ideas.length} ideas, ${starred} starred`}>ideas</BigTitle>

      <Card style={styles.capture}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={commit}
          placeholder="Throw in an idea. Add #tag to sort it"
          placeholderTextColor={theme.ink3}
          returnKeyType="done"
          accessibilityLabel="New idea"
          style={{ flex: 1, color: theme.ink, fontSize: Type.body, paddingVertical: 12 }}
        />
        <RoundButton icon="plus" label="Add idea" onPress={commit} accent />
      </Card>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        style={{ marginHorizontal: -Space.gutter }}>
        <Chip label={`All ${ideas.length}`} selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label={`Starred ${starred}`} selected={filter === 'starred'} onPress={() => setFilter('starred')} />
        {tags.map((tag) => (
          <Chip key={tag} label={`#${tag}`} selected={filter === tag} onPress={() => setFilter(tag)} />
        ))}
      </ScrollView>

      {visible.length === 0 ? (
        <Empty
          title={ideas.length ? 'Nothing under this filter' : 'The pool is empty'}
          body="Ideas, things to try, half-thoughts. Drop them in above and sort them later."
        />
      ) : (
        <View style={{ gap: 10 }}>
          {visible.map((idea) => (
            <Card key={idea.id} style={styles.idea}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={idea.text}
                accessibilityHint="Opens delete"
                onLongPress={() =>
                  Alert.alert(idea.text, undefined, [
                    { text: 'Delete', style: 'destructive', onPress: () => deleteIdea(idea.id) },
                    { text: 'Cancel', style: 'cancel' },
                  ])
                }>
                <Text style={{ color: theme.ink, fontSize: Type.callout, lineHeight: 21 }}>{idea.text}</Text>
              </Pressable>
              <View style={styles.ideaFoot}>
                {idea.tag ? (
                  <Text
                    style={{
                      color: theme.accentText,
                      backgroundColor: theme.accentSoft,
                      fontSize: Type.caption,
                      fontWeight: '600',
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 999,
                      overflow: 'hidden',
                    }}>
                    #{idea.tag}
                  </Text>
                ) : null}
                <View style={{ flex: 1 }} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: idea.starred }}
                  accessibilityLabel={idea.starred ? 'Unstar idea' : 'Star idea'}
                  hitSlop={10}
                  onPress={() => toggleStar(idea.id)}>
                  <Icon
                    name={idea.starred ? 'star.fill' : 'star'}
                    size={18}
                    color={idea.starred ? theme.accentText : theme.ink2}
                  />
                </Pressable>
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  capture: { flexDirection: 'row', alignItems: 'center', paddingLeft: Space.gutter, paddingRight: 6, gap: 8 },
  filters: { gap: 8, paddingHorizontal: Space.gutter, paddingVertical: 12 },
  idea: { padding: 14, gap: 10 },
  ideaFoot: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
