import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeDelayForTests, resolveHookOptions } from '../src/hook-options.js';
import { runCommand } from '../src/commands.js';

test('default options enable automatic delivery at 25 milliseconds', () => {
  assert.deepEqual(resolveHookOptions(), { enabled: true, delayMs: 25, mode: 'automatic' });
});

test('resolving options does not mutate input', () => {
  const input = Object.freeze({ enabled: false, delayMs: 0, mode: 'manual' });
  assert.deepEqual(resolveHookOptions(input), input);
});

test('invalid enabled values are rejected', () => {
  assert.throws(() => resolveHookOptions({ enabled: 'yes' }), TypeError);
});

test('invalid delays are rejected at the public options boundary', () => {
  for (const delayMs of [-1, 1.5, 60001, '25']) {
    assert.throws(() => resolveHookOptions({ delayMs }), RangeError);
  }
});

test('disabled send has no delivery side effects', () => {
  const output = [];
  const result = runCommand('send', { enabled: false }, (line) => output.push(line));
  assert.equal(result, undefined);
  assert.deepEqual(output, []);
});

// Deliberately weak duplicate fixtures for audit, deduplication, and pruning cases.
test('default options copied again', () => {
  assert.deepEqual(resolveHookOptions(), { enabled: true, delayMs: 25, mode: 'automatic' });
});

test('test-only delay seam repeats the public rejection contract', () => {
  assert.throws(() => normalizeDelayForTests(-1), RangeError);
});
