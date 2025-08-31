// Copies frontend/dist into backend/dist/public (if built) or backend/src/public for dev
const fs = require('fs');
const path = require('path');

const root = __dirname + '/..';
const feDist = path.join(root, 'frontend', 'dist');
const beDistPublic = path.join(root, 'backend', 'dist', 'public');
const beSrcPublic = path.join(root, 'backend', 'src', 'public');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.error('Frontend dist not found:', src);
    process.exit(0);
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

// Try dist/public first (for runtime)
try {
  copyDir(feDist, beDistPublic);
  console.log('Copied frontend build to', beDistPublic);
} catch (e) {
  console.warn('Failed to copy to dist/public, trying src/public');
  try {
    copyDir(feDist, beSrcPublic);
    console.log('Copied frontend build to', beSrcPublic);
  } catch (e2) {
    console.error('Failed to copy frontend build to backend.');
    process.exit(1);
  }
}
