/** Runs before every test file. */
jest.mock('expo-localization', () => require('./locale').expoLocalization);

afterEach(() => {
  require('./locale').resetPhone();
});
