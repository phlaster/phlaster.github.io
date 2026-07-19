import { config, detectInitialLang, resolveTranslations } from './scripts/i18n.js';
import { initNavigation } from './scripts/navigation.js';
import { renderContent } from './scripts/render.js';
import { initContact } from './scripts/contact.js';
import { initPdfModal } from './scripts/pdf-modal.js';
import { initPdfExport } from './scripts/pdf-export.js';

let currentLang = detectInitialLang();
let i18nConfig = resolveTranslations(config, currentLang);

// Функция для перерисовки при смене языка
function rerender(newLang) {
  currentLang = newLang;
  i18nConfig = resolveTranslations(config, currentLang);
  renderContent(i18nConfig, currentLang);
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
  // Первичная отрисовка
  renderContent(i18nConfig, currentLang);
  
  // Активация логики интерфейсов
  initNavigation(rerender);
  initContact(() => i18nConfig);
  initPdfModal(() => i18nConfig);
  initPdfExport();

  // Установка начального активного языка в UI
  document.getElementById('langCurrent').textContent = currentLang.toUpperCase();
  document.querySelectorAll('#langDropdown li').forEach(li => {
    li.classList.toggle('active', li.dataset.lang === currentLang);
  });
});