import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runCommand } from '../src/commands.js';

const entry = fileURLToPath(new URL('../bin/dispatch.js', import.meta.url));

test('help exposes the send and options commands', () => {
  const help = execFileSync(process.execPath, [entry, '--help'], { encoding: 'utf8' });
  assert.match(help, /^send: Batch and deliver an event$/m);
  assert.match(help, /^options: Print resolved hook options without starting delivery$/m);
});

test('options command prints configuration without delivering an event', () => {
  const output = [];
  const result = runCommand('options', { delayMs: 10 }, (line) => output.push(line));
  assert.equal(result, undefined);
  assert.deepEqual(output.map((line) => JSON.parse(line)), [
    { enabled: true, delayMs: 10, mode: 'automatic' },
  ]);
});

test('manual send delivers the supplied value through the command boundary', () => {
  const output = [];
  const dispatcher = runCommand('send', { mode: 'manual', value: 'payload' }, (line) => output.push(line));
  dispatcher.close();
  assert.deepEqual(output.map((line) => JSON.parse(line)), [[{ type: 'message', value: 'payload' }]]);
});

test('unknown commands produce a useful error', () => {
  assert.throws(() => runCommand('missing', {}, () => {}), /Unknown command: missing/);
});
