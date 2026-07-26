const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Ищем PDF файлы
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

// 2. Находим самое старое время изменения среди PDF
let minPdfTime = Infinity;
pdfFiles.forEach(f => {
  const stat = fs.statSync(f);
  if (stat.mtimeMs < minPdfTime) minPdfTime = stat.mtimeMs;
});

// 3. Получаем список всех файлов в Git (индекс + рабочая директория)
// Исключаем сами PDF-файлы из проверки
const trackedFiles = execSync('git ls-files', { encoding: 'utf-8' })
  .split('\n')
  .filter(Boolean)
  .filter(f => !f.startsWith('public/pdf/'));

// 4. Ищем файлы, которые изменялись позже самого старого PDF
let offendingFiles = [];

trackedFiles.forEach(f => {
  // Проверяем только существующие файлы (на случай удаленных в новом коммите)
  if (!fs.existsSync(f)) return;

  const stat = fs.statSync(f);
  if (stat.mtimeMs > minPdfTime) {
    offendingFiles.push({ file: f, time: stat.mtimeMs });
  }
});

// 5. Если найдены такие файлы — блокируем пуш
if (offendingFiles.length > 0) {
  console.error('\n🛑 ОШИБКА ПРИ ПУШЕ: Обнаружены файлы новее, чем сохранённые PDF-рендеры!');
  console.error('Пожалуйста, обновите PDF-файлы в public/pdf перед отправкой кода.\n');
  console.error('Файлы, измененные позже PDF:');
  
  // Сортируем по свежести и показываем топ-10 нарушителей
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

  process.exit(1); // Возвращаем ошибку, чтобы прервать git push
}

console.log('✅ Проверка PDF пройдена: рендеры актуальны.');
process.exit(0);