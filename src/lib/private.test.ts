import { settings } from '../../test/make';
import { isPrivate } from './private';

describe('private', () => {
  it('only while the whole app is locked', () => {
    expect(isPrivate(settings({ lockEnabled: true, lockScope: 'app' }))).toBe(true);
    expect(isPrivate(settings({ lockEnabled: true, lockScope: 'private' }))).toBe(false);
    expect(isPrivate(settings({ lockEnabled: false, lockScope: 'app' }))).toBe(false);
  });
});
