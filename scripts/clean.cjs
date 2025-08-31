// Best-effort cleanup of infra/test/lint files the project no longer uses
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const targets = [
  'docker-compose.yml',
  path.join('nginx', 'default.conf'),
  path.join('docker', 'mysql-init', 'init.sql'),
  path.join('backend', 'Dockerfile'),
  path.join('backend', 'jest.config.js'),
  path.join('backend', '.prettierrc'),
  path.join('backend', '.eslintrc.cjs'),
  '.eslintrc.cjs',
  path.join('frontend', '.eslintrc.cjs'),
  path.join('frontend', 'Dockerfile'),
  path.join('backend', '.husky', 'pre-commit'),
  path.join('backend', 'src', '__tests__', 'auth.test.ts'),
  path.join('frontend', 'src', 'pages', 'Auth', 'Register.test.tsx'),
  path.join('frontend', 'src', 'pages', 'Dashboard', 'index.test.tsx'),
];

for (const t of targets) {
  const p = path.join(root, t);
  try {
    if (fs.existsSync(p)) {
      fs.rmSync(p, { force: true });
      console.log('Removed', t);
    }
  } catch (e) {
    console.warn('Failed to remove', t, e.message);
  }
}

// Remove folders (recursively) if they exist
const removeDir = (d) => {
  const p = path.join(root, d);
  try {
    if (fs.existsSync(p)) {
      fs.rmSync(p, { recursive: true, force: true });
      console.log('Removed dir', d);
    }
  } catch {}
};
removeDir(path.join('backend', '.husky'));
removeDir(path.join('docker', 'mysql-init'));
// Optionally remove whole docker/ and nginx/ if present
removeDir('docker');
removeDir('nginx');
