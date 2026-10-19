export function createClock() {
  let nextId = 1;
  const callbacks = new Map();
  return {
    schedule(callback) {
      const id = nextId++;
      callbacks.set(id, callback);
      return id;
    },
    cancel(id) {
      callbacks.delete(id);
    },
    tick() {
      const ready = [...callbacks.values()];
      callbacks.clear();
      for (const callback of ready) callback();
    },
  };
}
