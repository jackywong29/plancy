/**
 * Renders the widget the way iOS does, without a phone.
 *
 * On the phone the widget runs in a small JavaScript engine inside the widget
 * extension: it loads ExpoWidgets.bundle, evaluates this file's layout (which
 * Babel turned into a string of source), and calls __expoWidgetRender(props,
 * environment). A layout that throws there is drawn as an empty white tile,
 * with no error anywhere. So every family is rendered here against real,
 * private, empty and broken props, in both colour schemes.
 *
 * ExpoWidgets.bundle is built into node_modules by the first iOS build. If
 * it's missing: `node node_modules/expo-widgets/scripts/build-bundle.mjs`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

import { propsFor } from '@/lib/widget';

import { settings, task } from '../test/make';
import TodayWidget from './TodayWidget';

jest.mock('expo-widgets', () => ({
  createWidget: (name: string, layout: string) => ({ name, layout }),
  addUserInteractionListener: () => ({ remove: () => undefined }),
}));

// With createWidget mocked, the widget is just the layout Babel produced for
// the app: the component's source, as a string.
const { layout } = TodayWidget as unknown as { layout: string };

type Env = { widgetFamily: string; colorScheme: string; target?: string };
type Runtime = {
  __expoWidgetLayout: unknown;
  __expoWidgetRender: (props: unknown, env: Env) => unknown;
  __expoWidgetHandlePress: (props: unknown, env: Env) => unknown;
};

const BUNDLE = join(__dirname, '../node_modules/expo-widgets/bundle/build/ExpoWidgets.bundle');
let runtime: Runtime;

beforeAll(() => {
  if (!existsSync(BUNDLE)) {
    throw new Error(
      'ExpoWidgets.bundle is missing. Build it with `node node_modules/expo-widgets/scripts/build-bundle.mjs` (any iOS build also makes it).',
    );
  }
  const context = vm.createContext({});
  vm.runInContext(readFileSync(BUNDLE, 'utf8'), context);
  context.__expoWidgetLayout = vm.runInContext(`(${layout})`, context);
  runtime = context as unknown as Runtime;
});

const FAMILIES = ['systemSmall', 'systemMedium', 'accessoryInline', 'accessoryCircular', 'accessoryRectangular'];
const SCHEMES = ['light', 'dark'];
const STYLES = ['progress', 'streak', 'tasks'] as const;

const render = (props: unknown, widgetFamily: string, colorScheme = 'light') =>
  runtime.__expoWidgetRender(props, { widgetFamily, colorScheme });

/** Everything the widget would draw, as text, so it can be searched. */
const drawn = (props: unknown, family: string, scheme = 'light') => JSON.stringify(render(props, family, scheme));

const TODAY = '2026-09-24';
const day = [
  task({ id: 'a', date: TODAY, time: '08:00', title: 'SECRET dentist', done: true }),
  task({ id: 'b', date: TODAY, time: '11:30', title: 'SECRET call the bank' }),
  task({ id: 'c', date: TODAY, time: '', title: 'SECRET buy a ring' }),
];
const unlocked = (style: (typeof STYLES)[number] = 'progress') => propsFor(day, settings({ widgetStyle: style }), TODAY, TODAY);
const locked = (style: (typeof STYLES)[number] = 'progress') =>
  propsFor(day, settings({ widgetStyle: style, lockEnabled: true, lockScope: 'app' }), TODAY, TODAY);

describe('the layout', () => {
  it('reached the test as source, the way the widget extension gets it', () => {
    expect(typeof layout).toBe('string');
    expect(layout.startsWith('function')).toBe(true);
  });
});

describe('never throws', () => {
  const broken: [string, unknown][] = [
    ['no props at all (the gallery preview)', undefined],
    ['empty props (the placeholder)', {}],
    ['real props', unlocked()],
    ['private props', locked()],
    ['a day with nothing planned', propsFor([], settings(), TODAY, TODAY)],
    ['tasks that are not a list', { date: TODAY, tasks: 'nope' }],
    ['junk in the task list', { date: TODAY, tasks: [null, 5, { id: 1 }, { id: 'x' }] }],
    ['every field the wrong type', { date: 5, day: 7, accent: null, style: 'weird', streakBefore: 'NaN', touched: 'x', private: 'yes', tasks: {} }],
    ['a very long title', { ...unlocked(), tasks: [{ id: 'l', time: '9:00 am', title: 'x'.repeat(2000), done: false }] }],
    ['a busy day', propsFor(Array.from({ length: 30 }, (_, i) => task({ date: TODAY, title: `T${i}` })), settings(), TODAY, TODAY)],
  ];

  for (const [name, props] of broken) {
    it(`with ${name}, in every family and both schemes`, () => {
      for (const family of FAMILIES) {
        for (const scheme of SCHEMES) {
          expect(render(props, family, scheme)).toBeTruthy();
        }
      }
    });
  }

  it('with an environment iOS left empty', () => {
    expect(() => runtime.__expoWidgetRender(unlocked(), {} as Env)).not.toThrow();
  });
});

describe('private while plancy is locked', () => {
  it('no family and no style ever shows a task name', () => {
    for (const style of STYLES) {
      for (const family of FAMILIES) {
        for (const scheme of SCHEMES) {
          expect(drawn(locked(style), family, scheme)).not.toContain('SECRET');
        }
      }
    }
  });

  it('offers nothing to tick that it will not show', () => {
    for (const family of FAMILIES) expect(drawn(locked('tasks'), family)).not.toContain('tick-');
  });

  it('the names are really there when unlocked, so the check above means something', () => {
    expect(drawn(unlocked('progress'), 'systemSmall')).toContain('SECRET call the bank');
    expect(drawn(unlocked('tasks'), 'systemSmall')).toContain('SECRET dentist');
    expect(drawn(unlocked(), 'systemMedium')).toContain('SECRET buy a ring');
    expect(drawn(unlocked(), 'accessoryRectangular')).toContain('SECRET call the bank');
  });
});

describe('ticking on the home screen', () => {
  it('flips that task and remembers it for plancy', () => {
    const props = unlocked();
    const next = runtime.__expoWidgetHandlePress(props, { widgetFamily: 'systemMedium', colorScheme: 'light', target: 'tick-b' }) as {
      tasks: { id: string; done: boolean }[];
      touched: string[];
    };
    expect(next.tasks.find((t) => t.id === 'b')?.done).toBe(true);
    expect(next.tasks.filter((t) => t.id !== 'b')).toEqual(props.tasks.filter((t) => t.id !== 'b'));
    expect(next.touched).toEqual(['b']);
  });

  it('keeps each task listed once in touched, however often it is tapped', () => {
    const once = runtime.__expoWidgetHandlePress(unlocked(), { widgetFamily: 'systemMedium', colorScheme: 'light', target: 'tick-b' }) as object;
    const twice = runtime.__expoWidgetHandlePress({ ...unlocked(), ...once }, { widgetFamily: 'systemMedium', colorScheme: 'light', target: 'tick-b' }) as {
      tasks: { id: string; done: boolean }[];
      touched: string[];
    };
    expect(twice.tasks.find((t) => t.id === 'b')?.done).toBe(false);
    expect(twice.touched).toEqual(['b']);
  });
});
