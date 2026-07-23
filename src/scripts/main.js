import {
  config,
  detectInitialLang,
  resolveTranslations
} from './i18n.js';
import {
  initNavigation
} from './navigation.js';
import {
  renderContent
} from './render.js';
import {
  initContact
} from './contact.js';
import {
  initPdfModal
} from './pdf-modal.js';
import {
  initPdfExport
} from './pdf-export.js';

let currentLang = detectInitialLang();
let i18nConfig = resolveTranslations(config, currentLang);

function rerender(newLang) {
  currentLang = newLang;
  i18nConfig = resolveTranslations(config, currentLang);
  renderContent(i18nConfig, currentLang);
}

document.addEventListener('DOMContentLoaded', () => {
  renderContent(i18nConfig, currentLang);

  initNavigation(rerender);
  initContact(() => i18nConfig);
  initPdfModal(() => i18nConfig);
  initPdfExport();

  const langAbbr = {
    en: 'ENG',
    ru: 'RUS',
    fr: 'FRA'
  };
  document.getElementById('langCurrent').textContent = langAbbr[currentLang] || 'ENG';
  document.querySelectorAll('#langDropdown li').forEach(li => {
    li.classList.toggle('active', li.dataset.lang === currentLang);
  });
});