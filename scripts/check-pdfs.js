#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ---- Check if push is to master/main ----
let pushToMaster = false;
try {
  const stdinData = fs.readFileSync(0, 'utf-8');
  const lines = stdinData.split('\n').filter(Boolean);
  for (const line of lines) {
    const parts = line.split(' ');
    if (parts.length >= 3) {
      const remoteRef = parts[2];
      if (remoteRef === 'refs/heads/master' || remoteRef === 'refs/heads/main') {
        pushToMaster = true;
        break;
      }
    }
  }
} catch (_) {
  // fallback: check current local branch
  try {
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
    if (currentBranch === 'master' || currentBranch === 'main') {
      pushToMaster = true;
    }
  } catch (_) {}
}

if (!pushToMaster) {
  console.log('Skipping PDF check: push not to master/main.');
  process.exit(0);
}

// ---- Main PDF validation ----
const pdfDir = path.join(process.cwd(), 'public', 'pdf');
let pdfFiles = [];

try {
  pdfFiles = fs.readdirSync(pdfDir)
    .filter(f => f.endsWith('.pdf'))
    .map(f => path.join(pdfDir, f));
} catch (e) {
  console.error('ERROR: public/pdf folder not found or empty. Create it and put renders there.');
  process.exit(1);
}

if (pdfFiles.length === 0) {
  console.error('ERROR: No PDF files in public/pdf folder.');
  process.exit(1);
}

// Find the oldest modification time among PDFs
let minPdfTime = Infinity;
pdfFiles.forEach(f => {
  const stat = fs.statSync(f);
  if (stat.mtimeMs < minPdfTime) minPdfTime = stat.mtimeMs;
});

// List of files that affect rendering (only these are considered)
const trackedFiles = execSync('git ls-files', { encoding: 'utf-8' })
  .split('\n')
  .filter(Boolean)
  .filter(f => {
    return f === 'CONTENT.toml' ||
           f === 'index.html' ||
           f.startsWith('src/styles/') ||
           f.startsWith('src/scripts/render.js');
  });

// Find files modified later than the oldest PDF
const offendingFiles = [];
trackedFiles.forEach(f => {
  if (!fs.existsSync(f)) return;
  const stat = fs.statSync(f);
  if (stat.mtimeMs > minPdfTime) {
    offendingFiles.push({ file: f, time: stat.mtimeMs });
  }
});

if (offendingFiles.length > 0) {
  console.error('\nPUSH ERROR: Found files newer than saved PDF renders!');
  console.error('Please update PDF files in public/pdf before pushing code.\n');
  console.error('Files modified later than PDF:');
  
  offendingFiles
    .sort((a, b) => b.time - a.time)
    .slice(0, 10)
    .forEach(item => {
      const date = new Date(item.time).toLocaleString();
      console.error(`- ${item.file} (Modified: ${date})`);
    });

  if (offendingFiles.length > 10) {
    console.error(`...and ${offendingFiles.length - 10} more files.`);
  }

  process.exit(1);
}

console.log('PDF check passed: renders are up to date.');
process.exit(0);