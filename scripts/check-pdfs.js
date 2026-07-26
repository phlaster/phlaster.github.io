const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const pdfDir = path.join(process.cwd(), 'public', 'pdf');
let pdfFiles = [];

try {
  pdfFiles = fs.readdirSync(pdfDir)
    .filter(f => f.endsWith('.pdf'))
    .map(f => path.join(pdfDir, f));
} catch (e) {
  console.error('🛑 ОШИБКА: Папка public/pdf не найдена или пуста. Создайте её и положите туда рендеры.');
  process.exit(1);
}

if (pdfFiles.length === 0) {
  console.error('🛑 ОШИБКА: В папке public/pdf нет PDF файлов.');
  process.exit(1);
}

// Находим самое старое время изменения среди PDF
let minPdfTime = Infinity;
pdfFiles.forEach(f => {
  const stat = fs.statSync(f);
  if (stat.mtimeMs < minPdfTime) minPdfTime = stat.mtimeMs;
});

// Получаем список файлов из Git, но фильтруем только те, что влияют на рендер
const trackedFiles = execSync('git ls-files', { encoding: 'utf-8' })
  .split('\n')
  .filter(Boolean)
  .filter(f => {
    // Проверяем только контент, разметку, стили и скрипт рендера
    return f === 'CONTENT.toml' ||
           f === 'index.html' ||
           f.startsWith('src/styles/') ||
           f.startsWith('src/scripts/render.js');
  });

// Ищем файлы, которые изменялись позже самого старого PDF
let offendingFiles = [];

trackedFiles.forEach(f => {
  if (!fs.existsSync(f)) return;
  const stat = fs.statSync(f);
  if (stat.mtimeMs > minPdfTime) {
    offendingFiles.push({ file: f, time: stat.mtimeMs });
  }
});

if (offendingFiles.length > 0) {
  console.error('\n🛑 ОШИБКА ПРИ ПУШЕ: Обнаружены файлы новее, чем сохранённые PDF-рендеры!');
  console.error('Пожалуйста, обновите PDF-файлы в public/pdf перед отправкой кода.\n');
  console.error('Файлы, измененные позже PDF:');
  
  offendingFiles
    .sort((a, b) => b.time - a.time)
    .slice(0, 10)
    .forEach(item => {
      const date = new Date(item.time).toLocaleString();
      console.error(`- ${item.file} (Изменен: ${date})`);
    });

  if (offendingFiles.length > 10) {
    console.error(`...и еще ${offendingFiles.length - 10} файлов.`);
  }

  process.exit(1);
}

console.log('✅ Проверка PDF пройдена: рендеры актуальны.');
process.exit(0);