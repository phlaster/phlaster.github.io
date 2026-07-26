import {
  config,
  loadLang,
  saveLang,
  resolveTranslations
} from './i18n.js';
import { 
  initNavigation, 
  initCareerHighlighting 
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

let currentLang = loadLang();
let i18nConfig = resolveTranslations(config, currentLang);

function rerender(newLang) {
  currentLang = newLang;
  saveLang(newLang);
  i18nConfig = resolveTranslations(config, currentLang);
  renderContent(i18nConfig, currentLang);
  initCareerHighlighting();
  if (window.reapplyContacts) window.reapplyContacts();
}

document.addEventListener('DOMContentLoaded', () => {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  renderContent(i18nConfig, currentLang);
  initCareerHighlighting();

  initNavigation(rerender);
  initContact(() => i18nConfig);
  initPdfModal(() => i18nConfig);
  initPdfExport(() => i18nConfig);
  
  const langAbbr = {
    en: 'ENG',
    ru: 'RUS',
    fr: 'FRA'
  };
  document.getElementById('langCurrent').textContent = langAbbr[currentLang] || 'ENG';
  document.querySelectorAll('#langDropdown li').forEach(li => {
    li.classList.toggle('active', li.dataset.lang === currentLang);
  });

  document.body.classList.add('is-ready');
});