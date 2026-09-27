import { finishedDays, task } from '../../test/make';
import { celebrationFor } from './celebrate';

const TODAY = '2026-09-24';

describe('celebrationFor', () => {
  it('celebrates the last task of the day', () => {
    const tasks = [task({ date: TODAY, done: true }), task({ date: TODAY, done: true })];
    expect(celebrationFor(tasks, TODAY, TODAY, new Set())).toEqual({ kind: 'day', key: `day:${TODAY}` });
  });

  it('stays quiet while anything is still open that day', () => {
    const tasks = [task({ date: TODAY, done: true }), task({ date: TODAY, done: false })];
    expect(celebrationFor(tasks, TODAY, TODAY, new Set())).toBeNull();
  });

  it('does not replay when a task is unticked and ticked again', () => {
    const tasks = [task({ date: TODAY, done: true })];
    const seen = new Set<string>();
    expect(celebrationFor(tasks, TODAY, TODAY, seen)).not.toBeNull();
    expect(celebrationFor(tasks, TODAY, TODAY, seen)).toBeNull();
  });

  it('makes a streak milestone the celebration, with its own words', () => {
    const got = celebrationFor(finishedDays(3, TODAY), TODAY, TODAY, new Set());
    expect(got).toMatchObject({ kind: 'milestone', days: 3, title: '3-day streak' });
    expect(got && 'body' in got && got.body).toMatch(/habit/);
  });

  it('does not replay a milestone, and does not swap in a smaller one either', () => {
    const tasks = finishedDays(7, TODAY);
    const seen = new Set<string>();
    expect(celebrationFor(tasks, TODAY, TODAY, seen)).toMatchObject({ kind: 'milestone', days: 7 });
    expect(celebrationFor(tasks, TODAY, TODAY, seen)).toBeNull();
  });

  it('only counts milestones for today', () => {
    // Finishing yesterday late completes a 3-day run, but it's not today's streak.
    const tasks = finishedDays(3, '2026-09-23');
    expect(celebrationFor(tasks, '2026-09-23', TODAY, new Set())).toEqual({ kind: 'day', key: 'day:2026-09-23' });
  });

  it('gives no milestone between milestones', () => {
    expect(celebrationFor(finishedDays(4, TODAY), TODAY, TODAY, new Set())).toMatchObject({ kind: 'day' });
  });

  it('celebrates a spotless month once at least a week of days was planned', () => {
    const tasks = ['01', '03', '05', '07', '09', '11', '24'].map((d) => task({ date: `2026-09-${d}`, done: true }));
    expect(celebrationFor(tasks, TODAY, TODAY, new Set())).toMatchObject({
      kind: 'month',
      title: 'September, spotless',
      body: 'All 7 planned days this month, done.',
    });
  });

  it('needs at least seven planned days for the month', () => {
    const tasks = ['01', '03', '05', '07', '09', '24'].map((d) => task({ date: `2026-09-${d}`, done: true }));
    expect(celebrationFor(tasks, TODAY, TODAY, new Set())).toMatchObject({ kind: 'day' });
  });

  it('is not spotless with an unfinished day in it', () => {
    const tasks = [
      ...['01', '03', '05', '07', '09', '11', '24'].map((d) => task({ date: `2026-09-${d}`, done: true })),
      task({ date: '2026-09-02', done: false }),
    ];
    expect(celebrationFor(tasks, TODAY, TODAY, new Set())).toMatchObject({ kind: 'day' });
  });

  it('does not celebrate a past month', () => {
    const tasks = ['01', '03', '05', '07', '09', '11', '31'].map((d) => task({ date: `2026-08-${d}`, done: true }));
    expect(celebrationFor(tasks, '2026-08-31', TODAY, new Set())).toMatchObject({ kind: 'day' });
  });
});
