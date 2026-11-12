import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));

test('package.json: manifest configuration and exports integrity', () => {
  const pkgPath = path.join(rootDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  assert.equal(pkg.name, '@snehav27/envguard-lite');
  assert.equal(pkg.version, '0.1.0');
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.license, 'MIT');
  assert.ok(pkg.engines && pkg.engines.node.includes('>=18'));

  // Ensure main and types entry points exist on disk
  assert.ok(fs.existsSync(path.join(rootDir, pkg.main)));
  assert.ok(fs.existsSync(path.join(rootDir, pkg.types)));

  // Ensure export map has root and package.json entries
  assert.ok(pkg.exports);
  assert.ok(pkg.exports['.']);
  assert.equal(pkg.exports['.'].import, './src/index.js');
  assert.equal(pkg.exports['.'].types, './src/index.d.ts');
  assert.equal(pkg.exports['./package.json'], './package.json');

  // Verify allowlist files exist on disk
  assert.ok(Array.isArray(pkg.files));
  assert.ok(fs.existsSync(path.join(rootDir, 'LICENSE')));
  assert.ok(fs.existsSync(path.join(rootDir, 'README.md')));
});

test('package.json: files allowlist excludes development artifacts', () => {
  const pkgPath = path.join(rootDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  for (const pattern of pkg.files) {
    assert.ok(!pattern.startsWith('test'), `Files pattern ${pattern} should not include test files`);
    assert.ok(!pattern.startsWith('.git'), `Files pattern ${pattern} should not include git files`);
    assert.ok(!pattern.includes('node_modules'), `Files pattern ${pattern} should not include node_modules`);
  }
});
