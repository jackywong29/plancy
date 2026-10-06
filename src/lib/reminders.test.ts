import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Task } from '@/data/types';

import { days, finishedDays, settings, task } from '../../test/make';
import { composeEvening, composeNudge, NUDGE_DAYS, planEvenings, planNudges, voiceFor } from './nudges';
import { planReminders, reminderBudget, syncReminders } from './reminders';

/* iOS's notification centre, reduced to a list plancy can fill and empty. */
const mockCentre = {
  scheduled: new Map<string, { identifier: string; content: { title: string; body: string } }>(),
  granted: true,
  asked: 0,
  buttons: [] as string[],
};

jest.mock('expo-notifications', () => ({
  setNotificationHandler: () => undefined,
  getPermissionsAsync: async () => ({ granted: mockCentre.granted, canAskAgain: true }),
  requestPermissionsAsync: async () => {
    mockCentre.asked += 1;
    return { granted: mockCentre.granted, canAskAgain: true };
  },
  getAllScheduledNotificationsAsync: async () => [...mockCentre.scheduled.values()],
  cancelScheduledNotificationAsync: async (id: string) => {
    mockCentre.scheduled.delete(id);
  },
  scheduleNotificationAsync: async (request: { identifier: string; content: { title: string; body: string } }) => {
    mockCentre.scheduled.set(request.identifier, request);
    return request.identifier;
  },
  setNotificationCategoryAsync: async (_id: string, actions: { buttonTitle: string }[]) => {
    mockCentre.buttons = actions.map((a) => a.buttonTitle);
  },
  SchedulableTriggerInputTypes: { DATE: 'date', TIME_INTERVAL: 'timeInterval' },
}));

const TODAY = '2026-09-24'; // a Thursday

