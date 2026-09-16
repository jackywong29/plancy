import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LayoutAnimationConfig, LinearTransition } from 'react-native-reanimated';

import { SwipeRow } from '@/components/swipe-row';
import { useToast } from '@/components/toast';
import { BigTitle, Card, Chip, Empty, Icon, RoundButton, Screen, Tick } from '@/components/ui';
import { useStore } from '@/data/store';
import type { Idea } from '@/data/types';
import { haptic } from '@/lib/haptics';
import { Space, Type, useTheme } from '@/theme/theme';

export default function IdeasScreen() {
  const { ideas, addIdea, toggleStar, toggleIdeaDone, deleteIdea, restoreIdea } = useStore();
  const theme = useTheme();
  const toast = useToast();
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState('all');

  const tags = [...new Set(ideas.map((i) => i.tag).filter(Boolean))].sort();
  const starred = ideas.filter((i) => i.starred).length;
  const done = ideas.filter((i) => i.done).length;
  const visible = ideas
    .filter((i) => (filter === 'all' ? true : filter === 'starred' ? i.starred : filter === 'done' ? i.done : i.tag === filter))
    // Open ideas first, done ones sink to the bottom; within each, starred on top, then newest.
    .sort((a, b) => Number(a.done) - Number(b.done) || Number(b.starred) - Number(a.starred) || b.createdAt - a.createdAt);

  function commit() {
    if (!draft.trim()) return;
    addIdea(draft);
    haptic('saved');
    setDraft('');
    setFilter('all');
  }

  function toggleIdea(idea: Idea) {
    haptic(idea.done ? 'untick' : 'tick');
    toggleIdeaDone(idea.id);
  }

  function star(idea: Idea) {
    haptic('select');
    toggleStar(idea.id);
  }

  function remove(idea: Idea) {
    haptic('remove');
    deleteIdea(idea.id);
    toast('Idea deleted', { label: 'Undo', onPress: () => restoreIdea(idea) });
  }

  return (
    <Screen>
      <BigTitle subtitle={`${ideas.length - done} open, ${done} done`}>ideas</BigTitle>

      <Card style={styles.capture}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={commit}
          placeholder="Throw in an idea. Add #tag to sort it"
          placeholderTextColor={theme.ink3}
          keyboardAppearance={theme.scheme}
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
        {done > 0 || filter === 'done' ? (
          <Chip label={`Done ${done}`} selected={filter === 'done'} onPress={() => setFilter('done')} />
        ) : null}
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
        <LayoutAnimationConfig skipEntering>
          <View style={{ gap: 10 }}>
            {visible.map((idea) => (
              // Ideas glide to their new place when ticked or starred, and fade
              // when deleted or filtered out.
              <Animated.View
                key={idea.id}
                layout={LinearTransition.duration(280)}
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(160)}>
                <SwipeRow
                  containerStyle={styles.swipe}
                  style={[styles.idea, { backgroundColor: theme.card }]}
                  accessibilityLabel={[idea.text, idea.tag && `#${idea.tag}`, idea.starred && 'starred', idea.done && 'done']
                    .filter(Boolean)
                    .join(', ')}
                  inRowActions={[
                    { name: 'toggle', label: idea.done ? 'Mark not done' : 'Mark done', onPress: () => toggleIdea(idea) },
                    { name: 'star', label: idea.starred ? 'Unstar' : 'Star', onPress: () => star(idea) },
                  ]}
                  actions={[
                    {
                      name: 'delete',
                      label: 'Delete',
                      icon: 'trash',
                      background: theme.bad,
                      ink: '#FFFFFF',
                      onPress: () => remove(idea),
                    },
                  ]}>
                  <View style={styles.ideaTop}>
                    <Text
                      style={{
                        flex: 1,
                        color: idea.done ? theme.ink3 : theme.ink,
                        fontSize: Type.callout,
                        lineHeight: 21,
                        textDecorationLine: idea.done ? 'line-through' : 'none',
                      }}>
                      {idea.text}
                    </Text>
                    <Tick checked={idea.done} onPress={() => toggleIdea(idea)} label={`${idea.text} done`} size={24} />
                  </View>
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
                          opacity: idea.done ? 0.6 : 1,
                        }}>
                        #{idea.tag}
                      </Text>
                    ) : null}
                    <View style={{ flex: 1 }} />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: idea.starred }}
                      accessibilityLabel={idea.starred ? 'Unstar idea' : 'Star idea'}
                      hitSlop={13}
                      onPress={() => star(idea)}>
                      <Icon
                        name={idea.starred ? 'star.fill' : 'star'}
                        size={18}
                        color={idea.starred ? theme.accentText : theme.ink2}
                      />
                    </Pressable>
                  </View>
                </SwipeRow>
              </Animated.View>
            ))}
          </View>
        </LayoutAnimationConfig>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  capture: { flexDirection: 'row', alignItems: 'center', paddingLeft: Space.gutter, paddingRight: 6, gap: 8 },
  filters: { gap: 8, paddingHorizontal: Space.gutter, paddingVertical: 12 },
  swipe: { borderRadius: Space.radius, overflow: 'hidden' },
  idea: { padding: 14, gap: 10 },
  ideaTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  ideaFoot: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
