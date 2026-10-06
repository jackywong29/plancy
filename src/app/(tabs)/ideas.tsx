import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LayoutAnimationConfig, LinearTransition } from 'react-native-reanimated';

import { SwipeRow } from '@/components/swipe-row';
import { useToast } from '@/components/toast';
import { BigTitle, Card, Chip, Empty, Icon, Screen, Tick } from '@/components/ui';
import { useStore } from '@/data/store';
import type { Idea } from '@/data/types';
import { useAddAction } from '@/lib/add-action';
import { haptic } from '@/lib/haptics';
import { useSettle } from '@/lib/settle';
import { Space, Type, useTheme } from '@/theme/theme';

export default function IdeasScreen() {
  const { ideas, addIdea, toggleStar, toggleIdeaDone, deleteIdea, restoreIdea } = useStore();
  // Ideas are for catching a thought fast, so the add button goes straight to
  // the capture field with the keyboard up. Return saves it.
  const capture = useRef<TextInput>(null);
  useAddAction('Add idea', () => capture.current?.focus());
  const theme = useTheme();
  const toast = useToast();
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState('all');
  // A ticked idea waits a moment where it was, so the tick is seen landing,
  // then glides down to the done ones (the layout animation below).
  const { hold, placedDone } = useSettle();

  const tags = [...new Set(ideas.map((i) => i.tag).filter(Boolean))].sort();
  const starred = ideas.filter((i) => i.starred).length;
  const done = ideas.filter((i) => i.done).length;
  const visible = ideas
    .filter((i) => (filter === 'all' ? true : filter === 'starred' ? i.starred : filter === 'done' ? placedDone(i) : i.tag === filter))
    // Open ideas first, done ones sink to the bottom; within each, starred on top, then newest.
    .sort(
      (a, b) =>
        Number(placedDone(a)) - Number(placedDone(b)) || Number(b.starred) - Number(a.starred) || b.createdAt - a.createdAt,
    );

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
    hold(idea.id, idea.done);
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
          ref={capture}
          returnKeyType="done"
          accessibilityLabel="New idea"
          style={{ flex: 1, color: theme.ink, fontSize: Type.body, paddingVertical: 12 }}
        />
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
                  // Swipe right to tick it off (or back on), as Mail marks a message read.
                  leading={{
                    name: 'toggle',
                    label: idea.done ? 'Not done' : 'Done',
                    icon: idea.done ? 'arrow.uturn.backward' : 'checkmark',
                    background: idea.done ? theme.fill : theme.accent,
                    ink: idea.done ? theme.ink : theme.onAccent,
                    onPress: () => toggleIdea(idea),
                  }}
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
                    <Tick checked={idea.done} onPress={() => toggleIdea(idea)} label={`${idea.text} done`} />
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
            <Animated.View layout={LinearTransition.duration(280)}>
              <Text style={{ color: theme.ink3, fontSize: Type.footnote, textAlign: 'center', marginTop: 2 }}>
                Swipe an idea right to mark it done, left to delete it.
              </Text>
            </Animated.View>
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