/** Freeze the clock at `hh:mm` on TODAY. Promises still run. */
function at(hh: number, mm = 0) {
  jest.useFakeTimers({ now: new Date(2026, 8, 24, hh, mm), doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate'] });
}

beforeEach(() => {
  mockCentre.scheduled.clear();
  mockCentre.granted = true;
  mockCentre.asked = 0;
  at(5);
});

afterEach(() => jest.useRealTimers());

/** A task every hour of every day for the coming week and a day. */
function busyWeek(): Task[] {
  return days(TODAY, '2026-10-01').flatMap((date) =>
    Array.from({ length: 24 }, (_, h) => task({ date, time: `${String(h).padStart(2, '0')}:00` })),
  );
}

const ids = () => [...mockCentre.scheduled.keys()];

describe('the notification budget', () => {
  it('plans at most 60 reminders however busy the week is, soonest first', () => {
    const planned = planReminders(busyWeek(), settings(), TODAY);
    expect(planned).toHaveLength(60);
    const times = planned.map((p) => p.at);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    // 5:00 now, 10 minutes' lead: the 6:00 task is the first one still to come.
    expect(planned[0].task).toMatchObject({ date: TODAY, time: '06:00' });
  });

  it('gives each nudge that is on a week of the 60, and reminders the rest', () => {
    expect(reminderBudget({ nudge: false, evening: false })).toBe(60);
    expect(reminderBudget({ nudge: true, evening: false })).toBe(53);
    expect(reminderBudget({ nudge: true, evening: true })).toBe(46);
    expect(planReminders(busyWeek(), settings({ nudge: true, evening: true }), TODAY)).toHaveLength(46);
  });

  it('plans at most 7 nudges', () => {
    expect(NUDGE_DAYS).toBe(7);
    expect(planNudges([], settings({ nudge: true }), TODAY)).toHaveLength(7);
  });

  it('skips today’s nudge once its hour has passed', () => {
    at(9);
    const nudges = planNudges([], settings({ nudge: true, nudgeHour: 8 }), TODAY);
    expect(nudges.map((n) => n.id)).toEqual(days('2026-09-25', '2026-09-30').map((d) => `nudge-${d}`));
  });

  it('never leaves more than 60 pending with reminders and nudges both on', async () => {
    await syncReminders(busyWeek(), settings({ remind: true, nudge: true }));
    expect(mockCentre.scheduled.size).toBe(60);
    expect(ids().filter((id) => id.startsWith('nudge-'))).toHaveLength(7);
  });

  it('never leaves more than 60 pending with reminders and both nudges on', async () => {
    await syncReminders(busyWeek(), settings({ remind: true, nudge: true, evening: true }));
    expect(mockCentre.scheduled.size).toBe(60);
    expect(ids().filter((id) => id.startsWith('evening-'))).toHaveLength(7);
  });

  it('turning reminders off cancels every reminder but keeps the nudges', async () => {
    await syncReminders(busyWeek(), settings({ remind: true, nudge: true }));
    await syncReminders(busyWeek(), settings({ remind: false, nudge: true }));
    expect(ids()).toHaveLength(7);
    expect(ids().every((id) => id.startsWith('nudge-'))).toBe(true);
  });

  it('turning both off leaves nothing scheduled', async () => {
    await syncReminders(busyWeek(), settings({ remind: true, nudge: true }));
    await syncReminders(busyWeek(), settings({ remind: false, nudge: false }));
    expect(ids()).toEqual([]);
  });

  it('keeps a nudge preview that is about to arrive', async () => {
    mockCentre.scheduled.set('nudge-preview', { identifier: 'nudge-preview', content: { title: '', body: '' } });
    await syncReminders(busyWeek(), settings());
    expect(ids()).toContain('nudge-preview');
  });
});

describe('which tasks get a reminder', () => {
  it('none whose reminder time has already passed', () => {
    at(9, 55);
    const tasks = [task({ id: 'gone', time: '10:00' }), task({ id: 'coming', time: '10:10' })];
    expect(planReminders(tasks, settings({ leadMinutes: 10 }), TODAY).map((p) => p.task.id)).toEqual(['coming']);
  });

  it('only open, timed tasks that want one, from today through a week ahead', () => {
    const tasks = [
      task({ id: 'yes', date: TODAY, time: '10:00' }),
      task({ id: 'last-day', date: '2026-10-01', time: '10:00' }),
      task({ id: 'done', date: TODAY, time: '10:00', done: true }),
      task({ id: 'opted-out', date: TODAY, time: '10:00', remind: false }),
      task({ id: 'anytime', date: TODAY, time: '' }),
      task({ id: 'too-far', date: '2026-10-02', time: '10:00' }),
      task({ id: 'yesterday', date: '2026-09-23', time: '10:00' }),
    ];
    expect(planReminders(tasks, settings(), TODAY).map((p) => p.task.id)).toEqual(['yes', 'last-day']);
  });

  it('none at all when reminders are off', () => {
    expect(planReminders(busyWeek(), settings({ remind: false }), TODAY)).toEqual([]);
  });

  it('arrives the lead time before the task', () => {
    const [plan] = planReminders([task({ time: '10:30' })], settings({ leadMinutes: 15 }), TODAY);
    expect(new Date(plan.at)).toEqual(new Date(2026, 8, 24, 10, 15));
  });
});

describe('asking for permission', () => {
  it('schedules nothing, and never asks, when notifications are not allowed', async () => {
    mockCentre.granted = false;
    await syncReminders(busyWeek(), settings({ remind: true, nudge: true }));
    expect(ids()).toEqual([]);
    expect(mockCentre.asked).toBe(0);
  });
});

describe('what a reminder says', () => {
  async function reminderFor(time: string, fields: Parameters<typeof settings>[0]) {
    await syncReminders([task({ id: 'r', time, title: 'Call the contractor' })], settings(fields));
    return mockCentre.scheduled.get('r')!.content;
  }

  it('says how long there is, in the reader’s clock', async () => {
    expect(await reminderFor('10:30', { leadMinutes: 10 })).toMatchObject({ title: 'Call the contractor', body: 'In 10 min, 10:30 am' });
    expect((await reminderFor('10:30', { leadMinutes: 0 })).body).toBe('Now, 10:30 am');
    expect((await reminderFor('14:30', { leadMinutes: 10, hour12: false })).body).toBe('In 10 min, 14:30');
  });
});

describe('voices', () => {
  const day = [task({ date: TODAY })];

  it('say the same moment three different ways', () => {
    const titles = (['warm', 'gentle', 'playful'] as const).map((v) => composeNudge([], settings({ nudgeVoice: v }), TODAY).title);
    expect(new Set(titles).size).toBe(3);
  });

  it('mix takes turns with all three, a day at a time', () => {
    const voices = days('2026-09-24', '2026-09-26').map((d) => voiceFor({ nudgeVoice: 'mix' }, d));
    expect(new Set(voices)).toEqual(new Set(['warm', 'gentle', 'playful']));
  });

  it('a chosen voice stays put', () => {
    expect(composeNudge(day, settings({ nudgeVoice: 'gentle' }), TODAY).title).toBe(
      composeNudge(day, settings({ nudgeVoice: 'gentle' }), TODAY).title,
    );
    expect(voiceFor({ nudgeVoice: 'playful' }, '2026-09-25')).toBe('playful');
  });
});

describe('the evening check-in', () => {
  it('says how much is left, and that it will move on', () => {
    const tasks = [task({ title: 'Call Mum', time: '' }), task({ title: 'Gym', time: '18:00' }), task({ done: true })];
    expect(composeEvening(tasks, settings({ carryOver: true }), TODAY)).toEqual({
      title: '2 left today',
      subtitle: 'Still time for one. Anything unfinished moves to tomorrow.',
      body: '6:00 pm  ·  Gym\nAnytime  ·  Call Mum',
    });
  });

  it('doesn’t promise a move when carry-over is off', () => {
    expect(composeEvening([task({})], settings({ carryOver: false }), TODAY)?.subtitle).toBe('Still time to tick one off.');
  });

  it('stays quiet on a day with nothing left', () => {
    expect(composeEvening([task({ done: true })], settings(), TODAY)).toBeNull();
    expect(composeEvening([], settings(), TODAY)).toBeNull();
  });

  it('is planned only for the days that have something open, after its hour', () => {
    at(21);
    const tasks = [task({ date: TODAY }), task({ date: '2026-09-25' }), task({ date: '2026-09-27' })];
    const planned = planEvenings(tasks, settings({ evening: true, eveningHour: 20 }), TODAY);
    expect(planned.map((n) => n.id)).toEqual(['evening-2026-09-25', 'evening-2026-09-27']);
  });

  it('turning it off cancels it', async () => {
    await syncReminders([task({ date: '2026-09-25' })], settings({ remind: false, evening: true }));
    expect(ids()).toEqual(['evening-2026-09-25']);
    await syncReminders([task({ date: '2026-09-25' })], settings({ remind: false, evening: false }));
    expect(ids()).toEqual([]);
  });
});

describe('the morning nudge', () => {
  it('invites a first task on an empty day', () => {
    expect(composeNudge([], settings(), TODAY)).toEqual({
      title: 'A clear day',
      subtitle: 'Add one thing you’d be glad to have done',
      body: 'Open plancy and add the first thing. Small plans count.',
    });
  });

  it('lists the first three things and counts the rest', () => {
    const tasks = ['07:00', '08:00', '', '12:00', '18:00'].map((time, i) => task({ time, title: `T${i}`, position: i }));
    const nudge = composeNudge(tasks, settings(), TODAY);
    expect(nudge.subtitle).toBe('5 planned, first at 7:00 am');
    expect(nudge.body).toBe('7:00 am  ·  T0\n8:00 am  ·  T1\n12:00 pm  ·  T3\nand 2 more');
  });

  it('has no “first at” on a day of anytime tasks only', () => {
    const tasks = [task({ time: '', title: 'Read' }), task({ time: '', title: 'Call Mum', position: 1 })];
    const nudge = composeNudge(tasks, settings(), TODAY);
    expect(nudge.subtitle).toBe('2 planned');
    expect(nudge.body).toBe('Anytime  ·  Read\nAnytime  ·  Call Mum');
  });

  it('points at a streak milestone within reach today', () => {
    const tasks = [...finishedDays(2, '2026-09-23'), task({ date: TODAY })];
    expect(composeNudge(tasks, settings(), TODAY)).toMatchObject({
      title: 'Today could make it 3 days',
      subtitle: 'Finish your list for a 3-day streak',
    });
  });

  it('counts the days of a streak in progress', () => {
    const tasks = [...finishedDays(4, '2026-09-23'), task({ date: TODAY })];
    expect(composeNudge(tasks, settings(), TODAY).title).toBe('4 days running. Make it 5');
  });

  it('knows an unfinished yesterday ended the streak', () => {
    const tasks = [...finishedDays(4, '2026-09-22'), task({ date: '2026-09-23' }), task({ date: TODAY })];
    expect(composeNudge(tasks, settings(), TODAY).title).not.toMatch(/days running/);
  });

  it('notices a finished yesterday', () => {
    const tasks = [task({ date: '2026-09-23', done: true }), task({ date: '2026-09-23', done: true }), task({ date: TODAY })];
    expect(composeNudge(tasks, settings(), TODAY)).toMatchObject({
      title: 'Yesterday: all 2 done. Nice.',
      subtitle: '1 planned, first at 9:00 am',
    });
  });

  it('welcomes what was carried over, without counting it as a failure', () => {
    const tasks = [task({ date: '2026-09-23', title: 'Book the plumber' })];
    const nudge = composeNudge(tasks, settings({ carryOver: true }), TODAY);
    expect(nudge).toMatchObject({ title: 'Fresh start', subtitle: '1 came over from yesterday. Today’s a new go.' });
    expect(nudge.body).toBe('Anytime  ·  Book the plumber');
  });

  it('plans tomorrow with today’s leftovers already moved in', () => {
    const tasks = [task({ date: TODAY, title: 'Book the plumber' })];
    expect(composeNudge(tasks, settings({ carryOver: true }), '2026-09-25').body).toBe('Anytime  ·  Book the plumber');
    expect(composeNudge(tasks, settings({ carryOver: false }), '2026-09-25').body).not.toContain('plumber');
  });

  it('opens a week with last week’s tally', () => {
    const monday = '2026-09-28';
    const tasks = [
      task({ date: '2026-09-21', done: true }),
      task({ date: '2026-09-23', done: true }),
      task({ date: '2026-09-23', done: false }),
      task({ date: monday, time: '09:00' }),
    ];
    expect(composeNudge(tasks, settings(), monday)).toMatchObject({
      title: 'New week, clean slate',
      subtitle: 'You finished 2 things last week. 1 planned, first at 9:00 am.',
    });
  });

  it('opens a month with last month’s tally', () => {
    const tasks = [task({ date: '2026-09-10', done: true }), task({ date: '2026-09-30', done: false })];
    expect(composeNudge(tasks, settings(), '2026-10-01')).toMatchObject({
      title: 'Hello, October',
      subtitle: 'You finished 1 thing last month. Nothing planned yet.',
    });
  });

  it('counts what was done, never what was missed', () => {
    const tasks = [task({ date: '2026-09-22', done: false }), task({ date: '2026-09-28', time: '09:00' })];
    expect(composeNudge(tasks, settings(), '2026-09-28').subtitle).toBe('1 planned, first at 9:00 am.');
  });

  it('greets differently on consecutive ordinary days', () => {
    const titles = ['2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26'].map(
      (day) => composeNudge([task({ date: day })], settings(), day).title,
    );
    for (let i = 1; i < titles.length; i += 1) expect(titles[i]).not.toBe(titles[i - 1]);
  });
});

/*
 * Onboarding shows a picture of the reminder and the nudge it is asking
 * permission for, with the words typed into the screen. If the real
 * notifications change, the pictures must change too, or they lie.
 */
describe('onboarding shows the notifications plancy really sends', () => {
  const onboarding = readFileSync(join(__dirname, '../components/onboarding.tsx'), 'utf8');

  it('the reminder', async () => {
    await syncReminders([task({ id: 'r', time: '10:30', title: 'Call the contractor' })], settings({ leadMinutes: 10 }));
    const { title, body } = mockCentre.scheduled.get('r')!.content;
    expect(onboarding).toContain(`title="${title}"`);
    expect(onboarding).toContain(`body="${body}"`);
  });

  it('the morning nudge, and its two buttons', async () => {
    const tasks = [
      ...finishedDays(11, '2026-09-23'),
      task({ date: TODAY, time: '07:00', title: 'Morning run' }),
      task({ date: TODAY, time: '09:30', title: 'Stand-up' }),
      task({ date: TODAY, time: '14:00', title: 'Draft the spec' }),
    ];
    const nudge = composeNudge(tasks, settings(), TODAY);
    expect(onboarding).toContain(`title="${nudge.title}"`);
    expect(onboarding).toContain(`subtitle="${nudge.subtitle}"`);
    expect(onboarding).toContain(`body={'${nudge.body.replace(/\n/g, '\\n')}'}`);

    await syncReminders([], settings({ remind: false, nudge: true }));
    expect(mockCentre.buttons.length).toBeGreaterThan(0);
    expect(onboarding).toContain(`actions={[${mockCentre.buttons.map((b) => `'${b}'`).join(', ')}]}`);
  });
});
