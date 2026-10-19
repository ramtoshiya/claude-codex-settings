import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, statSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const metadata = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));

test('every published command points into a shipped directory', () => {
  for (const entry of Object.values(metadata.bin)) {
    assert.ok(metadata.files.some((directory) => entry.startsWith(directory)));
    assert.ok(statSync(new URL(entry, root)).isFile());
    assert.match(readFileSync(new URL(entry, root), 'utf8'), /^#!\/usr\/bin\/env node\n/);
  }
});

test('package allowlist excludes test and evaluation support', () => {
  assert.ok(metadata.files.includes('src/'));
  assert.ok(metadata.files.includes('bin/'));
  for (const directory of metadata.files) {
    assert.ok(!directory.startsWith('test/'));
    assert.ok(!directory.startsWith('evals/'));
  }
});
