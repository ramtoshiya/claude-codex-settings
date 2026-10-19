export function createLifecycle({
  send,
  delayMs = 25,
  schedule = setTimeout,
  cancel = clearTimeout,
}) {
  let pending = [];
  let timer = null;
  let paused = false;
  let closed = false;

  function flush() {
    if (timer !== null) cancel(timer);
    timer = null;
    if (paused || closed || pending.length === 0) return;
    const batch = pending;
    pending = [];
    send(batch);
  }

  function arm() {
    if (!paused && !closed && pending.length > 0 && timer === null) {
      timer = schedule(flush, delayMs);
    }
  }

  return {
    enqueue(event) {
      if (closed) throw new Error('Dispatcher is closed');
      pending.push(event);
      arm();
    },
    flush,
    pause() {
      paused = true;
      if (timer !== null) cancel(timer);
    },
    resume() {
      if (closed) throw new Error('Dispatcher is closed');
      paused = false;
      arm();
    },
    close() {
      closed = true;
      if (timer !== null) cancel(timer);
      timer = null;
      pending = [];
    },
  };
}
