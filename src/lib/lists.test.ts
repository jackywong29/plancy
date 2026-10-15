import { continueList } from './lists';

/** Type a Return at the end of `text`. */
const enter = (text: string) => continueList(text, `${text}\n`);

describe('lists in notes', () => {
  it('starts the next number after Return', () => {
    expect(enter('1. Buy milk')).toBe('1. Buy milk\n2. ');
    expect(enter('Shopping\n1. Milk\n2. Bread')).toBe('Shopping\n1. Milk\n2. Bread\n3. ');
  });

  it('keeps the style of number and the indent', () => {
    expect(enter('9) Ninth')).toBe('9) Ninth\n10) ');
    expect(enter('  1. Nested')).toBe('  1. Nested\n  2. ');
  });

  it('continues bullets', () => {
    expect(enter('- Milk')).toBe('- Milk\n- ');
    expect(enter('• Milk')).toBe('• Milk\n• ');
  });

  it('ends the list on Return in an empty item, leaving the line clear', () => {
    expect(enter('1. Milk\n2. ')).toBe('1. Milk\n');
    expect(enter('- Milk\n- ')).toBe('- Milk\n');
  });

  it('leaves ordinary lines and other edits alone', () => {
    expect(enter('Call the plumber')).toBe('Call the plumber\n');
    expect(continueList('1. Milk', '1. Milk!')).toBe('1. Milk!');
    expect(continueList('1. Milk', '1. Mil')).toBe('1. Mil');
    // A Return typed in the middle of the text.
    expect(continueList('1. Milk\n2. Bread', '1. Milk\n\n2. Bread')).toBe('1. Milk\n\n2. Bread');
    // Pasting several lines at once.
    expect(continueList('1. Milk', '1. Milk\n2. Bread\n')).toBe('1. Milk\n2. Bread\n');
  });

  it('needs a space after the marker, so a price or a year is not a list', () => {
    expect(enter('2026.')).toBe('2026.\n');
    expect(enter('RM 1.50')).toBe('RM 1.50\n');
  });
});
