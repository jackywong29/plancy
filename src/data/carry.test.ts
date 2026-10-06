import { settings, task } from '../../test/make';
import { asOf, carryOver } from './carry';
import { countsByDate, movedOn, streak } from './select';

const TODAY = '2026-09-24';
const YESTERDAY = '2026-09-23';

describe('carryOver', () => {
  it('moves an unfinished one-off task from yesterday to today', () => {
    const [moved] = carryOver([task({ id: 'a', date: YESTERDAY, time: '' })], TODAY, '');
    expect(moved).toMatchObject({ id: 'a', date: TODAY, carriedFrom: [YESTERDAY] });
  });

  it('turns a timed task into an anytime one, since its time has passed', () => {
    const [moved] = carryOver([task({ date: YESTERDAY, time: '15:00' })], TODAY, '');
    expect(moved.time).toBe('');
  });

  it('leaves finished tasks, repeating tasks and today’s tasks alone', () => {
    const tasks = [
      task({ date: YESTERDAY, done: true }),
      task({ date: YESTERDAY, repeat: 'daily' }),
      task({ date: TODAY }),
      task({ date: '2026-09-25' }),
    ];
    expect(carryOver(tasks, TODAY, '')).toEqual([]);
  });

  it('does not reach back before `since`', () => {
    const tasks = [task({ id: 'old', date: '2026-09-01' }), task({ id: 'new', date: YESTERDAY })];
    expect(carryOver(tasks, TODAY, YESTERDAY).map((t) => t.id)).toEqual(['new']);
  });

  it('records every day missed when plancy wasn’t opened for a while', () => {
    const [moved] = carryOver([task({ date: '2026-09-21', carriedFrom: ['2026-09-20'] })], TODAY, '');
    expect(moved.carriedFrom).toEqual(['2026-09-20', '2026-09-21', '2026-09-22', YESTERDAY]);
  });

  it('puts carried tasks above today’s anytime tasks, oldest day first, each day in its own order', () => {
    const tasks = [
      task({ id: 'today', date: TODAY, time: '', position: 0 }),
      task({ id: 'y-anytime', date: YESTERDAY, time: '', position: 0 }),
      task({ id: 'y-9am', date: YESTERDAY, time: '09:00' }),
      task({ id: 'older', date: '2026-09-22', time: '', position: 5 }),
    ];
    const moved = carryOver(tasks, TODAY, '').sort((a, b) => a.position - b.position);
    expect(moved.map((t) => t.id)).toEqual(['older', 'y-9am', 'y-anytime']);
    expect(Math.max(...moved.map((t) => t.position))).toBeLessThan(0);
  });
});

describe('a carried task still counts as unfinished where it was', () => {
  const finishedDay = task({ date: YESTERDAY, done: true });
  const carried = task({ date: TODAY, time: '', carriedFrom: [YESTERDAY] });

  it('in the day’s counts', () => {
    expect(countsByDate([finishedDay, carried]).get(YESTERDAY)).toEqual({ total: 2, done: 1 });
  });

  it('so it breaks the streak, the same as leaving it there would have', () => {
    expect(streak([finishedDay, carried], TODAY)).toBe(0);
    expect(streak([finishedDay], TODAY)).toBe(1);
  });

  it('and shows on that day as moved on', () => {
    expect(movedOn([finishedDay, carried], YESTERDAY)).toEqual([carried]);
    expect(movedOn([finishedDay, carried], TODAY)).toEqual([]);
  });
});

describe('asOf', () => {
  const open = task({ id: 'open', date: TODAY, time: '' });

  it('shows tomorrow with today’s leftovers already moved in', () => {
    const view = asOf([open], '2026-09-25', settings({ carryOver: true }));
    expect(view).toEqual([expect.objectContaining({ id: 'open', date: '2026-09-25', carriedFrom: [TODAY] })]);
  });

  it('changes nothing with carry-over off', () => {
    const tasks = [open];
    expect(asOf(tasks, '2026-09-25', settings({ carryOver: false }))).toBe(tasks);
  });
});
