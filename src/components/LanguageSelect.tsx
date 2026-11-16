import { languages, setLocale, useLocale } from '@/i18n';

export function LanguageSelect() {
  const locale = useLocale();
  return <select aria-label="Language / 语言" className="field-input !w-auto !h-7 !text-[10.5px]" value={locale}
    onChange={event => void setLocale(event.target.value)}>
    {languages.map(language => <option key={language.code} value={language.code}>{language.label}</option>)}
  </select>;
}
