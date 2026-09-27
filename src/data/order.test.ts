import { task } from '../../test/make';
import { dayOrder, move, nextPosition, offsetTo, slotFor } from './order';

const titles = (list: { title: string }[]) => list.map((t) => t.title);

describe('dayOrder', () => {
  it('puts timed tasks first, by the clock, then anytime ones by position', () => {
    const list = [
      task({ title: 'anytime 2', time: '', position: 2 }),
      task({ title: '2 pm', time: '14:00' }),
      task({ title: 'anytime 0', time: '', position: 0 }),
      task({ title: '7 am', time: '07:00' }),
      task({ title: 'anytime 1', time: '', position: 1 }),
    ];
    expect(titles(dayOrder(list))).toEqual(['7 am', '2 pm', 'anytime 0', 'anytime 1', 'anytime 2']);
  });

  it('breaks ties by when the task was made', () => {
    const list = [
      task({ title: 'later', time: '09:00', createdAt: 2 }),
      task({ title: 'earlier', time: '09:00', createdAt: 1 }),
      task({ title: 'b', time: '', position: 0, createdAt: 2 }),
      task({ title: 'a', time: '', position: 0, createdAt: 1 }),
    ];
    expect(titles(dayOrder(list))).toEqual(['earlier', 'later', 'a', 'b']);
  });

  it('does not change the list it was given', () => {
    const list = [task({ time: '10:00' }), task({ time: '08:00' })];
    const before = [...list];
    dayOrder(list);
    expect(list).toEqual(before);
  });
});

describe('move', () => {
  it('moves an item down and up', () => {
    expect(move(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(move(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
    expect(move(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c']);
  });

  it('clamps a target past either end', () => {
    expect(move(['a', 'b', 'c'], 0, 99)).toEqual(['b', 'c', 'a']);
    expect(move(['a', 'b', 'c'], 2, -5)).toEqual(['c', 'a', 'b']);
  });

  it('returns an unchanged copy when the source is out of range', () => {
    const ids = ['a', 'b'];
    const out = move(ids, 5, 0);
    expect(out).toEqual(ids);
    expect(out).not.toBe(ids);
  });
});

describe('nextPosition', () => {
  it('goes after the last anytime task on that day', () => {
    const list = [
      task({ date: '2026-09-24', time: '', position: 0 }),
      task({ date: '2026-09-24', time: '', position: 4 }),
      task({ date: '2026-09-24', time: '08:00', position: 9 }), // timed: ignored
      task({ date: '2026-09-25', time: '', position: 7 }), // other day: ignored
    ];
    expect(nextPosition(list, '2026-09-24')).toBe(5);
  });

  it('starts at 0 on a day with no anytime tasks', () => {
    expect(nextPosition([task({ date: '2026-09-24', time: '08:00' })], '2026-09-24')).toBe(0);
  });
});

describe('drag maths', () => {
  const even = [50, 50, 50, 50];

  it('passes a neighbour once the leading edge crosses its middle', () => {
    expect(slotFor(0, 24, even)).toBe(0);
    expect(slotFor(0, 26, even)).toBe(1);
    expect(slotFor(0, 76, even)).toBe(2);
    expect(slotFor(3, -24, even)).toBe(3);
    expect(slotFor(3, -26, even)).toBe(2);
  });

  it('stays in range when dragged past either end', () => {
    expect(slotFor(0, 10_000, even)).toBe(3);
    expect(slotFor(3, -10_000, even)).toBe(0);
    expect(slotFor(1, 0, even)).toBe(1);
  });

  it('measures by each row’s own height', () => {
    const rows = [40, 120, 40];
    // Moving row 0 down: its bottom (40 + dy) must pass row 1's middle (100).
    expect(slotFor(0, 59, rows)).toBe(0);
    expect(slotFor(0, 61, rows)).toBe(1);
  });

  it('offsetTo is how far a row travels to reach a slot', () => {
    const rows = [50, 60, 70];
    expect(offsetTo(0, 2, rows)).toBe(130);
    expect(offsetTo(2, 0, rows)).toBe(-110);
    expect(offsetTo(1, 1, rows)).toBe(0);
  });

  it('travelling exactly offsetTo lands in that slot, for every pair', () => {
    const rows = [44, 90, 44, 61, 120, 44];
    for (let from = 0; from < rows.length; from += 1) {
      for (let to = 0; to < rows.length; to += 1) {
        expect({ from, to, landed: slotFor(from, offsetTo(from, to, rows), rows) }).toEqual({ from, to, landed: to });
      }
    }
  });
});
