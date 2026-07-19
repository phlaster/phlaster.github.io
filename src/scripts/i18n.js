import {
  parse
} from 'smol-toml';
import tomlString from '../content.toml?raw';

export const config = parse(tomlString);
const langKeys = ['en', 'fr', 'ru'];
const fallbackMap = {
  en: 'fr',
  ru: 'en',
  fr: 'ru'
};

export function detectInitialLang() {
  const browserLangs = navigator.languages || [navigator.language];
  for (const bl of browserLangs) {
    const code = bl.split('-')[0].toLowerCase();
    if (langKeys.includes(code)) return code;
  }
  return config.site.default_lang || 'en';
}

export function resolveTranslations(obj, lang) {
  if (Array.isArray(obj)) return obj.map(item => resolveTranslations(item, lang));
  if (typeof obj === 'object' && obj !== null) {
    const keys = Object.keys(obj);
    const hasLangKey = keys.some(k => langKeys.includes(k));

    if (hasLangKey) {
      const sequence = [];
      let current = lang;
      for (let i = 0; i < 3; i++) {
        sequence.push(current);
        current = fallbackMap[current] || 'en';
      }

      for (const l of sequence) {
        if (obj[l] !== undefined) {
          if (Array.isArray(obj[l]) || typeof obj[l] !== 'object') {
            return resolveTranslations(obj[l], lang);
          }
          const result = {};
          for (const k in obj) {
            if (!langKeys.includes(k)) result[k] = resolveTranslations(obj[k], lang);
          }
          for (const k in obj[l]) {
            result[k] = resolveTranslations(obj[l][k], lang);
          }
          return result;
        }
      }
      return {};
    } else {
      const result = {};
      for (const k in obj) result[k] = resolveTranslations(obj[k], lang);
      return result;
    }
  }
  return obj;
}