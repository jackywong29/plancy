/**
 * "This task only / This and future tasks", asked before saving or deleting a
 * copy of a repeating task, the way Calendar asks about a repeating event.
 *
 * A native action sheet, so it looks and reads like every other iOS choice of
 * this kind and VoiceOver handles it for free. It follows plancy's light or
 * dark setting, not just the phone's.
 */
import { ActionSheetIOS } from 'react-native';

import type { Scope } from '@/data/store';

export function askScope(
  kind: 'save' | 'delete',
  look: { scheme: 'light' | 'dark'; tint: string },
  onPick: (scope: Scope) => void,
): void {
  const verb = kind === 'save' ? 'Save' : 'Delete';
  ActionSheetIOS.showActionSheetWithOptions(
    {
      title: 'This is a repeating task.',
      options: [`${verb} this task only`, `${verb} this and future tasks`, 'Cancel'],
      cancelButtonIndex: 2,
      destructiveButtonIndex: kind === 'delete' ? [0, 1] : undefined,
      userInterfaceStyle: look.scheme,
      tintColor: look.tint,
    },
    (index) => {
      if (index === 0) onPick('this');
      else if (index === 1) onPick('future');
    },
  );
}
