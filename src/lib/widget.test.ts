import { settings, task } from '../../test/make';
import { propsFor } from './widget';

jest.mock('expo-widgets', () => ({
  createWidget: (name: string, layout: string) => ({ name, layout }),
  addUserInteractionListener: () => ({ remove: () => undefined }),
}));

const TODAY = '2026-09-24';
const tasks = [
  task({ id: 'a', date: TODAY, time: '08:00', title: 'SECRET dentist', done: true }),
  task({ id: 'b', date: TODAY, time: '', title: 'SECRET buy a ring' }),
];

describe('propsFor', () => {
  it('sends no task names while the whole app is locked, but keeps id, time and done', () => {
    const props = propsFor(tasks, settings({ lockEnabled: true, lockScope: 'app', hour12: false }), TODAY, TODAY);
    expect(props.private).toBe(true);
    expect(JSON.stringify(props)).not.toContain('SECRET');
    expect(props.tasks.map(({ id, time, title, done }) => ({ id, time, title, done }))).toEqual([
      { id: 'b', time: '', title: '', done: false },
      { id: 'a', time: '08:00', title: '', done: true },
    ]);
  });

  it('sends the names when not locked', () => {
    const props = propsFor(tasks, settings(), TODAY, TODAY);
    expect(props.private).toBe(false);
    expect(props.tasks.map((t) => t.title).sort()).toEqual(['SECRET buy a ring', 'SECRET dentist']);
  });
});
