import assert from 'node:assert/strict';
import test from 'node:test';
import { createLifecycle } from '../src/lifecycle.js';
import { createClock } from './support/clock.js';

function fixture() {
  const clock = createClock();
  const sent = [];
  const dispatcher = createLifecycle({ ...clock, send: (batch) => sent.push(batch) });
  return { clock, sent, dispatcher };
}

test('queued events are delivered as one ordered batch', () => {
  const { clock, sent, dispatcher } = fixture();
  dispatcher.enqueue({ id: 1 });
  dispatcher.enqueue({ id: 2 });
  assert.deepEqual(sent, []);
  clock.tick();
  assert.deepEqual(sent, [[{ id: 1 }, { id: 2 }]]);
  clock.tick();
  assert.equal(sent.length, 1);
});

test('manual flush delivers once and cancels scheduled delivery', () => {
  const { clock, sent, dispatcher } = fixture();
  dispatcher.enqueue({ id: 1 });
  dispatcher.flush();
  clock.tick();
  assert.deepEqual(sent, [[{ id: 1 }]]);
});

test('pausing prevents delivery while paused', () => {
  const { clock, sent, dispatcher } = fixture();
  dispatcher.enqueue({ id: 1 });
  dispatcher.pause();
  clock.tick();
  assert.deepEqual(sent, []);
});

test('close discards pending events and rejects new events', () => {
  const { clock, sent, dispatcher } = fixture();
  dispatcher.enqueue({ id: 1 });
  dispatcher.close();
  clock.tick();
  assert.deepEqual(sent, []);
  assert.throws(() => dispatcher.enqueue({ id: 2 }), /closed/);
});

// Deliberately quarantined timing-sensitive fixture for the flaky-test repair case.
test('automatic delivery meets a wall-clock deadline', { skip: 'Replace timing assumption before enabling' }, async () => {
  const sent = [];
  const dispatcher = createLifecycle({ delayMs: 5, send: (batch) => sent.push(batch) });
  try {
    dispatcher.enqueue({ id: 1 });
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.deepEqual(sent, [[{ id: 1 }]]);
  } finally {
    dispatcher.close();
  }
});
