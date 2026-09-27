/**
 * The phone's language and region, as expo-localization reports them, made
 * settable. Every test starts as an English-speaking phone in Malaysia.
 */
type Phone = { languageTag: string; currencyCode: string | null; uses24hourClock: boolean };

const phone: Phone = { languageTag: 'en-MY', currencyCode: 'MYR', uses24hourClock: false };
const initial = { ...phone };

/** Pretend the phone is set to this language, e.g. `de-DE`. */
export function setPhone(fields: Partial<Phone>): void {
  Object.assign(phone, fields);
}

export function resetPhone(): void {
  Object.assign(phone, initial);
}

export const expoLocalization = {
  getLocales: () => [{ languageTag: phone.languageTag, currencyCode: phone.currencyCode }],
  getCalendars: () => [{ uses24hourClock: phone.uses24hourClock }],
};
