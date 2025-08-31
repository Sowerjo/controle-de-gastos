// Create a root-level dist folder with everything ready to upload
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'dist');
const feDist = path.join(root, 'frontend', 'dist');
const phpApi = path.join(root, 'backend-php', 'api');
const phpEnv = path.join(root, 'backend-php', '.env.example');
const phpSchema = path.join(root, 'backend-php', 'schema.sql');

function rimraf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}
function mkdirp(p) {
  fs.mkdirSync(p, { recursive: true });
}
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  mkdirp(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

// Clean output
rimraf(out);
mkdirp(out);

// Package 1: frontend-only (static hosting)
const feOut = path.join(out, 'frontend');
copyDir(feDist, feOut);
// Ensure Apache SPA rewrite is present in the packaged frontend
const spaHtaccess = path.join(root, 'frontend', 'public', '.htaccess');
if (fs.existsSync(spaHtaccess)) {
  fs.copyFileSync(spaHtaccess, path.join(feOut, '.htaccess'));
}

// Package 2: PHP API for shared hosting
const apiOut = path.join(out, 'api');
copyDir(phpApi, apiOut);
if (fs.existsSync(phpEnv)) fs.copyFileSync(phpEnv, path.join(out, '.env.example'));
if (fs.existsSync(phpSchema)) fs.copyFileSync(phpSchema, path.join(out, 'schema.sql'));

console.log('Packaged into:', out);
console.log('- frontend/: arquivos estáticos (public_html/htdocs)');
console.log('- api/: backend PHP (coloque em /api do seu hosting)');
