import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { useSyncExternalStore } from 'react';
import en from './locales/en.json';
import zh from './locales/zh-CN.json';
import source from './locales/source.json';

export const languages = [{ code: 'en', label: 'English', dir: 'ltr' }, { code: 'zh-CN', label: '简体中文', dir: 'ltr' }] as const;
export type Locale = typeof languages[number]['code'];
export function normalizeLocale(value: string): Locale {
  const exact = languages.find(language => language.code.toLowerCase() === value.toLowerCase());
  if (exact) return exact.code;
  if (/^zh(?:-|$)/i.test(value) && !/^zh-(TW|HK|MO|Hant)/i.test(value)) return 'zh-CN';
  const base = languages.find(language => language.code.toLowerCase() === value.toLowerCase().split('-')[0]);
  return base?.code || 'en';
}

function initialLocale(): Locale {
  try { const saved = localStorage.getItem('studio-language'); if (languages.some(l => l.code === saved)) return saved as Locale; } catch { /* optional storage */ }
  return 'en';
}
void i18next.use(initReactI18next).init({ lng: initialLocale(), fallbackLng: 'en', initAsync: false,
  resources: { en: { translation: en }, 'zh-CN': { translation: zh } },
  keySeparator: false, interpolation: { escapeValue: false }, returnEmptyString: false });
export function tr(key: string, params: Record<string, unknown> = {}, fallback?: string): string {
  return String(i18next.t(key, { ...params, defaultValue: fallback ?? key }));
}
// Transient event strings keep English compatibility while retaining their message references.
const eventReferences = new Map<string, { key: string; params: Record<string, unknown> }>();
export function message(key: string, params: Record<string, unknown> = {}): string {
  const value = String(i18next.getFixedT('en')(key, params));
  eventReferences.set(value, { key, params });
  if (eventReferences.size > 2000) eventReferences.delete(eventReferences.keys().next().value!);
  return value;
}
export function text(value: string | null | undefined): string {
  if (!value) return value || '';
  if (value.startsWith('Error: ')) return text(value.slice(7));
  const reference = eventReferences.get(value);
  if (reference) {
    if (reference.key === 'events.timestamp') {
      const time = new Intl.DateTimeFormat(i18next.resolvedLanguage, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(Number(reference.params.time));
      return '[' + time + '] ' + text(String(reference.params.line));
    }
    const params = Object.fromEntries(Object.entries(reference.params).map(([key, value]) => [key, typeof value === 'string' && eventReferences.has(value) ? text(value) : value]));
    return tr(reference.key, params, value);
  }
  const key = (source as Record<string, string>)[value];
  return typeof key === 'string' ? tr(key, {}, value) : value;
}
export function useLocale(): string {
  return useSyncExternalStore(callback => { i18next.on('languageChanged', callback); return () => { i18next.off('languageChanged', callback); }; }, () => i18next.resolvedLanguage || 'en', () => i18next.resolvedLanguage || 'en');
}
function applyLocale() {
  if (typeof document === 'undefined') return;
  const locale = i18next.resolvedLanguage || 'en';
  document.documentElement.lang = locale;
  document.documentElement.dir = languages.find(l => l.code === locale)?.dir || 'ltr';
  document.title = tr('app.title');
}
i18next.on('languageChanged', applyLocale);
applyLocale();
export async function setLocale(locale: string) {
  if (!languages.some(l => l.code === locale)) return;
  await i18next.changeLanguage(locale);
  try { localStorage.setItem('studio-language', locale); } catch { /* optional storage */ }
}
export default i18next;


/** Register references from API diagnostics without changing the original response. */
export function registerMessages(payload: unknown): void {
  if (!payload || typeof payload !== 'object') return;
  const record = payload as Record<string, unknown>;
  const remember = (value: unknown, reference: unknown) => {
    if (typeof value !== 'string' || !reference || typeof reference !== 'object') return;
    const ref = reference as { key?: string; params?: Record<string, unknown> };
    if (typeof ref.key !== 'string') return;
    eventReferences.set(value, { key: ref.key, params: ref.params || {} });
    if (eventReferences.size > 2000) eventReferences.delete(eventReferences.keys().next().value!);
  };
  if (record.translations && typeof record.translations === 'object') {
    for (const [field, ref] of Object.entries(record.translations)) remember(record[field], ref);
  }
  if (Array.isArray(record.note_translations) && Array.isArray(record.notes)) {
    record.note_translations.forEach((ref, index) => remember((record.notes as unknown[])[index], ref));
  }
  for (const value of Object.values(record)) if (value && typeof value === 'object') registerMessages(value);
}
