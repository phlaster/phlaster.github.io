const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const pdfDir = path.join(process.cwd(), 'public', 'pdf');

if (!fs.existsSync(pdfDir)) {
  console.log('⚠️ Папка public/pdf не найдена, пропуск сжатия.');
  process.exit(0);
}

const pdfFiles = fs.readdirSync(pdfDir).filter(f => f.endsWith('.pdf'));

if (pdfFiles.length === 0) {
  console.log('⚠️ В папке нет PDF файлов для сжатия.');
  process.exit(0);
}

console.log('⚙️ Сжатие PDF файлов (gzip level 9)...');

pdfFiles.forEach(pdfName => {
  const pdfPath = path.join(pdfDir, pdfName);
  const gzPath = pdfPath + '.gz';
  const pdfData = fs.readFileSync(pdfPath);
  
  const gzData = zlib.gzipSync(pdfData, { level: 9 });
  fs.writeFileSync(gzPath, gzData);
});

console.log(`✅ Успешно сжато файлов: ${pdfFiles.length}`);